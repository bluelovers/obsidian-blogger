import { getBoundary } from '../../utils';
import { ISafeAny } from '../../types';
import { IFormItemNameMapper, FormItems } from '../../utils/type-utils';
import { EnumPostStatus } from '../../types/const';
import { AbstractRequestClientWithConstructor } from '../request/request-client';
import { IObsidianRequest } from '../request/abstract-request-client';
import { _getEndpoint, _handleHeaders, _handleRestClientHref, _httpPost, _requestUrl, EnumHttpMethod } from '../request/http-post';

interface IRestOptions
{
  /** Blogger API 端點 URL / Blogger API endpoint URL */
  url: URL;
}

/**
 * Blogger API 請求主體介面
 * Blogger API request body interface
 *
 * @see https://developers.google.com/blogger/docs/3.0/using?hl=zh-tw Blogger API 3.0
 * @see https://developers.google.com/blogger/docs/2.0/json/using?hl=zh-tw Blogger JSON API 2.0 (已於 2024-09-30 停止支援 / deprecated since 2024-09-30)
 */
export interface IBloggerPostApiBody
{
  /** 資源類型（固定值）/ Resource kind (constant value) */
  kind: 'blogger#post',

  /** 部落格資訊 / Blog information */
  blog: {
    /**
     * 部落格 ID
     * Blog ID
     *
     * @example "8070105920543249955"
     */
    id: `${number}`,
  };

  /** 文章標題 / Post title */
  title: string;

  /** 文章內容（HTML 格式）/ Post content (HTML format) */
  content: string;

  /**
   * 文章標籤列表
   * Post labels
   *
   * 官方 API 文件未說明此屬性，但實際可用於設定標籤。
   * Not documented in the official API, but works for setting labels.
   */
  labels: string[];

  /** 文章狀態 / Post status */
  status: EnumPostStatus;
}

/**
 * Blogger API 回傳主體介面
 * Blogger API response body interface
 *
 * 使用引號包裹的屬性名稱以對應 Blogger API 的 JSON 回應欄位。
 * Uses quoted property names to match Blogger API JSON response fields.
 */
export interface IBloggerPostApiReturn extends Omit<IBloggerPostApiBody, 'labels' | 'status'>
{
  /**
   * 文章 ID
   * Post ID
   *
   * @example "6819100329896798058"
   */
  "id": `${number}`,
  /**
   * 發布時間（ISO 8601 格式）
   * Published time (ISO 8601 format)
   *
   * @example "2012-05-20T20:08:00-07:00"
   */
  "published": string,
  /**
   * 更新時間（ISO 8601 格式）
   * Updated time (ISO 8601 format)
   *
   * @example "2012-05-20T20:08:35-07:00"
   */
  "updated": string,
  /**
   * 文章公開 URL
   * Public post URL
   *
   * @example "http://brettmorgan-test2.blogspot.com/2012/05/new-post.html"
   */
  "url": string,
  /**
   * API 資源連結
   * API resource self-link
   *
   * @example "https://www.googleapis.com/blogger/v3/blogs/8070105920543249955/posts/6819100329896798058"
   */
  "selfLink": string,

  /** 作者資訊 / Author information */
  "author": {
    /** 作者 ID / Author ID */
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
  /** 回覆資訊 / Reply information */
  "replies": {
    /**
     * 回覆總數
     * Total reply count
     *
     * @example "0"
     */
    "totalItems": `${number}`,
    /**
     * 回覆 API 連結
     * Replies API link
     *
     * @example "https://www.googleapis.com/blogger/v3/blogs/8070105920543249955/posts/6819100329896798058/comments"
     */
    "selfLink": string
  }

  /**
   * 文章狀態
   * Post status
   *
   * @todo 官方 API 文件未說明此回傳欄位，但本專案程式碼表示存在。
   * @todo This field is not documented in the official API, but the codebase indicates it exists.
   * 尚未實際監測回傳 API 是否有此欄位 / Actual API response has not been verified for this field.
   */
  status: EnumPostStatus,
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
   * @param path - API 路徑 / API path
   * @param options - 可選的請求標頭 / Optional request headers
   */
  async httpGet(
    path: string,
    options?: {
      headers: Record<string, string>;
    },
  ): Promise<IBloggerPostApiReturn>
  {
    const endpoint = this.getEndpoint(path);
    return _requestUrl(this, {
      endpoint,
      method: EnumHttpMethod.GET,
      headers: _handleHeaders(options, {
        'content-type': 'application/json',
      }),
    });
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
    options: {
      headers?: Record<string, string>;
      formItemNameMapper?: IFormItemNameMapper;
    },
  ): Promise<IBloggerPostApiReturn>
  {
    return _httpPost(EnumHttpMethod.POST, path, body, options, this);
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
    options: {
      headers?: Record<string, string>;
      formItemNameMapper?: IFormItemNameMapper;
    },
  ): Promise<IBloggerPostApiReturn>
  {
    return _httpPost(EnumHttpMethod.PUT, path, body, options, this);
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
    options: {
      headers?: Record<string, string>;
      formItemNameMapper?: IFormItemNameMapper;
    },
  ): Promise<IBloggerPostApiReturn>
  {
    return _httpPost(EnumHttpMethod.PATCH, path, body as IBloggerPostApiBody, options, this);
  }
}
