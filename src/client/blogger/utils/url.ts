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
export type IUrlGetter<T extends string = string> = () => T;

export type IRestEndpointUrl<T extends string = string> = T | IUrlGetter;

/**
 * 檢視模式（字串），以指定的檢視模式來偵測文章可見性與可取得資訊
 *
 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/get?hl=zh-tw#request-body
 */
export const enum EnumBloggerViewMode
{
	/**
	 * view=AUTHOR：作者層級詳細資料
	 *     LIVE 文章  → ✅ 成功（有 status 欄位，值為 LIVE）
	 *     DRAFT 文章 → ✅ 成功（有 status 欄位，值為 DRAFT）
	 */
	AUTHOR = 'AUTHOR',

	/**
	 * 無 view 或 view=READER：讀者層級詳細資料
	 *     LIVE 文章  → ✅ 成功（但無 status 欄位，需預設為 LIVE）
	 *     DRAFT 文章 → ❌ HTTP 404（！！）
	 */
	READER = 'READER',

	/**
	 * view=ADMIN：管理員層級詳細資料
	 */
	ADMIN = 'ADMIN',
}

/**
 * Blogger API v3 REST 端點枚舉 (endpoint enum)
 *
 * @see {getBloggerRestEndpoint}
 * @see {getUrl}
 */
export const enum EnumBloggerRestEndpoint
{
	/**
	 * Blogger API v3 基礎端點 / Blogger API v3 base endpoint
	 *
	 * 固定值：https://www.googleapis.com/blogger/v3/blogs
	 * 所有文章端點皆以此為前綴。
	 * Constant: https://www.googleapis.com/blogger/v3/blogs
	 * All post endpoints are prefixed with this.
	 *
	 * @example
	 * {
	 *   path: 'https://www.googleapis.com/blogger/v3/blogs',
	 *   method: EnumHttpMethod.GET
	 * }
	 */
	base = 'base',

	/**
	 * 建立新文章 / Create a new post
	 *
	 * POST /{blogId}/posts?isDraft=<%= isDraft %>
	 *
	 * 用於首次發布文章到 Blogger。
	 * isDraft 是否要以草稿形式建立貼文
	 *
	 * isDraft=true 建立草稿，false 直接發布。
	 * 請求主體須包含 kind、blog.id、title、content、labels、status。
	 *
	 * Used for first-time publishing. isDraft=true creates a draft, false publishes live.
	 * Request body must include kind, blog.id, title, content, labels, status.
	 *
	 * @see {BloggerCoreApiClient.publish}
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/insert?hl=zh-tw
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts?isDraft={isDraft}',
	 *   method: EnumHttpMethod.POST,
	 *   query: {
	 *     isDraft: boolean,
	 *   },
	 *   body: {
	 *     kind: 'blogger#post',
	 *     blog: { id: IBloggerPostParamsCore["postId"] },
	 *     title: string,
	 *     content: string,
	 *     labels: string[],
	 *     status: EnumPostStatus.Draft | EnumPostStatus.Live,
	 *   }
	 * }
	 */
	newPost = 'newPost',

	/**
	 * 完整更新（取代）已有文章
	 * Fully update (replace) an existing post
	 *
	 * PUT /{blogId}/posts/<%= postId %>
	 *
	 * 完整取代（PUT）已有文章。
	 * ⚠️ PUT 會完整取代所有欄位，未提供的內容會被清空。
	 *
	 * Fully replaces (PUT) an existing post.
	 * ⚠️ PUT overwrites all fields — omitted content will be cleared.
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/update?hl=zh-tw
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}?isDraft={isDraft}',
	 *   method: EnumHttpMethod.PUT,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *   },
	 *   body: {
	 *     kind: 'blogger#post',
	 *     blog: { id: IBloggerPostParamsCore["postId"] },
	 *     title: string,
	 *     content: string,
	 *     labels: string[],
	 *     status: EnumPostStatus.Draft | EnumPostStatus.Live,
	 *   }
	 * }
	 */
	editPost = 'editPost',

	/**
	 * 部分更新文章
	 * Partially update an existing post
	 *
	 * PATCH /{blogId}/posts/<%= postId %>
	 *
	 * 僅更新有提供的欄位（PATCH），不影響其他內容。
	 * 適合輕量操作，如只更新 status。
	 *
	 * Updates only the provided fields (PATCH).
	 * Suitable for lightweight operations, e.g. status-only update.
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/patch?hl=zh-tw
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}?isDraft={isDraft}',
	 *   method: EnumHttpMethod.PATCH,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *   },
	 *   body: {
	 *     status: EnumPostStatus.Draft | EnumPostStatus.Live,
	 *   }
	 * }
	 */
	patchPost = 'patchPost',

	/**
	 * 取得單一文章
	 * Get a single post
	 *
	 * GET /{blogId}/posts/<%= postId %>?view=<%= view %>
	 *
	 * 如果文章位於私人網誌上，則必須取得授權。
	 * 如果文章是在公開的網誌上，則可以在未經授權的情況下呼叫此方法。
	 *
	 * 模板參數 / Template parameters:
	 *   view   — 檢視模式（字串），以指定的檢視模式來偵測文章可見性與可取得資訊
	 *            View mode (string), controls post visibility
	 *
	 *   view=AUTHOR：作者層級詳細資料
	 *     LIVE 文章  → ✅ 成功（有 status 欄位，值為 LIVE）
	 *     DRAFT 文章 → ✅ 成功（有 status 欄位，值為 DRAFT）
	 *
	 *   無 view 或 view=READER：讀者層級詳細資料
	 *     LIVE 文章  → ✅ 成功（但無 status 欄位，需預設為 LIVE）
	 *     DRAFT 文章 → ❌ HTTP 404（！！）
	 *
	 *   view=ADMIN：管理員層級詳細資料
	 *
	 *   maxComments — (可選) 貼文資源中可擷取的留言數量上限。如未指定這個參數，系統就不會傳回任何註解。
	 *
	 * 結論：讀取 DRAFT 文章時**必須**加上 view=AUTHOR，否則必定 404。
	 *       `?isDraft=true` 無法繞過此限制（已實測確認無效）。
	 *
	 * @see {BloggerCoreApiClient.getPost}
	 * @see {BloggerCoreApiClient.updatePostStatusOnly}
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/get?hl=zh-tw
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}?view={view}',
	 *   method: EnumHttpMethod.GET,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *     view: EnumBloggerViewMode,
	 *     maxComments?: number,
	 *   },
	 *   response: {
	 *     status: EnumPostStatus.Draft | EnumPostStatus.Live,
	 *   }
	 * }
	 */
	getPost = 'getPost',

	/**
	 * 將文章更改發布為可見（DRAFT → LIVE） / Publish a post (DRAFT → LIVE)
	 *
	 * POST /{blogId}/posts/<%= postId %>/publish
	 *
	 * 將 DRAFT 文章發布為 LIVE。
	 * 無請求主體，回應一定包含 status: "LIVE"。
	 * 對已是 LIVE 的文章再次 publish 可能導致錯誤。
	 *
	 * Publishes a DRAFT post to LIVE.
	 * No request body, response always includes status: "LIVE".
	 * Calling publish on an already-LIVE post may error.
	 *
	 * @see {RestClient.httpPublish}
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}/publish',
	 *   method: EnumHttpMethod.POST,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *   },
	 *   response: {
	 *     status: EnumPostStatus.Live,
	 *   }
	 * }
	 */
	setPostStatusLive = 'setPostStatusLive',

	/**
	 * 將文章更改恢復為草稿（LIVE → DRAFT） / Revert a post (LIVE → DRAFT)
	 *
	 * POST /{blogId}/posts/<%= postId %>/revert
	 *
	 * 將 LIVE 文章復原為 DRAFT。
	 * 無請求主體，回應一定包含 status: "DRAFT"。
	 * 對已是 DRAFT 的文章再次 revert 可能導致錯誤。
	 *
	 * Reverts a LIVE post back to DRAFT.
	 * No request body, response always includes status: "DRAFT".
	 * Calling revert on an already-DRAFT post may error.
	 *
	 * @see {RestClient.httpRevert}
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}/revert',
	 *   method: EnumHttpMethod.POST,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *   },
	 *   response: {
	 *     status: EnumPostStatus.Draft,
	 *   }
	 * }
	 */
	setPostStatusDraft = 'setPostStatusDraft',

	/**
	 * 透過路徑取得文章 / Get post by path
	 *
	 * GET /blogs/{blogId}/posts/byPath?path={path}
	 *
	 * 文章路徑是文章網址中主機後面的部分。
	 * 舉例來說，
	 * 網址為 `http://code.blogger.com/2011/09/blogger-json-api-now-available.html`
	 * 的網誌文章路徑為 `/2011/09/blogger-json-api-now-available.html`
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/getByPath?hl=zh-tw
	 */
	getByPath = 'getByPath',

	/**
	 * 列出文章 / List posts
	 *
	 * GET /blogs/{blogId}/posts
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/list?hl=zh-tw
	 */
	listPosts = 'listPosts',
}

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
export function getUrlCore(
	url: string | IUrlGetter | undefined,
	defaultValue: string,
	params?: {
		postId?: IBloggerProfile["blogId"];
		[p: string]: string | number | boolean | undefined;
	},
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
	else if (!resultUrl?.length)
	{
		throw new TypeError('URL is empty');
	}
	else
	{
		return resultUrl;
	}
}

export function getUrl(
	url: string | IUrlGetter | undefined,
	params?: {
		postId?: IBloggerProfile["blogId"];
		[p: string]: string | number | boolean | undefined;
	},
): string
{
	return getUrlCore(url, void 0 as any, params);
}

/**
 * Blogger REST API 端點集合
 * Blogger REST API endpoint set
 *
 * 根據部落格 ID 建立對應的 API 端點路徑。
 * 使用 lodash template 語法（`<%= ... %>`）標記動態參數位置，
 * 呼叫時需透過 `getUrl()` 傳入 `params` 物件進行插值。
 * Creates API endpoint paths from blog ID.
 * Uses lodash template syntax (`<%= ... %>`) for dynamic parameter placeholders;
 * interpolate via `getUrl()` by passing a `params` object.
 *
 * @param blogId - 部落格 ID / Blog ID
 */
export function getBloggerRestEndpoint(blogId: IBloggerProfile["blogId"])
{
	return {
		[EnumBloggerRestEndpoint.base]: BLOGGER_API_ENDPOINT,
		[EnumBloggerRestEndpoint.newPost]: () => `/${blogId}/posts?isDraft=<%= isDraft %>` as const,
		[EnumBloggerRestEndpoint.editPost]: () => `/${blogId}/posts/<%= postId %>=` as const,
		[EnumBloggerRestEndpoint.patchPost]: () => `/${blogId}/posts/<%= postId %>=` as const,
		[EnumBloggerRestEndpoint.getPost]: () => `/${blogId}/posts/<%= postId %>=` as const,
		[EnumBloggerRestEndpoint.setPostStatusLive]: () => `/${blogId}/posts/<%= postId %>/publish` as const,
		[EnumBloggerRestEndpoint.setPostStatusDraft]: () => `/${blogId}/posts/<%= postId %>/revert` as const,
		[EnumBloggerRestEndpoint.getByPath]: () => `/${blogId}/posts/byPath?path=<%= path %>` as const,
		[EnumBloggerRestEndpoint.listPosts]: () => `/${blogId}/posts` as const,
	} as const satisfies IBloggerRestEndpoint
}

/**
 * Blogger REST API 端點結構介面
 * Blogger REST API endpoint structure interface
 *
 * 定義所有 Blogger API 端點的合約格式。
 * 每個欄位可以是靜態 URL 字串、惰性求值函式（IUrlGetter），
 * 或 undefined（此時由 getUrl() 的 defaultValue 參數代償）。
 *
 * 實際端點路徑由 `getBloggerRestEndpoint()` 產生，
 * URL 解析與參數插值統一由 `getUrl()` 處理。
 *
 * Defines the contract for all Blogger API endpoints.
 * Each field can be a static URL string, a lazy-evaluated getter (IUrlGetter),
 * or undefined (fallback to getUrl()'s defaultValue parameter).
 *
 * Actual paths are generated by `getBloggerRestEndpoint()`,
 * URL resolution and parameter interpolation are handled by `getUrl()`.
 */
export interface IBloggerRestEndpoint extends Record<EnumBloggerRestEndpoint, IRestEndpointUrl>
{
	/**
	 * Blogger API v3 基礎端點 / Blogger API v3 base endpoint
	 *
	 * 固定值：https://www.googleapis.com/blogger/v3/blogs
	 * 所有文章端點皆以此為前綴。
	 * Constant: https://www.googleapis.com/blogger/v3/blogs
	 * All post endpoints are prefixed with this.
	 *
	 * @example
	 * {
	 *   path: 'https://www.googleapis.com/blogger/v3/blogs',
	 *   method: EnumHttpMethod.GET
	 * }
	 */
	[EnumBloggerRestEndpoint.base]: IRestEndpointUrl;

	/**
	 * 建立新文章 / Create a new post
	 *
	 * POST /{blogId}/posts?isDraft=<%= isDraft %>
	 *
	 * 用於首次發布文章到 Blogger。
	 * isDraft 是否要以草稿形式建立貼文
	 *
	 * isDraft=true 建立草稿，false 直接發布。
	 * 請求主體須包含 kind、blog.id、title、content、labels、status。
	 *
	 * Used for first-time publishing. isDraft=true creates a draft, false publishes live.
	 * Request body must include kind, blog.id, title, content, labels, status.
	 *
	 * @see {BloggerCoreApiClient.publish}
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/insert?hl=zh-tw
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts?isDraft={isDraft}',
	 *   method: EnumHttpMethod.POST,
	 *   query: {
	 *     isDraft: boolean,
	 *   },
	 *   body: {
	 *     kind: 'blogger#post',
	 *     blog: { id: IBloggerPostParamsCore["postId"] },
	 *     title: string,
	 *     content: string,
	 *     labels: string[],
	 *     status: EnumPostStatus.Draft | EnumPostStatus.Live,
	 *   }
	 * }
	 */
	[EnumBloggerRestEndpoint.newPost]: IRestEndpointUrl;

	/**
	 * 完整更新（取代）已有文章
	 * Fully update (replace) an existing post
	 *
	 * PUT /{blogId}/posts/<%= postId %>
	 *
	 * 完整取代（PUT）已有文章。
	 * ⚠️ PUT 會完整取代所有欄位，未提供的內容會被清空。
	 *
	 * Fully replaces (PUT) an existing post.
	 * ⚠️ PUT overwrites all fields — omitted content will be cleared.
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/update?hl=zh-tw
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}?isDraft={isDraft}',
	 *   method: EnumHttpMethod.PUT,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *   },
	 *   body: {
	 *     kind: 'blogger#post',
	 *     blog: { id: IBloggerPostParamsCore["postId"] },
	 *     title: string,
	 *     content: string,
	 *     labels: string[],
	 *     status: EnumPostStatus.Draft | EnumPostStatus.Live,
	 *   }
	 * }
	 */
	[EnumBloggerRestEndpoint.editPost]: IRestEndpointUrl;

	/**
	 * 部分更新文章
	 * Partially update an existing post
	 *
	 * PATCH /{blogId}/posts/<%= postId %>
	 *
	 * 僅更新有提供的欄位（PATCH），不影響其他內容。
	 * 適合輕量操作，如只更新 status。
	 *
	 * Updates only the provided fields (PATCH).
	 * Suitable for lightweight operations, e.g. status-only update.
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/patch?hl=zh-tw
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}?isDraft={isDraft}',
	 *   method: EnumHttpMethod.PATCH,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *   },
	 *   body: {
	 *     status: EnumPostStatus.Draft | EnumPostStatus.Live,
	 *   }
	 * }
	 */
	[EnumBloggerRestEndpoint.patchPost]: IRestEndpointUrl;

	/**
	 * 取得單一文章
	 * Get a single post
	 *
	 * GET /{blogId}/posts/<%= postId %>?view=<%= view %>
	 *
	 * 如果文章位於私人網誌上，則必須取得授權。
	 * 如果文章是在公開的網誌上，則可以在未經授權的情況下呼叫此方法。
	 *
	 * 模板參數 / Template parameters:
	 *   view   — 檢視模式（字串），以指定的檢視模式來偵測文章可見性與可取得資訊
	 *            View mode (string), controls post visibility
	 *
	 *   view=AUTHOR：作者層級詳細資料
	 *     LIVE 文章  → ✅ 成功（有 status 欄位，值為 LIVE）
	 *     DRAFT 文章 → ✅ 成功（有 status 欄位，值為 DRAFT）
	 *
	 *   無 view 或 view=READER：讀者層級詳細資料
	 *     LIVE 文章  → ✅ 成功（但無 status 欄位，需預設為 LIVE）
	 *     DRAFT 文章 → ❌ HTTP 404（！！）
	 *
	 *   view=ADMIN：管理員層級詳細資料
	 *
	 *   maxComments — (可選) 貼文資源中可擷取的留言數量上限。如未指定這個參數，系統就不會傳回任何註解。
	 *
	 * 結論：讀取 DRAFT 文章時**必須**加上 view=AUTHOR，否則必定 404。
	 *       `?isDraft=true` 無法繞過此限制（已實測確認無效）。
	 *
	 * @see {BloggerCoreApiClient.getPost}
	 * @see {BloggerCoreApiClient.updatePostStatusOnly}
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/get?hl=zh-tw
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}?view={view}',
	 *   method: EnumHttpMethod.GET,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *     view: EnumBloggerViewMode,
	 *     maxComments?: number,
	 *   },
	 *   response: {
	 *     status: EnumPostStatus.Draft | EnumPostStatus.Live,
	 *   }
	 * }
	 */
	[EnumBloggerRestEndpoint.getPost]: IRestEndpointUrl;

	/**
	 * 將文章更改發布為可見（DRAFT → LIVE） / Publish a post (DRAFT → LIVE)
	 *
	 * POST /{blogId}/posts/<%= postId %>/publish
	 *
	 * 將 DRAFT 文章發布為 LIVE。
	 * 無請求主體，回應一定包含 status: "LIVE"。
	 * 對已是 LIVE 的文章再次 publish 可能導致錯誤。
	 *
	 * Publishes a DRAFT post to LIVE.
	 * No request body, response always includes status: "LIVE".
	 * Calling publish on an already-LIVE post may error.
	 *
	 * @see {RestClient.httpPublish}
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}/publish',
	 *   method: EnumHttpMethod.POST,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *   },
	 *   response: {
	 *     status: EnumPostStatus.Live,
	 *   }
	 * }
	 */
	[EnumBloggerRestEndpoint.setPostStatusLive]: IRestEndpointUrl;

	/**
	 * 將文章更改恢復為草稿（LIVE → DRAFT） / Revert a post (LIVE → DRAFT)
	 *
	 * POST /{blogId}/posts/<%= postId %>/revert
	 *
	 * 將 LIVE 文章復原為 DRAFT。
	 * 無請求主體，回應一定包含 status: "DRAFT"。
	 * 對已是 DRAFT 的文章再次 revert 可能導致錯誤。
	 *
	 * Reverts a LIVE post back to DRAFT.
	 * No request body, response always includes status: "DRAFT".
	 * Calling revert on an already-DRAFT post may error.
	 *
	 * @see {RestClient.httpRevert}
	 *
	 * @example
	 * {
	 *   path: '/{blogId}/posts/{postId}/revert',
	 *   method: EnumHttpMethod.POST,
	 *   query: {
	 *     postId: IBloggerPostParamsCore["postId"],
	 *   },
	 *   response: {
	 *     status: EnumPostStatus.Draft,
	 *   }
	 * }
	 */
	[EnumBloggerRestEndpoint.setPostStatusDraft]: IRestEndpointUrl;

	/**
	 * 透過路徑取得文章 / Get post by path
	 *
	 * GET /blogs/{blogId}/posts/byPath?path={path}
	 *
	 * 文章路徑是文章網址中主機後面的部分。
	 * 舉例來說，
	 * 網址為 `http://code.blogger.com/2011/09/blogger-json-api-now-available.html`
	 * 的網誌文章路徑為 `/2011/09/blogger-json-api-now-available.html`
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/getByPath?hl=zh-tw
	 */
	[EnumBloggerRestEndpoint.getByPath]: IRestEndpointUrl;

	/**
	 * 列出文章 / List posts
	 *
	 * GET /blogs/{blogId}/posts
	 *
	 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/list?hl=zh-tw
	 */
	[EnumBloggerRestEndpoint.listPosts]: IRestEndpointUrl;
}
