import { App, Modal, Setting, Notice } from 'obsidian';
import { IBloggerClientResult, IBloggerPostParams, IBloggerPublishResult } from '../../../types/blogger-client-interface';
import { getGlobalI18n } from '../../../i18n/i18n';
import { IMatterData } from '../../../types/types';
import { IPluginSettings } from '../../../plugin-settings';
import { EnumBloggerClientReturnCode, EnumPostStatus } from '../../../types/const';
import { ITranslateKey } from '../../../i18n/langs';
import { _getPostStatusFromTags, _togglePostStatus } from '../../../utils/tags-utils';
import { IObsidianContext } from '../../../utils/obsidian/obsidian-context';
import { BLOGGER_DEFAULT_PROFILE_NAME } from '../../../consts';
import { compareWithLocal } from '../../../utils/md-compare-utils';
import { stripFrontMatter } from '../../../utils/obsidian/obsidian-utils';

import { IBloggerProfile } from '../../../types/blogger-profile';

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
 * 同步回呼函式型別
 * Sync callback function type
 *
 * @param postId - 文章 ID / Post ID
 * @returns Promise 包含發布結果（response 中含原始 API 資料）/ Promise containing publish result (response has raw API data)
 */
export type IOnSync = (
	postId: `${number}`,
) => Promise<IBloggerClientResult<IBloggerPublishResult>>;

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
   * @param onSync - 同步時的回呼函式（可選）/ Callback function on sync (optional)
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
		/**
		 * 同步回呼（可選）/ Sync callback (optional)
		 */
		protected readonly onSync?: IOnSync,
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

	/**
	 * 取得當前啟用檔案在 Vault 中的相對路徑
	 * Get the Vault relative path of the current active file
	 *
	 * @returns 檔案路徑或 undefined / File path or undefined
	 */
	protected get filePath(): string | undefined
	{
		const activeFile = this.ctx.getActiveFile();
		if (activeFile)
		{
			return activeFile.path;
		}
		return undefined;
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

    /** 顯示當前檔案路徑 / Display current file path */
    {
      const path = this.filePath;
      if (path)
      {
        const filePathEl = contentEl.createEl('div', {
          cls: 'setting-item-description',
          text: `📄 ${path}`,
        });
        filePathEl.style.padding = '0 0 12px 0';
        filePathEl.style.fontSize = 'var(--font-small)';
        filePathEl.style.color = 'var(--text-muted)';
      }
    }

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

    /** 僅當筆記已有 postId（已發布過）時顯示進階選項 */
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

      {
        const smartCheckSetting = new Setting(contentEl)
          .setName(t('settings_enableSmartPreCheck'))
          .setDesc(t('settings_enableSmartPreCheckDesc'))
          .addToggle((toggle) =>
          {
            toggle
              .setValue(this.settings.enableSmartPreCheck)
              .onChange(async (value) =>
              {
                this.settings.enableSmartPreCheck = value;
                await this.ctx.plugin.saveSettings();
              });
          });
        smartCheckSetting.descEl.style.maxWidth = '500px';
        smartCheckSetting.descEl.style.wordBreak = 'break-word';
      }
    }

    /** ===== 同步按鈕 — 已發布可同步，未發布禁用 ===== */
    /** Sync button — enabled when published, disabled when not */
    {
      const syncSetting = new Setting(contentEl);

      if (this.hasPostId && this.onSync)
      {
        syncSetting
          .setName(t('publishModal_syncButton'))
          .setDesc(t('publishModal_syncButtonTooltip'))
          .addButton((button) =>
          {
            button
              .setButtonText(t('publishModal_syncButton'))
              .onClick(async () =>
              {
                await this._handleSync();
              });
          });
      }
      else
      {
        syncSetting
          .setName(t('publishModal_syncButton'))
          .setDesc(t('publishModal_syncNoPostId'))
          .addButton((button) =>
          {
            button
              .setButtonText(t('publishModal_syncButton'))
              .setDisabled(true);
          });
      }
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

  /**
   * 處理同步邏輯
   * Handle sync logic
   *
   * 從遠端取得文章資料，更新本地 Frontmatter，並比較內容差異。
   * Fetches post data from remote, updates local Frontmatter, and compares content differences.
   */
  protected async _handleSync(): Promise<void>
  {
    const t = (key: ITranslateKey, vars?: Record<string, string>): string =>
    {
      return getGlobalI18n().t(key, vars);
    };

    /** 確保有 postId 和 onSync 回呼 */
    if (!this.matterData.postId || !this.onSync)
    {
      return;
    }

    try
    {
      /** 1. 呼叫 API 取得遠端文章資料 */
      const result = await this.onSync(this.matterData.postId);

      if (result.code !== EnumBloggerClientReturnCode.OK)
      {
        new Notice(t('message_syncFailed', { message: result.message ?? 'Unknown error' }));
        return;
      }

      /**
       * 2. 從 raw response 中提取資料
       * 2. Extract data from raw response
       *
       * result.response 包含 IBloggerPostApiReturn 的完整資料（title, content, status 等）
       * result.response contains full IBloggerPostApiReturn data (title, content, status, etc.)
       */
      const rawResponse = result.response as Record<string, any> | undefined;
      const remoteTitle: string = rawResponse?.title ?? '';
      const remoteContent: string = rawResponse?.content ?? '';
      const remoteStatus: string = rawResponse?.status ?? '';
      const remotePublished: string = rawResponse?.published ?? '';
      const remoteUpdated: string = rawResponse?.updated ?? '';

      /** 3. 建立 file context 並更新 Frontmatter */
      /** 3. Create file context and update Frontmatter */
      const fileCtx = this.ctx.createFileContext();
      if (fileCtx)
      {
        await fileCtx.frontmatter.blogger.updatePublishSuccess({
          profileName: this.matterData.profileName ?? BLOGGER_DEFAULT_PROFILE_NAME,
          postId: this.matterData.postId,
          url: result.data.url,
          status: result.data.status,
          published: remotePublished,
          updated: remoteUpdated,
          thumbnail: result.data.images?.[0]?.url,
          customTitle: remoteTitle,
        });

        /**
         * 若遠端狀態與本地不同，同步更新狀態標籤
         * If remote status differs from local, sync status tags
         */
        if (remoteStatus && remoteStatus !== _getPostStatusFromTags(this.matterData.tags))
        {
          const statusEnum = remoteStatus === 'LIVE' ? EnumPostStatus.Live : EnumPostStatus.Draft;
          await fileCtx.frontmatter.blogger.updateStatusTags(statusEnum);
        }

        new Notice(t('message_syncSuccess'));
      }

      /** 4. 讀取本地檔案內容（去除 Frontmatter）進行 MD 比較 */
      /** 4. Read local file content (strip Frontmatter) for MD comparison */
      const activeFile = this.ctx.getActiveFile();
      if (activeFile && remoteContent)
      {
        const rawContent = await this.ctx.app.vault.read(activeFile);
        const localMd = stripFrontMatter(rawContent);

        const compareResult = compareWithLocal(remoteContent, localMd);

        if (compareResult.isEqual)
        {
          new Notice(t('message_syncContentIdentical'));
        }
        else
        {
          /**
           * 5. 內容不同時，在對話框中顯示 diff 結果
           * 5. Show diff result in modal when content differs
           */
          this._showDiffResult(compareResult.diffHtml ?? '');
        }
      }
    }
    catch (error)
    {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(t('message_syncFailed', { message }));
    }
  }

  /**
   * 在對話框中顯示內容差異
   * Show content diff in the modal
   *
   * @param diffHtml - HTML 格式的差異內容 / Diff content in HTML format
   */
  protected _showDiffResult(diffHtml: string): void
  {
    const t = (key: ITranslateKey, vars?: Record<string, string>): string =>
    {
      return getGlobalI18n().t(key, vars);
    };

    const { contentEl } = this;

    /** 建立 diff 區塊容器 */
    const diffContainer = contentEl.createEl('div', {
      cls: 'blogger-diff-container',
    });
    diffContainer.style.marginTop = '16px';
    diffContainer.style.padding = '12px';
    diffContainer.style.border = '1px solid var(--background-modifier-border)';
    diffContainer.style.borderRadius = '6px';
    diffContainer.style.backgroundColor = 'var(--background-primary)';
    diffContainer.style.maxHeight = '400px';
    diffContainer.style.overflowY = 'auto';
    diffContainer.style.whiteSpace = 'pre-wrap';
    diffContainer.style.fontFamily = 'var(--font-monospace)';
    diffContainer.style.fontSize = 'var(--font-small)';

    /** 標題 */
    diffContainer.createEl('div', {
      cls: 'blogger-diff-title',
      text: t('message_syncContentDifferent'),
    }).style.cssText = 'font-weight: 600; margin-bottom: 8px; color: var(--text-warning);';

    /** 差異內容 */
    const diffBody = diffContainer.createEl('div', {
      cls: 'blogger-diff-body',
    });
    diffBody.innerHTML = diffHtml;

    /** 提醒：此為唯讀比對，不更新內容 */
    diffContainer.createEl('div', {
      cls: 'blogger-diff-note',
      text: '⚠️ Read-only comparison — content will not be updated.',
    }).style.cssText = 'margin-top: 8px; font-size: var(--font-smallest); color: var(--text-muted); font-style: italic;';
  }
}
