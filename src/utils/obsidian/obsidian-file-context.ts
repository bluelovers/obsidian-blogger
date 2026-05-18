import { App, TFile } from 'obsidian';
import { IMatterData } from '../../types/types';
import { processFile } from './obsidian-utils';
import { IObsidianContext } from './obsidian-context';

/**
 * 建立單一檔案的上下文
 * Create file context
 *
 * 用於在非同步流程中鎖定並管理單一檔案的狀態與 Frontmatter，
 * 避免因中途切換 ActiveFile 導致操作到錯誤的檔案。
 *
 * @param file - 鎖定的目標檔案 / Locked target file
 * @param app - Obsidian 應用程式實例 / Obsidian App instance
 * @returns 檔案上下文物件 / File context object
 */
export function createFileContext(file: TFile, ctx: IObsidianContext)
{
	return {
		/**
		 * 取得當前鎖定的目標檔案
		 * Get currently locked target file
		 */
		get file()
		{
			return file;
		},

		/**
		 * 取得該檔案目前的 Frontmatter 快取
		 * Get current Frontmatter cache for the file
		 *
		 * @returns Frontmatter 資料 / Frontmatter data
		 */
		getFrontmatter(): IMatterData | undefined
		{
			return ctx.app.metadataCache.getFileCache(file)?.frontmatter as IMatterData | undefined;
		},

		/**
		 * 更新該檔案的 Frontmatter
		 * Update Frontmatter for the file
		 *
		 * @param matterDataOrCallback - 要更新的 Frontmatter 屬性，或用來修改的 callback 函式 / Frontmatter properties to update, or callback function
		 */
		async updateFrontmatter(matterDataOrCallback: Partial<IMatterData> | ((matter: IMatterData) => void)): Promise<void>
		{
			await ctx.app.fileManager.processFrontMatter(file, (matter: IMatterData) =>
			{
				if (typeof matterDataOrCallback === 'function')
				{
					matterDataOrCallback(matter);
				}
				else
				{
					Object.assign(matter, matterDataOrCallback);
				}
			});
		},

		/**
		 * 解析檔案，提取內文與 Frontmatter
		 * Process file, extract content and Frontmatter
		 *
		 * 底層使用 obsidian-utils.ts 的 processFile
		 *
		 * @returns 包含內容與 Frontmatter 的物件 / Object containing content and Frontmatter
		 */
		async processData(): Promise<{ content: string; matter: IMatterData }>
		{
			return processFile(file, ctx.app);
		},
	} as const;
}

/**
 * 檔案上下文型別
 * File context type
 */
export type IFileContext = ReturnType<typeof createFileContext>;
