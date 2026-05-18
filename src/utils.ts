import { format } from 'date-fns';
import { ISafeAny, IURLInput, IURLParams } from './types/types';

export function generateLink(url: IURLInput, queryParams: IURLParams = {})
{
	return `${url}?${generateQueryString(queryParams)}`.replace(/[\?&]$/, '');
}

/**
 * 產生 URL 查詢字串
 * Generate URL query string
 *
 * @param params - 查詢參數物件 / Query parameters object
 * @returns 格式化後的查詢字串 / Formatted query string
 */
export function generateQueryString(params: IURLParams): string
{
	if (params instanceof URLSearchParams)
	{
		return params.toString();
	}

	return new URLSearchParams(
		Object.entries(params).filter(([k, v]) => v !== undefined) as [string, string][],
	).toString();
}

/**
 * 檢查是否為 Promise 成功結果
 * Check if the result is a fulfilled Promise result
 *
 * @template T - Promise 的解析值型別 / The resolved value type of the Promise
 * @param obj - 待檢查的物件 / Object to check
 * @returns 是否為成功結果 / Whether it is a fulfilled result
 */
export function isPromiseFulfilledResult<T>(obj: ISafeAny): obj is PromiseFulfilledResult<T>
{
	return !!obj && obj.status === 'fulfilled' && obj.value;
}

/**
 * 驗證是否為合法的 URL
 * Validate if it is a valid URL
 *
 * @param url - 待驗證的網址字串 / URL string to validate
 * @returns 是否合法 / Whether it is valid
 */
export function isValidUrl(url: string): boolean
{
	try
	{
		return Boolean(new URL(url));
	}
	catch (e)
	{
		return false;
	}
}

/**
 * 驗證是否為合法的 Blogger URL
 * Validate if it is a valid Blogger URL
 *
 * @param url - 待驗證的網址字串 / URL string to validate
 * @returns 是否為 Blogger 網址 / Whether it is a Blogger URL
 */
export function isValidBloggerUrl(url: string): boolean
{
	try
	{
		const u = new URL(url);
		return u.hostname.endsWith('.blogspot.com');
	}
	catch (e)
	{
		return false;
	}
}

/**
 * 取得用於 multipart/form-data 的邊界字串
 * Get boundary string for multipart/form-data
 *
 * @returns 邊界字串 / Boundary string
 */
export function getBoundary(): string
{
	return `----obsidianBoundary${format(new Date(), 'yyyyMMddHHmmss')}`;
}

