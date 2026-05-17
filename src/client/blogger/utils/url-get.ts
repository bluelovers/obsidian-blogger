import { EnumHttpMethod } from '../../../client/request/http-post';
import { IBloggerProfile } from '../../../blogger-profile';
import { EnumBloggerRestEndpoint, getUrl, IBloggerRestEndpoint } from './url';
import { IBloggerPostParamsCore } from 'src/types/blogger-client-interface';
import { ITSPickExtra, ITSRequireAtLeastOne } from 'ts-type';
import { EnumPostStatus } from '../../../types/const';
import { IBloggerPostApiBody, RestClient } from '../rest-client';
import { IHttpHeaders } from 'src/types/http';

export interface IEndpointQuery
{
	postId?: IBloggerProfile["blogId"];
	[p: string]: string | number | boolean | undefined;
}

export interface IEndpointQueryWithPostId extends IEndpointQuery
{
	postId: IBloggerProfile["blogId"];
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

export interface IBloggerRestEndpointPostEdit extends _IEndpointImpl
{
	endpointID: EnumBloggerRestEndpoint.editPost;
	method: EnumHttpMethod.PUT;
	query: IEndpointQueryWithPostId;
}

export interface IBloggerRestEndpointPostPatch extends _IEndpointImpl
{
	endpointID: EnumBloggerRestEndpoint.patchPost;
	method: EnumHttpMethod.PATCH;

	query: IEndpointQueryWithPostId;

	body: ITSRequireAtLeastOne<Partial<IBloggerPostApiBody>>;
}

/**
 * @todo 需要繼續完成擴充各個 endpoint
 */
export type TBloggerRestEndpointAll = IBloggerRestEndpointPostEdit | IBloggerRestEndpointPostPatch;

export type IBloggerRestEndpointHelperDetect<K extends EnumBloggerRestEndpoint> = Extract<TBloggerRestEndpointAll, { endpointID: K }>;

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
		case EnumBloggerRestEndpoint.editPost:
		{
			return EnumHttpMethod.PUT as IBloggerRestEndpointHelperDetect<K>["method"];
		}
		case EnumBloggerRestEndpoint.patchPost:
		{
			return EnumHttpMethod.PATCH as IBloggerRestEndpointHelperDetect<K>["method"];
		}
	}

	throw new RangeError(`Unknown endpoint ID: ${endpointID}`);
}

/**
 * @todo 此函數尚未完成實作，請勿使用
 * @deprecated 此函數尚未完成實作，請勿使用
 */
export async function requestUrlEndpoint<K extends EnumBloggerRestEndpoint, T extends IBloggerRestEndpointHelperDetect<K> = IBloggerRestEndpointHelperDetect<K>>(
	client: RestClient,
	endpoints: Pick<IBloggerRestEndpoint, K>,
	endpointID: K,
	requestInit: {
		headers: IHttpHeaders,
	} & Pick<T, 'query' | 'body'>
)
{
	const method = getEndpointMethod(endpointID);

	const url = getUrlEndpoint(endpoints, endpointID, requestInit.query);

	const resp = await client.requestHttpMethod(method, url, requestInit.body as any, {
		headers: requestInit.headers,
	});

	return resp;
}

/** =========== 確認實作的類型是否正確 =========== */

getUrlEndpoint({} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.editPost, { postId: "123" });

requestUrlEndpoint({} as RestClient, {} as IBloggerRestEndpoint, EnumBloggerRestEndpoint.editPost, {
	headers: {},
	query: { postId: "123" },
});
