import {
	IBloggerClientResult,
	IBloggerPostParams,
	IBloggerPublishResult,
	IBloggerPublishResultError,
} from '../../types/blogger-client-interface';
import { IBloggerPostApiReturn, RestClient } from './rest-client';
import { IBloggerRestClientContext } from './types';
import { getUrl } from './utils/url';
import { getGlobalI18n } from '../../i18n/i18n';
import { _hasError } from '../../utils/type-utils';
import { EnumBloggerClientReturnCode, EnumPostStatus } from '../../types/const';
import { _handleTagsForBloggerPostApi } from '../../data/tags-utils';
import { IHttpHeaders } from '../../types/http';
import { IBloggerProfile } from '../../blogger-profile';

/**
 * Blogger 核心 API 客戶端
 * Blogger core API client
 *
 * 純粹負責處理與 Blogger API 的通訊邏輯，不依賴任何 Obsidian 環境或 UI 狀態。
 * Purely handles communication logic with Blogger API, independent of any Obsidian environment or UI state.
 */
export class BloggerCoreApiClient
{
	/**
	 * 建立 Blogger 核心 API 客戶端實例
	 * Create Blogger core API client instance
	 *
	 * @param client - REST 客戶端 / REST client
	 * @param context - REST 客戶端上下文環境 / REST client context
	 * @param blogId - Blog 識別碼 / Blog ID
	 * @param getHeaders - 取得授權標頭的函式 / Function to get authorization headers
	 */
	constructor(
		public readonly client: RestClient,
		public readonly context: IBloggerRestClientContext,
		public readonly blogId: IBloggerProfile["blogId"],
		public readonly getHeaders: () => Promise<IHttpHeaders>,
	)
	{}

	/**
	 * 處理發布/更新的 API 回應
	 * Handle API response for publish/update
	 *
	 * @param resp - API 回應物件 / API response object
	 * @param parserParams - 傳遞給解析器的參數 / Parameters passed to parser
	 * @param checkPostExist - 是否檢查文章存在 (404) / Whether to check post existence (404)
	 * @returns 包含發布結果的 Promise / Promise containing publish result
	 */
	protected _handlePublishResponse<R extends IBloggerPublishResultError | IBloggerPublishResult | IBloggerPostApiReturn>(
		resp: R,
		parserParams: Partial<IBloggerPostParams>,
		checkPostExist: boolean,
	): IBloggerClientResult<IBloggerPublishResult, R>
	{
		/**
		 * 判斷請求是否發生錯誤
		 * Check if request encountered an error
		 */
		if (_hasError(resp))
		{
			const error = resp.error;
			let message = getGlobalI18n().t('error_requestFailed', {
				code: error.code,
				message: error.message,
			});
			/**
			 * 針對更新操作時的 404 錯誤，給予明確的「文章不存在」提示
			 * Provide an explicit "post not exist" hint for 404 error during update operation
			 */
			if (checkPostExist && error.code === 404)
			{
				message = `${message} ${getGlobalI18n().t('error_postNotExistRemotely')}`;
			}
			return {
				code: EnumBloggerClientReturnCode.Error,
				message,
				response: resp,
			};
		}
		/**
		 * 嘗試解析 API 回應，若成功則回傳處理結果
		 * Attempt to parse API response, return processed result if successful
		 */
		try
		{
			const result = this.context.responseParser.toBloggerPublishResult(parserParams, resp);
			return {
				code: EnumBloggerClientReturnCode.OK,
				data: result,
				response: resp,
			};
		}
		/**
		 * 捕獲解析回應時的例外，轉為解析失敗錯誤
		 * Catch exceptions during response parsing, convert to parse failed error
		 */
		catch (e)
		{
			return {
				code: EnumBloggerClientReturnCode.Error,
				message: getGlobalI18n().t('error_cannotParseResponse'),
				response: resp,
			};
		}
	}

	/**
	 * 發布或更新文章到 Blogger
	 * Publish or update post to Blogger
	 *
	 * 處理三種路徑：僅更新狀態、更新現有文章 (PUT) 及建立新文章 (POST)。
	 * Handles three paths: update status only, update existing post (PUT), and create new post (POST).
	 *
	 * @param title - 文章標題 / Post title
	 * @param content - 文章內容 / Post content
	 * @param postParams - 發布參數 / Publish parameters
	 * @returns 包含發布結果的 Promise / Promise containing publish result
	 */
	async publish(
		title: string | undefined,
		content: string | undefined,
		postParams: Partial<IBloggerPostParams>,
	): Promise<IBloggerClientResult<IBloggerPublishResult>>
	{
		/** ========== Status-only PATCH 路徑 ========== */
		/**
		 * 判斷是否執行僅更新狀態（Status-only）的操作路徑
		 * Check if executing the Status-only operation path
		 */
		if (postParams.updateStatusOnly)
		{
			if (!postParams.postId)
			{
				return {
					code: EnumBloggerClientReturnCode.Error,
					message: getGlobalI18n().t('error_noPostId'),
					response: undefined,
				};
			}
			return this.updatePostStatusOnly(postParams.postId, postParams.status!);
		}

		/** ========== 正常發布/更新路徑（PUT / POST）========== */
		let url: string;
		let method: typeof this.client.httpPut;
		const isDraft = postParams.status === EnumPostStatus.Draft;
		/**
		 * 若參數中已有 postId，代表是更新現有文章（PUT 請求）
		 * If postId exists in params, it means updating an existing post (PUT request)
		 */
		if (postParams.postId)
		{
			url = getUrl(this.context.endpoints?.editPost, {
				postId: postParams.postId,
				isDraft,
			});
			method = this.client.httpPut.bind(this.client);
		}
		/**
		 * 若參數中無 postId，代表是建立新文章（POST 請求）
		 * If postId does not exist in params, it means creating a new post (POST request)
		 */
		else
		{
			url = getUrl(this.context.endpoints?.newPost, {
				isDraft,
			});
			method = this.client.httpPost.bind(this.client);
		}
		const resp = await method(
			url,
			{
				kind: 'blogger#post',
				blog: {
					id: this.blogId,
				},
				title: title!,
				content: content!,
				labels: _handleTagsForBloggerPostApi(postParams.tags),
				status: postParams.status!,
			},
			{
				headers: await this.getHeaders(),
			},
		);

		return this._handlePublishResponse(resp, postParams, !!postParams.postId);
	}

	/**
	 * 取得指定文章
	 * Get specific post
	 *
	 * ⚠️ 若文章為 DRAFT，需傳入 view='AUTHOR' 否則會回傳 404。
	 * ⚠️ If the post is DRAFT, view='AUTHOR' must be passed, otherwise it returns 404.
	 *
	 * @param postId - 文章 ID / Post ID
	 * @param view - 檢視模式 / View mode
	 * @returns 包含文章資訊的 Promise / Promise containing post information
	 */
	async getPost(postId: IBloggerProfile["blogId"], view: string = 'AUTHOR'): Promise<IBloggerClientResult<IBloggerPublishResult>>
	{
		const url = getUrl(this.context.endpoints?.getPost, {
			postId,
			view,
		});
		const resp = await this.client.httpGet(url, { headers: await this.getHeaders() });
		return this._handlePublishResponse(resp, { postId }, true);
	}

	/**
	 * 發布草稿文章 (狀態切換至 LIVE)
	 * Publish a draft post (toggle status to LIVE)
	 *
	 * 呼叫 Blogger API 原生的 publish 端點。
	 * Calls Blogger API native publish endpoint.
	 *
	 * @param postId - 文章 ID / Post ID
	 * @returns 包含發布結果的 Promise / Promise containing publish result
	 */
	async publishPostAction(postId: IBloggerProfile["blogId"]): Promise<IBloggerClientResult<IBloggerPublishResult>>
	{
		const url = getUrl(this.context.endpoints?.publishPost, {
			postId,
		});
		const resp = await this.client.httpPublish(url, { headers: await this.getHeaders() });
		return this._handlePublishResponse(resp, { postId }, true);
	}

	/**
	 * 復原公開文章為草稿 (狀態切換至 DRAFT)
	 * Revert a live post to draft (toggle status to DRAFT)
	 *
	 * 呼叫 Blogger API 原生的 revert 端點。
	 * Calls Blogger API native revert endpoint.
	 *
	 * @param postId - 文章 ID / Post ID
	 * @returns 包含發布結果的 Promise / Promise containing publish result
	 */
	async revertPostAction(postId: IBloggerProfile["blogId"]): Promise<IBloggerClientResult<IBloggerPublishResult>>
	{
		const url = getUrl(this.context.endpoints?.revertPost, {
			postId,
		});
		const resp = await this.client.httpRevert(url, { headers: await this.getHeaders() });
		return this._handlePublishResponse(resp, { postId }, true);
	}

	/**
	 * 自動處理文章狀態切換
	 * Automatically handle post status toggle
	 *
	 * 根據目標狀態（Draft 或 Live），自動判斷目前的文章狀態並呼叫對應的 publish / revert 端點。
	 * Automatically detects current status and calls the corresponding publish/revert endpoint based on target status.
	 *
	 * @param postId - 文章 ID / Post ID
	 * @param targetStatus - 目標文章狀態 / Target post status
	 * @returns 包含發布結果的 Promise / Promise containing publish result
	 */
	async updatePostStatusOnly(postId: IBloggerProfile["blogId"], targetStatus: EnumPostStatus): Promise<IBloggerClientResult<IBloggerPublishResult>>
	{
		const getResp = await this.getPost(postId, 'AUTHOR');
		if (getResp.code !== EnumBloggerClientReturnCode.OK)
		{
			return getResp; // 返回獲取失敗錯誤 / Return fetch error
		}

		// 判斷目前狀態 / Determine current status
		const currentStatus = getResp.data?.status ?? EnumPostStatus.Live;

		if (currentStatus === targetStatus)
		{
			// 狀態已一致，直接返回成功 / Status matches, return OK directly
			return getResp;
		}

		if (targetStatus === EnumPostStatus.Live)
		{
			return this.publishPostAction(postId);
		}
		else
		{
			return this.revertPostAction(postId);
		}
	}
}
