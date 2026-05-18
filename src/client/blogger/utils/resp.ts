import { ISafeAny } from '../../../types/types';
import { EnumBloggerClientReturnCode } from '../../../types/const';
import { IBloggerClientErrorResult, IBloggerClientResult } from '../../../types/blogger-client-interface';
import { _hasError } from '../../../utils/type-utils';

export function isBloggerClientErrorResult<R extends ISafeAny = ISafeAny>(resp?: IBloggerClientResult<any, R> | any): resp is IBloggerClientErrorResult<R>
{
	resp ??= {};
	return resp.code !== EnumBloggerClientReturnCode.OK || resp.code === EnumBloggerClientReturnCode.Error || _hasError(resp);
}

export function createBloggerClientErrorResult<R extends ISafeAny = ISafeAny>(message: string, response: R)
{
	return {
		code: EnumBloggerClientReturnCode.Error,
		message,
		response,
	} satisfies IBloggerClientErrorResult<R>;
}
