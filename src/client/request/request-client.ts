import { obsidianRequest as _obsidianRequest } from './obsidian-request';
import { AbstractRequestClient, IObsidianRequest } from './abstract-request-client';

/**
 * 含建構子注入的抽象請求客戶端
 * Abstract request client with constructor injection
 *
 * 提供預設的 Obsidian requestUrl 實作，同時允許子類別在建構時注入自訂實作
 * （例如用於測試的 Mock 實作）。
 * Provides a default Obsidian requestUrl implementation while allowing subclasses
 * to inject custom implementations (e.g., mocks for testing) via the constructor.
 */
export abstract class AbstractRequestClientWithConstructor extends AbstractRequestClient
{
	/**
	 * @param obsidianRequest - requestUrl 實作，預設為 Obsidian API / requestUrl implementation, defaults to Obsidian API
	 */
	protected constructor(protected obsidianRequest: IObsidianRequest = _obsidianRequest)
	{
		super();
	}
}
