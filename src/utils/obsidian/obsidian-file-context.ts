import { App, TFile } from 'obsidian';
import { IMatterData } from '../../types/types';
import { IObsidianContext } from './obsidian-context';
import { createFrontmatterContext } from './obsidian-frontmatter-context';
import { stripFrontMatter } from './obsidian-utils';

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
	const frontmatterCtx = createFrontmatterContext(file, ctx);

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
		 * 取得檔案的 Frontmatter 管理器
		 * Get Frontmatter manager for the file
		 */
		get frontmatter()
		{
			return frontmatterCtx;
		},

		/**
		 * 解析檔案，提取內文與 Frontmatter
		 * Process file, extract content and Frontmatter
		 *
		 * @returns 包含內容與 Frontmatter 的物件 / Object containing content and Frontmatter
		 */
		async processData(): Promise<{ content: string; matter: IMatterData }>
		{
			const matter = await frontmatterCtx.readEnsure();
			const raw = await ctx.app.vault.read(file);
			return {
				content: stripFrontMatter(raw),
				matter,
			};
		},
	} as const;
}

/**
 * 檔案上下文型別
 * File context type
 */
export type IFileContext = ReturnType<typeof createFileContext>;
