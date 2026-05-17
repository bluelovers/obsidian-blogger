import {
	IBloggerClient,
	IBloggerClientResult,
	IBloggerPostParams,
	IBloggerPublishResult,
} from '../../types/blogger-client-interface';
import { IObsidianContext } from '../../utils/obsidian/obsidian-context';
import { IPluginSettings } from '../../plugin-settings';
import { IBloggerProfile } from '../../blogger-profile';
import { IMatterData } from '../../types';
import { getGlobalI18n } from '../../i18n/i18n';
import { EnumBloggerClientReturnCode, EnumConfirmCode } from '../../types/const';
import { getGlobalMarkdownParser } from '../../markdown-it-default';
import { _frontMatterToBloggerPostParams, _updateFrontMatterTagsByPostStatus } from '../../data/tags-utils';
import { isFunction } from 'lodash-es';
import { processFile } from '../../utils';

/**
 * 抽象 Blogger 客戶端類別
 * Abstract Blogger client class
 *
 * 提供共用的發布流程與前置檢查，子類別必須實作具體的 `publish` 方法。
 * Provides common publish workflow and pre-checks, subclass must implement `publish` method.
 */
export abstract class AbstractBloggerClient implements IBloggerClient
{
	/**
	 * Client name.
	 */
	name = 'AbstractBloggerClient';

	/**
	 * 建立抽象 Blogger 客戶端實例
	 * Create abstract Blogger client instance
	 *
	 * @param ctx - Obsidian 上下文環境 / Obsidian context
	 * @param settings - 外掛設定 / Plugin settings
	 * @param profile - Blogger 設定檔 / Blogger profile
	 */
	protected constructor(
		protected readonly ctx: IObsidianContext,
		protected readonly settings: IPluginSettings,
		protected readonly profile: IBloggerProfile,
	)
	{}

	abstract publish(
		title: string | undefined,
		content: string | undefined,
		postParams: Partial<IBloggerPostParams>,
	): Promise<IBloggerClientResult<IBloggerPublishResult>>;

	/**
	 * 檢查既有的設定檔名稱是否與當前一致
	 * Check if existing profile name matches current one
	 *
	 * 若不相符，將詢問使用者是否要覆蓋為當前的設定檔。
	 * If not matching, it will prompt the user whether to overwrite with the current profile.
	 *
	 * @param matterData - 筆記的 Frontmatter 資料 / Frontmatter data of the note
	 */
	protected async checkExistingProfile(matterData: IMatterData)
	{
		const { profileName } = matterData;
		/**
		 * 判斷筆記記錄的設定檔是否與當前選取的設定檔不符
		 * Check if the profile recorded in the note mismatches the currently selected profile
		 */
		const isProfileNameMismatch = profileName && profileName !== this.profile.name;
		if (isProfileNameMismatch)
		{
			const confirm = await this.ctx.openConfirmModal(
				{
					message: getGlobalI18n().t('error_profileNotMatch'),
					cancelText: getGlobalI18n().t('profileNotMatch_useOld', {
						profileName: matterData.profileName!,
					}),
					confirmText: getGlobalI18n().t('profileNotMatch_useNew', {
						profileName: this.profile.name,
					}),
				},
				this.ctx.app,
			);
			if (confirm.code !== EnumConfirmCode.Cancel)
			{
				/**
				 * 若使用者選擇覆蓋設定檔，則清除舊的 postId，以便重新建立文章
				 * If user chooses to overwrite profile, clear the old postId to create a new post
				 */
				delete matterData.postId;
			}
		}
	}

	/**
	 * 內部方法：嘗試發布文章
	 * Internal method: Try to publish post
	 *
	 * @param params - 嘗試發布時的參數 / Parameters when trying to publish
	 * @param params.postParams - 發布文章所需的參數 / Post parameters
	 * @param params.updateMatterData - 更新 Frontmatter 資料的函式（可選）/ Function to update Frontmatter data (optional)
	 * @returns 發布結果 Promise / Promise of publish result
	 */
	protected async tryToPublish(params: {
		postParams: Partial<IBloggerPostParams>;
		updateMatterData?: (matter: Partial<IMatterData>) => void;
	}): Promise<IBloggerClientResult<IBloggerPublishResult>>
	{
		const { postParams, updateMatterData } = params;
		const result = await this.publish(
			postParams.title ?? 'A post from Obsidian!',
			// FIXME: this modification should be done on the renderer side
			`<div class="obsidian-blogger-post">
      ${getGlobalMarkdownParser().render(postParams.content!)}
      </div>`,
			postParams as IBloggerPostParams,
		);
		/**
		 * 檢查發布 API 回傳結果是否為錯誤
		 * Check if the publish API response is an error
		 */
		if (result.code === EnumBloggerClientReturnCode.Error)
		{
			throw new Error(
				getGlobalI18n().t('error_publishFailed', {
					message: result.message,
				}),
			);
		}
		else
		{
			/**
			 * 若發布成功，顯示成功通知並處理後續的檔案更新與開啟頁面邏輯
			 * If publish succeeds, show notice and handle subsequent file update and page opening logic
			 */
			this.ctx.showNotice(getGlobalI18n().t('message_publishSuccessfully'));
			// post id will be returned if creating, true if editing
			const postId = result.data.postId;
			/**
			 * 若有回傳 postId，代表發布或更新成功，準備更新 Frontmatter
			 * If postId is returned, it means publish or update succeeded, prepare to update Frontmatter
			 */
			if (postId)
			{
				// const modified = matter.stringify(postParams.content, matterData, matterOptions);
				// this.updateFrontMatter(modified);
				const file = this.ctx.app.workspace.getActiveFile();
				/**
				 * 若取得當前活躍檔案，則更新其 Frontmatter
				 * If active file is retrieved, update its Frontmatter
				 */
				if (file)
				{
					await this.ctx.app.fileManager.processFrontMatter(file, (fm: IMatterData) =>
					{
						fm.profileName = this.profile.name;
						fm.postId = postId;

						fm.tags = _updateFrontMatterTagsByPostStatus(fm, result.data.status);

						/**
						 * 執行外部傳入的自訂 Frontmatter 更新邏輯
						 * Execute custom Frontmatter update logic passed from outside
						 */
						if (isFunction(updateMatterData))
						{
							updateMatterData(fm);
						}
					});
				}

				/**
				 * 根據設定決定是否在發布後使用瀏覽器開啟文章網址
				 * Decide whether to open the post URL with browser after publishing based on settings
				 */
				if (this.settings.openPublishedPageWithBrowser)
				{
					this.ctx.openWithBrowser?.(result.data.url);
				}
			}
		}
		return result;
	}

	/**
	 * 執行發布文章的主要流程
	 * Execute the main workflow to publish post
	 *
	 * 包含前置檢查、顯示對話框（若無預設參數）、並呼叫內部發布方法。
	 * Includes pre-checks, showing modal (if no default params), and calling internal publish method.
	 *
	 * @param defaultPostParams - 預設的發布參數（可選）/ Default publish parameters (optional)
	 * @returns 最終的發布結果 / Final publish result
	 */
	async publishPost(
		defaultPostParams?: IBloggerPostParams,
	): Promise<IBloggerClientResult<IBloggerPublishResult>>
	{
		try
		{
			/**
			 * 驗證設定檔是否包含有效的端點 URL
			 * Verify if profile contains a valid endpoint URL
			 */
			if (!this.profile.endpoint || this.profile.endpoint.length === 0)
			{
				throw new Error(getGlobalI18n().t('error_noEndpoint'));
			}
			// const { activeEditor } = this.plugin.app.workspace;
			const file = this.ctx.app.workspace.getActiveFile();
			/**
			 * 確保當前有開啟的 Markdown 檔案可供處理
			 * Ensure there is an active Markdown file to process
			 */
			if (file === null)
			{
				throw new Error(getGlobalI18n().t('error_noActiveFile'));
			}

			// read note title, content and matter data
			const title = file.basename;
			const { content, matter: matterData } = await processFile(file, this.ctx.app);

			// check if profile selected is matched to the one in note property,
			// if not, ask whether to update or not
			await this.checkExistingProfile(matterData);

			// now we're preparing the publishing data
			let postParams: IBloggerPostParams;
			let result: IBloggerClientResult<IBloggerPublishResult> | undefined;
			/**
			 * 若有提供預設參數（通常來自背景靜默更新等），則直接跳過對話框進行發布
			 * If default params are provided (usually from background silent updates), skip modal and publish directly
			 */
			if (defaultPostParams)
			{
				postParams = this.readFromFrontMatter(title, matterData, defaultPostParams);
				postParams.content = content;
				result = await this.tryToPublish({
					postParams,
				});
			}
			else
			{
				/**
				 * 否則，開啟發布對話框，由使用者確認並填寫發布參數
				 * Otherwise, open publish modal for user to confirm and fill in publish parameters
				 */
				const hasPostId = !!matterData.postId;
				result = await this.ctx.openPublishModal({
					ctx: this.ctx,
					settings: this.settings,
					hasPostId,
					onSubmit: async (
						postParams,
						updateMatterData: (matter: IMatterData) => void,
						publishModal,
						resolve,
					) =>
					{
						postParams = this.readFromFrontMatter(title, matterData, postParams);
						postParams.content = content;
						try
						{
							/**
							 * Status-only 路徑：僅 PATCH status 欄位
							 *
							 * 判斷是否為僅更新文章狀態的操作
							 * Check if the operation is only to update post status
							 */
							if (postParams.updateStatusOnly)
							{
								const r = await this.publish(void 0, void 0, postParams);
								/**
								 * 檢查狀態更新 API 是否發生錯誤
								 * Check if status update API encountered an error
								 */
								if (r.code === EnumBloggerClientReturnCode.Error)
								{
									throw new Error(r.message);
								}
								const file = this.ctx.app.workspace.getActiveFile();
								/**
								 * 取得當前檔案並更新其中的標籤狀態
								 * Get current file and update its tag status
								 */
								if (file)
								{
									await this.ctx.app.fileManager.processFrontMatter(file, (fm: IMatterData) =>
									{
										fm.tags = _updateFrontMatterTagsByPostStatus(fm, r.data!.status);
									});
								}
								this.ctx.showNotice(getGlobalI18n().t('message_postStatusUpdated'));
								publishModal.close();
								resolve!(r);
								return;
							}
							/** 正常發布/更新路徑 */
							const r = await this.tryToPublish({
								postParams,
								updateMatterData,
							});
							/**
							 * 若正常發布成功，關閉對話框並解決 Promise
							 * If publish succeeds, close modal and resolve Promise
							 */
							if (r.code === EnumBloggerClientReturnCode.OK)
							{
								publishModal.close();
								resolve!(r);
							}
						}
						catch (error)
						{
							/**
							 * 處理發布過程中的例外情況，若為 Error 實例則顯示錯誤通知
							 * Handle exceptions during publishing, if it's an Error instance, show error notice
							 */
							if (error instanceof Error)
							{
								return this.ctx.showError(error);
							}
							else
							{
								throw error;
							}
						}
					},
					matterData,
				});
			}
			/**
			 * 確保最終有回傳結果，否則拋出未知發布失敗錯誤
			 * Ensure there is a final result returned, otherwise throw unknown publish failed error
			 */
			if (result)
			{
				return result;
			}
			else
			{
				throw new Error(getGlobalI18n().t('message_publishFailed'));
			}
		}
		catch (error)
		{
			/**
			 * 捕獲全域流程例外，轉換為 Obsidian 錯誤通知
			 * Catch global workflow exceptions and convert to Obsidian error notices
			 */
			if (error instanceof Error)
			{
				return this.ctx.showError(error);
			}
			else
			{
				throw error;
			}
		}
	}

	/**
	 * 從 Frontmatter 中讀取並合併發布參數
	 * Read and merge publish parameters from Frontmatter
	 *
	 * @param noteTitle - 筆記標題 / Note title
	 * @param matterData - 筆記的 Frontmatter 資料 / Frontmatter data of the note
	 * @param params - 既有的發布參數 / Existing publish parameters
	 * @returns 處理過後的最終發布參數 / Processed final publish parameters
	 */
	protected readFromFrontMatter(
		noteTitle: string,
		matterData: IMatterData,
		params: Partial<IBloggerPostParams>,
	): IBloggerPostParams
	{
		const postParams = { ...params };
		postParams.title = noteTitle;
		return _frontMatterToBloggerPostParams(matterData, postParams);
	}
}
