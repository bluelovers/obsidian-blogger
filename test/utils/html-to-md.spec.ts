/**
 * HTML→Markdown 轉換測試
 * HTML to Markdown conversion test
 *
 * 驗證兩條路徑的 HTML→MD 轉換：
 * 1. **Direct（直接）**：使用 fixture 中的乾淨 HTML 輸入，測試 turndown 基本能力
 * 2. **Pipeline（管線）**：透過 markdown-it 產生 HTML（模擬 Blogger API 回傳的真實情境），
 *    再餵給 turndown 轉回 MD，並檢查是否等同原始 MD（round-trip 忠實度）
 *
 * 兩條路徑的結果與相等性全部記錄在快照中，不相等時不拋出錯誤。
 *
 * Validates two HTML→MD conversion paths:
 * 1. **Direct**: Clean fixture HTML → turndown, testing turndown's baseline capability
 * 2. **Pipeline**: markdown-it generated HTML (simulating real Blogger API response)
 *    → turndown, checking round-trip fidelity against the original MD
 *
 * Both paths' results and equality info are captured in snapshots.
 * No error is thrown when results differ.
 */
/// <reference types="vitest" />

import { describe, it, expect } from 'vitest';
import { convertHtmlToMarkdown } from '../../src/utils/md-compare-utils';
import { getGlobalMarkdownParser } from '../../src/utils/markdown/markdown-it-default';
import { ALL_TEST_GROUPS, ITestGroup } from '../fixtures/md-conversion-test-cases';

/** ==================== 型別定義 / Type Definitions ==================== */

/**
 * 單一測試案例的完整 HTML→MD 轉換結果
 * Complete HTML→MD conversion result for a single test case
 */
export interface IHtmlToMdEntry
{
	/** 測試案例名稱 / Test case name */
	name: string;

	/** ===== Direct 路徑：fixture HTML → turndown ===== */
	/** fixture 中的原始 HTML 輸入 / Raw fixture HTML input */
	directHtml: string;
	/** turndown 轉換後的 Markdown / turndown converted Markdown */
	directMd: string;
	/** Direct 路徑的 MD 是否等於原始 MD / Whether direct MD equals original MD */
	directMatchesOriginal: boolean;

	/** ===== Pipeline 路徑：MD → markdown-it HTML → turndown ===== */
	/** markdown-it 產生的中間 HTML / markdown-it generated intermediate HTML */
	pipelineHtml: string;
	/** turndown 從 pipeline HTML 轉回的 MD / turndown MD from pipeline HTML */
	pipelineMd: string;
	/** Pipeline 路徑的 MD 是否等於原始 MD / Whether pipeline MD equals original MD */
	pipelineMatchesOriginal: boolean;
}

/**
 * 單一群組的 HTML→MD 轉換結果
 * HTML→MD conversion result for a single group
 */
export interface IHtmlToMdGroupResult
{
	/** 群組名稱 / Group name */
	groupName: string;
	/** 所有測試案例的轉換結果陣列 / Results array for all test cases */
	results: IHtmlToMdEntry[];
}

/** ==================== 轉換函式 / Conversion Functions ==================== */

/**
 * Direct 路徑：fixture HTML → turndown
 * Direct path: fixture HTML → turndown
 *
 * @param html - fixture 中的原始 HTML / Raw fixture HTML
 * @returns turndown 轉換後的 Markdown / turndown converted Markdown
 */
function directHtmlToMd(html: string): string
{
	if (!html || !html.trim())
	{
		return '';
	}

	return convertHtmlToMarkdown(html);
}

/**
 * Pipeline 路徑：MD → markdown-it HTML → turndown
 * Pipeline path: MD → markdown-it HTML → turndown
 *
 * 此路徑模擬 Blogger API 回傳的真實情境：
 * markdown-it 先將 MD 轉成 HTML（如同 Blogger 儲存的內容），
 * 再用 turndown 將該 HTML 轉回 MD。
 * This path simulates the real Blogger API scenario:
 * markdown-it converts MD to HTML first (like Blogger stored content),
 * then turndown converts that HTML back to MD.
 *
 * @param md - 原始 Markdown / Original Markdown
 * @returns turndown 轉換後的 Markdown / turndown converted Markdown
 */
function pipelineMdToHtmlToMd(md: string): { html: string; md: string }
{
	if (!md || !md.trim())
	{
		return { html: '', md: '' };
	}

	const parser = getGlobalMarkdownParser();
	const html = parser.render(md);
	const resultMd = convertHtmlToMarkdown(html);

	return { html, md: resultMd };
}

/**
 * 對單個群組執行兩條路徑的轉換
 * Execute both conversion paths for a single group
 *
 * @param group - 測試群組 / Test group
 * @returns 群組轉換結果（含 direct 與 pipeline）/ Group result (both direct and pipeline)
 */
function runGroupConversion(group: ITestGroup): IHtmlToMdGroupResult
{
	const results: IHtmlToMdEntry[] = group.testCases
		.filter(tc => !tc.skip)
		.map(tc =>
		{
			const originalMd = tc.md.trim();

			/** Direct 路徑：fixture HTML → turndown */
			const directMd = directHtmlToMd(tc.html);
			const directTrimmed = directMd.trim();

			/** Pipeline 路徑：MD → markdown-it HTML → turndown */
			const { html: pipelineHtml, md: pipelineMd } = pipelineMdToHtmlToMd(tc.md);
			const pipelineTrimmed = pipelineMd.trim();

			return {
				name: tc.name,

				/** Direct */
				directHtml: tc.html,
				directMd: directTrimmed,
				directMatchesOriginal: originalMd.length > 0 && directTrimmed === originalMd,

				/** Pipeline */
				pipelineHtml,
				pipelineMd: pipelineTrimmed,
				pipelineMatchesOriginal: originalMd.length > 0 && pipelineTrimmed === originalMd,
			};
		});

	return {
		groupName: group.name,
		results,
	};
}

/** ==================== 測試案例 / Test Cases ==================== */

describe('HTML → MD Conversion (turndown)', () =>
{
	for (const group of ALL_TEST_GROUPS)
	{
		describe(group.name, () =>
		{
			const groupResult = runGroupConversion(group);

			/**
			 * 主要斷言：對整個群組的雙路徑轉換結果建立快照。
			 * 快照包含每筆案例的：
			 *   - directHtml / directMd / directMatchesOriginal
			 *   - pipelineHtml / pipelineMd / pipelineMatchesOriginal
			 *
			 * 相等性資訊亦記錄在快照中 — 無論是否相等，測試都不會因此失敗。
			 * The main assertion: snapshot the dual-path conversion result for the group.
			 * The snapshot captures equality info for both paths — no test failure on mismatch.
			 */
			it('should match snapshot (direct + pipeline)', () =>
			{
				expect(groupResult).toMatchSnapshot();
			});

			/**
			 * 對 Direct 路徑做基本的結構性斷言
			 * Basic structural assertions for the Direct path
			 */
			for (const entry of groupResult.results)
			{
				if (entry.directHtml.trim())
				{
					it(`${entry.name}: direct MD should not be empty`, () =>
					{
						expect(entry.directMd.length).toBeGreaterThan(0);
					});

					it(`${entry.name}: direct MD should not equal input HTML`, () =>
					{
						expect(entry.directMd).not.toBe(entry.directHtml);
					});
				}
			}

			/**
			 * 對 Pipeline 路徑做基本的結構性斷言
			 * Basic structural assertions for the Pipeline path
			 */
			for (const entry of groupResult.results)
			{
				/** 原始 MD 非空時，pipeline HTML 應非空 */
				if (entry.directHtml.trim())
				{
					it(`${entry.name}: pipeline HTML should not be empty`, () =>
					{
						expect(entry.pipelineHtml.length).toBeGreaterThan(0);
					});
				}

				/** pipeline MD ≠ pipeline HTML（基本結構性檢查）*/
				if (entry.pipelineHtml.trim())
				{
					it(`${entry.name}: pipeline MD should not equal pipeline HTML`, () =>
					{
						expect(entry.pipelineMd).not.toBe(entry.pipelineHtml);
					});
				}
			}
		});
	}
});
