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
import { EnumPostStatus, EnumDashboardAction } from './types/const';
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
  /**
   * 以預設設定檔發布文章（共用實作，供 defaultPublish 與 mcpPublish 呼叫）
   * Publish post with default profile (shared implementation for defaultPublish and mcpPublish)
   */
  protected _publishWithDefault = async (): Promise<void> =>
  {
    const defaultProfile = findDefaultProfile(this.#settings!);
    if (defaultProfile)
    {
      const params: IBloggerPostParams = {
        status: this.#settings?.defaultPostStatus ?? EnumPostStatus.Draft,
        tags: [],
        title: '',
        content: '',
      };
      await doClientPublish(this.ctx, defaultProfile, params);
    } else
    {
      showError(getGlobalI18n().t('error_noDefaultProfile') ?? 'No default profile found.');
    }
  };
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
      factory: (controller, containerEl) => new BloggerBasesView(controller, containerEl, this.app),
    });

    this.addRibbonIcon('blogger-logo', getGlobalI18n().t('ribbon_iconTitle'), () => {
      this.openProfileChooser();
    });

    this.addCommand({
      id: 'defaultPublish',
      name: getGlobalI18n().t('command_publishWithDefault'),
      editorCallback: async () => { await this._publishWithDefault(); },
    });

    /**
     * 透過 REST API / MCP 從外部呼叫發布（使用 callback 而非 editorCallback，確保 command_execute 能正確觸發）
     * Publish via REST API / MCP (uses callback instead of editorCallback to ensure command_execute compatibility)
     */
    this.addCommand({
      id: 'mcpPublish',
      name: '[MCP] 發布目前筆記（使用默認值）',
      callback: async () => { await this._publishWithDefault(); },
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
        this._ensureDashboardView(EnumDashboardAction.Activate);
      },
    });

    this.addSettingTab(new BloggerSettingTab(this.ctx, this.settings, this.saveSettings));

    /** 延遲初始化儀表板（確保外掛載入完成後再開啟 View）*/
    this.app.workspace.onLayoutReady(() =>
    {
      if (this.settings.enableDashboard)
      {
        this._ensureDashboardView(EnumDashboardAction.Init);
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
   * 確保 Blogger Dashboard View Leaf 處於正確狀態
   * Ensure the Blogger Dashboard view leaf is in the correct state
   *
   * @param action - 要執行的行為 / Action to perform
   */
  public _ensureDashboardView = (action: EnumDashboardAction): void =>
  {
    if (action === EnumDashboardAction.Toggle && !this.settings.enableDashboard)
    {
      /** 停用：銷毀所有現有 Dashboard Leaf */
      this.app.workspace.getLeavesOfType(BLOGGER_DASHBOARD_VIEW_TYPE)
        .forEach(leaf => leaf.detach());
      return;
    }

    const existing = this.app.workspace.getLeavesOfType(BLOGGER_DASHBOARD_VIEW_TYPE);
    if (existing.length === 0)
    {
      /** 無現有 Leaf → 建立 */
      this.app.workspace.getRightLeaf(false)?.setViewState({
        type: BLOGGER_DASHBOARD_VIEW_TYPE,
        active: true,
      });
    }
    else if (action === EnumDashboardAction.Activate)
    {
      /** 有現有 Leaf 且要求啟用 → 切換 */
      this.app.workspace.revealLeaf(existing[0]);
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
