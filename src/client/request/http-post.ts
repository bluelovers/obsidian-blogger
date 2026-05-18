import { ISafeAny } from '../../types/types';
import { getBoundary } from '../../utils';
import { FormItems, IFormItemNameMapper } from '../../utils/type-utils';
import { IBloggerPostApiBody, IBloggerPostApiReturn } from '../blogger/rest-client';
import { IAbstractRequestClientLike } from './abstract-request-client';
import { IHttpHeaders } from '../../types/http';

/**
 * HTTP 方法列舉
 * HTTP method enumeration
 *
 * 僅包含 Blogger API 實際使用的方法。
 * 注意：DELETE 已定義但 Blogger API Posts 端點未使用。
 * Contains only the methods actually used by the Blogger API.
 * Note: DELETE is defined but not used by the Blogger API Posts endpoints.
 */
export const enum EnumHttpMethod
{
	/** POST — 建立資源或觸發動態（newPost / publish / revert）*/
	POST = 'POST',
	/** PUT — 完整取代資源（editPost）*/
	PUT = 'PUT',
	/** DELETE — 已定義但 Blogger Posts 端點未使用 / Defined but unused by Blogger Posts */
	DELETE = 'DELETE',
	/** PATCH — 部分更新資源（patchPost，如僅更新 status）*/
	PATCH = 'PATCH',
	/** GET — 查詢資源（getPost）*/
	GET = 'GET',
}

/**
 * 處理 REST 客戶端的基礎路徑（移除結尾斜線）
 * Normalize the REST client base path (remove trailing slash)
 *
 * 確保 `href` 不以 `/` 結尾，避免後續 `_getEndpoint()` 拼接路徑時產生雙斜線。
 * Ensures `href` does not end with `/` to prevent double slashes when `_getEndpoint()` appends paths.
 *
 * @param href - 原始 URL / Raw URL
 * @returns 移除結尾斜線後的 URL / URL with trailing slash removed
 */
export function _handleRestClientHref(href: string): string
{
	if (href.endsWith('/')) {
		href = href.substring(0, href.length - 1);
	}
	return href;
}

/**
 * 拼接完整的 API 端點 URL
 * Build the full API endpoint URL
 *
 * 將相對路徑拼接至基礎路徑，並移除重複的斜線。
 * 例如：_getEndpoint("https://.../v3/blogs/123", "/posts/456/publish")
 *       → "https://.../v3/blogs/123/posts/456/publish"
 * Appends a relative path to the base path and removes duplicate slashes.
 *
 * @param href - 基礎路徑（不含結尾斜線）/ Base path (no trailing slash)
 * @param path - 相對路徑（可選開頭斜線）/ Relative path (leading slash optional)
 * @returns 完整端點 URL / Full endpoint URL
 */
export function _getEndpoint(href: string, path: string): string
{
	let realPath = path;
	if (realPath.startsWith('/'))
	{
		realPath = realPath.substring(1);
	}
	return `${href}/${realPath}`;
}

/**
 * 合併預設標頭與自訂標頭
 * Merge default headers with custom headers
 *
 * 預設加入 User-Agent 標頭，然後疊加 predefinedHeaders，
 * 最後疊加 options.headers（後者優先級最高）。
 * 此順序確保呼叫端可以覆蓋任何預設值。
 * Adds a default User-Agent header, then merges predefinedHeaders,
 * and finally options.headers (last wins).
 * This order ensures callers can override any default value.
 *
 * @param options - 可選的請求選項（含自訂標頭）/ Optional request options (with custom headers)
 * @param predefinedHeaders - 預定義的標頭（由 _httpPost 或 requestUrl 內部設定）/ Predefined headers (set internally)
 * @returns 合併後的標頭物件 / Merged headers object
 */
export function _handleHeaders(options?: IHttpOptions, predefinedHeaders?: IHttpHeaders): IHttpHeaders
{
	return {
		'user-agent': 'obsidian.md',
		...predefinedHeaders,
		...options?.headers,
	};
}

/**
 * REST 客戶端的最小必要介面（用於型別約束 _httpPost / _requestUrl 的參數）
 * Minimal required interface for REST client (type constraint for _httpPost / _requestUrl)
 */
export interface IRestClientLike extends IAbstractRequestClientLike
{
	/**
	 * 將相對路徑拼接為完整端點 URL
	 * Join relative path to base URL for full endpoint URL
	 *
	 * @param path - API 相對路徑 / API relative path
	 * @returns 完整端點 URL / Full endpoint URL
	 */
	getEndpoint(path: string): string;
}

/**
 * 發送 HTTP 請求（支援有主體與無主體兩種模式）
 * Send HTTP request (supports both body and body-less modes)
 *
 * 有主體模式（POST / PUT / PATCH）：
 * Body mode (POST / PUT / PATCH):
 *   支援三種請求主體格式：
 *   Supports three request body formats:
 *   1. IBloggerPostApiBody（JSON 物件）→ JSON.stringify()，content-type: application/json
 *   2. FormItems（表單資料）→ multipart/form-data，content-type 含 boundary
 *   3. ArrayBuffer（原始二進位）→ 直接傳送
 *
 * 無主體模式（GET / 動作 POST）：
 * Body-less mode (GET / action POST):
 *   不傳送請求主體，僅設定 content-type: application/json 標頭。
 *   No request body sent, only content-type: application/json header.
 *   用於 httpGet、httpPublish、httpRevert。
 *   Used by httpGet, httpPublish, httpRevert.
 *
 * @param httpMethod - HTTP 方法（GET / POST / PUT / PATCH）
 * @param path - API 路徑（由 RestClient.getEndpoint() 拼接為完整 URL）
 * @param requestClient - 實作 IRestClientLike 的客戶端實例
 * @param body - 可選的請求主體。若省略則為無主體請求
 *               Optional request body. If omitted, sends a body-less request.
 * @param options - 可選的請求選項（標頭、表單名稱映射器）
 *                  Optional request options (headers, form name mapper)
 * @returns Blogger API 回應物件
 */
export async function _httpPost(
	httpMethod: EnumHttpMethod,
	path: string,
	requestClient: IRestClientLike,
	body?: IBloggerPostApiBody,
	options?: IHttpOptions,
): Promise<IBloggerPostApiReturn>
{
	const endpoint = requestClient.getEndpoint(path);
	const predefinedHeaders: Record<string, string> = {};
	let requestBody: string | ArrayBuffer | undefined;

	if (body !== undefined)
	{
		/**
		 * 有主體模式：依 runtime 型別選擇序列化方式
		 * Body mode: select serialization based on runtime type
		 */
		if (body instanceof FormItems)
		{
			const boundary = getBoundary();
			requestBody = await body.toArrayBuffer({
				boundary,
				nameMapper: options?.formItemNameMapper,
			});
			predefinedHeaders['content-type'] = `multipart/form-data; boundary=${boundary}`;
		}
		else if (body instanceof ArrayBuffer)
		{
			requestBody = body;
		}
		else
		{
			requestBody = JSON.stringify(body);
			predefinedHeaders['content-type'] = 'application/json';
		}
	}
	/**
	 * 無主體模式：body 為 undefined
	 * Body-less mode: body is undefined
	 *
	 * 不設定 predefinedHeaders，content-type 由 options.headers 提供。
	 * No predefinedHeaders set; content-type comes from options.headers.
	 */
	return _requestUrl(requestClient, {
		endpoint,
		method: httpMethod,
		headers: options?.headers,
		predefinedHeaders,
		body: requestBody,
	});
}

/**
 * 發送 HTTP 請求並解析 JSON 回應
 * Send an HTTP request and parse the JSON response
 *
 * 封裝 Obsidian 的 requestUrl API，統一處理標頭合併與 JSON 解析。
 * 回傳值直接為 response.json（已經過 Obsidian 內部 JSON 解析）。
 * Wraps Obsidian's requestUrl API, handling header merging and JSON parsing uniformly.
 * The return value is response.json directly (already parsed by Obsidian).
 *
 * ⚠️ 注意：_requestUrl 本身不檢查 HTTP 狀態碼。呼叫端需自行檢查回應中的
 *    error 欄位（透過 _hasError()）來判斷請求是否成功。
 * ⚠️ Note: _requestUrl does NOT check HTTP status codes. Callers must check
 *    the response's error field (via _hasError()) to determine success.
 *
 * @param requestClient - 實作 IAbstractRequestClientLike 的客戶端實例
 * @param requestOpts - 請求選項（端點 URL、方法、標頭、主體）
 * @param requestOpts.endpoint - 完整 API 端點 URL
 * @param requestOpts.method - HTTP 方法
 * @param requestOpts.headers - 自訂標頭（會與預設標頭合併）
 * @param requestOpts.predefinedHeaders - 預定義標頭（優先級介於預設與自訂之間）
 * @param requestOpts.body - 請求主體（字串、ArrayBuffer 或 FormData）
 * @param requestOpts.throw - 是否拋出 HTTP 錯誤（預設 false，改為回傳含 error 的物件）
 * @returns response.json（已解析的 Blogger API 回應）
 */
export async function _requestUrl(requestClient: IRestClientLike, requestOpts: {
	endpoint: string;
	method: EnumHttpMethod;
	headers?: IHttpHeaders;
	predefinedHeaders?: IHttpHeaders;
	body?: ISafeAny;
	throw?: boolean;
})
{
	const response = await requestClient.requestUrl({
		url: requestOpts.endpoint,
		method: requestOpts.method,
		headers: _handleHeaders(requestOpts, requestOpts.predefinedHeaders),
		body: requestOpts.body,
		throw: requestOpts.throw ?? false,
	});
	return response.json;
}

export interface IHttpOptions
{
	headers?: IHttpHeaders;
	formItemNameMapper?: IFormItemNameMapper;
}
