import { getBloggerRestEndpoint, IBloggerRestEndpoint } from './utils/url';
import { IBloggerProfile } from '../../blogger-profile';
import {
	IBloggerMediaUploadResult,
	IBloggerPostParams,
	IBloggerPublishResult,
} from '../../types/blogger-client-interface';
import { IBloggerPostApiReturn } from './rest-client';
import { EnumPostStatus } from '../../types/const';
import { ISafeAny } from '../../types';
import { IBloggerRestClientContext } from './types';

/**
 * Blogger REST 客戶端 Google OAuth2 上下文環境類別
 * Blogger REST client Google OAuth2 context class
 *
 * 實作 `IBloggerRestClientContext` 介面，供 Blogger REST API 使用。
 * Implements `IBloggerRestClientContext` interface for Blogger REST API usage.
 */
export class BloggerRestClientGoogleOAuth2Context implements IBloggerRestClientContext
{
	name = 'BloggerRestClientGoogleOAuth2Context';

	needLoginModal = false;

	endpoints: IBloggerRestEndpoint = getBloggerRestEndpoint(this.blogId);

	/**
	 * 建立 Google OAuth2 上下文環境實例
	 * Create Google OAuth2 context instance
	 *
	 * @param blogId - Blogger 網誌 ID / Blogger blog ID
	 */
	constructor(private readonly blogId: IBloggerProfile["blogId"])
	{}

	/**
	 * 表單項目名稱映射器
	 * Form item name mapper
	 *
	 * 將名稱 'file' 映射為 'media[]'。
	 * Maps name 'file' to 'media[]'.
	 *
	 * @param name - 原始欄位名稱 / Original field name
	 * @param isArray - 該欄位是否為陣列 / Whether this field is an array
	 * @returns 轉換後的名稱 / Mapped name
	 */
	formItemNameMapper(name: string, isArray: boolean): string
	{
		/**
		 * 若欄位名稱為 'file' 且非陣列，則將其替換為 Blogger API 預期的 'media[]'
		 * If field name is 'file' and not an array, replace it with 'media[]' expected by Blogger API
		 */
		if (name === 'file' && !isArray)
		{
			return 'media[]';
		}
		return name;
	}

	responseParser = {
		toBloggerPublishResult: (
			postParams: Pick<IBloggerPostParams, 'postId'>,
			response: IBloggerPostApiReturn,
		): IBloggerPublishResult =>
		{
			/**
			 * 檢查 API 回應是否包含文章 ID
			 * Check if API response contains post ID
			 */
			if (response.id)
			{
				if (postParams.postId !== undefined && postParams.postId !== response.id)
				{
					throw new Error(
						`Inconsistent post IDs. This should be a bug: ${postParams.postId} vs ${response.id}`,
					);
				}
				return {
					postId: response.id,
					url: response.url,
					status: response.status ?? EnumPostStatus.Live,
				};
			}
			/** 
			 * 若回應不包含 ID，拋出一般錯誤
			 * Throw generic error if response does not contain ID
			 */
			throw new Error('xx');
		},
		toBloggerMediaUploadResult: (response: ISafeAny): IBloggerMediaUploadResult =>
		{
			/**
			 * 判斷是否成功上傳了媒體檔案
			 * Check if media file was uploaded successfully
			 */
			if (response.media.length > 0)
			{
				const media = response.media[0];
				return {
					url: media.link,
				};
			}
			/**
			 * 若未成功上傳，則檢查是否有錯誤訊息並拋出
			 * If not uploaded successfully, check for error messages and throw
			 */
			else if (response.errors)
			{
				throw new Error(response.errors.error.message);
			}
			throw new Error('Upload failed');
		},
	};
}
