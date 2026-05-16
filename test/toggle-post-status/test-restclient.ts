/**
 * RestClient E2E 測試 — Publish / Revert 文章狀態切換
 * RestClient E2E Test — Toggle post status via publish/revert endpoints
 *
 * 使用基於 RestClient + Node.js requestUrl 適配器的真實 HTTP 請求，
 * 驗證 Blogger API 的 publish/revert 端點是否正確切換文章狀態。
 *
 * Uses RestClient + Node.js requestUrl adapter with real HTTP requests
 * to verify Blogger API publish/revert endpoints correctly toggle post status.
 *
 * 只操作 postId: "2330039242586333609"（未命名3333），不影響其他文章。
 * Only operates on postId: "2330039242586333609", leaves other posts untouched.
 *
 * @example
 * tsx test/toggle-post-status/test-restclient.ts
 */
/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { nodeRequest } from '../lib/node-request';
import { RestClient, IBloggerPostApiReturn } from '../../src/client/blogger/rest-client';
import { BLOGGER_API_ENDPOINT } from '../../src/consts';
import { getBloggerRestEndpoint, getUrl } from '../../src/client/blogger/utils/url';
import { EnumPostStatus } from '../../src/types/const';
import { _hasError } from '../../src/utils/type-utils';
import {
	loadCredentials,
	DRAFT_POST_ID,
	assert,
	assertEqual,
	printSummary,
	ITestResult,
} from '../lib/test-utils';
import { __TEST_TEMP } from '../__root';

/** ==================== 型別定義 / Type Definitions ==================== */

/**
 * API 請求紀錄用介面 — 僅記錄傳遞給 RestClient 方法的參數，而非底層 HTTP 細節。
 * Request log interface — records only the parameters passed to RestClient methods,
 * not the low-level HTTP request details.
 */
interface IApiRequestLog
{
	/** 方法名稱（如 httpGet、httpPublish、httpRevert）/ Method name */
	method: string;

	/** API 路徑（不含 base URL）/ API path (without base URL) */
	path: string;

	/** 認證資訊 / Auth info */
	auth?: { headers: { authorization: string } };
}

/** ==================== 工具函數 / Utilities ==================== */

/**
 * 記錄 API 請求與回應至 test/temp/cache/{step}.json
 * Save API request + response to test/temp/cache/{step}.json
 *
 * @param step - 步驟名稱（固定值，作為檔名） / Step name (fixed, used as filename)
 * @param request - 傳遞給 API 的參數 / Parameters passed to API
 * @param response - API 回傳的原始資料 / Raw API response
 */
function saveApiResponse(
	step: string,
	request: IApiRequestLog,
	response: IBloggerPostApiReturn,
): void
{
	const dir = path.join(__TEST_TEMP, 'cache');
	fs.mkdirSync(dir, { recursive: true });

	/**
	 * 脫敏 token，只保留 Bearer 前綴。
	 * Redact the actual token value, keep only the Bearer prefix.
	 */
	const loggedRequest: IApiRequestLog = {
		...request,
		auth: request.auth
			? { headers: { authorization: 'Bearer [REDACTED]' } }
			: undefined,
	};

	const content = {
		step,
		request: loggedRequest,
		response,
	};

	// 固定檔名，每次執行覆蓋 / Fixed filename, overwritten on each run
	const filePath = path.join(dir, `${step}.json`);
	fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
	console.log(`    📁 Cache saved: ${filePath}`);
}

/**
 * 從 API 回應中安全提取文章狀態。
 * Safely extract post status from an API response.
 *
 * ═══════════════════════════════════════════════════════
 * Blogger API 觀察發現（透過 test/temp/cache 實測驗證）
 * ═══════════════════════════════════════════════════════
 *
 * 1. GET + view=AUTHOR 時：
 *    - LIVE 文章：成功，但「不包含」`status` 欄位
 *      LIVE post: succeeds, OMITS `status` field
 *    - DRAFT 文章：成功，「包含」`status: "DRAFT"`
 *      DRAFT post: succeeds, INCLUDES `status: "DRAFT"`
 *
 * 2. publish / revert 端點：一定包含 `status` 欄位。
 *    publish / revert endpoints: ALWAYS include `status`.
 *
 * ─────────────────────────────────────────────────────
 * 結論：無 `status` 欄位時預設為 LIVE。
 * ─────────────────────────────────────────────────────
 *
 * @param resp - API 回應物件 / API response object
 * @returns 推斷的狀態 / Inferred post status
 */
function extractStatus(resp: IBloggerPostApiReturn): EnumPostStatus
{
	const s = resp.status;
	if (s === EnumPostStatus.Draft) return EnumPostStatus.Draft;
	if (s === EnumPostStatus.Live) return EnumPostStatus.Live;

	/**
	 * Blogger API GET 對 LIVE 文章不回傳 status 欄位，
	 * 以 LIVE 為預設值。
	 * Blogger API GET omits `status` for LIVE posts — default to LIVE.
	 */
	return EnumPostStatus.Live;
}

/** ==================== Main ==================== */

async function main(): Promise<void>
{
	const result: ITestResult = { passed: 0, failed: 0 };

	console.log('');
	console.log('============================================================');
	console.log('  RestClient E2E — Publish / Revert Status Toggle');
	console.log('============================================================');

	// ===== 1. 載入憑證 =====
	const creds = await loadCredentials();
	console.log(`  Blog ID: ${creds.blogId}`);
	console.log(`  Target:  POST ${DRAFT_POST_ID}  (未命名3333)`);

	// ===== 2. 建立 RestClient（注入 Node.js requestUrl 適配器）=====
	const client = new RestClient(
		{ url: new URL(BLOGGER_API_ENDPOINT) },
		nodeRequest,
	);

	const auth = { headers: { authorization: `Bearer ${creds.accessToken}` } };

	/**
	 * 透過 getBloggerRestEndpoint() 建構所有端點路徑，禁止手動拼接網址。
	 * All API paths are built via getBloggerRestEndpoint() — never construct URLs manually.
	 *
	 * getUrl() 使用 lodash template 語法進行參數插值。
	 * getUrl() uses lodash template syntax for parameter interpolation.
	 */
	const endpoints = getBloggerRestEndpoint(creds.blogId);

	// ===== Step 1: GET 確認文章當前狀態 =====
	console.log('\n📋 Step 1: GET 確認文章當前狀態');

	/**
	 * Blogger API 支援 view=AUTHOR 參數，讓已驗證的使用者
	 * 可以透過 GET 端點看到自己的 DRAFT 文章（避免 404）。
	 * Blogger API supports view=AUTHOR parameter, allowing
	 * authenticated users to fetch their own DRAFT posts via GET.
	 */
	const getPathTryDraft = getUrl(endpoints.getPost, '', { postId: DRAFT_POST_ID, view: 'AUTHOR' });
	const getResp: IBloggerPostApiReturn = await client.httpGet(getPathTryDraft, auth);
	saveApiResponse('01-get-before', { method: 'httpGet', path: getPathTryDraft, auth }, getResp);

	/**
	 * ═══════════════════════════════════════════════════════════
	 * Blogger API 行為說明
	 * ═══════════════════════════════════════════════════════════
	 *
	 * GET 端點行為 / GET endpoint behavior:
	 *
	 * - 未加 view=AUTHOR 時：DRAFT 文章回傳 404（已知限制）
	 *   Without view=AUTHOR: DRAFT posts return 404 (known limitation)
	 *
	 * - 加上 view=AUTHOR 後：DRAFT 文章可正常回傳，且包含 status 欄位
	 *   With view=AUTHOR: DRAFT posts return normally and INCLUDE status
	 *
	 * - 加上 view=AUTHOR 後：LIVE 文章仍正常回傳，但「不包含」status 欄位
	 *   With view=AUTHOR: LIVE posts still work, but OMIT the status field
	 *
	 * 判斷策略 / Strategy:
	 *
	 *   一律使用 view=AUTHOR 發送 GET 請求
	 *   Always send GET with view=AUTHOR
	 *
	 *   _hasError(getResp) === true  → 不應發生（view=AUTHOR 應涵蓋所有狀態）
	 *                                  Should not happen with view=AUTHOR
	 *
	 *   _hasError(getResp) === false → 使用 extractStatus() 推斷狀態
	 *                                  Use extractStatus() to infer status
	 *   成功但無 status → DRAFT（publish/revert 端點會回傳 status）
	 *   Success without status → DRAFT (publish/revert endpoints include status)
	 *   有 status → 直接使用
	 *   Has status → use directly
	 * ═══════════════════════════════════════════════════════════
	 */
	let originalStatus: EnumPostStatus;
	if (_hasError(getResp))
	{
		/**
		 * view=AUTHOR 不應觸發此路徑，若發生表示其他問題。
		 * view=AUTHOR should prevent this — if triggered, something else is wrong.
		 */
		assert(
			false,
			`GET with view=AUTHOR 不應回傳錯誤（code: ${(getResp as any).error?.code}）`,
			result,
		);
		originalStatus = EnumPostStatus.Draft;
	}
	else
	{
		originalStatus = extractStatus(getResp);
		/**
		 * view=AUTHOR 成功時，DRAFT 文章會包含 status="DRAFT"，
		 * LIVE 文章則無 status 欄位（extractStatus 預設回傳 LIVE）。
		 * With view=AUTHOR: DRAFT posts include status="DRAFT",
		 * LIVE posts omit status (extractStatus defaults to LIVE).
		 */
		assert(
			originalStatus === EnumPostStatus.Draft || originalStatus === EnumPostStatus.Live,
			`預期 DRAFT 或 LIVE，實際: "${originalStatus}"`,
			result,
		);
	}

	/**
	 * wasDraft: 記錄切換「前」的狀態，用於決定所有後續步驟的方向。
	 * wasDraft: the status BEFORE toggling, used to determine all subsequent steps.
	 */
	const wasDraft = originalStatus === EnumPostStatus.Draft;
	console.log(`  原始狀態: "${originalStatus}"`);
	console.log(`  切換方向: ${wasDraft ? 'DRAFT → LIVE (publish)' : 'LIVE → DRAFT (revert)'}`);

	/**
	 * 切換後的預期狀態 / Expected status after toggle.
	 * 此值在 Step 2（驗證 toggle 結果）和 Step 3（驗證持久化）中共用。
	 * Shared between Step 2 (verify toggle result) and Step 3 (verify persistence).
	 */
	const expectedAfterToggle = wasDraft ? EnumPostStatus.Live : EnumPostStatus.Draft;

	// ===== Step 2: 執行狀態切換 =====
	console.log('\n📋 Step 2: 執行狀態切換');

	const toggleEndpoint = wasDraft ? endpoints.publishPost : endpoints.revertPost;
	const togglePath = getUrl(toggleEndpoint, '', { postId: DRAFT_POST_ID });
	const toggleResp: IBloggerPostApiReturn = wasDraft
		? await client.httpPublish(togglePath, auth)
		: await client.httpRevert(togglePath, auth);
	saveApiResponse(
		'02-toggle',
		{
			method: wasDraft ? 'httpPublish' : 'httpRevert',
			path: togglePath,
			auth,
		},
		toggleResp,
	);

	assert(
		!_hasError(toggleResp),
		`切換請求未回傳錯誤`,
		result,
	);

	if (_hasError(toggleResp))
	{
		const err = (toggleResp as any).error;
		console.log(`    error.code = ${err?.code}, message = ${err?.message}`);
	}
	else
	{
		/**
		 * publish / revert 端點會回傳完整的文章物件，包含 `status` 欄位。
		 * 與 GET 不同，這兩個端點「一定」有 status。
		 * Unlike GET, the publish/revert endpoints ALWAYS include the status field.
		 */
		assertEqual(
			toggleResp.status,
			expectedAfterToggle,
			`切換後狀態應為 "${expectedAfterToggle}"`,
			result,
		);
	}

	console.log(`  切換後狀態: "${expectedAfterToggle}"`);

	// ===== Step 3: GET 確認狀態已持久化 =====
	console.log('\n📋 Step 3: GET 確認狀態已持久化');

	/**
	 * view=AUTHOR 是 Blogger API 標準參數，讓 GET 端點
	 * 可以同時看到 LIVE 與 DRAFT 文章，避免 DRAFT 的 404 問題。
	 * view=AUTHOR is the standard Blogger API parameter that allows
	 * fetching both LIVE and DRAFT posts, avoiding the DRAFT 404 issue.
	 */
	const verifyPath = getUrl(endpoints.getPost, '', {
		postId: DRAFT_POST_ID,
		view: 'AUTHOR',
	});
	const verifyResp: IBloggerPostApiReturn = await client.httpGet(verifyPath, auth);
	saveApiResponse('03-get-verify', { method: 'httpGet', path: verifyPath, auth }, verifyResp);

	/**
	 * ═══════════════════════════════════════════════════════════
	 * GET 驗證 / GET verification — with view=AUTHOR both cases work
	 * ═══════════════════════════════════════════════════════════
	 *
	 * Case A: expectedAfterToggle === LIVE
	 *   ➤ GET 成功，status 欄位缺省 → extractStatus 推斷為 LIVE
	 *     GET succeeds, status omitted → extractStatus returns LIVE
	 *
	 * Case B: expectedAfterToggle === DRAFT
	 *   ➤ GET 成功，status 欄位為 "DRAFT" → extractStatus 回傳 DRAFT
	 *     GET succeeds, status = "DRAFT" → extractStatus returns DRAFT
	 *
	 * view=AUTHOR 讓兩種狀態都可正常讀取，不再有 404。
	 * view=AUTHOR makes both statuses readable — no more 404.
	 * ═══════════════════════════════════════════════════════════
	 */
	{
		assert(
			!_hasError(verifyResp),
			`GET with view=AUTHOR 不應回傳錯誤（預期: "${expectedAfterToggle}"）`,
			result,
		);

		if (!_hasError(verifyResp))
		{
			assertEqual(
				extractStatus(verifyResp),
				expectedAfterToggle,
				`持久化狀態應為 "${expectedAfterToggle}"`,
				result,
			);
		}
	}

	// ===== Step 4: 回復原始狀態（cleanup）=====
	console.log('\n📋 Step 4: 回復原始狀態 (cleanup)');

	/**
	 * 復原方向與切換方向相反 / Restore direction is the opposite of toggle:
	 *   wasDraft=true  (原 DRAFT) → Step 2 執行 publish → Step 4 執行 revert
	 *   wasDraft=false (原 LIVE)  → Step 2 執行 revert → Step 4 執行 publish
	 */
	const restoreEndpoint = wasDraft ? endpoints.revertPost : endpoints.publishPost;
	const restorePath = getUrl(restoreEndpoint, '', { postId: DRAFT_POST_ID });
	const restoreResp: IBloggerPostApiReturn = wasDraft
		? await client.httpRevert(restorePath, auth)
		: await client.httpPublish(restorePath, auth);
	saveApiResponse(
		'04-restore',
		{
			method: wasDraft ? 'httpRevert' : 'httpPublish',
			path: restorePath,
			auth,
		},
		restoreResp,
	);

	assert(
		!_hasError(restoreResp),
		`復原請求未回傳錯誤`,
		result,
	);

	if (!_hasError(restoreResp))
	{
		assertEqual(
			restoreResp.status,
			originalStatus,
			`復原後狀態應為 "${originalStatus}"`,
			result,
		);
		console.log(`  復原後狀態: "${restoreResp.status}"`);
	}

	// ===== Summary =====
	console.log(`\n  過程: "${originalStatus}" → "${expectedAfterToggle}" → "${originalStatus}"`);
	printSummary(result);
}

main().catch((err) =>
{
	console.error('\n❌ Fatal:', err);
	process.exit(1);
});
