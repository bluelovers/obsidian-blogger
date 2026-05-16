import { ISafeAny } from '../../types';
import { getBoundary } from '../../utils';
import { IFormItemNameMapper, FormItems } from '../../utils/type-utils';
import { IBloggerPostApiBody, IBloggerPostApiReturn } from '../blogger/rest-client';
import { IAbstractRequestClientLike } from './abstract-request-client';
import { IHttpHeaders } from '../../types/http';

export const enum EnumHttpMethod
{
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
	PATCH = 'PATCH',
	GET = 'GET',
}

export function _handleRestClientHref(href: string): string
{
	if (href.endsWith('/')) {
		href = href.substring(0, href.length - 1);
	}
	return href;
}

export function _getEndpoint(href: string, path: string): string
{
	let realPath = path;
	if (realPath.startsWith('/'))
	{
		realPath = realPath.substring(1);
	}
	return `${href}/${realPath}`;
}

export function _handleHeaders(options?: {
	headers?: IHttpHeaders;
}, predefinedHeaders?: IHttpHeaders): IHttpHeaders
{
	return {
		'user-agent': 'obsidian.md',
		...predefinedHeaders,
		...options?.headers,
	};
}

export interface IRestClientLike extends IAbstractRequestClientLike
{
	getEndpoint(path: string): string;
}

export async function _httpPost(
	httpMethod: EnumHttpMethod.POST | EnumHttpMethod.PUT | EnumHttpMethod.PATCH,
	path: string,
	body: IBloggerPostApiBody,
	options: {
		headers?: IHttpHeaders;
		formItemNameMapper?: IFormItemNameMapper;
	},
	requestClient: IRestClientLike,
): Promise<IBloggerPostApiReturn>
{
	const endpoint = requestClient.getEndpoint(path);
	const predefinedHeaders: Record<string, string> = {};
	let requestBody: ISafeAny;
	if (body instanceof FormItems)
	{
		const boundary = getBoundary();
		requestBody = await body.toArrayBuffer({
			boundary,
			nameMapper: options.formItemNameMapper,
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
	return _requestUrl(requestClient, {
		endpoint,
		method: httpMethod,
		headers: options?.headers,
		predefinedHeaders,
		body: requestBody,
	});
}

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
