import { getGlobalI18n } from '../i18n/i18n';
import { ITranslateKey } from '../i18n/langs';

/**
 * 全域 i18n 翻譯輔助函式
 * Global i18n translation helper
 *
 * 簡化 `getGlobalI18n().t(key, vars)` 的呼叫模式。
 * Simplifies the `getGlobalI18n().t(key, vars)` calling pattern.
 *
 * @param key - 翻譯鍵值 / Translation key
 * @param vars - 可選的範本變數 / Optional template variables
 * @returns 翻譯後的字串 / Translated string
 */
export function t(key: ITranslateKey, vars?: Record<string, string | number>): string
{
	return getGlobalI18n().t(key, vars);
}
