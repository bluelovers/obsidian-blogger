import {
	IBloggerClient,
	IBloggerClientResult,
	IBloggerPostParams,
	IBloggerPublishResult,
} from './types/blogger-client-interface';
import { RestClient } from './client/blogger/rest-client';
import { IBloggerProfile } from './blogger-profile';
import { getGoogleOAuth2Client } from './client/blogger/oauth2-client';
import { getGlobalI18n } from './i18n/i18n';
import { IPluginSettings, isPluginSettingsWithOAuth2 } from './plugin-settings';
import { _hasError } from './utils/type-utils';
import { EnumBloggerClientReturnCode, EnumPostStatus } from './types/const';
import { _handleTagsForBloggerPostApi } from './data/tags-utils';
import { IObsidianContext } from './utils/obsidian/obsidian-context';
import { getUrl } from './client/blogger/utils/url';
import { BloggerRestClientGoogleOAuth2Context } from './client/blogger/blogger-rest-client-google-o-auth2-context';
import { IBloggerRestClientContext } from './client/blogger/types';
import { AbstractBloggerClient } from './client/blogger/abstract-blogger-client';

/**
 * Blogger REST 客戶端類別
 * Blogger REST client class
 *
 * 實作與 Blogger API 互動的 REST 客戶端。
 * Implements REST client for interacting with Blogger API.
 */
export class BloggerRestClient extends AbstractBloggerClient
{
	protected readonly client: RestClient;

	/**
	 * 建立 Blogger REST 客戶端實例
	 * Create Blogger REST client instance
	 *
	 * @param ctx - Obsidian 上下文環境 / Obsidian context
	 * @param settings - 外掛設定 / Plugin settings
	 * @param saveSettings - 儲存設定的回呼函式 / Callback function to save settings
	 * @param profile - Blogger 設定檔 / Blogger profile
	 * @param context - REST 客戶端上下文環境 / REST client context
	 */
	constructor(
		readonly ctx: IObsidianContext,
		readonly settings: IPluginSettings,
		// FIXME: Since only what we need is to refresh the token, there should be a
		// better way than passing `saveSettings` here.
		protected readonly saveSettings: () => Promise<void>,
		readonly profile: IBloggerProfile,
		protected readonly context: IBloggerRestClientContext,
	)
	{
		super(ctx, settings, profile);
		this.name = 'BloggerRestClient';
		this.client = new RestClient({
			url: new URL(getUrl(this.context.endpoints?.base, profile.endpoint)),
		});
	}

	/**
	 * 取得授權標頭 (Authorization Headers)
	 * Get authorization headers
	 *
	 * 確保 OAuth2 Token 未過期，並產生認證用的 Request Headers。
	 * Ensure OAuth2 Token is fresh and generate authorization request headers.
	 *
	 * @returns 包含 Bearer Token 的標頭物件 / Headers object containing Bearer Token
	 * @throws 若無有效的 Google Token 則拋出錯誤 / Throws error if no valid Google token
	 */
	async getHeaders(): Promise<Record<string, string>>
	{
		const token = this.profile.googleOAuth2Token;
		/**
		 * 確保設定檔中已有 OAuth2 Token，否則拋出無效 Token 錯誤
		 * Ensure OAuth2 Token exists in profile, otherwise throw invalid Token error
		 */
		if (!token)
		{
			throw new Error(getGlobalI18n().t('error_invalidGoogleToken'));
		}
		/**
		 * 驗證外掛設定是否包含完整的 OAuth2 用戶端憑證資訊
		 * Verify if plugin settings contain complete OAuth2 client credentials
		 */
		if (!isPluginSettingsWithOAuth2(this.settings))
		{
			throw new Error(getGlobalI18n().t('error_noOAuth2ClientCredentials'));
		}
		const fresh_token = await getGoogleOAuth2Client(this.settings)
			.ensureFreshToken(token)
			.catch(() =>
			{
				throw new Error(getGlobalI18n().t('error_invalidGoogleToken'));
			});
		/**
		 * 檢查是否取得新 Token，若有更新則存回設定檔並觸發保存
		 * Check if a new Token was acquired, save it back to profile and trigger save if updated
		 */
		if (token !== fresh_token)
		{
			this.profile.googleOAuth2Token = fresh_token;
			await this.saveSettings();
		}
		const headers: Record<string, string> = {
			authorization: `Bearer ${fresh_token.accessToken}`,
		};
		return headers;
	}

	/**
	 * 處理發布/更新的 API 回應
	 * Handle API response for publish/update
	 *
	 * @param resp - API 回應物件 / API response object
	 * @param parserParams - 傳遞給解析器的參數 / Parameters passed to parser
	 * @param checkPostExist - 是否檢查文章存在 (404) / Whether to check post existence (404)
	 * @returns 包含發布結果的 Promise / Promise containing publish result
	 */
	protected _handlePublishResponse(
		resp: any,
		parserParams: Partial<IBloggerPostParams>,
		checkPostExist: boolean,
	): IBloggerClientResult<IBloggerPublishResult>
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
			const isDraft = postParams.status === EnumPostStatus.Draft;
			const url = getUrl(this.context.endpoints?.patchPost, 'dummy/patch/<%= postId %>?isDraft=<%= isDraft %>', {
				postId: postParams.postId,
				isDraft,
			});
			const resp = await this.client.httpPatch(
				url,
				{ status: postParams.status },
				{ headers: await this.getHeaders() },
			);

			return this._handlePublishResponse(resp, { postId: postParams.postId }, true);
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
			url = getUrl(this.context.endpoints?.editPost, 'dummy/update/<%= postId %>?isDraft=<%= isDraft %>', {
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
			url = getUrl(this.context.endpoints?.newPost, 'dummy/post?isDraft=<%= isDraft %>', {
				isDraft,
			});
			method = this.client.httpPost.bind(this.client);
		}
		const resp = await method(
			url,
			{
				kind: 'blogger#post',
				blog: {
					id: this.profile.blogId,
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
}

/**
 * 取得 Blogger 客戶端實例
 * Get Blogger client instance
 *
 * @param ctx - Obsidian 上下文環境 / Obsidian context
 * @param settings - 外掛設定 / Plugin settings
 * @param saveSettings - 儲存設定的回呼函式 / Callback function to save settings
 * @param profile - Blogger 設定檔 / Blogger profile
 * @returns 建立的客戶端實例，若設定檔無效則回傳 null / Created client instance, or null if profile is invalid
 */
export function getBloggerClient(
	ctx: IObsidianContext,
	settings: IPluginSettings,
	saveSettings: () => Promise<void>,
	profile: IBloggerProfile,
): IBloggerClient | null
{
	/**
	 * 驗證 Blogger 網址端點是否設定
	 * Verify if Blogger endpoint URL is configured
	 */
	if (!profile.endpoint || profile.endpoint.length === 0)
	{
		ctx.showError(getGlobalI18n().t('error_noEndpoint'));
		return null;
	}
	/**
	 * 驗證是否有有效的 Google OAuth2 Token
	 * Verify if there is a valid Google OAuth2 Token
	 */
	if (!profile.googleOAuth2Token)
	{
		ctx.showError(getGlobalI18n().t('error_invalidGoogleToken'));
		return null;
	}
	/**
	 * 驗證是否已選定 Blog ID
	 * Verify if Blog ID is selected
	 */
	if (!profile.blogId)
	{
		ctx.showError(getGlobalI18n().t('error_noBlogId'));
		return null;
	}
	return new BloggerRestClient(
		ctx,
		settings,
		saveSettings,
		profile,
		new BloggerRestClientGoogleOAuth2Context(profile.blogId),
	);
}
