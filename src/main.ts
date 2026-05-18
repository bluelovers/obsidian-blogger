import { Platform, Plugin } from 'obsidian';
import { BloggerSettingTab } from './setting-tab';
import { addIcons } from './icons';
import {
  IBloggerPostParams,
} from './types/blogger-client-interface';
import { openProfileChooserModal } from './blogger-profile-chooser-modal';
import {
  IPluginSettings,
} from './plugin-settings';
import { IObsidianContext, showError } from './utils/obsidian/obsidian-context';
import { isString } from 'lodash-es';
import { IBloggerProfile } from './blogger-profile';
import { getBloggerClient } from './blogger-client';
import { getGlobalMarkdownParser, setupMarkdownParser } from './markdown-it-default';
import { getGlobalI18n, setGlobalLang } from './i18n/i18n';
import { MobileOAuth2Helper } from './blogger-oauth2-client';
import { EnumPostStatus } from './types/const';
import { findDefaultProfile, handleSettingsUpgrade } from './plugin/settings';
import { createObsidianContextMain } from './utils/obsidian/obsidian-context-main';

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

    this.addSettingTab(new BloggerSettingTab(this.ctx, this.settings, this.saveSettings));
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
