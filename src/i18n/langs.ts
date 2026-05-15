import * as en from './en.json';
import * as zh_cn from './zh-cn.json';
import { EnumLanguageIDAll } from '../types/const';

/**
 * 語言翻譯物件型別（以英文 JSON 結構為基底）
 * Language translation object type (based on English JSON shape)
 *
 * Partial 類型允許某些語言的翻譯尚未完整時，仍可正確推導型別。
 * Partial allows correct type inference even when some translations are incomplete.
 */
export type ILanguage = Partial<typeof en>;

/**
 * 支援的語言識別碼（排除 auto 選項）
 * Supported language IDs (excluding the auto option)
 *
 * 用於實際可選的語言列表，不包含「自動偵測」此一虛擬選項。
 * Represents the actual selectable languages, excluding the virtual "auto" option.
 */
export type ILanguageID = Exclude<EnumLanguageIDAll, EnumLanguageIDAll.auto>;

/**
 * 翻譯鍵值型別
 * Translation key type
 *
 * 所有可用的翻譯字串鍵名，對應 JSON 檔案中的每個欄位。
 * All available translation string keys, mapping to each field in the JSON files.
 */
export type ITranslateKey = keyof ILanguage;

/**
 * 內部語言翻譯映射表
 * Internal language translation map
 *
 * 使用 satisfies 關鍵字確保滿足 Record<ILanguageID, ILanguage> 約束，
 * 同時保留每個欄位的精確字面型別以供推導。
 * Uses the satisfies keyword to enforce Record<ILanguageID, ILanguage> constraints
 * while preserving exact literal types for inference.
 */
const _LANGUAGES = {
	[EnumLanguageIDAll.en]: en,
	[EnumLanguageIDAll.zh_cn]: zh_cn,
} satisfies Record<ILanguageID, ILanguage>;

/**
 * 語言翻譯映射表（公開匯出）
 * Language translation map (public export)
 *
 * 提供給 i18n 核心模組使用的翻譯資源。
 * Translation resources for the i18n core module.
 */
export const LANGUAGES: Record<ILanguageID, ILanguage> = _LANGUAGES;
