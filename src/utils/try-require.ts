/**
 * 嘗試載入模組，若失敗則回傳 undefined
 * Attempt to require a module, return undefined if failed
 *
 * @template T - 預期的模組型別 / Expected module type
 * @param modulePath - 模組路徑 / Module path
 * @returns 載入的模組或 undefined / Required module or undefined
 */
export function tryRequire<T>(modulePath: string): T | undefined
{
	try
	{
		return require(modulePath);
	}
	catch (error)
	{

	}

	// @ts-ignore
	return undefined;
}
