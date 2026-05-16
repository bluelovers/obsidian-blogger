import { IBloggerClientResult } from '../../types/blogger-client-interface';
import { isString } from 'lodash-es';
import { ISafeAny } from '../../types';
import { Notice } from 'obsidian';
import { ERROR_NOTICE_TIMEOUT } from '../../consts';
import { EnumBloggerClientReturnCode } from '../../types/const';

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
		errorMessage = (error as ISafeAny).toString();
	}
	new Notice(errorMessage, ERROR_NOTICE_TIMEOUT);
	return {
		code: EnumBloggerClientReturnCode.Error,
		message: errorMessage,
	};
}
