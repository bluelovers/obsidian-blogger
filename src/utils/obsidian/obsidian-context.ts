import { App, moment, Notice } from 'obsidian';
import { ILanguageID } from '../../i18n/langs';
import { EnumBloggerClientReturnCode, EnumLanguageIDAll } from '../../types/const';
import { tryCatch } from '../try';
import { IBloggerClientResult } from '../../types/blogger-client-interface';
import { isString } from 'lodash-es';
import { ERROR_NOTICE_TIMEOUT } from '../../consts';

/**
 * 顯示 Obsidian 通知
 * Show Obsidian notice
 *
 * @param message - 通知訊息 / Notice message
 * @param duration - 顯示持續時間（毫秒，可選）/ Display duration in milliseconds (optional)
 * @returns 通知實例或 undefined / Notice instance or undefined
 */
export function showNotice(message: string | DocumentFragment, duration?: number)
{
	return tryCatch(() =>
	{
		return new (require('obsidian').Notice as typeof Notice)(message, duration);
	});
}

/**
 * 取得當前語言環境設定
 * Get current locale setting
 *
 * @returns 語言環境代碼 / Locale identifier
 */
export function getLocale()
{
	return tryCatch(() =>
	{
		return (require('obsidian').moment as typeof moment).locale().replace('-', '_') as ILanguageID;
	}) || EnumLanguageIDAll.en;
}

/**
 * 顯示錯誤訊息並回傳包含錯誤碼的結果
 * Show error message and return result with error code
 *
 * @template T - 回傳結果的資料型別 / Return result data type
 * @param error - 發生的錯誤 / Error occurred
 * @returns 包含錯誤碼的結果物件 / Result object with error code
 */
export function showError<T>(error: unknown): IBloggerClientResult<T>
{
	let errorMessage: string;
	if (isString(error))
	{
		errorMessage = error;
	}
	else if (error instanceof Error)
	{
		errorMessage = error.message;
	}
	else
	{
		errorMessage = (error as any).toString();
	}
	showNotice(errorMessage, ERROR_NOTICE_TIMEOUT);
	return {
		code: EnumBloggerClientReturnCode.Error,
		message: errorMessage,
	};
}

/**
 * 建立 Obsidian 上下文環境
 * Create Obsidian context
 *
 * @param context - 上下文參數物件 / Context parameters object
 * @param context.app - Obsidian 應用程式實例（可選）/ Obsidian App instance (optional)
 * @returns 建立的上下文物件 / Created context object
 */
export function createObsidianContext(context: {
	app?: App,
})
{
	context ??= {};
	return {
		app: context.app!,

		getLocale,

		showNotice,
		showError,
	};
}

/**
 * Obsidian 上下文型別
 * Obsidian context type
 */
export type IObsidianContext = ReturnType<typeof createObsidianContext>;

