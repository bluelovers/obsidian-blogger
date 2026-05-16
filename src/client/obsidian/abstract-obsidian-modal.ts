import { Modal } from 'obsidian';
import {
	IAbstractRequestClientLike,
	IRequestUrlParam,
	IRequestUrlResponsePromise,
} from '../request/abstract-request-client';
import { obsidianRequest } from '../request/obsidian-request';

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

	requestUrl<T = any, P extends IRequestUrlParam = IRequestUrlParam>(request: P | string)
	{
		return this.obsidianRequest(request) as IRequestUrlResponsePromise<T>;
	}
}
