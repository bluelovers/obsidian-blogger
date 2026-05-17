/**
 * 端到端測試共用工具
 * E2E test shared utilities
 *
 * 集中管理測試共用邏輯（憑證載入、斷言、常數），
 * 避免在各測試檔案中重複複製相同代碼。
 * Centralizes shared test logic (credential loading, assertions, constants)
 * to avoid duplicating the same code across test files.
 */
/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { IBloggerProfile } from '../../src/blogger-profile';
import { __PLUGIN_DATA_JSON, __ROOT } from '../__root';
import { loadSettingsFromJsonSync } from '../../src/plugin/settings-load-json';
import { findDefaultProfile } from '../../src/plugin/settings';

/** ==================== 常數 / Constants ==================== */

/** 僅允許操作的目標文章 ID / The only post ID allowed to operate on */
export const DRAFT_POST_ID = '2330039242586333609' as const;

/** ==================== 型別 / Types ==================== */

/** 從 data.json 載入的憑證資訊 / Credentials loaded from data.json */
export interface ICredentials
{
	/** 部落格 ID / Blog ID */
	blogId: IBloggerProfile["blogId"];
	/** 有效的存取權杖 / Valid access token */
	accessToken: string;
}

/** ==================== 憑證載入 / Credential Loading ==================== */

/**
 * 從 data.json 載入憑證，必要時自動刷新 OAuth2 token
 * Load credentials from data.json, auto-refresh OAuth2 token if needed
 *
 * 僅在記憶體中保留刷新後的 token，不會寫回 data.json。
 * Keeps the refreshed token in memory only — does NOT write back to data.json.
 *
 * @returns 部落格 ID 與有效的 access token / Blog ID and valid access token
 */
export async function loadCredentials(): Promise<ICredentials>
{
	const dataPath = __PLUGIN_DATA_JSON;
	const data = loadSettingsFromJsonSync(dataPath);

	const profile = findDefaultProfile(data)!;
	const token = profile.googleOAuth2Token;

	/** 若權杖過期，自動 refresh（僅記憶體，不寫回 data.json） */
	if (token.expiresAt <= Date.now())
	{
		console.log('  🔄 Token expired, refreshing...');

		const resp = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: data.clientId,
				client_secret: data.clientSecret,
				refresh_token: token.refreshToken,
				grant_type: 'refresh_token',
			}),
		});

		const json = await resp.json() as { access_token?: string; expires_in?: number };

		if (!json.access_token)
		{
			console.error('  ❌ Token refresh failed:', JSON.stringify(json));
			process.exit(1);
		}

		// 僅記憶體中更新，不寫回 data.json（遵守「可讀不可寫」限制）
		token.accessToken = json.access_token;
		token.expiresAt = Date.now() + (json.expires_in ?? 3599) * 1000;
		console.log('  ✅ Token refreshed (in memory only)');

		// console.log(token.accessToken);
	}

	return {
		blogId: profile.blogId,
		accessToken: token.accessToken,
	};
}

/** ==================== 斷言工具 / Assertion Utilities ==================== */

export interface ITestResult
{
	passed: number;
	failed: number;
}

/**
 * 簡易布林斷言
 * Simple boolean assertion
 *
 * @param condition - 斷言條件 / Assertion condition
 * @param label - 測試標籤 / Test label
 * @param result - 測試結果計數器 / Test result counter
 */
export function assert(
	condition: boolean,
	label: string,
	result: ITestResult,
): void
{
	if (condition)
	{
		result.passed++;
		console.log(`    ✅ ${label}`);
	}
	else
	{
		result.failed++;
		console.log(`    ❌ ${label}`);
	}
}

/**
 * 相等斷言（使用 ===）
 * Equality assertion (uses ===)
 *
 * @param actual - 實際值 / Actual value
 * @param expected - 預期值 / Expected value
 * @param label - 測試標籤 / Test label
 * @param result - 測試結果計數器 / Test result counter
 */
export function assertEqual<T>(
	actual: T,
	expected: T,
	label: string,
	result: ITestResult,
): void
{
	assert(actual === expected, `${label} (expected: ${JSON.stringify(expected)}, actual: ${JSON.stringify(actual)})`, result);
}

/**
 * 顯示測試摘要
 * Display test summary
 *
 * @param result - 測試結果 / Test result
 */
export function printSummary(result: ITestResult): void
{
	const total = result.passed + result.failed;
	console.log(`\n  📊 結果: ${result.passed}/${total} 通過, ${result.failed} 失敗`);

	if (result.failed > 0)
	{
		process.exit(1);
	}
}
