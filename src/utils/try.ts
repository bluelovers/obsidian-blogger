/**
 * 嘗試執行同步函式，若發生錯誤則回傳 undefined
 * Attempt to execute synchronous function, return undefined if an error occurs
 *
 * @template T - 預期的回傳型別 / Expected return type
 * @param fn - 要執行的函式 / Function to execute
 * @returns 函式結果或 undefined / Function result or undefined
 */
export function tryCatch<T>(fn: () => T): T
{
	try
	{
		return fn();
	}
	catch (error)
	{

	}

	// @ts-ignore
	return undefined;
}

/**
 * 嘗試執行非同步函式，若發生錯誤則回傳 undefined
 * Attempt to execute asynchronous function, return undefined if an error occurs
 *
 * @template T - 預期的回傳型別 / Expected return type
 * @param fn - 要執行的非同步函式 / Asynchronous function to execute
 * @returns 函式結果或 undefined / Function result or undefined
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<T>
{
	try
	{
		return await fn();
	}
	catch (error)
	{

	}

	// @ts-ignore
	return undefined;
}
