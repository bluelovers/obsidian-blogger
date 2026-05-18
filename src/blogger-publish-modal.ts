import { App, Modal, Setting } from 'obsidian';
import { IBloggerClientResult, IBloggerPostParams, IBloggerPublishResult } from './types/blogger-client-interface';
import { getGlobalI18n } from './i18n/i18n';
import { IMatterData } from './types';
import { IPluginSettings } from './plugin-settings';
import { EnumPostStatus } from './types/const';
import { ITranslateKey } from './i18n/langs';
import { _getPostStatusFromTags, _togglePostStatus } from './data/tags-utils';
import { IObsidianContext } from './utils/obsidian/obsidian-context';
import { BLOGGER_DEFAULT_PROFILE_NAME } from './consts';
import { IBloggerProfile } from './blogger-profile';

/**
 * 發布對話框提交回呼函式型別
 * Publish modal submit callback function type
 *
 * @template T - 預期的回傳結果型別 / Expected return result type
 * @param postParams - 發布參數 / Publish parameters
 * @param updateMatterData - 更新 Frontmatter 資料的函式 / Function to update Frontmatter data
 * @param publishModal - 發布對話框實例 / Publish modal instance
 * @param resolve - Promise 解析函式（可選）/ Promise resolve function (optional)
 * @param reject - Promise 拒絕函式（可選）/ Promise reject function (optional)
 */
export type IOnSubmit<T extends IBloggerClientResult<IBloggerPublishResult> = IBloggerClientResult<IBloggerPublishResult>> = (
	postParams: Partial<IBloggerPostParams>,
	updateMatterData: (matter: Partial<IMatterData>) => void,
  publishModal: BloggerPublishModal,
  resolve?: (value: T | PromiseLike<T>) => void,
  reject?: (reason?: any) => void,
) => void;

/**
 * Blogger 發布對話框類別
 * Blogger publish modal class
 */
export class BloggerPublishModal extends Modal {
  /**
   * 建立 Blogger 發布對話框實例
   * Create Blogger publish modal instance
   *
   * @param ctx - Obsidian 上下文環境 / Obsidian context
   * @param settings - 外掛設定 / Plugin settings
   * @param hasPostId - 筆記是否已有 postId（已發布過）/ Whether the note already has a postId
   * @param onSubmit - 提交時的回呼函式 / Callback function on submit
   * @param matterData - 筆記的 Frontmatter 資料 / Frontmatter data of the note
   */
  constructor(
    readonly ctx: IObsidianContext,
    protected readonly settings: IPluginSettings,
    /**
     * 筆記是否已有 postId（已發布過）
     * Whether the note already has a postId (previously published)
     */
		protected readonly hasPostId: boolean,
		protected readonly onSubmit: IOnSubmit,
		protected readonly matterData: IMatterData,
  ) {
    super(ctx.app);
  }

  /**
   * 當對話框開啟時的處理邏輯
   * Handling logic when modal is opened
   */
  onOpen() {
		const params: Partial<IBloggerPostParams> = {
			status: _getPostStatusFromTags(this.matterData.tags, this.settings.defaultPostStatus),
		// tags: [],
		// title: '',
		// content: '',
    };

    this.display(params);
  }

  /**
   * 當對話框關閉時的處理邏輯
   * Handling logic when modal is closed
   */
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

	/**
	 * 顯示對話框內容與 UI 元素
	 * Display modal content and UI elements
	 *
	 * @param params - 初始發布參數 / Initial publish parameters
	 */
	protected get profile(): IBloggerProfile | undefined
	{
		const profileName = this.matterData.profileName ?? BLOGGER_DEFAULT_PROFILE_NAME;
		return this.settings.profiles.find(p => p.name === profileName);
	}

	protected display(params: Partial<IBloggerPostParams>): void
	{
    const t = (key: ITranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };
    const profile = this.profile;

    const { contentEl } = this;

    contentEl.empty();
    contentEl.createEl('h1', { text: t('publishModal_title') });

    /** 顯示 Blog 資訊 / Display blog info */
    if (profile)
    {
      new Setting(contentEl)
        .setName('Blog')
        .setDesc(`${profile.name}（ID: ${profile.blogId}）`);
    }

    /** 顯示文章資訊 / Display post info */
    {
      const postTitle = this.matterData.title ?? '(untitled)';
      const postIdText = this.matterData.postId ?? '(new)';
      new Setting(contentEl)
        .setName('Post')
        .setDesc(`${postTitle}（ID: ${postIdText}）`);
    }

		const defaultPostStatus = _togglePostStatus(params.status, this.settings.defaultPostStatus)!;
		params.status = defaultPostStatus;

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
          this.onSubmit(params, (fm) => { }, this);
        }),
    );
  }
}
