import { isFunction, isString, template } from 'lodash-es';
import { BLOGGER_API_ENDPOINT } from '../../../consts';
import { IBloggerProfile } from '../../../blogger-profile';

/**
 * URL 取得器函式型別
 * URL getter function type
 *
 * 支援惰性求值（lazy evaluation），用於需要動態建構 URL 的場景。
 * Supports lazy evaluation for dynamically constructing URLs.
 */
export type IUrlGetter = () => string;

/**
 * 解析 URL，支援靜態字串、函式與預設值三種模式
 * Resolve URL — supports static string, getter function, and default value
 *
 * 1. 若 url 為字串 → 直接使用
 * 2. 若 url 為函式 → 呼叫取得 URL
 * 3. 若 url 為 undefined → 使用 defaultValue
 * 4. 若提供 params → 使用 lodash template 進行變數插值
 *
 * 1. If url is a string → use directly
 * 2. If url is a function → invoke to get URL
 * 3. If url is undefined → use defaultValue
 * 4. If params provided → interpolate via lodash template
 *
 * @param url - URL 字串、取得器函式或 undefined / URL string, getter function, or undefined
 * @param defaultValue - 當 url 為 undefined 時的預設值 / Default when url is undefined
 * @param params - 可選的範本變數 / Optional template variables
 * @returns 解析後的完整 URL / Resolved URL string
 */
export function getUrl(
	url: string | IUrlGetter | undefined,
	defaultValue: string,
	params?: { [p: string]: string | number | boolean },
): string
{
	let resultUrl: string;
	if (isString(url))
	{
		resultUrl = url;
	}
	else if (isFunction(url))
	{
		resultUrl = url();
	}
	else
	{
		resultUrl = defaultValue;
	}
	if (params)
	{
		const compiled = template(resultUrl);
		return compiled(params);
	}
	else
	{
		return resultUrl;
	}
}

/**
 * Blogger REST API 端點集合
 * Blogger REST API endpoint set
 *
 * 根據部落格 ID 建立對應的 API 端點路徑。
 * 使用 lodash template 語法（`<%= ... %>`）標記動態參數位置。
 * Creates API endpoint paths from blog ID.
 * Uses lodash template syntax (`<%= ... %>`) for dynamic parameter placeholders.
 *
 * @param blogId - 部落格 ID / Blog ID
 */
export function getBloggerRestEndpoint(blogId: IBloggerProfile["blogId"])
{
	return {
		base: BLOGGER_API_ENDPOINT ,
		newPost: () => `/${blogId}/posts?isDraft=<%= isDraft %>` as const,
		editPost: () => `/${blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>` as const,
		patchPost: () => `/${blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>` as const,
	} as const satisfies IBloggerRestEndpoint
}

/**
 * Blogger REST API 端點結構介面
 * Blogger REST API endpoint structure interface
 */
export interface IBloggerRestEndpoint
{
	/** API 基礎端點 / Base API endpoint */
	base: string | IUrlGetter;
	/** 建立新文章端點 / New post endpoint */
	newPost: string | IUrlGetter;
	/** 編輯已有文章端點 / Edit existing post endpoint */
	editPost: string | IUrlGetter;
	/** 部分更新文章端點 / Patch post endpoint */
	patchPost: string | IUrlGetter;
}
