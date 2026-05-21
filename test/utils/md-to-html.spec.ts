/**
 * Markdown→HTML 轉換測試
 * Markdown to HTML conversion test
 *
 * 驗證 markdown-it 對各類 Markdown 語法的 HTML 輸出，
 * 使用快照確保轉換結果的穩定性與正確性。
 * Validates markdown-it HTML output for various Markdown syntaxes,
 * using snapshots to ensure conversion stability and correctness.
 */
/// <reference types="vitest" />

import { describe, it, expect } from 'vitest';
import { getGlobalMarkdownParser } from '../../src/utils/markdown/markdown-it-default';
import { ALL_TEST_GROUPS, IConversionResult, IConversionGroupResult } from '../fixtures/md-conversion-test-cases';

/**
 * 將 Markdown 轉換為 HTML
 * Convert Markdown to HTML
 *
 * @param md - Markdown 內容 / Markdown content
 * @returns HTML 輸出 / HTML output
 */
function mdToHtml(md: string): string
{
	if (!md || !md.trim())
	{
		return '';
	}

	const parser = getGlobalMarkdownParser();
	const html = parser.render(md);

	/** 標準化結尾換行，避免快照因平台差異而變動 */
	return html.replace(/\r\n/g, '\n');
}

/**
 * 對單個群組執行 MD→HTML 轉換
 * Execute MD→HTML conversion for a single group
 *
 * @param group - 測試群組 / Test group
 * @returns 群組轉換結果 / Group conversion result
 */
function runGroupConversion(group: typeof ALL_TEST_GROUPS[number]): IConversionGroupResult
{
	const results: IConversionResult[] = group.testCases
		.filter(tc => !tc.skip)
		.map(tc => ({
			name: tc.name,
			input: tc.md,
			output: mdToHtml(tc.md),
		}));

	return {
		groupName: group.name,
		results,
	};
}

/** ==================== 測試案例 / Test Cases ==================== */

describe('MD → HTML Conversion', () =>
{
	for (const group of ALL_TEST_GROUPS)
	{
		describe(group.name, () =>
		{
			const groupResult = runGroupConversion(group);

			it('should match snapshot', () =>
			{
				expect(groupResult).toMatchSnapshot();
			});

			/** 進行基本的結構性斷言（非空、含 HTML 標籤等）*/
			for (const result of groupResult.results)
			{
				if (result.input.trim())
				{
					it(`${result.name}: output should contain HTML tags`, () =>
					{
						expect(result.output).toMatch(/<[a-z/][^>]*>/i);
					});

					it(`${result.name}: output should not equal input (HTML ≠ MD)`, () =>
					{
						expect(result.output).not.toBe(result.input);
					});
				}
			}
		});
	}
});
