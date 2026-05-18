import {
	DEFAULT_SETTINGS,
	IPluginSettings,
	IPluginSettingsWithOAuth2,
	upgradeSettings,
	upgradeSettingsSync,
} from '../plugin-settings';
import { EnumSettingsVersion } from '../types/const';
import { IBloggerProfile } from '../types/blogger-profile';

/**
 * 標準化外掛設定
 * Normalize plugin settings
 *
 * 將多個部分設定物件與預設設定合併。
 * Merges multiple partial settings objects with the default settings.
 *
 * @param settings - 一或多個部分設定物件 / One or more partial settings objects
 * @returns 標準化後的完整設定 / Normalized full settings
 */
export function normalizeSettings(...settings: Partial<IPluginSettings>[]): IPluginSettingsWithOAuth2
{
	return Object.assign({}, DEFAULT_SETTINGS, ...settings);
}

/**
 * 同步處理設定升級
 * Handle settings upgrade synchronously
 *
 * @param settings - 當前外掛設定 / Current plugin settings
 * @returns 升級後的設定物件 / Upgraded settings object
 */
export function handleSettingsUpgradeSync(settings: IPluginSettings)
{
	return upgradeSettingsSync(normalizeSettings(settings), EnumSettingsVersion.V1);
}

/**
 * 非同步處理設定升級
 * Handle settings upgrade asynchronously
 *
 * @param settings - 當前外掛設定 / Current plugin settings
 * @returns 升級後的設定物件 Promise / Upgraded settings object Promise
 */
export async function handleSettingsUpgrade(settings: IPluginSettings)
{
	return upgradeSettings(normalizeSettings(settings), EnumSettingsVersion.V1);
}

/** 包含 profiles 屬性的設定介面 / Settings interface containing profiles property */
export type ISettingsWithProfilesLike = Pick<IPluginSettingsWithOAuth2, 'profiles'>;

/**
 * 尋找預設的 Blogger 設定檔
 * Find default Blogger profile
 *
 * @param settings - 包含設定檔列表的設定物件 / Settings object containing profiles list
 * @returns 預設設定檔，若無則回傳 undefined / Default profile, or undefined if not found
 */
export function findDefaultProfile(settings: ISettingsWithProfilesLike)
{
	return settings.profiles.find((it) => it.isDefault);
}

/**
 * 設定預設的 Blogger 設定檔
 * Set default Blogger profile
 *
 * @param settings - 包含設定檔列表的設定物件 / Settings object containing profiles list
 * @param index - 欲設為預設的設定檔索引（可選） / Index of profile to set as default (optional)
 * @returns 更新後的設定物件 / Updated settings object
 * @throws 若指定索引的設定檔不存在則拋出錯誤 / Throws error if profile at specified index does not exist
 */
export function setDefaultProfile<T extends ISettingsWithProfilesLike>(settings: T, index?: number)
{
	/**
	 * 首先將所有設定檔的預設旗標清除
	 * Clear default flag from all profiles first
	 */
	settings.profiles.forEach((it) =>
	{
		it.isDefault = false;
	});
	/**
	 * 若有提供有效索引，則將對應的設定檔設為預設
	 * If valid index is provided, set the corresponding profile as default
	 */
	if (index !== undefined && index >= 0)
	{
		if (!settings.profiles[index])
		{
			throw newProfileNotExistsError(index);
		}
		settings.profiles[index].isDefault = true;
	}

	return settings;
}

/**
 * 新增 Blogger 設定檔
 * Add new Blogger profile
 *
 * @param settings - 包含設定檔列表的設定物件 / Settings object containing profiles list
 * @param profile - 欲新增的設定檔 / Profile to add
 * @returns 更新後的設定物件 / Updated settings object
 */
export function addNewProfile<T extends ISettingsWithProfilesLike>(settings: T, profile: IBloggerProfile)
{
	const index = settings.profiles.length;

	/**
	 * 若為第一個設定檔，則將其設為預設
	 * If it's the first profile, make it the default
	 */
	profile.isDefault = (index === 0);

	/**
	 * 確保若新設定檔為預設時，其他設定檔狀態皆同步重置
	 * Ensure other profiles' states are reset if the new profile is default
	 */
	if (profile.isDefault)
	{
		setDefaultProfile(settings);
	}

	settings.profiles.push(profile);

	return settings;
}

/**
 * 移除 Blogger 設定檔
 * Remove Blogger profile
 *
 * @param settings - 包含設定檔列表的設定物件 / Settings object containing profiles list
 * @param index - 欲移除的設定檔索引 / Index of profile to remove
 * @returns 更新後的設定物件 / Updated settings object
 * @throws 若指定索引的設定檔不存在則拋出錯誤 / Throws error if profile at specified index does not exist
 */
export function removeProfile<T extends ISettingsWithProfilesLike>(settings: T, index: number)
{
	const profile = settings.profiles[index];
	/**
	 * 檢查指定的設定檔是否存在
	 * Check if the specified profile exists
	 */
	if (!profile)
	{
		throw newProfileNotExistsError(index);
	}

	settings.profiles.splice(index, 1);

	/**
	 * 若移除的設定檔為預設且仍有其他設定檔，則將第一個設定檔設為預設
	 * If removed profile was default and there are other profiles, set the first one as default
	 */
	if (profile.isDefault && settings.profiles.length > 0)
	{
		setDefaultProfile(settings, 0);
	}

	return settings;
}

/**
 * 建立設定檔不存在錯誤
 * Create profile not exists error
 *
 * @param index - 不存在的設定檔索引 / Index of non-existent profile
 * @returns RangeError 錯誤實例 / RangeError instance
 */
export function newProfileNotExistsError(index: number)
{
	return new RangeError(`Profile at index ${index} does not exist`);
}
