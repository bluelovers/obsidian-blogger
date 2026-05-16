
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
