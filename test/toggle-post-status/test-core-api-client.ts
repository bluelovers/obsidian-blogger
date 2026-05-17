/**
 * BloggerCoreApiClient E2E 測試 — Publish / Revert 文章狀態切換
 * BloggerCoreApiClient E2E Test — Toggle post status via publish/revert endpoints
 *
 * 使用基於 BloggerCoreApiClient + Node.js requestUrl 適配器的真實 HTTP 請求，
 * 驗證核心 API 客戶端是否正確處理文章狀態切換與回應解析。
 *
 * Uses BloggerCoreApiClient + Node.js requestUrl adapter with real HTTP requests
 * to verify the core API client correctly handles post status toggles and response parsing.
 *
 * 只操作 postId: "2330039242586333609"（未命名3333），不影響其他文章。
 * Only operates on postId: "2330039242586333609", leaves other posts untouched.
 *
 * @example
 * tsx test/toggle-post-status/test-core-api-client.ts
 */
/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { nodeRequest } from '../lib/node-request';
import { RestClient } from '../../src/client/blogger/rest-client';
import { BloggerCoreApiClient } from '../../src/client/blogger/blogger-core-api-client';
import { BloggerRestClientGoogleOAuth2Context } from '../../src/client/blogger/blogger-rest-client-google-o-auth2-context';
import { BLOGGER_API_ENDPOINT } from '../../src/consts';
import { EnumPostStatus, EnumBloggerClientReturnCode } from '../../src/types/const';
import { IBloggerClientResult, IBloggerPublishResult } from '../../src/types/blogger-client-interface';
import {
	loadCredentials,
	DRAFT_POST_ID,
	assert,
	assertEqual,
	printSummary,
	ITestResult,
} from '../lib/test-utils';
import { __TEST_TEMP } from '../__root';
import { extractStatus } from '../../src/client/blogger/utils/post-utils';
import { createBloggerCoreApiClient } from '../lib/blogger-core-api-client';

/** ==================== 工具函數 / Utilities ==================== */

/**
 * 記錄 API 請求與回應至 test/temp/cache/core-api/{step}.json
 * Save API request + response to test/temp/cache/core-api/{step}.json
 */
function saveApiResponse(
	step: string,
	method: string,
	response: IBloggerClientResult<IBloggerPublishResult>,
): void
{
	const dir = path.join(__TEST_TEMP, 'cache', 'core-api');
	fs.mkdirSync(dir, { recursive: true });

	const content = {
		step,
		request: { method },
		response,
	};

	// 固定檔名，每次執行覆蓋 / Fixed filename, overwritten on each run
	const filePath = path.join(dir, `${step}.json`);
	fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
	console.log(`    📁 Cache saved: ${filePath}`);
}

/** ==================== Main ==================== */

async function main(): Promise<void>
{
	const result: ITestResult = { passed: 0, failed: 0 };

	console.log('');
	console.log('============================================================');
	console.log('  BloggerCoreApiClient E2E — Publish / Revert Toggle');
	console.log('============================================================');

	const coreClient = await createBloggerCoreApiClient();

	// ===== Step 1: GET 確認文章當前狀態 =====
	console.log('\n📋 Step 1: GET 確認文章當前狀態');

	const getResp = await coreClient.getPost(DRAFT_POST_ID, 'AUTHOR');
	saveApiResponse('01-get-before', 'getPost', getResp);

	let originalStatus: EnumPostStatus;
	if (getResp.code !== EnumBloggerClientReturnCode.OK)
	{
		assert(
			false,
			`getPost('AUTHOR') 不應回傳錯誤（message: ${getResp.message}）`,
			result,
		);
		originalStatus = EnumPostStatus.Draft;
	}
	else
	{
		originalStatus = extractStatus(getResp);
		assert(
			originalStatus === EnumPostStatus.Draft || originalStatus === EnumPostStatus.Live,
			`預期 DRAFT 或 LIVE，實際: "${originalStatus}"`,
			result,
		);
	}

	const wasDraft = originalStatus === EnumPostStatus.Draft;
	console.log(`  原始狀態: "${originalStatus}"`);
	console.log(`  切換方向: ${wasDraft ? 'DRAFT → LIVE (publishPostAction)' : 'LIVE → DRAFT (revertPostAction)'}`);

	const expectedAfterToggle = wasDraft ? EnumPostStatus.Live : EnumPostStatus.Draft;

	// ===== Step 2: 執行狀態切換 =====
	console.log('\n📋 Step 2: 執行狀態切換');

	const toggleResp = wasDraft
		? await coreClient.publishPostAction(DRAFT_POST_ID)
		: await coreClient.revertPostAction(DRAFT_POST_ID);

	saveApiResponse('02-toggle', wasDraft ? 'publishPostAction' : 'revertPostAction', toggleResp);

	assert(
		toggleResp.code === EnumBloggerClientReturnCode.OK,
		`切換請求應回傳 OK`,
		result,
	);

	if (toggleResp.code === EnumBloggerClientReturnCode.OK && toggleResp.data)
	{
		assertEqual(
			toggleResp.data.status,
			expectedAfterToggle,
			`切換後狀態應為 "${expectedAfterToggle}"`,
			result,
		);
	}
	console.log(`  切換後狀態: "${expectedAfterToggle}"`);

	// ===== Step 3: GET 確認狀態已持久化 =====
	console.log('\n📋 Step 3: GET 確認狀態已持久化');

	const verifyResp = await coreClient.getPost(DRAFT_POST_ID, 'AUTHOR');
	saveApiResponse('03-get-verify', 'getPost', verifyResp);

	{
		assert(
			verifyResp.code === EnumBloggerClientReturnCode.OK,
			`GET 驗證不應回傳錯誤（預期: "${expectedAfterToggle}"）`,
			result,
		);

		if (verifyResp.code === EnumBloggerClientReturnCode.OK)
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

	const restoreResp = wasDraft
		? await coreClient.revertPostAction(DRAFT_POST_ID)
		: await coreClient.publishPostAction(DRAFT_POST_ID);

	saveApiResponse('04-restore', wasDraft ? 'revertPostAction' : 'publishPostAction', restoreResp);

	assert(
		restoreResp.code === EnumBloggerClientReturnCode.OK,
		`復原請求應回傳 OK`,
		result,
	);

	let restoreStatus: EnumPostStatus;

	if (restoreResp.code === EnumBloggerClientReturnCode.OK && restoreResp.data)
	{
		restoreStatus = restoreResp.data.status;

		assertEqual(
			restoreStatus,
			originalStatus,
			`復原後狀態應為 "${originalStatus}"`,
			result,
		);
		console.log(`  復原後狀態: "${restoreStatus}"`);
	}

	// ===== Summary =====
	console.log(`\n  過程: "${originalStatus}" → "${expectedAfterToggle}" → "${restoreStatus!}"`);
	printSummary(result);
}

main().catch((err) =>
{
	console.error('\n❌ Fatal:', err);
	process.exit(1);
});
