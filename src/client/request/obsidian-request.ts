import { AbstractRequestClient, IObsidianRequest } from './abstract-request-client';

function useObsidianRequest(): IObsidianRequest
{
	let fn = () =>
	{
		throw new Error('obsidian.requestUrl is not a function');
	};

	try
	{
		const requestUrl = require('obsidian').requestUrl;

		if (typeof requestUrl === 'function')
		{
			return requestUrl;
		}
	}
	catch (error)
	{
		// console.error(error);
	}

	return fn;
}

/**
 * Obsidian requestUrl 函數的型別化包裝
 * Typed wrapper for Obsidian's requestUrl function

 * 直接導出 Obsidian 內建的 requestUrl，並賦予泛型型別。
 * Directly exports Obsidian's built-in requestUrl with generic typing.
 *
 * @see https://docs.obsidian.md/Reference/TypeScript+API/requestUrl
 */
export const obsidianRequest: IObsidianRequest = useObsidianRequest();

/**
 * 基於 Obsidian request 的抽象客戶端實作
 * Abstract client implementation based on Obsidian request
 *
 * 注入 Obsidian 的 requestUrl 實作，適合在實際 Obsidian 環境中使用。
 * Injects Obsidian's requestUrl implementation, suitable for real Obsidian environment.
 */
export class AbstractRequestClientObsidian extends AbstractRequestClient
{
	protected obsidianRequest = obsidianRequest;
}
