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
		/**
		 * Blogger API v3 基礎端點
		 * Blogger API v3 base endpoint
		 *
		 * 固定值：https://www.googleapis.com/blogger/v3/blogs
		 * Constant: https://www.googleapis.com/blogger/v3/blogs
		 *
		 * 所有文章端點皆以此為前綴，後接 `/{blogId}/posts/...`。
		 * All post endpoints are prefixed with this, followed by `/{blogId}/posts/...`.
		 */
		base: BLOGGER_API_ENDPOINT,

		/**
		 * 建立新文章
		 * Create a new post
		 *
		 * 路徑模板：`/{blogId}/posts?isDraft=<%= isDraft %>`
		 * Path template：`/{blogId}/posts?isDraft=<%= isDraft %>`
		 *
		 * 模板參數 / Template parameters:
		 *   blogId  — 由 getBloggerRestEndpoint() 傳入，固化在 closure 中
		 *             Passed into getBloggerRestEndpoint(), baked into the closure
		 *
		 * 查詢參數 / Query parameters:
		 *   isDraft — boolean, 由 getUrl() params 傳入
		 *             ⚠️ 注意：此參數為 boolean，但在 lodash template 中會自動轉為字串
		 *             Passed via getUrl() params
		 *             ⚠️ Note: boolean auto-converts to string in lodash template
		 *   true  → 建立 DRAFT 草稿文章 / Create as DRAFT
		 *   false → 直接發布 LIVE 文章 / Publish as LIVE immediately
		 *
		 * HTTP 方法：POST（透過 RestClient.httpPost()）
		 * HTTP method: POST (via RestClient.httpPost())
		 *
		 * 請求主體：需包含 kind、blog.id、title、content、labels、status
		 * Request body: must include kind, blog.id, title, content, labels, status
		 */
		newPost: () => `/${blogId}/posts?isDraft=<%= isDraft %>` as const,

		/**
		 * 完整更新（取代）已有文章
		 * Fully update (replace) an existing post
		 *
		 * 路徑模板：`/{blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>`
		 * Path template：`/{blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>`
		 *
		 * 模板參數 / Template parameters:
		 *   postId  — 目標文章的 Blogger ID（樣板字面型別 `${number}`）
		 *              Target post's Blogger ID (template literal type `${number}`)
		 *   isDraft — boolean, 控制更新後的草稿狀態
		 *              Controls whether the post remains as draft after update
		 *
		 * HTTP 方法：PUT（透過 RestClient.httpPut()）
		 * HTTP method: PUT (via RestClient.httpPut())
		 *
		 * ⚠️ PUT 會完整取代文章內容，未提供的欄位可能被清空
		 * ⚠️ PUT replaces the entire post — omitted fields may be cleared
		 */
		editPost: () => `/${blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>` as const,

		/**
		 * 部分更新文章
		 * Partially update an existing post
		 *
		 * 路徑模板：`/{blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>`
		 * Path template：`/{blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>`
		 *
		 * 模板參數 / Template parameters:
		 *   postId  — 目標文章的 Blogger ID
		 *              Target post's Blogger ID
		 *   isDraft — boolean, 控制更新後的草稿狀態
		 *              Controls whether the post remains as draft after update
		 *
		 * HTTP 方法：PATCH（透過 RestClient.httpPatch()）
		 * HTTP method: PATCH (via RestClient.httpPatch())
		 *
		 * 適用場景：僅更新特定欄位（如 status），不影響其他內容
		 * Use case: update only specific fields (e.g. status), leave other content intact
		 *
		 * 本專案中 `updatePostStatus()` 使用此端點搭配 `{ status: newStatus }` 主體
		 * In this project, `updatePostStatus()` uses this endpoint with `{ status: newStatus }` body
		 */
		patchPost: () => `/${blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>` as const,

		/**
		 * 取得單一文章
		 * Get a single post
		 *
		 * 路徑模板：`/{blogId}/posts/<%= postId %>?view=<%= view %>`
		 * Path template：`/{blogId}/posts/<%= postId %>?view=<%= view %>`
		 *
		 * 模板參數 / Template parameters:
		 *   postId — 目標文章的 Blogger ID
		 *            Target post's Blogger ID
		 *   view   — 檢視模式（字串），控制文章可見性
		 *            View mode (string), controls post visibility
		 *
		 * HTTP 方法：GET（透過 RestClient.httpGet()）
		 * HTTP method: GET (via RestClient.httpGet())
		 *
		 * ⚠️ view 參數行為（2026-05-16 實測）⚠️
		 * ⚠️ view parameter behavior (verified 2026-05-16) ⚠️
		 *
		 *   無 view 或 view=READER：
		 *     LIVE 文章  → ✅ 成功（但無 status 欄位，需預設為 LIVE）
		 *     LIVE post  → ✅ success (no status field, default to LIVE)
		 *     DRAFT 文章 → ❌ HTTP 404（！！）
		 *     DRAFT post → ❌ HTTP 404 (!!)
		 *
		 *   view=AUTHOR：
		 *     LIVE 文章  → ✅ 成功，無 status 欄位
		 *     LIVE post  → ✅ success, no status field
		 *     DRAFT 文章 → ✅ 成功，有 status: "DRAFT"
		 *     DRAFT post → ✅ success, includes status: "DRAFT"
		 *
		 * 結論：讀取 DRAFT 文章時**必須**加上 view=AUTHOR，否則必定 404。
		 *       `?isDraft=true` 無法繞過此限制（已實測確認無效）。
		 * Conclusion: fetching DRAFT posts REQUIRES view=AUTHOR, otherwise 404.
		 *       `?isDraft=true` does NOT bypass this (verified ineffective).
		 *
		 * 參考文件：docs/blogger-api-endpoints.md
		 * Reference: docs/blogger-api-endpoints.md
		 */
		getPost: () => `/${blogId}/posts/<%= postId %>?view=<%= view %>` as const,

		/**
		 * 發布文章（DRAFT → LIVE）
		 * Publish a post (DRAFT → LIVE)
		 *
		 * 路徑模板：`/{blogId}/posts/<%= postId %>/publish`
		 * Path template：`/{blogId}/posts/<%= postId %>/publish`
		 *
		 * 模板參數 / Template parameters:
		 *   postId — 目標文章的 Blogger ID
		 *            Target post's Blogger ID
		 *
		 * HTTP 方法：POST，無請求主體（透過 RestClient.httpPublish()）
		 * HTTP method: POST, no request body (via RestClient.httpPublish())
		 *
		 * 回應：一定包含 status: "LIVE"
		 * Response: always includes status: "LIVE"
		 */
		publishPost: () => `/${blogId}/posts/<%= postId %>/publish` as const,

		/**
		 * 復原文章（LIVE → DRAFT）
		 * Revert a post (LIVE → DRAFT)
		 *
		 * 路徑模板：`/{blogId}/posts/<%= postId %>/revert`
		 * Path template：`/{blogId}/posts/<%= postId %>/revert`
		 *
		 * 模板參數 / Template parameters:
		 *   postId — 目標文章的 Blogger ID
		 *            Target post's Blogger ID
		 *
		 * HTTP 方法：POST，無請求主體（透過 RestClient.httpRevert()）
		 * HTTP method: POST, no request body (via RestClient.httpRevert())
		 *
		 * 回應：一定包含 status: "DRAFT"
		 * Response: always includes status: "DRAFT"
		 */
		revertPost: () => `/${blogId}/posts/<%= postId %>/revert` as const,
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
export interface IBloggerRestEndpoint
{
	/**
	 * Blogger API v3 基礎端點 / Blogger API v3 base endpoint
	 *
	 * 固定值：https://www.googleapis.com/blogger/v3/blogs
	 * 所有文章端點皆以此為前綴。
	 * Constant: https://www.googleapis.com/blogger/v3/blogs
	 * All post endpoints are prefixed with this.
	 */
	base: string | IUrlGetter;

	/**
	 * 建立新文章端點 / Create new post endpoint
	 *
	 * POST /{blogId}/posts?isDraft=<%= isDraft %>
	 *
	 * 用於首次發布文章到 Blogger。
	 * isDraft=true 建立草稿，false 直接發布。
	 * 請求主體須包含 kind、blog.id、title、content、labels、status。
	 *
	 * Used for first-time publishing. isDraft=true creates a draft, false publishes live.
	 * Request body must include kind, blog.id, title, content, labels, status.
	 */
	newPost: string | IUrlGetter;

	/**
	 * 編輯已有文章端點 / Edit existing post endpoint
	 *
	 * PUT /{blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>
	 *
	 * 完整取代（PUT）已有文章。
	 * ⚠️ PUT 會完整取代所有欄位，未提供的內容會被清空。
	 * isDraft 控制文章是否為草稿狀態。
	 *
	 * Fully replaces (PUT) an existing post.
	 * ⚠️ PUT overwrites all fields — omitted content will be cleared.
	 * isDraft controls whether the post stays as draft.
	 */
	editPost: string | IUrlGetter;

	/**
	 * 部分更新文章端點 / Patch post endpoint
	 *
	 * PATCH /{blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>
	 *
	 * 僅更新有提供的欄位（PATCH）。
	 * 適合輕量操作，如只更新 status。
	 * 本專案的 updatePostStatus() 使用此端點。
	 *
	 * Updates only the provided fields (PATCH).
	 * Suitable for lightweight operations, e.g. status-only update.
	 * Used by this project's updatePostStatus().
	 */
	patchPost: string | IUrlGetter;

	/**
	 * 取得單一文章端點 / Get single post endpoint
	 *
	 * GET /{blogId}/posts/<%= postId %>?view=<%= view %>
	 *
	 * 透過 postId 取得文章詳細資料。
	 * view 參數控制可見性：
	 *   - view=AUTHOR → 可讀取 DRAFT 文章（包含 status="DRAFT"）
	 *   - 無 view     → DRAFT 文章回傳 404（已知限制）
	 *
	 * 詳見 docs/blogger-api-endpoints.md
	 *
	 * Fetches post details by postId.
	 * The view parameter controls visibility:
	 *   - view=AUTHOR → can read DRAFT posts (includes status="DRAFT")
	 *   - no view     → DRAFT posts return 404 (known limitation)
	 *
	 * See docs/blogger-api-endpoints.md for details.
	 */
	getPost: string | IUrlGetter;

	/**
	 * 發布文章端點 / Publish post endpoint
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
	 */
	publishPost: string | IUrlGetter;

	/**
	 * 復原文章端點 / Revert post endpoint
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
	 */
	revertPost: string | IUrlGetter;
}
