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
			/** 使用星號作為斜體標記，與原始 MD 一致 */
			emDelimiter: '*',
			/** 使用 ATX 風格標題 (#)，保留原始風格 */
			headingStyle: 'atx',
			/** 使用連字號作為無序列表標記 */
			bulletListMarker: '-',
			/** 使用圍柵式程式碼區塊 */
			codeBlockStyle: 'fenced',
			/** 使用 --- 作為水平線 */
			hr: '---',
		});

		/** 保留錨點標題屬性：移除 heading 內的 anchor 連結 */
		_turndownService.addRule('headingAnchor', {
			filter: (node): boolean =>
			{
				if (node.nodeName !== 'A') return false;
				if (!node.parentNode) return false;
				return /^H[1-6]$/i.test(node.parentNode.nodeName);
			},
			replacement: (content) => content,
		});

		/** 刪除線：<s> → ~~ */
		_turndownService.addRule('strikethrough', {
			filter: ['s', 'del'],
			replacement: (content) => '~~' + content + '~~',
		});

		/**
		 * 程式碼區塊（含語言標記）：
		 * <pre><code class="language-xxx"> → ```xxx
		 *
		 * 使用 node.textContent 而非 turndown 的 content 參數，
		 * 避免 turndown 預設的內聯程式碼處理干擾區塊內容。
		 */
		_turndownService.addRule('fencedCodeBlock', {
			filter: (node): boolean =>
			{
				return (
					node.nodeName === 'PRE'
					&& node.firstChild != null
					&& node.firstChild.nodeName === 'CODE'
				);
			},
			replacement: (_content, node) =>
			{
				const codeNode = node.firstChild as HTMLElement | null;
				if (!codeNode) return '';

				const codeContent = codeNode.textContent || '';
				let lang = '';
				if (codeNode.className)
				{
					const match = codeNode.className.match(/language-(\w+)/);
					if (match) lang = match[1];
				}

				/** 移除結尾換行，避免多餘空行 */
				const trimmed = codeContent.replace(/\n$/, '');
				return '```' + lang + '\n' + trimmed + '\n' + '```' + '\n';
			},
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
/**
 * 後製正規化：統整 turndown 的輸出格式風格
 * Post-processing normalization: harmonize turndown output style
 *
 * turndown 為了多行列表對齊會在標記後加入額外空白（如 `-   Item`），
 * 巢狀列表會加縮排（`    -   Item`），引言內列表會加上前綴（`> -   Item`）。
 * 此函數將這些多餘空白還原為 Obsidian 風格的單空白格式。
 * Turndown adds extra spaces after markers for alignment (e.g. `-   Item`),
 * nested lists add indentation (`    -   Item`),
 * and blockquote lists add a `>` prefix (`> -   Item`).
 * This function restores the Obsidian-style single-space format.
 *
 * @param md - turndown 輸出的 Markdown 字串 / Turndown output Markdown string
 * @returns 正規化後的 Markdown 字串 / Normalized Markdown string
 */
export function normalizeMarkdown(md: string): string
{
	/**
	 * 1. 正規化多餘空白行：保留段落間的單一空行
	 *    Normalize excessive blank lines: keep single blank line between paragraphs
	 */
	md = md.replace(/\n{3,}/g, '\n\n');

	/**
	 * 2. 正規化無序列表標記後的額外空白
	 *    支援巢狀縮排（`    -   Item`）與引言前綴（`> -   Item`）
	 *    Normalize extra whitespace after unordered list markers,
	 *    supporting nested indentation and blockquote prefixes
	 *
	 *    `-   Item` → `- Item`
	 *    `    -   Child` → `    - Child`
	 *    `> -   Item` → `> - Item`
	 */
	md = md.replace(/^([> ]*[-*+])\s{2,}/gm, '$1 ');

	/**
	 * 3. 正規化有序列表標記後的額外空白
	 *    同上，支援巢狀/引言前綴
	 *    Same as above, supports nested/blockquote prefix
	 */
	md = md.replace(/^([> ]*\d+\.)\s{2,}/gm, '$1 ');

	/**
	 * 4. 正規化引言（blockquote）中的空白行
	 *    移除 `>` 與換行間的多餘空白
	 *    Normalize blockquote blank lines — remove extra space after `>`
	 *    `> \n` → `>\n`
	 */
	md = md.replace(/^> \n/gm, '>\n');

	/**
	 * 5. 正規化巢狀列表縮排：turndown 輸出 4 空格縮排 → 統整為 2 空格
	 *    Normalize nested list indentation: turndown's 4-space → 2-space
	 *
	 *    `    - Child` → `  - Child`
	 */
	md = md.replace(/^((?: {4})+)([-*+])/gm, (match) => match.replace(/ {4}/g, '  '));

	return md;
}

export function convertHtmlToMarkdown(html: string): string
{
	if (!html)
	{
		return '';
	}

	const turndown = _getTurndownService();
	let md = turndown.turndown(html);

	/** 後製正規化：統整 turndown 格式風格 */
	md = normalizeMarkdown(md);

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
