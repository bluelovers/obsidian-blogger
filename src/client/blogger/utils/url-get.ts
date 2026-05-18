import { EnumHttpMethod } from '../../../client/request/http-post';
import { EnumBloggerRestEndpoint, EnumBloggerViewMode, getUrl, IBloggerRestEndpoint } from './url';
import { ITSRequireAtLeastOne } from 'ts-type';
import { IBloggerPostApiBody, IBloggerPostApiReturn, RestClient } from '../rest-client';
import { IHttpHeaders } from '../../../types/http';
import { EnumPostStatus } from '../../../types/const';
import { IBloggerProfile } from '../../../types/blogger-profile';

export interface IEndpointQuery
{
	postId?: IBloggerProfile["blogId"];

	[p: string]: string | number | boolean | undefined;
}

export interface IEndpointQueryWithPostId extends IEndpointQuery
{
	postId: IBloggerProfile["blogId"];
}

export interface IEndpointRequestInit<K extends EnumBloggerRestEndpoint> extends Pick<IBloggerRestEndpointHelperDetect<K>, 'query' | 'body'>
{
	headers: IHttpHeaders;
}

/**
 * 建立可依照 IBloggerRestEndpointHelperDetect<EnumBloggerRestEndpoint> 來自動偵測所需要輸入的資料是否符合類型定義
 * @internal
 */
interface _IEndpointImpl
{
	method: EnumHttpMethod;
	query?: IEndpointQuery;
	body?: unknown;

	/**
	 * @todo 此欄位等待實作完成後再依據實際測試 api 取得的結果來定義
	 */
	response: unknown;
}

interface _IEndpointImplWithoutBody extends _IEndpointImpl
{
	body?: undefined;
}

/**
 * 建立新文章 / Create a new post
 *
 * POST /{blogId}/posts?isDraft=<%= isDraft %>
 */
export interface IBloggerRestEndpointNewPost extends _IEndpointImpl
{
	endpointID: EnumBloggerRestEndpoint.newPost;
	method: EnumHttpMethod.POST;

	query: {
		isDraft: boolean;
	};
	body: IBloggerPostApiBody;

	response: IBloggerPostApiReturn;
}

/**
 * 完整更新（取代）已有文章 / Fully update (replace) an existing post
 *
 * PUT /{blogId}/posts/<%= postId %>
 */
export interface IBloggerRestEndpointPostEdit extends _IEndpointImpl
{
	endpointID: EnumBloggerRestEndpoint.editPost;
	method: EnumHttpMethod.PUT;

	query: IEndpointQueryWithPostId;

	body: IBloggerPostApiBody;

	response: IBloggerPostApiReturn;
}

/**
 * 部分更新文章 / Partially update an existing post
 *
 * PATCH /{blogId}/posts/<%= postId %>
 */
export interface IBloggerRestEndpointPostPatch extends _IEndpointImpl
{
	endpointID: EnumBloggerRestEndpoint.patchPost;
	method: EnumHttpMethod.PATCH;

	query: IEndpointQueryWithPostId;

	body: ITSRequireAtLeastOne<Partial<IBloggerPostApiBody>>;

	response: IBloggerPostApiReturn;
}

/**
 * 取得單一文章 / Get a single post
 *
 * GET /{blogId}/posts/<%= postId %>
 */
export interface IBloggerRestEndpointGetPost extends _IEndpointImplWithoutBody
{
	endpointID: EnumBloggerRestEndpoint.getPost;
	method: EnumHttpMethod.GET;
	query: IEndpointQueryWithPostId & {
		view: EnumBloggerViewMode;
		maxComments?: number;
	};

	response: IBloggerPostApiReturn;
}

/**
 * 將文章更改發布為可見（DRAFT → LIVE）/ Publish a post (DRAFT → LIVE)
 *
 * POST /{blogId}/posts/<%= postId %>/publish
 */
export interface IBloggerRestEndpointSetPostStatusLive extends _IEndpointImplWithoutBody
{
	endpointID: EnumBloggerRestEndpoint.setPostStatusLive;
	method: EnumHttpMethod.POST;
	query: IEndpointQueryWithPostId;

	response: IBloggerPostApiReturn;
}

/**
 * 將文章更改恢復為草稿（LIVE → DRAFT）/ Revert a post (LIVE → DRAFT)
 *
 * POST /{blogId}/posts/<%= postId %>/revert
 */
export interface IBloggerRestEndpointSetPostStatusDraft extends _IEndpointImplWithoutBody
{
	endpointID: EnumBloggerRestEndpoint.setPostStatusDraft;
	method: EnumHttpMethod.POST;
	query: IEndpointQueryWithPostId;

	response: IBloggerPostApiReturn;
}

/**
 * 透過路徑取得文章 / Get post by path
 *
 * GET /blogs/{blogId}/posts/byPath?path={path}
 */
export interface IBloggerRestEndpointGetByPath extends _IEndpointImplWithoutBody
{
	endpointID: EnumBloggerRestEndpoint.getByPath;
	method: EnumHttpMethod.GET;
	query: IBloggerRestEndpointGetPost["query"] & {
		path: string;
	};

	response: IBloggerPostApiReturn;
}

/**
 * 列出文章 / List posts
 *
 * GET /blogs/{blogId}/posts
 *
 * @see https://developers.google.com/blogger/docs/3.0/reference/posts/list?hl=zh-tw
 */
export interface IBloggerRestEndpointPostList extends _IEndpointImplWithoutBody
{
	endpointID: EnumBloggerRestEndpoint.listPosts;
	method: EnumHttpMethod.GET;
	query: {
		/**
		 * 要擷取的最新貼文日期，格式為 date-time，並採用 RFC 3339 格式。
		 */
		endDate?: string;

		/**
		 * 要擷取的最舊貼文日期，格式為 date-time，並採用 RFC 3339 格式。
		 */
		startDate?: string;

		/** 篩選狀態 / Filter by status */
		status?: EnumPostStatus.Draft | EnumPostStatus.Live | EnumPostStatus.Scheduled;

		/** 檢視模式 / View mode */
		view: EnumBloggerViewMode;

		/**
		 * 是否要納入貼文內文 (預設為 true)。
		 * 如果不需要貼文內文，請將此值設為 false，以盡量減少流量。
		 * (預設值：true)
		 *
		 * @default true
		 */
		fetchBodies?: boolean;

		/**
		 * 是否包含每則貼文的圖片網址中繼資料。
		 */
		fetchImages?: boolean;

		/**
		 * 以半形逗號分隔的標籤清單，用於搜尋。
		 */
		labels?: string;

		/**
		 * 要擷取的貼文數量上限。
		 */
		maxResults?: number;

		/**
		 * 套用至結果的排序順序。
		 *
		 * 可接受的值如下：
		 * 「published」：依貼文發布日期排序
		 * 「updated」：依貼文上次更新的日期排序
		 */
		orderBy?: 'published' | 'updated';
	};

	response: {
		kind: "blogger#postList";
		nextPageToken: string;
		items: IBloggerPostApiReturn[];
	};
}

/**
 * 所有 Blogger REST 端點的聯合型別
 * Union type for all Blogger REST endpoints
 */
export type TBloggerRestEndpointAll = IBloggerRestEndpointNewPost
	| IBloggerRestEndpointPostEdit
	| IBloggerRestEndpointPostPatch
	| IBloggerRestEndpointGetPost
	| IBloggerRestEndpointSetPostStatusLive
	| IBloggerRestEndpointSetPostStatusDraft
	| IBloggerRestEndpointGetByPath
	| IBloggerRestEndpointPostList
	;

export type IBloggerRestEndpointHelperDetect<K extends EnumBloggerRestEndpoint> = Extract<TBloggerRestEndpointAll, {
	endpointID: K
}>;

/**
 * @internal
 */
function getUrlEndpoint<K extends EnumBloggerRestEndpoint>(
	endpoints: Pick<IBloggerRestEndpoint, K>,
	endpointID: K,
	query: IBloggerRestEndpointHelperDetect<K>["query"],
): string
{
	return getUrl(endpoints[endpointID], query);
}

/**
 * @internal
 */
function getEndpointMethod<K extends EnumBloggerRestEndpoint>(
	endpointID: K,
): IBloggerRestEndpointHelperDetect<K>["method"]
{
	switch (endpointID)
	{
		case EnumBloggerRestEndpoint.newPost:
		case EnumBloggerRestEndpoint.setPostStatusLive:
		case EnumBloggerRestEndpoint.setPostStatusDraft:
			return EnumHttpMethod.POST as IBloggerRestEndpointHelperDetect<K>["method"];
		case EnumBloggerRestEndpoint.editPost:
			return EnumHttpMethod.PUT as IBloggerRestEndpointHelperDetect<K>["method"];
		case EnumBloggerRestEndpoint.patchPost:
			return EnumHttpMethod.PATCH as IBloggerRestEndpointHelperDetect<K>["method"];
		case EnumBloggerRestEndpoint.getPost:
		case EnumBloggerRestEndpoint.getByPath:
		case EnumBloggerRestEndpoint.listPosts:
			return EnumHttpMethod.GET as IBloggerRestEndpointHelperDetect<K>["method"];
	}

	throw new RangeError(`Unknown endpoint ID: ${endpointID}`);
}

/**
 * @internal 除錯用的內部函數
 */
export function _requestUrlEndpointOptions<K extends EnumBloggerRestEndpoint>(
	client: RestClient,
	endpoints: Pick<IBloggerRestEndpoint, K>,
	endpointID: K,
	requestInit: IEndpointRequestInit<K>,
)
{
	const method = getEndpointMethod(endpointID);

	const url = getUrlEndpoint(endpoints, endpointID, requestInit.query as IBloggerRestEndpointHelperDetect<K>["query"]);

	return {
		method,
		url,
		body: requestInit.body,
		options: {
			headers: requestInit.headers,
		},
	};
}

/**
 * @internal 除錯用的內部函數
 */
export async function _requestUrlEndpointCore<K extends EnumBloggerRestEndpoint>(client: RestClient, requestOpts: ReturnType<typeof _requestUrlEndpointOptions<K>>)
{
	return client.requestHttpMethod(requestOpts.method, requestOpts.url, requestOpts.body as any, requestOpts.options) as any as IBloggerRestEndpointHelperDetect<K>["response"];
}

/**
 * 發送請求至指定的 Blogger REST 端點
 * Send a request to the specified Blogger REST endpoint
 *
 * 基於 endpointID 自動選擇正確的 HTTP 方法與 URL 模板。
 * 型別系統確保 query 與 body 參數與端點定義一致。
 * Automatically selects the correct HTTP method and URL template based on endpointID.
 * The type system ensures query and body parameters match the endpoint definition.
 */
export async function requestUrlEndpoint<K extends EnumBloggerRestEndpoint>(
	client: RestClient,
	endpoints: Pick<IBloggerRestEndpoint, K>,
	endpointID: K,
	requestInit: IEndpointRequestInit<K>,
)
{
	const requestOpts = _requestUrlEndpointOptions(client, endpoints, endpointID, requestInit);

	return _requestUrlEndpointCore(client, requestOpts);
}

/** =========== 確認實作的類型是否正確 =========== */

/*
getUrlEndpoint({} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.newPost, { isDraft: true });
getUrlEndpoint({} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.editPost, { postId: "123" });
getUrlEndpoint({} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.patchPost, { postId: "123" });
getUrlEndpoint({} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.getPost, { postId: "123", view: EnumBloggerViewMode.AUTHOR });
getUrlEndpoint({} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.setPostStatusLive, { postId: "123" });
getUrlEndpoint({} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.setPostStatusDraft, { postId: "123" });
getUrlEndpoint({} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.getByPath, { path: "/2024/01/test-post.html", view: EnumBloggerViewMode.AUTHOR });
getUrlEndpoint({} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.listPosts, { view: EnumBloggerViewMode.AUTHOR });

requestUrlEndpoint({} as RestClient, {} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.newPost, {
	headers: {},
	body: {} as any,
});

requestUrlEndpoint({} as RestClient, {} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.editPost, {
	headers: {},
	query: { postId: "123" },
	body: {} as any,
});

requestUrlEndpoint({} as RestClient, {} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.patchPost, {
	headers: {},
	query: { postId: "123" },
	body: { status: EnumPostStatus.Live },
});

requestUrlEndpoint({} as RestClient, {} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.getPost, {
	headers: {},
	query: { postId: "123", view: EnumBloggerViewMode.AUTHOR },
});

requestUrlEndpoint({} as RestClient, {} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.setPostStatusLive, {
	headers: {},
	query: { postId: "123" },
});

requestUrlEndpoint({} as RestClient, {} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.setPostStatusDraft, {
	headers: {},
	query: { postId: "123" },
});

requestUrlEndpoint({} as RestClient, {} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.getByPath, {
	headers: {},
	query: { path: "/2024/01/test.html", view: EnumBloggerViewMode.AUTHOR },
});

requestUrlEndpoint({} as RestClient, {} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.listPosts, {
	headers: {},
	query: { view: EnumBloggerViewMode.AUTHOR },
});
*/
