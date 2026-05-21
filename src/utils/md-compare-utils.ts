import TurndownService from 'turndown';
import { diffLines } from 'diff';

/**
 * HTML 轉 Markdown 比較結果介面
 * HTML to Markdown comparison result interface
 */
export interface ICompareResult
{
	/** 內容是否相等 / Whether content is equal */
	isEqual: boolean;

	/** 遠端內容轉換後的 Markdown / Remote content converted to Markdown */
	remoteMd: string;

	/** 本地 Markdown 內容 / Local Markdown content */
	localMd: string;

	/** HTML 格式的差異比較結果（用於 UI 顯示）/ Diff result in HTML (for UI display) */
	diffHtml?: string;

	/** 純文字格式的差異比較結果 / Diff result in plain text */
	diffText?: string;
}

/**
 * TurndownService 全域實例（惰性初始化）
 * TurndownService global instance (lazy initialization)
 */
let _turndownService: TurndownService | null = null;

/**
 * 取得 TurndownService 全域實例
 * Get TurndownService global instance
 *
 * 使用 <br> 作為段落分隔符，保留遠端 HTML 的段落結構。
 * Uses <br> as paragraph separator to preserve remote HTML paragraph structure.
 *
 * @returns TurndownService 實例 / TurndownService instance
 */
function _getTurndownService(): TurndownService
{
	if (!_turndownService)
	{
		_turndownService = new TurndownService({
			/** 使用 <br> 作為段落分隔 */
			br: '\n',
		});

		/** 預設規則：保留錨點標題屬性 */
		_turndownService.addRule('headingAnchor', {
			filter: (node): boolean =>
			{
				if (node.nodeName !== 'A') return false;
				if (!node.parentNode) return false;
				return /^H[1-6]$/i.test(node.parentNode.nodeName);
			},
			replacement: (content) => content,
		});
	}
	return _turndownService;
}

/**
 * 將 HTML 內容轉換為 Markdown
 * Convert HTML content to Markdown
 *
 * @param html - HTML 格式的字串 / HTML string
 * @returns 轉換後的 Markdown 字串 / Converted Markdown string
 */
export function convertHtmlToMarkdown(html: string): string
{
	if (!html)
	{
		return '';
	}

	const turndown = _getTurndownService();
	let md = turndown.turndown(html);

	/** 去除多餘的空白行，保留段落結構 */
	md = md.replace(/\n{3,}/g, '\n\n');

	return md.trim();
}

/**
 * 比較遠端 HTML 內容與本地 Markdown 內容
 * Compare remote HTML content with local Markdown content
 *
 * @param remoteHtml - 從 Blogger API 取得的 HTML 內容 / HTML content from Blogger API
 * @param localMd - 本地的 Markdown 內容（已去除 Frontmatter）/ Local Markdown content (without Frontmatter)
 * @returns 比較結果物件 / Comparison result object
 */
export function compareWithLocal(remoteHtml: string, localMd: string): ICompareResult
{
	const remoteMd = convertHtmlToMarkdown(remoteHtml);
	const normalizedLocalMd = localMd.trim();

	if (remoteMd === normalizedLocalMd)
	{
		return {
			isEqual: true,
			remoteMd,
			localMd: normalizedLocalMd,
		};
	}

	/** 計算逐行 diff */
	const diff = diffLines(normalizedLocalMd, remoteMd);

	/** 生成 HTML 格式的 diff（用於 UI 顯示） */
	let diffHtml = '';
	let diffText = '';

	for (const part of diff)
	{
		if (part.added)
		{
			diffHtml += `<div style="background:#e6ffe6;color:#006600;">+ ${escapeHtml(part.value)}</div>`;
			diffText += `+ ${part.value}`;
		}
		else if (part.removed)
		{
			diffHtml += `<div style="background:#ffe6e6;color:#cc0000;">- ${escapeHtml(part.value)}</div>`;
			diffText += `- ${part.value}`;
		}
		else
		{
			diffHtml += `<div style="color:#666;">  ${escapeHtml(part.value)}</div>`;
			diffText += `  ${part.value}`;
		}
	}

	return {
		isEqual: false,
		remoteMd,
		localMd: normalizedLocalMd,
		diffHtml,
		diffText,
	};
}

/**
 * 轉義 HTML 特殊字元
 * Escape HTML special characters
 *
 * @param str - 原始字串 / Raw string
 * @returns 轉義後的字串 / Escaped string
 */
function escapeHtml(str: string): string
{
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
