import { ISafeAny } from './types';
import { EnumBloggerClientReturnCode, EnumPostStatus } from './types/const';

interface _IBloggerClientResult
{
  /**
   * Response from Blogger server.
   */
  response?: ISafeAny;

  code: EnumBloggerClientReturnCode;
}

interface IBloggerClientOkResult<T> extends _IBloggerClientResult {
  code: EnumBloggerClientReturnCode.OK;
  data: T;
}

interface IBloggerClientErrorResult extends _IBloggerClientResult {
  code: EnumBloggerClientReturnCode.Error;
  message: string;
}

export type IBloggerClientResult<T> = IBloggerClientOkResult<T> | IBloggerClientErrorResult;

export interface IBloggerPostParamsCore
{
  /**
   * 對應 IBloggerPostApiBody.labels
   *
   * @see AbstractBloggerClient.publish
   * @see RestClient.httpPut
   * @see RestClient.httpPost
   * @see IBloggerPostApiBody.labels
   */
  labels: string[];

  /**
   * Post title.
   */
  title: string;

  /**
   * Blogger post ID.
   *
   * If this is assigned, the post will be updated, otherwise created.
   *
   * @see IBloggerPostApiReturn.id
   */
  postId?: `${number}`;

  /**
   * Blogger profile name.
   */
  profileName?: string;
}

export interface IBloggerPostParams extends IBloggerPostParamsCore
{
  status: EnumPostStatus;

  /**
   * Post content.
   */
  content: string;
}

export interface IBloggerPublishParams
{
  postParams: IBloggerPostParams;
  matterData: { [p: string]: ISafeAny };
}

interface _IBloggerPublishResult
{
  url: string;
}

export interface IBloggerPublishResult extends Pick<IBloggerPostParams, 'postId' | 'status'>, _IBloggerPublishResult
{

}

export interface IBloggerMediaUploadResult extends _IBloggerPublishResult
{

}

export interface IBloggerClient
{
  /**
   * Publish a post to Blogger.
   *
   * If there is a `postId` in front-matter, the post will be updated,
   * otherwise, create a new one.
   *
   * @param defaultPostParams Use this parameter instead of popup publish modal if this is not undefined.
   */
  publishPost(
    defaultPostParams?: IBloggerPostParams,
  ): Promise<IBloggerClientResult<IBloggerPublishResult>>;
}
