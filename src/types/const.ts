import { ILanguage } from '../i18n/langs';
import * as zh_cn from '../i18n/zh-cn.json';

/**
 * Blogger 客戶端回傳碼列舉
 * Blogger client return code enumeration
 */
export const enum EnumBloggerClientReturnCode
{
	/** 成功 / Success */
	OK = 'OK',
	/** 一般錯誤 / General error */
	Error = 'Error',
	/** 伺服器內部錯誤 / Server internal error */
	ServerInternalError = 'ServerInternalError',
}

/**
 * 文章狀態列舉（對應 Blogger API 的 status 欄位）
 * Post status enumeration (maps to Blogger API status field)
 */
export const enum EnumPostStatus
{
	/** 草稿 / Draft */
	Draft = 'DRAFT',
	/** 已發布 / Published live */
	Live = 'LIVE',
	/** 已排程 / Scheduled */
	Scheduled = 'SCHEDULED',
	/** 軟刪除 / Soft trashed */
	SoftTrashed = 'SOFT_TRASHED',
}

/**
 * MathJax 輸出類型列舉
 * MathJax output type enumeration
 */
export const enum EnumMathJaxOutputType
{
	/** TeX 原始碼輸出 / TeX source output */
	TeX = 'tex',
	/** SVG 向量輸出 / SVG vector output */
	SVG = 'svg',
}

/**
 * 確認操作碼列舉
 * Confirmation code enumeration
 */
export const enum EnumConfirmCode
{
	/** 確認 / Confirm */
	Confirm = 'confirm',
	/** 取消 / Cancel */
	Cancel = 'cancel',
}

/**
 * 設定檔版本列舉
 * Settings version enumeration
 */
export const enum EnumSettingsVersion
{
	/** 初始版本 V1 / Initial version V1 */
	V1 = '1',
}

/**
 * Obsidian Blogger 內部標籤列舉
 * Obsidian Blogger internal tags enumeration
 *
 * 這些標籤以 obsidian-blogger/ 為前綴，用於在 Obsidian 內部標記文章狀態，
 * 在發送至 Blogger API 前會被過濾移除。
 * These tags use the obsidian-blogger/ prefix for internal state tracking
 * and are filtered out before sending to the Blogger API.
 */
export const enum EnumobsidianBloggerTags
{
	/** 標記為 Blogger 文章 / Marked as a Blogger post */
	Published = 'obsidian-blogger/published',
	/** 一般文章標記 / General post marker */
	Post = 'obsidian-blogger/post',
	/** 草稿狀態 / Draft status */
	Draft = 'obsidian-blogger/draft',
	/** 已發布狀態 / Live status */
	Live = 'obsidian-blogger/live',
	/** 已排程狀態 / Scheduled status */
	Scheduled = 'obsidian-blogger/scheduled',
	/** 軟刪除狀態 / Soft trashed status */
	SoftTrashed = 'obsidian-blogger/soft-trashed',
}

/**
 * 語言識別碼列舉（支援多語言翻譯）
 * Language ID enumeration (multi-language translation support)
 */
export const enum EnumLanguageIDAll
{
	/** 英文 / English */
	en = 'en',
	/** 簡體中文 / Simplified Chinese */
	zh_cn = 'zh_cn',
	/** 自動偵測 / Auto detect */
	auto = 'auto',
}
