import { App, moment, Notice } from 'obsidian';
import { ILanguageID } from '../../i18n/langs';
import { EnumBloggerClientReturnCode, EnumLanguageIDAll } from '../../types/const';
import { tryCatch } from '../try';
import { IBloggerClientResult } from '../../types/blogger-client-interface';
import { isString } from 'lodash-es';
import { ERROR_NOTICE_TIMEOUT } from '../../consts';
import { openPublishModal } from './open-publish-modal';
import { openConfirmModal } from '../../confirm-modal';
import { IMatterData } from '../../types';
import { IObsidianRequest } from '../../client/request/abstract-request-client';
import { openWithBrowser } from '../webview/webview-utils';
import BloggerPlugin from '../../main';
import { getActiveFile } from './app/file';

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
 * 除了測試以外，不需要直接調用此函數
 * 因為已經由 createObsidianContextMain 呼叫調用
 *
 * @see createObsidianContextMain
 *
 * @param context - 上下文參數物件 / Context parameters object
 * @param context.app - Obsidian 應用程式實例（可選）/ Obsidian App instance (optional)
 * @param context.openPublishModal - 開啟發布對話框函式（可選）/ Function to open publish modal (optional)
 * @param context.openConfirmModal - 開啟確認對話框函式（可選）/ Function to open confirm modal (optional)
 * @param context.getCurrentNoteData - 取得當前筆記資料（可選）/ Function to get current note data (optional)
 * @param context.updateNoteFrontmatter - 更新筆記 Frontmatter（可選）/ Function to update note frontmatter (optional)
 * @returns 建立的上下文物件 / Created context object
 */
export function createObsidianContext(context: {
	app?: App,

	plugin?: BloggerPlugin,

	openPublishModal?: typeof openPublishModal,
	openConfirmModal?: typeof openConfirmModal,

	/**
	 * @todo 待實作，目前尚無相關邏輯，也可能是已經廢棄的規劃
	 */
	getCurrentNoteData?: () => Promise<{ title: string, content: string, matter: IMatterData } | null>,
	/**
	 * @todo 待實作，目前尚無相關邏輯，也可能是已經廢棄的規劃
	 */
	updateNoteFrontmatter?: (matterData: Partial<IMatterData>) => Promise<void>,

	obsidianRequest?: IObsidianRequest,
	openWithBrowser?: typeof openWithBrowser,

})
{
	context ??= {} as any;

	const app = context.app!;

	return {
		app,

		plugin: context.plugin!,

		obsidianRequest: context.obsidianRequest!,

		getLocale,

		showNotice,
		showError,

		openPublishModal: context.openPublishModal!,
		openConfirmModal: context.openConfirmModal!,

		getCurrentNoteData: context.getCurrentNoteData!,
		updateNoteFrontmatter: context.updateNoteFrontmatter!,

		openWithBrowser(url: string | URL)
		{
			context.openWithBrowser?.(url);
			console.log('openWithBrowser', url);
		},

		getActiveFile()
		{
			return getActiveFile(app);
		},
	};
}

/**
 * Obsidian 上下文型別
 * Obsidian context type
 *
 * 請保持 `type IObsidianContext = ReturnType<typeof createObsidianContext>`
 *
 * @todo
 * 漸進式將 邏輯中的 `app: App` 重構為 `ctx: IObsidianContext`
 * 然後以 `ctx.app` 調用原有的 `app`
 *
 * 如果 `plugin: BloggerPlugin` 與 ctx 同時存在，則以 plugin.ctx 取代 ctx
 * 因為新版的 BloggerPlugin 會自動管理 ctx
 */
export type IObsidianContext = ReturnType<typeof createObsidianContext>;
