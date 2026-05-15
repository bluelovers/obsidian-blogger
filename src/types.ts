import { IBloggerPostParamsCore } from './types/blogger-client-interface';

/**
 * 安全 Any 型別（明確標記跳過 ESLint 檢查）
 * Safe any type (explicitly bypasses ESLint checking)
 *
 * 用於無法或不適合使用具體型別的邊界場景。
 * Used in edge cases where a concrete type is infeasible or inappropriate.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ISafeAny = any;

/**
 * 品牌型別（Nominal Typing 模擬）
 * Branded type (nominal typing simulation)
 *
 * 透過交叉類型添加 `__brand` 屬性，在結構化類型系統中模擬名義型別行為，
 * 防止不同類別的相同底層類型被混用。
 * Adds a `__brand` property via intersection type to simulate nominal typing
 * in a structural type system, preventing misuse of same underlying types.
 *
 * @template K - 原始類型 / Base type
 * @template T - 品牌標籤 / Brand label
 */
export type IBrand<K, T> = K & { __brand: T };

/**
 * Front Matter 資料型別
 * Front matter data type
 *
 * 從 Obsidian 筆記的 YAML Front Matter 解析出的資料結構。
 * Data structure parsed from Obsidian note YAML front matter.
 */
export type IMatterData = {
	/**
	 * 與原版 obsidian-blogger 相容
	 * 並且如果此屬性存在，就會忽略 tags
	 *
	 * @see https://github.com/privet-kitty/obsidian-blogger
	 */
	labels?: string[];
	[p: string]: ISafeAny;
} & Partial<IBloggerPostParamsCore>;

/**
 * 媒體檔案資料介面
 * Media file data interface
 *
 * 用於 Blogger API 的圖片/附件上傳。
 * Used for image/attachment uploads to the Blogger API.
 */
export interface IMedia
{
	/** MIME 類型（如 image/png）/ MIME type (e.g. image/png) */
	mimeType: string;
	/** 檔案名稱 / File name */
	fileName: string;
	/** 二進位內容 / Binary content */
	content: ArrayBuffer;
}

