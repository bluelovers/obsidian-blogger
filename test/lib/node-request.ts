/**
 * Node.js requestUrl 適配器
 * Node.js requestUrl adapter
 *
 * 將 Node.js 的 fetch() 包裝為 Obsidian 風格的 requestUrl 介面，
 * 使 RestClient（與其他 AbstractRequestClient 子類別）可在 Obsidian 外執行。
 *
 * Wraps Node.js fetch() into Obsidian-style requestUrl interface,
 * allowing RestClient (and other AbstractRequestClient subclasses)
 * to run outside Obsidian.
 *
 * @example
 * ```typescript
 * import { nodeRequest } from '../lib/node-request';
 * import { RestClient } from '../../src/client/blogger/rest-client';
 *
 * const client = new RestClient(
 *   { url: new URL('https://www.googleapis.com/blogger/v3/blogs') },
 *   nodeRequest,
 * );
 * ```
 */
/// <reference types="node" />

import { EnumHttpMethod } from '../../src/client/request/http-post';
import { IRequestUrlParam, IRequestUrlResponse, IRequestUrlResponsePromise } from '../../src/client/request/abstract-request-client';
import { IHttpHeaders } from '../../src/types/http';

/**
 * 將 Node.js Response headers 轉換為 Record<string, string>
 * Convert Node.js Response headers to Record<string, string>
 */
function _headersToRecord(headers: Headers): Record<string, string>
{
	const result: Record<string, string> = {};
	headers.forEach((value, key) =>
	{
		result[key.toLowerCase()] = value;
	});
	return result;
}

/**
 * Node.js requestUrl 實作
 * Node.js requestUrl implementation
 *
 * 回傳值符合 IRequestUrlResponsePromise 約束（Promise 解析後為 IRequestUrlResponse）。
 * 不因 HTTP 錯誤狀態碼而拋出（throw: false 語意）。
 * Return value satisfies IRequestUrlResponsePromise constraints (resolves to IRequestUrlResponse).
 * Does NOT throw on non-2xx HTTP status codes (throw: false semantics).
 *
 * @typeParam T - 回應 JSON 的型別 / Type of the response JSON
 * @param request - 請求參數（IRequestUrlParam）或字串 URL / Request params or URL string
 * @returns 包裝為 Promise 的 HTTP 回應 / HTTP response wrapped in a Promise
 */
export async function _nodeRequest<T = any>(
	request: IRequestUrlParam | string,
): Promise<IRequestUrlResponse<T>>
{
	const params = typeof request === 'string'
		? { url: request, method: EnumHttpMethod.GET }
		: request;

	// Build fetch() options
	const fetchOptions: RequestInit & { headers: Record<string, string> } = {
		method: params.method,
		headers: params.headers as Record<string, string> ?? {},
	};

	// body: string | ArrayBuffer → 依 Obsidian requestUrl 規格
	if (params.body !== undefined)
	{
		fetchOptions.body = typeof params.body === 'string'
			? params.body
			: new Uint8Array(params.body as ArrayBuffer);
	}

	let response: Response;
	try
	{
		response = await fetch(params.url, fetchOptions);
	}
	catch (error)
	{
		// 若 throw 為 false 則不拋錯，回傳模擬錯誤回應
		// If throw is false, don't throw; return a simulated error response
		if (params.throw === true)
		{
			throw error;
		}
		return {
			status: 0,
			headers: {},
			json: {
				error: {
					code: 0,
					message: error instanceof Error ? error.message : String(error),
				},
			} as unknown as T,
			text: '',
			arrayBuffer: new ArrayBuffer(0),
		};
	}

	const text = await response.text();

	return {
		status: response.status,
		headers: _headersToRecord(response.headers),
		get json()
		{
			return JSON.parse(text) as T;
		},
		text,
		get arrayBuffer()
		{
			return new TextEncoder().encode(text).buffer as ArrayBuffer;
		},
	};
}

export function wrapToObsidianRequest<T>(responsePromise: Promise<IRequestUrlResponse<T>>)
{
	let wraped: IRequestUrlResponsePromise<T> = responsePromise as any;

	wraped.json = responsePromise.then(r => r.json);
	wraped.text = responsePromise.then(r => r.text);
	wraped.arrayBuffer = responsePromise.then(r => r.arrayBuffer);

	return wraped;
}

export function nodeRequest<T = any>(
	request: IRequestUrlParam | string,
)
{
	return wrapToObsidianRequest<T>(_nodeRequest(request));
}
