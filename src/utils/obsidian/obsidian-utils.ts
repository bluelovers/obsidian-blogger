import { App, TFile } from 'obsidian';
import { IMatterData } from '../../types/types';

/**
 * YAML Frontmatter 正則表達式（用於去除檔案開頭的 frontmatter 區塊）
 * YAML Frontmatter regex (strips the frontmatter block at the beginning of a file)
 */
export const FRONT_MATTER_REGEX = /^---[\s\S]+?---/;

/**
 * 從原始檔案內容中去除 YAML Frontmatter
 * Strip YAML Frontmatter from raw file content
 *
 * @param raw - 原始檔案內容 / Raw file content
 * @returns 去除 frontmatter 後的內容（已 trim）/ Content with frontmatter stripped (trimmed)
 */
export function stripFrontMatter(raw: string): string
{
	return raw.replace(FRONT_MATTER_REGEX, '').trim();
}

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
		content: stripFrontMatter(raw),
		matter: fm ?? {},
	};
}
