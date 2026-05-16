import { App, Modal, Setting } from 'obsidian';
import { IBloggerPostParams } from './types/blogger-client-interface';
import { getGlobalI18n } from './i18n/i18n';
import { IMatterData } from './types';
import { IPluginSettings } from './plugin-settings';
import { EnumPostStatus } from './types/const';
import { ITranslateKey } from './i18n/langs';
import { _getPostStatusFromTags, _togglePostStatus } from './data/tags-utils';
import { IObsidianContext } from './utils/obsidian/obsidian-context';

export type IOnSubmit = (
	postParams: Partial<IBloggerPostParams>,
	updateMatterData: (matter: Partial<IMatterData>) => void,
) => void;

/**
 * Blogger publish modal.
 */
export class BloggerPublishModal extends Modal {
  constructor(
    readonly app: App,
    private readonly settings: IPluginSettings,
    /**
     * 筆記是否已有 postId（已發布過）
     * Whether the note already has a postId (previously published)
     */
		protected readonly hasPostId: boolean,
		protected readonly onSubmit: IOnSubmit,
		protected readonly matterData: IMatterData,
  ) {
    super(app);
  }

  onOpen() {
		const params: Partial<IBloggerPostParams> = {
			status: _getPostStatusFromTags(this.matterData.tags, this.settings.defaultPostStatus),
		// tags: [],
		// title: '',
		// content: '',
    };

    this.display(params);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

	protected display(params: Partial<IBloggerPostParams>): void
	{
    const t = (key: ITranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const { contentEl } = this;

    contentEl.empty();
    contentEl.createEl('h1', { text: t('publishModal_title') });

		const defaultPostStatus = _togglePostStatus(params.status, this.settings.defaultPostStatus)!;

    new Setting(contentEl)
      .setName(t('publishModal_postStatus'))
      .setDesc(t('publishModal_postStatusDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(EnumPostStatus.Draft, t('publishModal_postStatusDraft'))
          .addOption(EnumPostStatus.Live, t('publishModal_postStatusLive'))
					.setValue(defaultPostStatus)
          .onChange((value) => {
            params.status = value as EnumPostStatus;
          });
      });

    /** 僅當筆記已有 postId（已發布過）時顯示「僅更新狀態」選項 */
    if (this.hasPostId)
    {
      new Setting(contentEl)
        .setName(t('publishModal_updateStatusOnly'))
        .addToggle((toggle) =>
        {
          toggle
            .setValue(false)
            .onChange((value) =>
            {
              params.updateStatusOnly = value;
            });
        });
    }

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
