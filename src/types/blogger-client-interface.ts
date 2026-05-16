import { ISafeAny } from '../types';
import { EnumBloggerClientReturnCode, EnumobsidianBloggerTags, EnumPostStatus } from './const';

/**
 * Blogger 客戶端結果基底介面（內部使用）
 * Base blogger client result interface (internal)
 */
interface _IBloggerClientResult
{
	/** Blogger 伺服器原始回應 / Raw response from Blogger server */
	response?: ISafeAny;

	/** 回傳碼 / Return code */
	code: EnumBloggerClientReturnCode;
}

/**
 * Blogger 客戶端成功結果介面（內部使用）
 * Blogger client success result interface (internal)
 *
 * @template T - 成功時攜帶的資料類型 / Data type on success
 */
interface IBloggerClientOkResult<T> extends _IBloggerClientResult
{
	code: EnumBloggerClientReturnCode.OK;
	/** 成功結果資料 / Success result data */
	data: T;
}

/**
 * Blogger 客戶端錯誤結果介面（內部使用）
 * Blogger client error result interface (internal)
 */
interface IBloggerClientErrorResult extends _IBloggerClientResult
{
	code: EnumBloggerClientReturnCode.Error;
	/** 錯誤訊息 / Error message */
	message: string;
}

/**
 * Blogger 客戶端結果聯合型別
 * Blogger client result union type
 *
 * 使用可辨別聯合（Discriminated Union）區分成功與錯誤結果。
 * Uses a discriminated union to differentiate success and error results.
 *
 * @template T - 成功時攜帶的資料類型 / Data type on success
 */
export type IBloggerClientResult<T> = IBloggerClientOkResult<T> | IBloggerClientErrorResult;

/**
 * Blogger 發文參數核心介面
 * Blogger post parameters core interface
 */
export interface IBloggerPostParamsCore
{
	/**
	 * 文章標籤列表（含內部管理標籤）
	 * Post tags list (including internal management tags)
	 *
	 * 對應 Blogger API 的 labels 欄位。
	 * 可包含 `EnumobsidianBloggerTags` 內部標籤，在實際發送 API 時會被過濾移除。
	 * Maps to the Blogger API labels field.
	 * May include `EnumobsidianBloggerTags` for internal management;
	 * these are filtered out before the actual API call.
	 */
	tags: (string | EnumobsidianBloggerTags)[];

	/** 文章標題 / Post title */
	title: string;

	/**
	 * Blogger 文章 ID
	 * Blogger post ID
	 *
	 * 若已存在此 ID，則更新已有文章；否則建立新文章。
	 * 使用 TypeScript 樣板字面型別（Template Literal Type）確保格式為數字字串。
	 * If assigned, updates an existing post; otherwise creates a new one.
	 * Uses TypeScript template literal type to enforce numeric string format.
	 */
	postId?: `${number}`;

	/**
	 * Blogger 設定檔名稱
	 * Blogger profile name
	 */
	profileName?: string;

	/**
	 * 僅更新狀態模式（跳過內容上傳）
	 * Update status only mode (skip content upload)
	 *
	 * 啟用時 publish() 會使用輕量 PATCH 請求僅修改 status 欄位，
	 * 而非重新上傳完整文章內容。
	 * 若文章尚未發布（無 postId），则仍會 fallback 至正常發布流程。
	 * When enabled, publish() uses a lightweight PATCH request to modify
	 * only the status field instead of re-uploading full post content.
	 * Falls back to normal publish when postId does not exist.
	 */
	updateStatusOnly?: boolean;
}

/**
 * 完整 Blogger 發文參數介面
 * Full Blogger post parameters interface
 */
export interface IBloggerPostParams extends IBloggerPostParamsCore
{
	/** 文章狀態（草稿/已發布/已排程/軟刪除）/ Post status (draft/live/scheduled/soft-trashed) */
	status: EnumPostStatus;

	/** 文章內容（HTML 格式）/ Post content (HTML format) */
	content: string;
}

/**
 * 發布請求參數介面
 * Publish request parameters interface
 */
export interface IBloggerPublishParams
{
	/** 發文參數 / Post parameters */
	postParams: IBloggerPostParams;
	/** Front Matter 原始資料 / Raw front matter data */
	matterData: { [p: string]: ISafeAny };
}

/**
 * 發布結果基底介面（內部使用）
 * Publish result base interface (internal)
 */
interface _IBloggerPublishResult
{
	/** 已發布文章的 URL / Published post URL */
	url: string;
}

/**
 * 發布結果介面
 * Publish result interface
 *
 * 繼承自 `IBloggerPostParams` 的 `postId` 與 `status`，加上 `url`。
 * Extends `IBloggerPostParams` with `postId` and `status`, plus `url`.
 */
export interface IBloggerPublishResult extends Pick<IBloggerPostParams, 'postId' | 'status'>, _IBloggerPublishResult
{

}

/**
 * 媒體上傳結果介面
 * Media upload result interface
 */
export interface IBloggerMediaUploadResult extends _IBloggerPublishResult
{

}

/**
 * Blogger 客戶端合約介面
 * Blogger client contract interface
 */
export interface IBloggerClient
{
	/**
	 * 發布文章至 Blogger
	 * Publish a post to Blogger
	 *
	 * 若 Front Matter 中包含 `postId` 則更新已有文章，否則建立新文章。
	 * If `postId` exists in front matter, updates the existing post; otherwise creates a new one.
	 *
	 * @param defaultPostParams - 若提供此參數，則跳過發布確認彈窗直接發布 / Skip the publish confirmation modal when provided
	 */
	publishPost(
		defaultPostParams?: IBloggerPostParams,
	): Promise<IBloggerClientResult<IBloggerPublishResult>>;

}
