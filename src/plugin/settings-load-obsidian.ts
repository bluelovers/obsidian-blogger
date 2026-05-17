import { Plugin } from 'obsidian';
import { IPluginSettings, IPluginSettingsWithOAuth2 } from '../plugin-settings';

/**
 * 從 Obsidian 外掛非同步載入設定
 * Load settings asynchronously from Obsidian plugin
 *
 * @param plugin - Obsidian 外掛實例 / Obsidian plugin instance
 * @returns 載入的外掛設定 / Loaded plugin settings
 */
export async function loadSettingsFromObsidianPlugin(plugin: Pick<Plugin, 'loadData'>): Promise<IPluginSettingsWithOAuth2>
{
	return plugin.loadData();
}
