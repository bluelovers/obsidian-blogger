import { Modal, requestUrl } from 'obsidian';
import { IObsidianRequest, AbstractRequestClient, IRequestUrlResponsePromise, IRequestUrlParam, IAbstractRequestClientLike } from './abstract-request-client';

/**
 * Obsidian requestUrl 函數的型別化包裝
 * Typed wrapper for Obsidian's requestUrl function
 *
 * 直接導出 Obsidian 內建的 requestUrl，並賦予泛型型別。
 * Directly exports Obsidian's built-in requestUrl with generic typing.
 *
 * @see https://docs.obsidian.md/Reference/TypeScript+API/requestUrl
 */
export const obsidianRequest: IObsidianRequest = requestUrl;

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

/**
 * 結合 Obsidian Modal 與抽象請求能力的類別
 * Class combining Obsidian Modal with abstract request capability
 *
 * 由於 TypeScript 不支援多重類別繼承，因此透過實作 `IAbstractRequestClientLike` 介面
 * 來為 Modal 子類別加入 HTTP 請求能力。
 * Since TypeScript does not support multiple class inheritance, this implements
 * the `IAbstractRequestClientLike` interface to add HTTP request capability to Modal subclasses.
 */
export class AbstractObsidianModal extends Modal implements IAbstractRequestClientLike
{
	protected obsidianRequest = obsidianRequest;

	requestUrl<T = any , P extends IRequestUrlParam = IRequestUrlParam>(request: P | string)
	{
		return this.obsidianRequest(request) as IRequestUrlResponsePromise<T>;
	}
}
