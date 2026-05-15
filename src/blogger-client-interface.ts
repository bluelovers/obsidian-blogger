import { SafeAny } from './types';
import { BloggerClientReturnCode, PostStatus } from './types/const';

interface _bloggerClientResult {
  /**
   * Response from Blogger server.
   */
  response?: SafeAny;

  code: BloggerClientReturnCode;
}

interface BloggerClientOkResult<T> extends _bloggerClientResult {
  code: typeof BloggerClientReturnCode.OK;
  data: T;
}

interface BloggerClientErrorResult extends _bloggerClientResult {
  code: 'Error';
  message: string;
}

export type BloggerClientResult<T> = BloggerClientOkResult<T> | BloggerClientErrorResult;

export interface BloggerPostParams {
  status: PostStatus;
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

export interface BloggerPublishParams {
  postParams: BloggerPostParams;
  matterData: { [p: string]: SafeAny };
}

export interface BloggerPublishResult {
  postId: string;
  url: string;
  status: PostStatus;
}

export interface BloggerMediaUploadResult {
  url: string;
}

export interface BloggerClient {
  /**
   * Publish a post to Blogger.
   *
   * If there is a `postId` in front-matter, the post will be updated,
   * otherwise, create a new one.
   *
   * @param defaultPostParams Use this parameter instead of popup publish modal if this is not undefined.
   */
  publishPost(
    defaultPostParams?: BloggerPostParams,
  ): Promise<BloggerClientResult<BloggerPublishResult>>;
}
