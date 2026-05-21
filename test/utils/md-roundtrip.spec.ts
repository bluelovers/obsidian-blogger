/**
 * MD Round-trip 轉換測試
 * MD round-trip conversion test
 *
 * 測試 MD→HTML→MD 的雙向轉換忠實度。
 * 當轉換結果不等於原始內容時，**不拋出錯誤**，
 * 但會將完整的中間過程（原始 MD、中間 HTML、轉回 MD）記錄在快照中，
 * 供開發者審閱轉換遺失的細節。
 *
 * Tests the MD→HTML→MD round-trip conversion fidelity.
 * When the result differs from the original, **no error is thrown**,
 * but the full trace (original MD, intermediate HTML, round-trip MD)
 * is recorded in snapshots for developer review of conversion loss.
 */
/// <reference types="vitest" />

import { describe, it, expect, afterAll } from 'vitest';
import { getGlobalMarkdownParser } from '../../src/utils/markdown/markdown-it-default';
import { convertHtmlToMarkdown } from '../../src/utils/md-compare-utils';
import { ALL_TEST_GROUPS, IRoundTripResult } from '../fixtures/md-conversion-test-cases';

/**
 * 執行單一測試案例的 round-trip 轉換
 * Execute round-trip conversion for a single test case
 *
 * @param md - 原始 Markdown 輸入 / Original Markdown input
 * @param name - 測試案例名稱 / Test case name
 * @returns Round-trip 結果物件 / Round-trip result object
 */
function roundTrip(md: string, name: string): IRoundTripResult
{
	/** 處理邊界情況：空或純空白輸入 */
	if (!md || !md.trim())
	{
		return {
			name,
			originalMd: md,
			intermediateHtml: '',
			roundTripMd: '',
			isEqual: true,
		};
	}

	const parser = getGlobalMarkdownParser();
	const intermediateHtml = parser.render(md);
	const roundTripMd = convertHtmlToMarkdown(intermediateHtml);

	return {
		name,
		originalMd: md,
		intermediateHtml,
		roundTripMd,
		isEqual: roundTripMd === md.trim(),
	};
}

/** ==================== 測試案例 / Test Cases ==================== */

describe('MD Round-trip (MD → HTML → MD)', () =>
{
	/** 用於彙整所有不等價的案例，在 afterAll 中統一彙報 */
	const nonEqualCases: IRoundTripResult[] = [];

	for (const group of ALL_TEST_GROUPS)
	{
		describe(group.name, () =>
		{
			const results = group.testCases
				.filter(tc => !tc.skip)
				.map(tc => roundTrip(tc.md, tc.name));

			/**
			 * 主要斷言：對整個群組的 round-trip 結果建立快照。
			 * 快照包含每個案例的完整追蹤資訊：
			 *   - originalMd: 原始 Markdown
			 *   - intermediateHtml: markdown-it 產生的中間 HTML
			 *   - roundTripMd: turndown 轉回來的 Markdown
			 *   - isEqual: 原始與最終是否相等
			 *
			 * 無論 isEqual 為何，快照都會記錄所有資訊。
			 * 當轉換行為改變時，快照會提醒開發者審閱變動。
			 */
			it('should capture round-trip conversion trace', () =>
			{
				expect(results).toMatchSnapshot();
			});

			/**
			 * 收集不等價案例，用於最終彙報。
			 * 這些案例不會導致測試失敗（無 expect 斷言），
			 * 僅在 afterAll 中輸出日誌供開發者留意。
			 */
			for (const result of results)
			{
				if (!result.isEqual)
				{
					nonEqualCases.push(result);

					/**
					 * 不等價案例的詳細追蹤測試。
					 * 此測試始終通過（不拋錯），但快照已包含完整過程，
					 * 開發者可檢視快照了解轉換差異。
					 */
					it(`${result.name}: ⚠️ round-trip differs (logged, not failed)`, () =>
					{
						/** 輸出詳細資訊到 console，方便開發者直接查看 */
						console.log('');
						console.log(`  ⚠️ Round-trip mismatch: "${result.name}"`);
						console.log(`  ── Original MD ────────────────────────`);
						console.log(`  ${JSON.stringify(result.originalMd)}`);
						console.log(`  ── Intermediate HTML ───────────────────`);
						console.log(`  ${JSON.stringify(result.intermediateHtml)}`);
						console.log(`  ── Round-trip MD ───────────────────────`);
						console.log(`  ${JSON.stringify(result.roundTripMd)}`);
						console.log(`  ────────────────────────────────────────`);

						/** 測試永遠通過 — round-trip 不等價是設計允許的行為 */
						expect(true).toBe(true);
					});
				}
			}
		});
	}

	/**
	 * 在所有測試完成後，彙報不等價的 round-trip 案例總數。
	 * 不拋出錯誤，僅供資訊參考。
	 */
	afterAll(() =>
	{
		if (nonEqualCases.length > 0)
		{
			console.log('');
			console.log(`  📋 Round-trip Summary: ${nonEqualCases.length} case(s) with non-equal conversion`);
			console.log(`  ${nonEqualCases.map(r => `"${r.name}"`).join(', ')}`);
			console.log('');
		}
		else
		{
			console.log('');
			console.log('  ✅ All round-trip conversions are faithful (original MD === round-trip MD)');
			console.log('');
		}
	});
});
