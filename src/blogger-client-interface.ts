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

export interface IBloggerPostParams
{
  status: EnumPostStatus;
  labels: string[];

  /**
   * Post title.
   */
  title: string;

  /**
   * Post content.
   */
  content: string;

  /**
   * Blogger post ID.
   *
   * If this is assigned, the post will be updated, otherwise created.
   */
  postId?: string;

  /**
   * Blogger profile name.
   */
  profileName?: string;
}

export interface IBloggerPublishParams
{
  postParams: IBloggerPostParams;
  matterData: { [p: string]: ISafeAny };
}

export interface IBloggerPublishResult
{
  postId: string;
  url: string;
  status: EnumPostStatus;
}

export interface IBloggerMediaUploadResult
{
  url: string;
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
