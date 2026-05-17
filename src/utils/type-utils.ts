import { IBloggerPublishResultError } from '../types/blogger-client-interface';
import { IMedia, ISafeAny } from '../types';
import { isArray, isString } from 'lodash-es';

/**
 * 型別守衛：檢查物件是否為 IMedia 類型
 * Type guard: check if an object is of type IMedia
 *
 * @param obj - 待檢查的物件 / Object to check
 * @returns 是否為 IMedia / Whether it is IMedia
 */
export function isMedia(obj: ISafeAny): obj is IMedia
{
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'mimeType' in obj &&
		typeof obj.mimeType === 'string' &&
		'fileName' in obj &&
		typeof obj.fileName === 'string' &&
		'content' in obj &&
		obj.content instanceof ArrayBuffer
	);
}

/**
 * 將原始表單欄位名稱轉換為自訂名稱的映射器
 * Mapper to convert original form field name to custom one
 *
 * @param name - 原始欄位名稱 / Original field name
 * @param isArray - 該欄位是否為陣列（若是，名稱會附加 `[]`）/ Whether this field is in an array
 */
export type IFormItemNameMapper = (name: string, isArray: boolean) => string;

/**
 * 多部份表單資料建構器（multipart/form-data）
 * Multipart form data builder
 *
 * 用於建構包含文字欄位與媒體檔案的 multipart/form-data 請求主體，
 * 輸出為 ArrayBuffer 格式。
 * Builds multipart/form-data request bodies containing text fields and media files,
 * outputting as ArrayBuffer.
 */
export class FormItems
{
	/** 內部表單資料儲存 / Internal form data storage */
	#formData: Record<string, ISafeAny> = {};

	/**
	 * 附加文字資料到表單
	 * Append string data to form
	 *
	 * @param name - 欄位名稱 / Field name
	 * @param data - 文字資料 / String data
	 */
	append(name: string, data: string): FormItems;

	/**
	 * 附加媒體資料到表單
	 * Append media data to form
	 *
	 * @param name - 欄位名稱 / Field name
	 * @param data - 媒體資料 / Media data
	 */
	append(name: string, data: IMedia): FormItems;

	/**
	 * 附加資料到表單（支援字串與媒體）
	 * Append data to the form (string or media)
	 *
	 * 若指定名稱已存在，則將該欄位升級為陣列。
	 * If the name already exists, the field is promoted to an array.
	 *
	 * @param name - 欄位名稱 / Field name
	 * @param data - 資料（字串或媒體）/ Data (string or media)
	 * @returns 自身以支援鏈式呼叫 / Self for chaining
	 */
	append(name: string, data: string | IMedia): FormItems
	{
		const existing = this.#formData[name];
		if (existing)
		{
			/** 已存在同名欄位：升級為陣列 / Promote to array when duplicate name exists */
			this.#formData[name] = [existing];
			this.#formData[name].push(data);
		}
		else
		{
			this.#formData[name] = data;
		}
		return this;
	}

	/**
	 * 將表單資料序列化為 ArrayBuffer
	 * Serialize form data to ArrayBuffer
	 *
	 * 依照 multipart/form-data 規範建構請求主體，包含 boundary 分隔線、
	 * Content-Disposition 標頭等。陣列欄位的名稱會附加 `[]` 後綴。
	 * Constructs the request body per multipart/form-data spec, with boundary
	 * delimiters and Content-Disposition headers. Array fields get `[]` suffix.
	 *
	 * @param option.boundary - 多部份邊界字串 / Multipart boundary string
	 * @param option.nameMapper - 可選的欄位名稱轉換器 / Optional field name mapper
	 * @returns 序列化後的 ArrayBuffer / Serialized ArrayBuffer
	 */
	toArrayBuffer(option: {
		boundary: string;
		nameMapper?: IFormItemNameMapper;
	}): Promise<ArrayBuffer>
	{
		const CRLF = '\r\n';

		/**
		 * 產生單一表單項目的編碼區塊
		 * Generate encoded block for a single form item
		 *
		 * @param name - 欄位名稱 / Field name
		 * @param data - 文字或媒體資料 / String or media data
		 * @param isArray - 是否為陣列元素 / Whether this is an array element
		 */
		const itemPart = (name: string, data: string | IMedia, isArray: boolean) =>
		{
			/** 應用名稱映射器（如有提供）/ Apply name mapper if provided */
			let itemName = name;
			if (option.nameMapper)
			{
				itemName = option.nameMapper(name, isArray);
			}

			body.push(encodedItemStart);
			if (isString(data))
			{
				/** 文字欄位：標準 Content-Disposition / String field: standard Content-Disposition */
				body.push(
					encoder.encode(`Content-Disposition: form-data; name="${itemName}"${CRLF}${CRLF}`),
				);
				body.push(encoder.encode(data));
			}
			else
			{
				/** 媒體欄位：附加 filename 與 Content-Type / Media field: add filename and Content-Type */
				const media = data;
				body.push(
					encoder.encode(
						`Content-Disposition: form-data; name="${itemName}"; filename="${media.fileName}"${CRLF}Content-Type: ${media.mimeType}${CRLF}${CRLF}`,
					),
				);
				body.push(new Uint8Array(media.content));
			}
			body.push(encoder.encode(CRLF));
		};

		const encoder = new TextEncoder();
		const encodedItemStart = encoder.encode(`--${option.boundary}${CRLF}`);
		const body: (Uint8Array | ArrayBuffer)[] = [];

		/** 遍歷所有表單欄位，陣列欄位名稱附加 `[]` / Iterate all fields; array names get `[]` suffix */
		Object.entries(this.#formData).forEach(([name, data]) =>
		{
			if (isArray(data))
			{
				data.forEach((item) =>
				{
					itemPart(`${name}[]`, item, true);
				});
			}
			else
			{
				itemPart(name, data, false);
			}
		});

		/** 結尾 boundary / Closing boundary */
		body.push(encoder.encode(`--${option.boundary}--`));
		return new Blob(body as any).arrayBuffer();
	}
}

/**
 * 攜帶錯誤碼的錯誤型別
 * Error type with an error code
 *
 * @template T - 基礎 Error 子類別 / Base Error subclass
 */
export type IErrorWithCode<T extends Error> = T & {
	code: number | string
}

/**
 * 型別守衛：檢查值是否為非 undefined（視為有錯誤）
 * Type guard: check if value is not undefined (treated as having an error)
 *
 * @param error - 待檢查的值 / Value to check
 * @returns 是否非 undefined / Whether it is not undefined
 */
export function _isError<T extends Error>(error: unknown): error is IErrorWithCode<T>
{
	return error !== undefined
}

/**
 * 型別守衛：檢查回應物件是否包含 error 屬性
 * Type guard: check if response object has an error property
 *
 * @param resp - 回應物件 / Response object
 * @returns 是否包含 error 屬性 / Whether it has an error property
 */
export function _hasError<T extends Error>(resp: unknown): resp is IBloggerPublishResultError<T>
{
	return (resp as any).error !== undefined
}
