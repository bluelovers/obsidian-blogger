import { EnumPostStatus } from '../../types/const';
import { AbstractRequestClientWithConstructor } from '../request/request-client';
import { IObsidianRequest } from '../request/abstract-request-client';
import { _getEndpoint, _handleRestClientHref, _httpPost, EnumHttpMethod, IHttpOptions } from '../request/http-post';
import { ITSPickExtra } from 'ts-type';

/**
 * REST 客戶端建構選項介面
 * REST client constructor options interface
 *
 * @property url - Blogger API 基礎端點 URL（來自 IBloggerRestEndpoint.base）/ Blogger API base endpoint URL
 */
interface IRestOptions
{
	/** Blogger API 基礎端點 URL / Blogger API base endpoint URL */
	url: URL | {
		href: string,
	};
}

/**
 * Blogger API 請求主體介面
 * Blogger API request body interface
 *
 * 對應 Blogger API v3 Posts.insert / Posts.update 的 JSON 請求主體結構。
 * 使用 kind 區分資源類型（固定為 "blogger#post"）。
 * Maps to the JSON request body for Blogger API v3 Posts.insert / Posts.update.
 * Uses `kind` to identify the resource type (always "blogger#post").
 *
 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/insert Blogger API v3 Posts.insert
 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/update Blogger API v3 Posts.update
 * @see https://developers.google.com/blogger/docs/3.0/using?hl=zh-tw Blogger API v3 使用指南
 */
export interface IBloggerPostApiBody
{
	/**
	 * 資源類型（固定值）
	 * Resource kind (constant value)
	 *
	 * Blogger API 使用 kind 欄位來識別 JSON 資源類型。
	 * The kind field identifies the JSON resource type in the Blogger API.
	 */
	kind: 'blogger#post',

	/**
	 * 部落格資訊
	 * Blog information
	 *
	 * 包含所屬部落格的 ID，用於 API 路由與驗證。
	 * Contains the owning blog's ID for API routing and validation.
	 */
	blog: {
		/**
		 * 部落格 ID（樣板字面型別 `${number}`）
		 * Blog ID (template literal type `${number}`)
		 *
		 * Blogger API 使用純數字字串作為 ID 格式。
		 * 樣板字面型別確保型別安全並與 IBloggerProfile 保持一致。
		 * Blogger API uses plain numeric strings for IDs.
		 * Template literal type ensures type safety and consistency with IBloggerProfile.
		 *
		 * @example "8070105920543249955"
		 */
		id: `${number}`,
	};

	/** 文章標題 / Post title */
	title: string;

	/**
	 * 文章內容（HTML 格式）
	 * Post content (HTML format)
	 *
	 * Blogger API 接受 HTML 格式的文章主體。
	 * 本專案先以 markdown-it 將 Markdown 轉譯為 HTML 後再送出。
	 * The Blogger API accepts HTML-formatted post bodies.
	 * This project converts Markdown to HTML via markdown-it before submitting.
	 */
	content: string;

	/**
	 * 文章標籤列表
	 * Post labels
	 *
	 * 對應 Blogger API 的 labels 欄位，用於文章分類與搜尋。
	 * 內部管理標籤（EnumobsidianBloggerTags）在送出前會被過濾移除。
	 * Maps to the Blogger API labels field for post categorization and search.
	 * Internal management tags (EnumobsidianBloggerTags) are filtered out before sending.
	 */
	labels: string[];

	/**
	 * 文章狀態
	 * Post status
	 *
	 * 控制文章的發布狀態：
	 *   EnumPostStatus.Draft  → 草稿（不會公開顯示）
	 *   EnumPostStatus.Live   → 已發布（公開可見）
	 *   EnumPostStatus.Scheduled → 已排程
	 *   EnumPostStatus.SoftTrashed → 軟刪除
	 *
	 * Controls the post's publication status.
	 */
	status: EnumPostStatus;
}

/**
 * Blogger API 回傳主體介面
 * Blogger API response body interface
 *
 * 對應 Blogger API v3 Posts 資源（GET/POST/PUT/PATCH 回應）的 JSON 結構。
 * 使用引號包裹的屬性名稱以對應 Blogger API 的 JSON 回應欄位名稱（非駝峰式）。
 * Maps to the JSON structure of Blogger API v3 Posts resource responses.
 * Uses quoted property names to match the Blogger API's JSON response field names.
 *
 * 注意事項 / Notes:
 * - 繼承 IBloggerPostApiBody 但不包含 labels（回應中未回傳此欄位）
 *   Extends IBloggerPostApiBody but omits labels (API responses omit this field)
 * - status 欄位為可選，其存在性取決於端點與查詢參數（見下方 status 說明）
 *   status is optional; its presence depends on the endpoint and query parameters (see below)
 *
 * @see https://developers.google.com/blogger/docs/3.0/reference/posts#resource Blogger API v3 Posts resource
 */
export interface IBloggerPostApiReturn extends Omit<IBloggerPostApiBody, 'labels' | 'status'>
{
	/**
	 * 文章 ID（樣板字面型別 `${number}`）
	 * Post ID (template literal type `${number}`)
	 *
	 * Blogger API 專屬的唯一文章識別碼，建立後不可變更。
	 * 儲存於 frontmatter 的 postId 欄位，用於後續編輯與狀態切換。
	 * Blogger API's unique post identifier, immutable after creation.
	 * Stored in frontmatter's postId field for subsequent editing and status toggling.
	 *
	 * @example "6819100329896798058"
	 */
	"id": `${number}`,

	/**
	 * 發布時間（ISO 8601 格式）
	 * Published time (ISO 8601 format)
	 *
	 * 文章首次發布的時間戳。DRAFT 文章若從未發布過，此時間可能等於建立時間。
	 * The timestamp when the post was first published. For never-published DRAFT posts,
	 * this may equal the creation time.
	 *
	 * @example "2012-05-20T20:08:00-07:00"
	 */
	"published": string,

	/**
	 * 更新時間（ISO 8601 格式）
	 * Updated time (ISO 8601 format)
	 *
	 * 文章最後一次修改的時間戳（包含狀態變更、內容編輯等）。
	 * The timestamp of the last modification (status changes, content edits, etc.).
	 *
	 * @example "2012-05-20T20:08:35-07:00"
	 */
	"updated": string,

	/**
	 * 文章公開 URL
	 * Public post URL
	 *
	 * LIVE 文章的公開訪問網址。
	 * DRAFT 文章也可能有此欄位，但無法公開存取。
	 * The public URL for LIVE posts. DRAFT posts may also have this field
	 * but the URL is not publicly accessible.
	 *
	 * @example "http://brettmorgan-test2.blogspot.com/2012/05/new-post.html"
	 */
	"url": string,

	/**
	 * API 資源連結（self link）
	 * API resource self-link
	 *
	 * 此文章在 Blogger API 中的完整資源 URL。
	 * 可用於直接透過 API 再次查詢此文章。
	 * The full resource URL for this post within the Blogger API.
	 * Can be used for subsequent API queries.
	 *
	 * @example "https://www.googleapis.com/blogger/v3/blogs/8070105920543249955/posts/6819100329896798058"
	 */
	"selfLink": string,

	/**
	 * 作者資訊
	 * Author information
	 *
	 * 包含作者的 Google 帳號相關資訊。
	 * 注意：此處的 url 為個人檔案 URL，非文章 URL。
	 * Contains information about the author's Google account.
	 * Note: url here is the profile URL, not the post URL.
	 */
	"author": {
		/** 作者 ID（樣板字面型別 `${number}`）/ Author ID */
		"id": `${number}`,
		/** 作者顯示名稱 / Author display name */
		"displayName": string,
		/**
		 * 作者個人檔案 URL
		 * Author profile URL
		 *
		 * @example "http://www.blogger.com/profile/16258312240222542576"
		 */
		"url": string,
		/** 作者頭像 / Author avatar */
		"image": {
			/**
			 * 頭像圖片 URL
			 * Avatar image URL
			 *
			 * @example "https://resources.blogblog.com/img/b16-rounded.gif"
			 */
			"url": string
		}
	},

	/**
	 * 回覆（留言）資訊
	 * Reply (comment) information
	 *
	 * 包含此文章的回覆總數與回覆 API 連結。
	 * 此欄位僅提供計數與連結，不含回覆內容本身。
	 * Contains total reply count and replies API link.
	 * This field only provides counts and links, not the actual reply content.
	 */
	"replies": {
		/**
		 * 回覆總數（樣板字面型別 `${number}`）
		 * Total reply count (template literal type `${number}`)
		 *
		 * @example "0"
		 */
		"totalItems": `${number}`,
		/**
		 * 回覆 API 連結
		 * Replies API self-link
		 *
		 * @example "https://www.googleapis.com/blogger/v3/blogs/8070105920543249955/posts/6819100329896798058/comments"
		 */
		"selfLink": string
	}

	/**
	 * 文章狀態
	 * Post status
	 *
	 * ═══════════════════════════════════════════════════════════
	 * 實測行為 / Empirical behavior (verified 2026-05-16)
	 * ═══════════════════════════════════════════════════════════
	 *
	 * 此欄位是否出現，取決於端點與查詢參數：
	 * Whether this field appears depends on the endpoint and query parameters:
	 *
	 * ┌─────────────────────┬─────────────┬──────────────────┐
	 * │ 端點 / Endpoint      │ DRAFT       │ LIVE             │
	 * ├─────────────────────┼─────────────┼──────────────────┤
	 * │ GET + view=AUTHOR   │ ✅ "DRAFT"  │ ❌ 無此欄位       │
	 * │ GET + 無 view       │ ❌ 404      │ ❌ 無此欄位       │
	 * │ publishPost         │ ✅ "LIVE"   │ —                │
	 * │ revertPost          │ —           │ ✅ "DRAFT"       │
	 * │ newPost / editPost  │ ✅ 有       │ ✅ 有             │
	 * └─────────────────────┴─────────────┴──────────────────┘
	 *
	 * 應用層預設值：response.status ?? EnumPostStatus.Live（見 blogger-client.ts）
	 * Application default: response.status ?? EnumPostStatus.Live (see blogger-client.ts)
	 *
	 * @todo 官方 API 文件未說明此欄位的可選性及條件行為。
	 * @todo The official API documentation does not explain the optionality or conditional behavior.
	 */
	status?: EnumPostStatus,
}

/**
 * REST 客戶端類別
 * REST client class
 *
 * 封裝 Blogger API v3 的 HTTP 方法（GET/POST/PUT/PATCH），
 * 提供類型安全的端點呼叫。
 * Wraps Blogger API v3 HTTP methods (GET/POST/PUT/PATCH)
 * with type-safe endpoint calls.
 */
export class RestClient extends AbstractRequestClientWithConstructor
{
	/**
	 * API 基礎路徑（已移除結尾 `/`）
	 * API base path (trailing `/` removed)
	 */
	protected readonly href: string;

	/**
	 * @param options - REST 客戶端選項（含端點 URL）/ REST client options (with endpoint URL)
	 * @param obsidianRequest - 可選的 requestUrl 實作，用於測試注入 / Optional requestUrl implementation for testing
	 */
	constructor(protected readonly options: IRestOptions, obsidianRequest?: IObsidianRequest)
	{
		super(obsidianRequest);

		this.href = _handleRestClientHref(this.options.url.href);
	}

	/**
	 * 取得完整 API 端點 URL
	 * Get the full API endpoint URL
	 *
	 * @param path - 相對於基礎路徑的路徑 / Path relative to base
	 * @returns 完整端點 URL / Full endpoint URL
	 */
	getEndpoint(path: string): string
	{
		return _getEndpoint(this.href, path);
	}

	/**
	 * 發送 HTTP GET 請求
	 * Send an HTTP GET request
	 *
	 * ⚠️ 對 DRAFT 文章使用 GET 時，需在端點路徑中加入 view=AUTHOR 參數，
	 *    否則 Blogger API 會回傳 404。
	 * ⚠️ When GETting DRAFT posts, include view=AUTHOR in the endpoint path,
	 *    otherwise Blogger API returns 404.
	 *
	 * 無主體請求，委派給 _httpPost（body 參數為 undefined）。
	 * Body-less request, delegates to _httpPost (body omitted).
	 *
	 * @param path - API 路徑（含查詢參數）/ API path (with query parameters)
	 * @param options - 可選的請求標頭 / Optional request headers
	 */
	async httpGet(
		path: string,
		/**
		 * 不確定之前阪本是忘記 `headers?:` 還是故意讓 headers 必須填寫
		 */
		options?: ITSPickExtra<IHttpOptions, 'headers'>,
	): Promise<IBloggerPostApiReturn>
	{
		return _httpPost(EnumHttpMethod.GET, path, this, undefined, options);
	}

	/**
	 * 發送 HTTP POST 請求（建立資源）
	 * Send an HTTP POST request (create resource)
	 *
	 * @param path - API 路徑 / API path
	 * @param body - 請求主體 / Request body
	 * @param options - 可選的請求標頭與表單名稱映射器 / Optional headers and form name mapper
	 */
	async httpPost(
		path: string,
		body: IBloggerPostApiBody,
		options: IHttpOptions,
	): Promise<IBloggerPostApiReturn>
	{
		return _httpPost(EnumHttpMethod.POST, path, this, body, options);
	}

	/**
	 * 發送 HTTP PUT 請求（更新資源）
	 * Send an HTTP PUT request (update resource)
	 *
	 * @param path - API 路徑 / API path
	 * @param body - 請求主體 / Request body
	 * @param options - 可選的請求標頭與表單名稱映射器 / Optional headers and form name mapper
	 */
	async httpPut(
		path: string,
		body: IBloggerPostApiBody,
		options: IHttpOptions,
	): Promise<IBloggerPostApiReturn>
	{
		return _httpPost(EnumHttpMethod.PUT, path, this, body, options);
	}

	/**
	 * 發送 HTTP PATCH 請求（部分更新資源）
	 * Send an HTTP PATCH request (partial update resource)
	 *
	 * @param path - API 路徑 / API path
	 * @param body - 部分請求主體 / Partial request body
	 * @param options - 可選的請求標頭與表單名稱映射器 / Optional headers and form name mapper
	 */
	async httpPatch(
		path: string,
		body: Partial<IBloggerPostApiBody>,
		options: IHttpOptions,
	): Promise<IBloggerPostApiReturn>
	{
		return _httpPost(EnumHttpMethod.PATCH, path, this, body as IBloggerPostApiBody, options);
	}

	/**
	 * 發送 HTTP POST 請求（無主體 — 用於 publish / revert 等動作端點）
	 * Send an HTTP POST request without body — for action endpoints (publish / revert)
	 *
	 * 無主體請求，委派給 _httpPost（body 參數為 undefined）。
	 * Body-less request, delegates to _httpPost (body omitted).
	 *
	 * @param path - API 路徑 / API path
	 * @param options - 可選的請求標頭 / Optional request headers
	 */
	async httpPublish(
		path: string,
		options?: IHttpOptions,
	): Promise<IBloggerPostApiReturn>
	{
		return _httpPost(EnumHttpMethod.POST, path, this, undefined, options);
	}

	/**
	 * 發送 HTTP POST 請求（無主體 — 用於 revert 動作端點）
	 * Send an HTTP POST request without body — for revert action endpoint
	 *
	 * 無主體請求，委派給 _httpPost（body 參數為 undefined）。
	 * Body-less request, delegates to _httpPost (body omitted).
	 *
	 * @param path - API 路徑 / API path
	 * @param options - 可選的請求標頭 / Optional request headers
	 */
	async httpRevert(
		path: string,
		options?: IHttpOptions,
	): Promise<IBloggerPostApiReturn>
	{
		return _httpPost(EnumHttpMethod.POST, path, this, undefined, options);
	}
}
