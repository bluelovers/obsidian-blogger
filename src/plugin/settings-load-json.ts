import { readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { IPluginSettingsWithOAuth2 } from '../plugin-settings';

/**
 * 解析 JSON 字串為外掛設定
 * Parse JSON string into plugin settings
 *
 * @param content - JSON 字串內容 / JSON string content
 * @returns 外掛設定物件 / Plugin settings object
 */
export function _parseJson(content: string): IPluginSettingsWithOAuth2
{
	return JSON.parse(content) as IPluginSettingsWithOAuth2;
}

/**
 * 從 JSON 檔案非同步載入設定
 * Load settings asynchronously from JSON file
 *
 * @param file - 檔案路徑 / File path
 * @returns 載入的外掛設定 / Loaded plugin settings
 *
 * @see __PLUGIN_DATA_JSON
 */
export async function loadSettingsFromJson(file: string)
{
	const content = await readFile(file, 'utf-8');
	return _parseJson(content);
}

/**
 * 從 JSON 檔案同步載入設定
 * Load settings synchronously from JSON file
 *
 * @param file - 檔案路徑 / File path
 * @returns 載入的外掛設定 / Loaded plugin settings
 *
 * @see __PLUGIN_DATA_JSON
 */
export function loadSettingsFromJsonSync(file: string)
{
	const content = readFileSync(file, 'utf-8');
	return _parseJson(content);
}
