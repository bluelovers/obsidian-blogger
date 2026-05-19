import { EnumLanguageIDAll, EnumMathJaxOutputType, EnumPostStatus, EnumSettingsVersion } from './types/const';
import { IBloggerProfile } from './types/blogger-profile';

/**
 * OAuth2 客戶端憑證介面
 * OAuth2 client credentials interface
 */
export interface IOauth2ClientCredentials
{
	/** Google OAuth2 客戶端 ID / Google OAuth2 client ID */
	clientId: string;
	/** Google OAuth2 客戶端密鑰 / Google OAuth2 client secret */
	clientSecret: string;
}

/**
 * 外掛設定介面
 * Plugin settings interface
 */
export interface IPluginSettings extends Partial<IOauth2ClientCredentials>
{
	/** 設定檔版本 / Settings version */
	version: EnumSettingsVersion;

	/** 外掛語言 / Plugin language */
	lang: EnumLanguageIDAll;

	/** Blogger 設定檔列表 / Blogger profile list */
	profiles: IBloggerProfile[];

	/** 是否在側邊欄顯示外掛圖示 / Whether to show the plugin ribbon icon */
	showRibbonIcon: boolean;

	/** 預設發文狀態 / Default post status */
	defaultPostStatus: EnumPostStatus;

	/** 發布成功後是否用瀏覽器開啟文章 / Whether to open the published page in browser */
	openPublishedPageWithBrowser: boolean;

	/** MathJax 輸出類型 / MathJax output type */
	mathJaxOutputType: EnumMathJaxOutputType;

	/** 是否啟用 HTML 渲染 / Whether to enable HTML rendering */
	enableHtml: boolean;

	/** 是否啟用 Blogger Dashboard 儀表板 / Whether to enable Blogger Dashboard view */
	enableDashboard: boolean;

	/**
	 * 更新文章前是否先查詢當前狀態
	 * Whether to check current post status before updating
	 *
	 * 啟用後，更新文章前會先 GET 查詢當前文章狀態，並根據狀態變化
	 * 自動選擇正確的 API 端點順序（publish/revert → PATCH），
	 * 避免 Blogger API 不支援在 PATCH 中直接切換狀態的限制。
	 * When enabled, queries the current post status via GET before updating,
	 * and automatically selects the correct API endpoint order (publish/revert -> PATCH)
	 * to work around the Blogger API limitation where PATCH cannot change post status.
	 */
	enableSmartPreCheck: boolean;
}

/**
 * 含 OAuth2 憑證的完整設定型別
 * Full settings type with OAuth2 credentials
 */
export type IPluginSettingsWithOAuth2 = IPluginSettings & IOauth2ClientCredentials;

/**
 * 型別守衛：檢查設定是否包含 OAuth2 憑證
 * Type guard: check if settings include OAuth2 credentials
 *
 * @param settings - 外掛設定 / Plugin settings
 * @returns 是否已設定 OAuth2 憑證 / Whether OAuth2 credentials are configured
 */
export const isPluginSettingsWithOAuth2 = (
	settings: IPluginSettings,
): settings is IPluginSettingsWithOAuth2 =>
{
	return !!(settings.clientId && settings.clientSecret);
};

/**
 * 預設外掛設定值
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: IPluginSettings = {
	version: EnumSettingsVersion.V1,
	lang: EnumLanguageIDAll.auto,
	profiles: [],
	showRibbonIcon: false,
	defaultPostStatus: EnumPostStatus.Draft,
	openPublishedPageWithBrowser: false,
	mathJaxOutputType: EnumMathJaxOutputType.SVG,
	enableHtml: false,
	enableDashboard: false,
	enableSmartPreCheck: false,
};

/**
 * 升級設定檔至指定版本
 * Upgrade settings to the specified version
 *
 * @param existingSettings - 現有設定資料 / Existing settings data
 * @param to - 目標版本 / Target version
 * @returns 是否需要升級以及升級後的設定 / Whether upgrade is needed and upgraded settings
 *
 * @note 目前僅有一個版本，此函式為預留的遷移機制
 * @note Currently only one version exists; this function is a stub for future migrations
 */
export async function upgradeSettings<T extends IPluginSettings>(
	existingSettings: T,
	to: EnumSettingsVersion,
)
{
	return upgradeSettingsSync(existingSettings, to);
}

export function upgradeSettingsSync<T extends IPluginSettings>(
	existingSettings: T,
	to: EnumSettingsVersion,
)
{
	return {
		needUpgrade: false,
		settings: existingSettings,
	};
}
