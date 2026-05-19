import { Platform, Plugin, WorkspaceLeaf } from 'obsidian';
import { BloggerSettingTab } from './client/obsidian/settings/setting-tab';
import { addIcons } from './utils/obsidian/icons';
import {
  IBloggerPostParams,
} from './types/blogger-client-interface';
import { openProfileChooserModal } from './client/obsidian/modal/blogger-profile-chooser-modal';
import {
  IPluginSettings,
} from './plugin-settings';
import { IObsidianContext, showError } from './utils/obsidian/obsidian-context';
import { isString } from 'lodash-es';
import { getBloggerClient } from './blogger-client';
import { getGlobalMarkdownParser, setupMarkdownParser } from './utils/markdown/markdown-it-default';
import { getGlobalI18n, setGlobalLang } from './i18n/i18n';
import { MobileOAuth2Helper } from './blogger-oauth2-client';
import { EnumPostStatus } from './types/const';
import { findDefaultProfile, handleSettingsUpgrade } from './plugin/settings';
import { createObsidianContextMain } from './utils/obsidian/obsidian-context-main';
import { IBloggerProfile } from './types/blogger-profile';
import { BloggerDashboardView, BLOGGER_DASHBOARD_VIEW_TYPE } from './client/obsidian/view/blogger-dashboard-view';
import { BloggerBasesView, BLOGGER_BASES_VIEW_TYPE } from './client/obsidian/view/blogger-bases-view';

const doClientPublish = async (
  ctx: IObsidianContext,
  profileOrName: IBloggerProfile | string,
  defaultPostParams?: IBloggerPostParams,
): Promise<void> =>
{
  let profile: IBloggerProfile | undefined;
  if (isString(profileOrName)) {
    profile = ctx.plugin.settings.profiles.find((it) => it.name === profileOrName);
  } else {
    profile = profileOrName;
  }
  if (profile) {
    const client = getBloggerClient(ctx, ctx.plugin.settings, ctx.plugin.saveSettings, profile);
    if (client) {
      await client.publishPost(defaultPostParams);
    }
  } else {
    const noSuchProfileMessage = getGlobalI18n().t('error_noSuchProfile', {
      profileName: String(profileOrName),
    });
    showError(noSuchProfileMessage);
    throw new Error(noSuchProfileMessage);
  }
};

export default class BloggerPlugin extends Plugin {
  #settings: IPluginSettings | undefined;
  get settings() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#settings!;
  }

  #ctx: IObsidianContext = null!;
  get ctx()
  {
    if (!this.#ctx)
    {
      this.#ctx = createObsidianContextMain(this.app, this);
    }
    return this.#ctx;
  }

  protected ribbonBloggerIcon: HTMLElement | null = null;

  onload = async () => {
    await this.loadSettings();
    // lang should be load early, but after settings
    setGlobalLang(this.#settings?.lang);
    setupMarkdownParser(getGlobalMarkdownParser(), this.settings);
    addIcons();
    if (Platform.isMobile) {
      MobileOAuth2Helper.setUp(this.ctx);
    }

    // this.registerProtocolHandler();

    /** 註冊 Blogger Dashboard Base View */
    this.registerView(
      BLOGGER_DASHBOARD_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new BloggerDashboardView(leaf, this.ctx),
    );

    /** 註冊 Blogger Bases View（供 Obsidian Bases 系統使用）*/
    this.registerBasesView(BLOGGER_BASES_VIEW_TYPE, {
      name: 'Blogger Status',
      icon: 'blogger-logo',
      factory: (controller, containerEl) => new BloggerBasesView(controller, containerEl),
    });

    this.addRibbonIcon('blogger-logo', getGlobalI18n().t('ribbon_iconTitle'), () => {
      this.openProfileChooser();
    });

    this.addCommand({
      id: 'defaultPublish',
      name: getGlobalI18n().t('command_publishWithDefault'),
      editorCallback: async () =>
      {
        const defaultProfile = findDefaultProfile(this.#settings!);
        if (defaultProfile) {
          const params: IBloggerPostParams = {
            status: this.#settings?.defaultPostStatus ?? EnumPostStatus.Draft,
            tags: [],
            title: '',
            content: '',
          };
          await doClientPublish(this.ctx, defaultProfile, params);
        } else {
          showError(getGlobalI18n().t('error_noDefaultProfile') ?? 'No default profile found.');
        }
      },
    });

    this.addCommand({
      id: 'LIVE',
      name: getGlobalI18n().t('command_publish'),
      editorCallback: () => {
        this.openProfileChooser();
      },
    });

    this.addCommand({
      id: 'openDashboard',
      name: getGlobalI18n().t('command_openDashboard'),
      callback: () => {
        if (!this.settings.enableDashboard)
        {
          showError(getGlobalI18n().t('error_dashboardDisabled'));
          return;
        }
        this.activateDashboardView();
      },
    });

    this.addSettingTab(new BloggerSettingTab(this.ctx, this.settings, this.saveSettings));

    /** 延遲初始化儀表板（確保外掛載入完成後再開啟 View）*/
    this.app.workspace.onLayoutReady(() =>
    {
      if (this.settings.enableDashboard)
      {
        this.initDashboardView();
      }
    });
  };

  onunload = () => {};

  loadSettings = async () => {
    const { needUpgrade, settings } = await handleSettingsUpgrade(await this.loadData());
    this.#settings = settings;
    if (needUpgrade) {
      await this.saveSettings();
    }

    getGlobalMarkdownParser().set({
      html: this.#settings?.enableHtml ?? false,
    });
  };

  saveSettings = async () => {
    await this.saveData(this.settings);
  };

  updateRibbonIcon = () => {
    const ribbonIconTitle = getGlobalI18n().t('ribbon_iconTitle') ?? 'Blogger';
    if (this.#settings?.showRibbonIcon) {
      if (!this.ribbonBloggerIcon) {
        this.ribbonBloggerIcon = this.addRibbonIcon('blogger-logo', ribbonIconTitle, () => {
          this.openProfileChooser();
        });
      }
    } else {
      if (this.ribbonBloggerIcon) {
        this.ribbonBloggerIcon.remove();
        this.ribbonBloggerIcon = null;
      }
    }
  };

  /**
   * 初始化 Blogger Dashboard View（若尚未存在）
   * Initialize the Blogger Dashboard view (if not already created)
   */
  protected initDashboardView = () =>
  {
    const existing = this.app.workspace.getLeavesOfType(BLOGGER_DASHBOARD_VIEW_TYPE);
    if (existing.length === 0)
    {
      this.app.workspace.getRightLeaf(false)?.setViewState({
        type: BLOGGER_DASHBOARD_VIEW_TYPE,
        active: true,
      });
    }
  };

  /**
   * 啟用 Blogger Dashboard View（若已存在則切換至該 Leaf）
   * Activate the Blogger Dashboard view (switches to existing leaf if present)
   */
  protected activateDashboardView = () =>
  {
    const existing = this.app.workspace.getLeavesOfType(BLOGGER_DASHBOARD_VIEW_TYPE);
    if (existing.length > 0)
    {
      this.app.workspace.revealLeaf(existing[0]);
    }
    else
    {
      this.app.workspace.getRightLeaf(false)?.setViewState({
        type: BLOGGER_DASHBOARD_VIEW_TYPE,
        active: true,
      });
    }
  };

  /**
   * 根據設定更新 Blogger Dashboard View
   * Update Blogger Dashboard view based on settings
   *
   * 當用戶在設定中切換「啟用儀表板」時，此方法負責建立或銷毀 View Leaf。
   * When the user toggles "Enable Dashboard" in settings, this method creates or destroys view leaves.
   */
  protected updateDashboardView = () =>
  {
    if (this.settings.enableDashboard)
    {
      /** 啟用：若尚無 Leaf 則建立一個 */
      const existing = this.app.workspace.getLeavesOfType(BLOGGER_DASHBOARD_VIEW_TYPE);
      if (existing.length === 0)
      {
        this.app.workspace.getRightLeaf(false)?.setViewState({
          type: BLOGGER_DASHBOARD_VIEW_TYPE,
          active: true,
        });
      }
    }
    else
    {
      /** 停用：銷毀所有現有 Dashboard Leaf */
      this.app.workspace.getLeavesOfType(BLOGGER_DASHBOARD_VIEW_TYPE)
        .forEach(leaf => leaf.detach());
    }
  };

  protected openProfileChooser = async () =>
  {
    if (this.settings.profiles.length === 1) {
      await doClientPublish(this.ctx, this.settings.profiles[0]);
    } else if (this.settings.profiles.length > 1) {
      const profile = await openProfileChooserModal(this.ctx, this.settings.profiles);
      await doClientPublish(this.ctx, profile);
    } else {
      showError(getGlobalI18n().t('error_noProfile'));
    }
  };
}
