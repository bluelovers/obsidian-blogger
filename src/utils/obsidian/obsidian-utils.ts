import { App, TFile } from 'obsidian';
import { IMatterData } from '../../types/types';

/**
 * 處理檔案，提取內容與 Frontmatter
 * Process file, extract content and Frontmatter
 *
 * @param file - 目標檔案 / Target file
 * @param app - Obsidian 應用程式實例 / Obsidian App instance
 * @returns 包含內容與 Frontmatter 的物件 / Object containing content and Frontmatter
 */
export async function processFile(
	file: TFile,
	app: App,
): Promise<{ content: string; matter: IMatterData }>
{
	let fm = app.metadataCache.getFileCache(file)?.frontmatter;
	if (!fm)
	{
		await app.fileManager.processFrontMatter(file, (matter: IMatterData) =>
		{
			fm = matter;
		});
	}
	const raw = await app.vault.read(file);
	return {
		content: raw.replace(/^---[\s\S]+?---/, '').trim(),
		matter: fm ?? {},
	};
}
