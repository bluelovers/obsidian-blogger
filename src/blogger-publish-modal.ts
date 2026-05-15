import { App, Modal, Setting } from 'obsidian';
import { BloggerPostParams } from './blogger-client-interface';
import { TranslateKey, getGlobalI18n } from './i18n';
import { MatterData } from './types';
import { PluginSettings } from './plugin-settings';
import { EnumPostStatus } from './types/const';

/**
 * Blogger publish modal.
 */
export class BloggerPublishModal extends Modal {
  constructor(
    readonly app: App,
    private readonly settings: PluginSettings,
    private readonly onSubmit: (
      params: BloggerPostParams,
      updateMatterData: (matter: MatterData) => void,
    ) => void,
  ) {
    super(app);
  }

  onOpen() {
    const params: BloggerPostParams = {
      status: this.settings.defaultPostStatus,
      labels: [],
      title: '',
      content: '',
    };

    this.display(params);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private display(params: BloggerPostParams): void {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const { contentEl } = this;

    contentEl.empty();
    contentEl.createEl('h1', { text: t('publishModal_title') });

    new Setting(contentEl)
      .setName(t('publishModal_postStatus'))
      .setDesc(t('publishModal_postStatusDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(EnumPostStatus.Draft, t('publishModal_postStatusDraft'))
          .addOption(EnumPostStatus.Live, t('publishModal_postStatusLive'))
          .setValue(this.settings.defaultPostStatus)
          .onChange((value) => {
            params.status = value as EnumPostStatus;
          });
      });

    new Setting(contentEl).addButton((button) =>
      button
        .setButtonText(t('publishModal_publishButtonText'))
        .setCta()
        .onClick(() => {
          this.onSubmit(params, (fm) => {});
        }),
    );
  }
}
