import { PluginSettingTab, Setting } from 'obsidian';
import { getGlobalI18n } from '../../../i18n/i18n';
import { BloggerProfileManageModal } from '../modal/blogger-profile-manage-modal';
import { IPluginSettings } from '../../../plugin-settings';
import { getGlobalMarkdownParser, setupMarkdownParser } from '../../../utils/markdown/markdown-it-default';

import { EnumMathJaxOutputType, EnumPostStatus } from '../../../types/const';
import { ITranslateKey } from '../../../i18n/langs';
import type { IObsidianContext } from '../../../utils/obsidian/obsidian-context';

export class BloggerSettingTab extends PluginSettingTab {
  constructor(
    protected readonly ctx: IObsidianContext,
    protected readonly settings: IPluginSettings,
    protected readonly saveSettings: () => Promise<void>,
  ) {
    super(ctx.app, ctx.plugin);
  }

  display(): void {
    const t = (key: ITranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const getMathJaxOutputTypeDesc = (type: EnumMathJaxOutputType): string => {
      switch (type) {
        case EnumMathJaxOutputType.TeX:
          return t('settings_MathJaxOutputTypeTeXDesc');
        case EnumMathJaxOutputType.SVG:
          return t('settings_MathJaxOutputTypeSVGDesc');
        default:
          return '';
      }
    };

    const { containerEl } = this;

    containerEl.empty();

    let mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.settings.mathJaxOutputType);

    new Setting(containerEl)
      .setName(t('settings_clientId'))
      .setDesc(t('settings_clientIdDesc'))
      .addText((text) =>
        text.setValue(this.settings.clientId ?? '').onChange(async (value) => {
          if (this.settings.clientId !== value) {
            this.settings.clientId = value;
            await this.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_clientSecret'))
      .setDesc(t('settings_clientSecretDesc'))
      .addText((text) =>
        text.setValue(this.settings.clientSecret ?? '').onChange(async (value) => {
          if (this.settings.clientSecret !== value) {
            this.settings.clientSecret = value;
            await this.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_profiles'))
      .setDesc(t('settings_profilesDesc'))
      .addButton((button) =>
        button.setButtonText(t('settings_profilesModal')).onClick(() => {
          new BloggerProfileManageModal(this.ctx, this.settings, this.saveSettings).open();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_defaultPostStatus'))
      .setDesc(t('settings_defaultPostStatusDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(EnumPostStatus.Draft, t('settings_defaultPostStatusDraft'))
          .addOption(EnumPostStatus.Live, t('settings_defaultPostStatusLive'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.settings.defaultPostStatus)
          .onChange(async (value) => {
            this.settings.defaultPostStatus = value as EnumPostStatus;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t('settings_openPublishedPageWithBrowser'))
      .setDesc(t('settings_openPublishedPageWithBrowserDesc'))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.openPublishedPageWithBrowser).onChange(async (value) => {
          this.settings.openPublishedPageWithBrowser = value;
          await this.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_mathJaxOutputType'))
      .setDesc(t('settings_mathJaxOutputTypeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(EnumMathJaxOutputType.TeX, t('settings_mathJaxOutputTypeTeX'))
          .addOption(EnumMathJaxOutputType.SVG, t('settings_mathJaxOutputTypeSVG'))
          .setValue(this.settings.mathJaxOutputType)
          .onChange(async (value) => {
            this.settings.mathJaxOutputType = value as EnumMathJaxOutputType;
            mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.settings.mathJaxOutputType);
            await this.saveSettings();
            this.display();

            setupMarkdownParser(getGlobalMarkdownParser(), this.settings);
          });
      });
    containerEl.createEl('p', {
      text: mathJaxOutputTypeDesc,
      cls: 'setting-item-description',
    });

    new Setting(containerEl)
      .setName(t('settings_enableSmartPreCheck'))
      .setDesc(t('settings_enableSmartPreCheckDesc'))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.enableSmartPreCheck).onChange(async (value) => {
          this.settings.enableSmartPreCheck = value;
          await this.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_enableHtml'))
      .setDesc(t('settings_enableHtmlDesc'))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.enableHtml).onChange(async (value) => {
          this.settings.enableHtml = value;
          await this.saveSettings();

          getGlobalMarkdownParser().set({
            html: this.settings.enableHtml,
          });
        }),
      );
  }
}
