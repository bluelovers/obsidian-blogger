import {
	IBloggerClient,
	IBloggerClientResult,
	IBloggerPostParams,
	IBloggerPublishResult,
} from './types/blogger-client-interface';
import { RestClient } from './client/blogger/rest-client';
import { getGoogleOAuth2Client } from './client/blogger/oauth2-client';
import { getGlobalI18n } from './i18n/i18n';
import { IPluginSettings, isPluginSettingsWithOAuth2 } from './plugin-settings';
import { _hasError } from './utils/type-utils';
import { EnumBloggerClientReturnCode, EnumPostStatus } from './types/const';
import { _handleTagsForBloggerPostApi } from './utils/tags-utils';
import { IObsidianContext } from './utils/obsidian/obsidian-context';
import { EnumBloggerRestEndpoint, EnumBloggerViewMode, getUrl, getUrlCore } from './client/blogger/utils/url';
import { BloggerRestClientGoogleOAuth2Context } from './client/blogger/blogger-rest-client-google-o-auth2-context';
import { IBloggerRestClientContext } from './client/blogger/types';
import { AbstractBloggerClient } from './client/blogger/abstract-blogger-client';

import { BloggerCoreApiClient } from './client/blogger/blogger-core-api-client';
import { IHttpHeaders } from './types/http';
import { ITSPickExtra } from 'ts-type';
import { IBloggerProfile } from './types/blogger-profile';

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
	protected readonly coreApiClient: BloggerCoreApiClient;

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
			url: new URL(getUrlCore(this.context.endpoints[EnumBloggerRestEndpoint.base], profile.endpoint)),
		});
		this.coreApiClient = new BloggerCoreApiClient(
			this.client,
			this.context,
			this.profile.blogId,
			() => this.getHeaders(),
			this.settings.enableSmartPreCheck,
		);
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
	async getHeaders()
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
		/**
		 * 嘗試刷新 Token
		 * Try to refresh token
		 *
		 * 不再使用 .catch() 吞噬原始錯誤，讓錯誤訊息（如 invalid_grant、網路問題）
		 * 自然傳播至外層的 showError() 處理。
		 * No longer use .catch() to swallow the original error — let the error message
		 * (e.g., invalid_grant, network issue) propagate naturally to the outer showError() handler.
		 */
		const fresh_token = await getGoogleOAuth2Client(this.settings, this.ctx)
			.ensureFreshToken(token);
		/**
		 * 檢查是否取得新 Token，若有更新則存回設定檔並觸發保存
		 * Check if a new Token was acquired, save it back to profile and trigger save if updated
		 */
		if (token !== fresh_token)
		{
			this.profile.googleOAuth2Token = fresh_token;
			await this.saveSettings();
		}
		const headers: ITSPickExtra<IHttpHeaders, 'authorization'> = {
			authorization: `Bearer ${fresh_token.accessToken}`,
		};
		return headers;
	}

	/**
	 * 發布或更新文章到 Blogger
	 * Publish or update post to Blogger
	 *
	 * 委派給純粹的核心 API 客戶端處理。
	 * Delegates to pure core API client.
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
		return this.coreApiClient.publish(title, content, postParams);
	}

	/**
	 * 從 Blogger 同步文章資料（遠端 → 本地）
	 * Sync post data from Blogger (remote → local)
	 *
	 * @param postId - 文章 ID / Post ID
	 */
	async syncPost(postId: `${number}`): Promise<IBloggerClientResult<IBloggerPublishResult>>
	{
		return this.coreApiClient.getPost(postId, EnumBloggerViewMode.AUTHOR);
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
export function handleBloggerClientOptions(
	ctx: IObsidianContext,
	settings: IPluginSettings,
	saveSettings: () => Promise<void>,
	profile: IBloggerProfile,
)
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
	return {
		ctx,
		settings,
		saveSettings,
		profile,
		context: new BloggerRestClientGoogleOAuth2Context(profile.blogId),
	};
}

export function getBloggerClient(
	ctx: IObsidianContext,
	settings: IPluginSettings,
	saveSettings: () => Promise<void>,
	profile: IBloggerProfile,
): IBloggerClient | null
{

	const core = handleBloggerClientOptions(ctx, settings, saveSettings, profile);

	if (!core) return null;

	return new BloggerRestClient(
		core.ctx,
		core.settings,
		core.saveSettings,
		core.profile,
		core.context,
	);
}
