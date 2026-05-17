import {
	IBloggerMediaUploadResult,
	IBloggerPostParams,
	IBloggerPublishResult,
} from '../../types/blogger-client-interface';
import { ISafeAny } from '../../types';
import { IBloggerRestEndpoint } from './utils/url';
import { IFormItemNameMapper } from '../../utils/type-utils';

/**
 * Blogger REST 客戶端上下文介面
 * Blogger REST client context interface
 *
 * 定義 BloggerRestClient 所需的依賴注入合約：
 * Defines the dependency injection contract required by BloggerRestClient:
 *
 * - responseParser：API 回應的解析器（toBloggerPublishResult / toBloggerMediaUploadResult）
 *   API response parser
 * - endpoints：端點集合（可選，用於 URL 建構）
 *   Endpoint set (optional, for URL construction)
 * - needLoginModal：是否需要登入提示
 *   Whether a login prompt is needed
 * - formItemNameMapper：表單欄位名稱映射器（用於 multipart 上傳）
 *   Form field name mapper (for multipart uploads)
 *
 * @see BloggerRestClient — 消費此介面的 REST 客戶端 / The REST client consuming this interface
 * @see BloggerRestClientGoogleOAuth2Context — 使用 Google OAuth2 的實作 / Google OAuth2 implementation
 */
export interface IBloggerRestClientContext
{
	name: string;

	responseParser: {
		/**
		 * 將 Blogger API 回傳轉換為 IBloggerPublishResult
		 * Convert Blogger API response to IBloggerPublishResult
		 *
		 * @param postParams - 僅需 postId 欄位，用於 ID 一致性檢查
		 *                     Only postId is needed for defensive ID consistency check
		 * @param response - Blogger API 原始回應 / Raw Blogger API response
		 */
		toBloggerPublishResult: (
			postParams: Pick<IBloggerPostParams, 'postId'>,
			response: ISafeAny,
		) => IBloggerPublishResult;
		/**
		 * 將回應轉換為 IBloggerMediaUploadResult
		 * Convert response to `IBloggerMediaUploadResult`.
		 *
		 * 若發生錯誤則直接拋出例外
		 * If there is any error, throw new error directly.
		 *
		 * @param response - 遠端伺服器的回應 / Response from remote server
		 */
		toBloggerMediaUploadResult: (response: ISafeAny) => IBloggerMediaUploadResult;
	};

	endpoints: Partial<IBloggerRestEndpoint>;

	needLoginModal?: boolean;

	formItemNameMapper?: IFormItemNameMapper;
}
