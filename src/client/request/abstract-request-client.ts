import { RequestUrlParam, RequestUrlResponse, RequestUrlResponsePromise } from 'obsidian';
import { IHttpHeaders } from '../../types/http';
import { EnumHttpMethod } from './http-post';

/**
 * 泛型化 HTTP 回應介面（內含解析後的 JSON 資料）
 * Generic HTTP response interface (with parsed JSON data)
 *
 * @template T - 回應 JSON 資料的型別 / Type of the response JSON data
 */
export interface IRequestUrlResponse<T = any> extends RequestUrlResponse
{
	/** 解析後的 JSON 資料 / Parsed JSON data */
	json: T;
}

/**
 * 泛型化 HTTP 回應 Promise 介面
 * Generic HTTP response Promise interface
 *
 * 包裝 Obsidian 的 RequestUrlResponsePromise，額外提供泛型化的 `json` 屬性。
 * Wraps Obsidian's RequestUrlResponsePromise with a generic `json` property.
 *
 * @template T - 回應 JSON 資料的型別 / Type of the response JSON data
 */
export interface IRequestUrlResponsePromise<T = any> extends Pick<RequestUrlResponsePromise, 'arrayBuffer' | 'text'>, Promise<IRequestUrlResponse<T>>
{
	/** 解析後的 JSON 資料（Promise 形式）/ Parsed JSON data (Promise form) */
	json: Promise<T>;
}

/**
 * 泛型化 HTTP 請求參數介面
 * Generic HTTP request parameters interface
 *
 * 目前為空擴展，保留未來擴充彈性。
 * Currently an empty extension, reserved for future flexibility.
 */
export interface IRequestUrlParam extends Omit<RequestUrlParam, 'headers'>
{
	method: EnumHttpMethod;
	headers?: IHttpHeaders;
}

/**
 * Obsidian requestUrl 函數的泛型包裝型別
 * Generic wrapper type for Obsidian's requestUrl function
 *
 * @template T - 回應 JSON 資料的型別 / Type of the response JSON data
 * @template P - 請求參數的型別 / Type of the request parameters
 *
 * @see https://docs.obsidian.md/Reference/TypeScript+API/requestUrl
 */
export type IObsidianRequest<T = any , P extends IRequestUrlParam = IRequestUrlParam> = (request: P | string) => IRequestUrlResponsePromise<T>;

/**
 * 抽象請求客戶端行為介面
 * Abstract request client behavior interface
 *
 * 定義 requestUrl 方法的合約，允許不同實作（真實 HTTP 請求 vs 測試 Mock）。
 * Defines the requestUrl contract, allowing different implementations (real HTTP vs test mock).
 */
export interface IAbstractRequestClientLike
{
	/**
	 * 發送 HTTP 請求
	 * Send an HTTP request
	 *
	 * @template T - 回應 JSON 資料的型別 / Response JSON type
	 * @template P - 請求參數型別 / Request parameter type
	 * @param request - 請求參數或字串 URL / Request params or URL string
	 *
	 * @see https://docs.obsidian.md/Reference/TypeScript+API/requestUrl
	 */
	requestUrl<T = any , P extends IRequestUrlParam = IRequestUrlParam>(request: P | string): IRequestUrlResponsePromise<T>;
}

/**
 * 抽象請求客戶端基底類別
 * Abstract base request client
 *
 * 保留 obsidianRequest 作為抽象屬性，允許子類別注入不同的 request 實作
 * （例如：真實請求 vs 單元測試 Mock），便於測試隔離。
 * Keeps obsidianRequest as an abstract property so subclasses can inject
 * different request implementations (real vs mock), enabling test isolation.
 */
export abstract class AbstractRequestClient implements IAbstractRequestClientLike
{
	/** Obsidian requestUrl 函數實作 / Obsidian requestUrl function implementation */
	protected abstract obsidianRequest: IObsidianRequest;

	/**
	 * 發送 HTTP 請求
	 * Send an HTTP request
	 *
	 * @template T - 回應 JSON 資料的型別 / Response JSON type
	 * @template P - 請求參數型別 / Request parameter type
	 * @param request - 請求參數或字串 URL / Request params or URL string
	 *
	 * @see https://docs.obsidian.md/Reference/TypeScript+API/requestUrl
	 */
	requestUrl<T = any , P extends IRequestUrlParam = IRequestUrlParam>(request: P | string)
	{
		return this.obsidianRequest(request) as IRequestUrlResponsePromise<T>;
	}
}
