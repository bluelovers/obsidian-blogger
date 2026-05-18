import { App } from 'obsidian';
import { createObsidianContext } from './obsidian-context';
import { openPublishModal } from './open-publish-modal';
import { openConfirmModal } from '../../confirm-modal';
import BloggerPlugin from '../../main';
import { obsidianRequest } from '../../client/request/obsidian-request';
import { openWithBrowser } from '../webview/webview-utils';

/**
 * 創建 Obsidian 上下文（主程序端）
 * main.ts 專用
 *
 * @param app Obsidian App 實例
 * @returns Obsidian 上下文
 */
export function createObsidianContextMain(app: App, plugin: BloggerPlugin)
{
	return createObsidianContext({
		app,
		plugin,

		openPublishModal,
		openConfirmModal,

		obsidianRequest,
		openWithBrowser,
	})
}

/**
 * BloggerPlugin 雖然是循環引用，但因為只是 typescript 類型，所以沒有實際上造成問題
 */
export function createObsidianContextMainByPlugin(plugin: BloggerPlugin)
{
	return createObsidianContextMain(plugin.app, plugin)
}
