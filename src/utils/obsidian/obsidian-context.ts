import { App, moment, Notice } from 'obsidian';
import { ILanguageID } from '../../i18n/langs';
import { EnumBloggerClientReturnCode, EnumLanguageIDAll } from '../../types/const';
import { tryCatch } from '../try';
import { IBloggerClientResult } from '../../types/blogger-client-interface';
import { isString } from 'lodash-es';
import { ERROR_NOTICE_TIMEOUT } from '../../consts';

export function showNotice(message: string | DocumentFragment, duration?: number)
{
	return tryCatch(() =>
	{
		return new (require('obsidian').Notice as typeof Notice)(message, duration);
	});
}

export function getLocale()
{
	return tryCatch(() =>
	{
		return (require('obsidian').moment as typeof moment).locale().replace('-', '_') as ILanguageID;
	}) || EnumLanguageIDAll.en;
}

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

export type IObsidianContext = ReturnType<typeof createObsidianContext>;

