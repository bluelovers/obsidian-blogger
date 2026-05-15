import { ILanguageID, ITranslateKey, LANGUAGES } from './langs';
import { moment } from 'obsidian';
import { template } from 'lodash-es';
import { EnumLanguageIDAll } from '../types/const';

/**
 * 多語言國際化類別
 * Internationalization (i18n) class
 *
 * 支援多語言翻譯，預設自動偵測使用者語言（依賴 Obsidian 的 moment.locale 設定），
 * 若無對應翻譯則回退至英文。
 * Supports multi-language translation with auto-detection via Obsidian's moment.locale,
 * falling back to English when no matching translation is available.
 */
export class I18n
{
	/**
	 * @param lang - 語言識別碼，預設為 auto（自動偵測）/ Language ID, defaults to auto-detect
	 */
	constructor(private readonly lang: EnumLanguageIDAll = EnumLanguageIDAll.auto)
	{
		this.lang = lang;
	}

	/**
	 * 取得翻譯字串（支援範本變數插值）
	 * Get translated string (with template variable interpolation)
	 *
	 * 當 vars 參數提供時，使用 lodash template 語法進行變數替換，
	 * 例如：`t("error_publishFailed", { message: "Network error" })`
	 * When vars is provided, substitutes variables using lodash template syntax.
	 *
	 * @param key - 翻譯鍵值 / Translation key
	 * @param vars - 可選的範本變數（如 `{ message: "..." }`）/ Optional template variables
	 * @returns 翻譯後的字串 / Translated string
	 */
	t(key: ITranslateKey, vars?: Record<string, string | number>): string
	{
		/** 取得原始翻譯字串 / Get raw translation string */
		const string = this.#get(key);
		if (vars)
		{
			/** 使用 lodash template 進行變數插值 / Interpolate variables via lodash template */
			const compiled = template(string);
			return compiled(vars);
		}
		else
		{
			return string;
		}
	}

	/**
	 * 解析語言並取得翻譯字串（私有方法）
	 * Resolve language and get translation string (private)
	 *
	 * 語言解析邏輯：
	 * 1. 若設為 auto，嘗試從 moment.locale() 自動匹配（將 `-` 轉為 `_`）
	 * 2. 若自動匹配失敗或未設定 auto，回退至英文
	 * 3. 若指定語言缺少該鍵值，同樣回退至英文
	 * 4. 若英文也缺少該鍵值，直接回傳鍵名本身
	 *
	 * Language resolution logic:
	 * 1. If auto, try to match via moment.locale() (convert `-` to `_`)
	 * 2. Fall back to English if auto-match fails or not auto
	 * 3. Fall back to English if the key is missing in the target language
	 * 4. Return the key itself if even English lacks it
	 *
	 * @param key - 翻譯鍵值 / Translation key
	 * @returns 翻譯後的字串 / Translated string
	 */
	#get(key: ITranslateKey): string
	{
		let lang: ILanguageID;
		if (this.lang === EnumLanguageIDAll.auto && moment.locale().replace('-', '_') in LANGUAGES)
		{
			lang = moment.locale().replace('-', '_') as ILanguageID;
		}
		else
		{
			lang = EnumLanguageIDAll.en;
		}
		return LANGUAGES[lang][key] || LANGUAGES[EnumLanguageIDAll.en][key] || key;
	}
}

/** 全域預設 i18n 實例（auto 模式）/ Default global i18n instance (auto mode) */
let i18n = new I18n();

/**
 * 設定全域語言
 * Set global language
 *
 * 重新建立 I18n 實例以切換語言。
 * Recreates the I18n instance to switch language.
 *
 * @param lang - 語言識別碼（省略時使用 auto）/ Language ID (defaults to auto)
 */
export const setGlobalLang = (lang?: EnumLanguageIDAll) =>
{
	i18n = new I18n(lang);
};

/**
 * 取得全域 i18n 實例
 * Get the global i18n instance
 *
 * 此為全域單例模式，供各模組直接使用。
 * Global singleton pattern for direct use across modules.
 */
export const getGlobalI18n = () =>
{
	return i18n;
};
