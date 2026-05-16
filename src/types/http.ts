/**
 * HTTP 請求標頭介面
 * HTTP request headers interface
 *
 * 為常用標頭提供型別提示與自動補全。
 * Provides type hints and autocompletion for common headers.
 */
export interface IHttpHeaders extends Record<string, string | undefined>
{
	/** 內容類型（如 application/json）/ Content type (e.g. application/json) */
	'content-type'?: string;
	/** 使用者代理字串 / User agent string */
	'user-agent'?: string;
}
