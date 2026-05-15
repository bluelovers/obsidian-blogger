import { requestUrl } from 'obsidian';
import { getBoundary } from './utils';
import { ISafeAny } from './types';
import { IFormItemNameMapper, FormItems } from './utils/type-utils';

interface IRestOptions
{
  url: URL;
}

export class RestClient {
  /**
   * Href without '/' at the very end.
   * @private
   */
  private readonly href: string;

  constructor(private readonly options: IRestOptions) {
    this.href = this.options.url.href;
    if (this.href.endsWith('/')) {
      this.href = this.href.substring(0, this.href.length - 1);
    }
  }

  httpGet = async (
    path: string,
    options?: {
      headers: Record<string, string>;
    },
  ): Promise<unknown> => {
    let realPath = path;
    if (realPath.startsWith('/')) {
      realPath = realPath.substring(1);
    }

    const endpoint = `${this.href}/${realPath}`;
    const opts = {
      headers: {},
      ...options,
    };
    const response = await requestUrl({
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
  };

  httpPost = async (
    path: string,
    body: ISafeAny,
    options: {
      headers?: Record<string, string>;
      formItemNameMapper?: IFormItemNameMapper;
    },
  ): Promise<unknown> => {
    let realPath = path;
    if (realPath.startsWith('/')) {
      realPath = realPath.substring(1);
    }
    const endpoint = `${this.href}/${realPath}`;
    const predefinedHeaders: Record<string, string> = {};
    let requestBody: ISafeAny;
    if (body instanceof FormItems) {
      const boundary = getBoundary();
      requestBody = await body.toArrayBuffer({
        boundary,
        nameMapper: options.formItemNameMapper,
      });
      predefinedHeaders['content-type'] = `multipart/form-data; boundary=${boundary}`;
    } else if (body instanceof ArrayBuffer) {
      requestBody = body;
    } else {
      requestBody = JSON.stringify(body);
      predefinedHeaders['content-type'] = 'application/json';
    }
    const response = await requestUrl({
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
  };

  httpPut = async (
    path: string,
    body: ISafeAny,
    options: {
      headers?: Record<string, string>;
      formItemNameMapper?: IFormItemNameMapper;
    },
  ): Promise<unknown> => {
    let realPath = path;
    if (realPath.startsWith('/')) {
      realPath = realPath.substring(1);
    }

    const endpoint = `${this.href}/${realPath}`;
    const predefinedHeaders: Record<string, string> = {};
    let requestBody: ISafeAny;
    if (body instanceof FormItems) {
      const boundary = getBoundary();
      requestBody = await body.toArrayBuffer({
        boundary,
        nameMapper: options.formItemNameMapper,
      });
      predefinedHeaders['content-type'] = `multipart/form-data; boundary=${boundary}`;
    } else if (body instanceof ArrayBuffer) {
      requestBody = body;
    } else {
      requestBody = JSON.stringify(body);
      predefinedHeaders['content-type'] = 'application/json';
    }
    const response = await requestUrl({
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
  };
}
