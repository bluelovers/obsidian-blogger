import { getBoundary } from './utils';
import { ISafeAny } from './types';
import { IFormItemNameMapper, FormItems } from './utils/type-utils';
import { EnumPostStatus } from './types/const';
import { AbstractRequestClientWithConstructor } from './client/request/request-client';
import { IObsidianRequest } from './client/request/abstract-request-client';

interface IRestOptions
{
  url: URL;
}

/**
 * @see https://developers.google.com/blogger/docs/2.0/json/using?hl=zh-tw Blogger JSON API 2.0 (2024 年 9 月 30 日停止支援)
 * @see https://developers.google.com/blogger/docs/3.0/using?hl=zh-tw Blogger API 3.0
 */
export interface IBloggerPostApiBody
{
  kind: 'blogger#post',
  blog: {
    /**
     * @example
     * "8070105920543249955"
     */
    id: `${number}`,
  };
  title: string;
  content: string;

  /**
   * 官方 API 沒有說明 但此屬性可以設定標籤
   */
  labels: string[];
  status: EnumPostStatus;
}

export interface IBloggerPostApiReturn extends Omit<IBloggerPostApiBody, 'labels' | 'status'>
{
  /**
   * @example
   * "6819100329896798058"
   */
  "id": `${number}`,
  /**
   * @example
   * "2012-05-20T20:08:00-07:00"
   */
  "published": string,
  /**
   * @example
   * "2012-05-20T20:08:35-07:00"
   */
  "updated": string,
  /**
   * @example
   * "http://brettmorgan-test2.blogspot.com/2012/05/new-post.html"
   */
  "url": string,
  /**
   * @example
   * "https://www.googleapis.com/blogger/v3/blogs/8070105920543249955/posts/6819100329896798058"
   */
  "selfLink": string,

  "author": {
    "id": `${number}`,
    "displayName": string,
    /**
     * @example
     * "http://www.blogger.com/profile/16258312240222542576"
     */
    "url": string,
    "image": {
      /**
       * @example
       * "https://resources.blogblog.com/img/b16-rounded.gif"
       */
      "url": string
    }
  },
  "replies": {
    /**
     * @example
     * "0"
     */
    "totalItems": `${number}`,
    /**
     * @example
     * "https://www.googleapis.com/blogger/v3/blogs/8070105920543249955/posts/6819100329896798058/comments"
     */
    "selfLink": string
  }

  /**
   * @todo
   * 官方 API 上面沒有說明 但本專案的程式碼確表示存在
   * 尚未實際監測回傳 API 是否有此欄位
   */
  status: EnumPostStatus,
}

export class RestClient extends AbstractRequestClientWithConstructor
{
  /**
   * Href without '/' at the very end.
   * @private
   */
  protected readonly href: string;

  constructor(protected readonly options: IRestOptions, obsidianRequest?: IObsidianRequest)
  {
    super(obsidianRequest);

    this.href = this.options.url.href;
    if (this.href.endsWith('/')) {
      this.href = this.href.substring(0, this.href.length - 1);
    }
  }

  async httpGet(
    path: string,
    options?: {
      headers: Record<string, string>;
    },
  ): Promise<IBloggerPostApiReturn>
  {
    let realPath = path;
    if (realPath.startsWith('/'))
    {
      realPath = realPath.substring(1);
    }

    const endpoint = `${this.href}/${realPath}`;
    const opts = {
      headers: {},
      ...options,
    };
    const response = await this.requestUrl({
      url: endpoint,
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'obsidian.md',
        ...opts.headers,
      },
      throw: false,
    });
    return response.json;
  }

  async httpPost(
    path: string,
    body: IBloggerPostApiBody,
    options: {
      headers?: Record<string, string>;
      formItemNameMapper?: IFormItemNameMapper;
    },
  ): Promise<IBloggerPostApiReturn>
  {
    let realPath = path;
    if (realPath.startsWith('/'))
    {
      realPath = realPath.substring(1);
    }
    const endpoint = `${this.href}/${realPath}`;
    const predefinedHeaders: Record<string, string> = {};
    let requestBody: ISafeAny;
    if (body instanceof FormItems)
    {
      const boundary = getBoundary();
      requestBody = await body.toArrayBuffer({
        boundary,
        nameMapper: options.formItemNameMapper,
      });
      predefinedHeaders['content-type'] = `multipart/form-data; boundary=${boundary}`;
    }
    else if (body instanceof ArrayBuffer)
    {
      requestBody = body;
    }
    else
    {
      requestBody = JSON.stringify(body);
      predefinedHeaders['content-type'] = 'application/json';
    }
    const response = await this.requestUrl({
      url: endpoint,
      method: 'POST',
      headers: {
        'user-agent': 'obsidian.md',
        ...predefinedHeaders,
        ...options.headers,
      },
      body: requestBody,
      throw: false,
    });
    return response.json;
  }

  async httpPut(
    path: string,
    body: IBloggerPostApiBody,
    options: {
      headers?: Record<string, string>;
      formItemNameMapper?: IFormItemNameMapper;
    },
  ): Promise<IBloggerPostApiReturn>
  {
    let realPath = path;
    if (realPath.startsWith('/'))
    {
      realPath = realPath.substring(1);
    }

    const endpoint = `${this.href}/${realPath}`;
    const predefinedHeaders: Record<string, string> = {};
    let requestBody: ISafeAny;
    if (body instanceof FormItems)
    {
      const boundary = getBoundary();
      requestBody = await body.toArrayBuffer({
        boundary,
        nameMapper: options.formItemNameMapper,
      });
      predefinedHeaders['content-type'] = `multipart/form-data; boundary=${boundary}`;
    }
    else if (body instanceof ArrayBuffer)
    {
      requestBody = body;
    }
    else
    {
      requestBody = JSON.stringify(body);
      predefinedHeaders['content-type'] = 'application/json';
    }
    const response = await this.requestUrl({
      url: endpoint,
      method: 'PUT',
      headers: {
        'user-agent': 'obsidian.md',
        ...predefinedHeaders,
        ...options.headers,
      },
      body: requestBody,
      throw: false,
    });
    return response.json;
  }
}
