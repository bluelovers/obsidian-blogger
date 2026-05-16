
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
