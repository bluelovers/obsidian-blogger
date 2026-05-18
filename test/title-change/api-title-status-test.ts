/**
 * API 標題 + 狀態變更測試
 * API Title + Status Change Test
 *
 * 測試 Blogger API 是否能「單次請求同時更改文章標題與狀態」。
 * 使用三種端點：PATCH (isDraft=true/false)、PUT (editPost)。
 * 所有請求回應均記錄至 test/temp/title-change-test/。
 *
 * Tests whether the Blogger API can change both title AND status
 * in a single request. Uses three endpoints:
 * PATCH (isDraft=true/false), PUT (editPost).
 * All responses are saved to test/temp/title-change-test/.
 *
 * @example
 * tsx test/title-change/api-title-status-test.ts
 */
/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { nodeRequest } from '../lib/node-request';
import { RestClient, IBloggerPostApiBody, IBloggerPostApiReturn } from '../../src/client/blogger/rest-client';
import { BLOGGER_API_ENDPOINT } from '../../src/consts';
import {
    EnumBloggerRestEndpoint,
    EnumBloggerViewMode,
    getBloggerRestEndpoint,
    getUrl,
} from '../../src/client/blogger/utils/url';
import { EnumPostStatus } from '../../src/types/const';
import { _hasError } from '../../src/utils/type-utils';
import { _extractStatusCore } from '../../src/client/blogger/utils/post-utils';
import { loadCredentials, printSummary, ITestResult } from '../lib/test-utils';
import { __TEST_TEMP } from '../__root';
import { IHttpHeaders } from '../../src/types/http';

/** ==================== 常數 / Constants ==================== */

/** 目標文章 ID / Target post ID */
const TARGET_POST_ID = '984648475646277424' as const;

/** 儲存目錄 / Output directory */
const OUTPUT_DIR = path.join(__TEST_TEMP, 'title-change-test');

/** 測試用固定內容 / Fixed test content */
const TEST_CONTENT = '<p>Test content for title+status change investigation.</p>';

/** 測試開始時間戳 / Test start timestamp */
const TIMESTAMP = Date.now();

/** ==================== 型別 / Types ==================== */

interface ITestRecord
{
    label: string;
    method: string;
    url: string;
    body?: Partial<IBloggerPostApiBody>;
    response: IBloggerPostApiReturn | null;
    verifyStatus?: EnumPostStatus;
    verifyTitle?: string;
    error?: string;
}

/** ==================== 工具 / Utilities ==================== */

function saveRecords(records: ITestRecord[]): void
{
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const filePath = path.join(OUTPUT_DIR, `test-results-${TIMESTAMP}.json`);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
    console.log(`    📁 Results saved: ${filePath}`);
}

function extractStatus(resp: IBloggerPostApiReturn): EnumPostStatus | undefined
{
    return _extractStatusCore(resp);
}

function getReqTitle(scenario: string, variant: string): string
{
    return `[Test-${scenario}-${variant}] ${new Date(TIMESTAMP).toISOString()}`;
}

function buildBody(
    blogId: string,
    title: string,
    status?: EnumPostStatus,
): Partial<IBloggerPostApiBody>
{
    const body: Partial<IBloggerPostApiBody> = {
        kind: 'blogger#post',
        blog: { id: blogId },
        title,
        content: TEST_CONTENT,
        labels: [],
    };

    if (status !== undefined)
    {
        body.status = status;
    }

    return body;
}

/** ==================== Main ==================== */

async function main(): Promise<void>
{
    const records: ITestRecord[] = [];
    const result: ITestResult = { passed: 0, failed: 0 };

    console.log('');
    console.log('============================================================');
    console.log('  API Title + Status Change Test');
    console.log('============================================================');
    console.log(`  Post ID: ${TARGET_POST_ID}`);
    console.log(`  Timestamp: ${TIMESTAMP}`);
    console.log('');

    // ===== 1. 載入憑證 =====
    const creds = await loadCredentials();
    console.log(`  Blog ID: ${creds.blogId}`);

    const client = new RestClient(
        { url: new URL(BLOGGER_API_ENDPOINT) },
        nodeRequest,
    );

    const authOptions: { headers: IHttpHeaders } = {
        headers: { authorization: `Bearer ${creds.accessToken}` },
    };

    const endpoints = getBloggerRestEndpoint(creds.blogId);

    // ===== 2. GET 初始狀態 =====
    console.log('\n📋 Step 1: GET initial post state');
    const getUrlStr = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], {
        postId: TARGET_POST_ID,
        view: EnumBloggerViewMode.AUTHOR,
    });
    const initialResp = await client.httpGet(getUrlStr, authOptions);
    const initialStatus = _hasError(initialResp) ? undefined : extractStatus(initialResp);
    const initialTitle = _hasError(initialResp) ? undefined : initialResp.title;

    records.push({
        label: '00-initial-state',
        method: 'GET',
        url: getUrlStr,
        response: _hasError(initialResp) ? null : initialResp,
        verifyStatus: initialStatus,
        verifyTitle: initialTitle,
        error: _hasError(initialResp) ? 'GET failed' : undefined,
    });

    console.log(`    Current status: ${initialStatus ?? 'UNKNOWN'}`);
    console.log(`    Current title:  ${initialTitle ?? 'UNKNOWN'}`);

    if (_hasError(initialResp))
    {
        console.error('  ❌ Cannot proceed: GET failed');
        saveRecords(records);
        process.exit(1);
    }

    // ===== 3. 測試案例 / Test Cases =====
    /**
     * 每個測試案例：
     * - 發送 API 請求（PATCH 或 PUT）
     * - 記錄回應
     * - 再次 GET 確認實際狀態
     *
     * 測試是否能同時更改標題與狀態
     */

    // ── Scenario A: 變更標題 + 設為 DRAFT ──
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Scenario A: Change title → Set status to DRAFT');
    console.log('═══════════════════════════════════════════════════');

    // Test A1: PATCH isDraft=true + status=DRAFT
    {
        const title = getReqTitle('A', 'PATCH-draftTrue');
        console.log(`\n  A1: PATCH isDraft=true + body status=DRAFT`);
        console.log(`      Title: "${title}"`);

        const url = getUrl(endpoints[EnumBloggerRestEndpoint.patchPost], {
            postId: TARGET_POST_ID,
            isDraft: true,
        });
        const body = buildBody(creds.blogId, title, EnumPostStatus.Draft);

        let resp: IBloggerPostApiReturn | null = null;
        let err: string | undefined;
        try
        {
            resp = await client.httpPatch(url, body as any, authOptions);
            if (_hasError(resp))
            {
                err = 'API returned error';
                console.log(`      ⚠️  Response: ERROR`);
                console.dir(resp, { depth: null });
            }
            else
            {
                const s = extractStatus(resp);
                console.log(`      Response → status: ${s ?? '(omitted)'}, title: ${resp.title}`);
            }
        }
        catch (ex)
        {
            err = String(ex);
            console.log(`      ❌ Exception: ${err}`);
        }
        records.push({ label: 'A1-PATCH-isDraftTrue', method: 'PATCH', url, body, response: resp, error: err });

        // Verify
        const vUrl = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], { postId: TARGET_POST_ID, view: EnumBloggerViewMode.AUTHOR });
        const vResp = await client.httpGet(vUrl, authOptions);
        const vStatus = _hasError(vResp) ? undefined : extractStatus(vResp);
        console.log(`      Verify → status: ${vStatus ?? '(omitted)'}, title: ${_hasError(vResp) ? 'ERROR' : vResp.title}`);
        records.push({ label: 'A1-verify', method: 'GET', url: vUrl, response: _hasError(vResp) ? null : vResp, verifyStatus: vStatus, verifyTitle: _hasError(vResp) ? undefined : vResp.title, error: _hasError(vResp) ? 'GET failed' : undefined });
    }

    // Test A2: PATCH isDraft=false + status=DRAFT
    {
        const title = getReqTitle('A', 'PATCH-draftFalse');
        console.log(`\n  A2: PATCH isDraft=false + body status=DRAFT`);
        console.log(`      Title: "${title}"`);

        const url = getUrl(endpoints[EnumBloggerRestEndpoint.patchPost], {
            postId: TARGET_POST_ID,
            isDraft: false,
        });
        const body = buildBody(creds.blogId, title, EnumPostStatus.Draft);

        let resp: IBloggerPostApiReturn | null = null;
        let err: string | undefined;
        try
        {
            resp = await client.httpPatch(url, body as any, authOptions);
            if (_hasError(resp))
            {
                err = 'API returned error';
                console.log(`      ⚠️  Response: ERROR`);
                console.dir(resp, { depth: null });
            }
            else
            {
                const s = extractStatus(resp);
                console.log(`      Response → status: ${s ?? '(omitted)'}, title: ${resp.title}`);
            }
        }
        catch (ex)
        {
            err = String(ex);
            console.log(`      ❌ Exception: ${err}`);
        }
        records.push({ label: 'A2-PATCH-isDraftFalse', method: 'PATCH', url, body, response: resp, error: err });

        // Verify
        const vUrl = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], { postId: TARGET_POST_ID, view: EnumBloggerViewMode.AUTHOR });
        const vResp = await client.httpGet(vUrl, authOptions);
        const vStatus = _hasError(vResp) ? undefined : extractStatus(vResp);
        console.log(`      Verify → status: ${vStatus ?? '(omitted)'}, title: ${_hasError(vResp) ? 'ERROR' : vResp.title}`);
        records.push({ label: 'A2-verify', method: 'GET', url: vUrl, response: _hasError(vResp) ? null : vResp, verifyStatus: vStatus, verifyTitle: _hasError(vResp) ? undefined : vResp.title, error: _hasError(vResp) ? 'GET failed' : undefined });
    }

    // Test A3: PUT editPost + status=DRAFT
    {
        const title = getReqTitle('A', 'PUT-editPost');
        console.log(`\n  A3: PUT (editPost) + body status=DRAFT`);
        console.log(`      Title: "${title}"`);

        const url = getUrl(endpoints[EnumBloggerRestEndpoint.editPost], {
            postId: TARGET_POST_ID,
            isDraft: false,
        });
        const body = buildBody(creds.blogId, title, EnumPostStatus.Draft);

        let resp: IBloggerPostApiReturn | null = null;
        let err: string | undefined;
        try
        {
            resp = await client.httpPut(url, body as any, authOptions);
            if (_hasError(resp))
            {
                err = 'API returned error';
                console.log(`      ⚠️  Response: ERROR`);
                console.dir(resp, { depth: null });
            }
            else
            {
                const s = extractStatus(resp);
                console.log(`      Response → status: ${s ?? '(omitted)'}, title: ${resp.title}`);
            }
        }
        catch (ex)
        {
            err = String(ex);
            console.log(`      ❌ Exception: ${err}`);
        }
        records.push({ label: 'A3-PUT-editPost', method: 'PUT', url, body, response: resp, error: err });

        // Verify
        const vUrl = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], { postId: TARGET_POST_ID, view: EnumBloggerViewMode.AUTHOR });
        const vResp = await client.httpGet(vUrl, authOptions);
        const vStatus = _hasError(vResp) ? undefined : extractStatus(vResp);
        console.log(`      Verify → status: ${vStatus ?? '(omitted)'}, title: ${_hasError(vResp) ? 'ERROR' : vResp.title}`);
        records.push({ label: 'A3-verify', method: 'GET', url: vUrl, response: _hasError(vResp) ? null : vResp, verifyStatus: vStatus, verifyTitle: _hasError(vResp) ? undefined : vResp.title, error: _hasError(vResp) ? 'GET failed' : undefined });
    }

    // ── Scenario B: 變更標題 + 設為 LIVE ──
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Scenario B: Change title → Set status to LIVE');
    console.log('═══════════════════════════════════════════════════');

    // Test B1: PATCH isDraft=true + status=LIVE
    {
        const title = getReqTitle('B', 'PATCH-draftTrue');
        console.log(`\n  B1: PATCH isDraft=true + body status=LIVE`);
        console.log(`      Title: "${title}"`);

        const url = getUrl(endpoints[EnumBloggerRestEndpoint.patchPost], {
            postId: TARGET_POST_ID,
            isDraft: true,
        });
        const body = buildBody(creds.blogId, title, EnumPostStatus.Live);

        let resp: IBloggerPostApiReturn | null = null;
        let err: string | undefined;
        try
        {
            resp = await client.httpPatch(url, body as any, authOptions);
            if (_hasError(resp))
            {
                err = 'API returned error';
                console.log(`      ⚠️  Response: ERROR`);
                console.dir(resp, { depth: null });
            }
            else
            {
                const s = extractStatus(resp);
                console.log(`      Response → status: ${s ?? '(omitted)'}, title: ${resp.title}`);
            }
        }
        catch (ex)
        {
            err = String(ex);
            console.log(`      ❌ Exception: ${err}`);
        }
        records.push({ label: 'B1-PATCH-isDraftTrue', method: 'PATCH', url, body, response: resp, error: err });

        // Verify
        const vUrl = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], { postId: TARGET_POST_ID, view: EnumBloggerViewMode.AUTHOR });
        const vResp = await client.httpGet(vUrl, authOptions);
        const vStatus = _hasError(vResp) ? undefined : extractStatus(vResp);
        console.log(`      Verify → status: ${vStatus ?? '(omitted)'}, title: ${_hasError(vResp) ? 'ERROR' : vResp.title}`);
        records.push({ label: 'B1-verify', method: 'GET', url: vUrl, response: _hasError(vResp) ? null : vResp, verifyStatus: vStatus, verifyTitle: _hasError(vResp) ? undefined : vResp.title, error: _hasError(vResp) ? 'GET failed' : undefined });
    }

    // Test B2: PATCH isDraft=false + status=LIVE
    {
        const title = getReqTitle('B', 'PATCH-draftFalse');
        console.log(`\n  B2: PATCH isDraft=false + body status=LIVE`);
        console.log(`      Title: "${title}"`);

        const url = getUrl(endpoints[EnumBloggerRestEndpoint.patchPost], {
            postId: TARGET_POST_ID,
            isDraft: false,
        });
        const body = buildBody(creds.blogId, title, EnumPostStatus.Live);

        let resp: IBloggerPostApiReturn | null = null;
        let err: string | undefined;
        try
        {
            resp = await client.httpPatch(url, body as any, authOptions);
            if (_hasError(resp))
            {
                err = 'API returned error';
                console.log(`      ⚠️  Response: ERROR`);
                console.dir(resp, { depth: null });
            }
            else
            {
                const s = extractStatus(resp);
                console.log(`      Response → status: ${s ?? '(omitted)'}, title: ${resp.title}`);
            }
        }
        catch (ex)
        {
            err = String(ex);
            console.log(`      ❌ Exception: ${err}`);
        }
        records.push({ label: 'B2-PATCH-isDraftFalse', method: 'PATCH', url, body, response: resp, error: err });

        // Verify
        const vUrl = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], { postId: TARGET_POST_ID, view: EnumBloggerViewMode.AUTHOR });
        const vResp = await client.httpGet(vUrl, authOptions);
        const vStatus = _hasError(vResp) ? undefined : extractStatus(vResp);
        console.log(`      Verify → status: ${vStatus ?? '(omitted)'}, title: ${_hasError(vResp) ? 'ERROR' : vResp.title}`);
        records.push({ label: 'B2-verify', method: 'GET', url: vUrl, response: _hasError(vResp) ? null : vResp, verifyStatus: vStatus, verifyTitle: _hasError(vResp) ? undefined : vResp.title, error: _hasError(vResp) ? 'GET failed' : undefined });
    }

    // Test B3: PUT editPost + status=LIVE
    {
        const title = getReqTitle('B', 'PUT-editPost');
        console.log(`\n  B3: PUT (editPost) + body status=LIVE`);
        console.log(`      Title: "${title}"`);

        const url = getUrl(endpoints[EnumBloggerRestEndpoint.editPost], {
            postId: TARGET_POST_ID,
            isDraft: false,
        });
        const body = buildBody(creds.blogId, title, EnumPostStatus.Live);

        let resp: IBloggerPostApiReturn | null = null;
        let err: string | undefined;
        try
        {
            resp = await client.httpPut(url, body as any, authOptions);
            if (_hasError(resp))
            {
                err = 'API returned error';
                console.log(`      ⚠️  Response: ERROR`);
                console.dir(resp, { depth: null });
            }
            else
            {
                const s = extractStatus(resp);
                console.log(`      Response → status: ${s ?? '(omitted)'}, title: ${resp.title}`);
            }
        }
        catch (ex)
        {
            err = String(ex);
            console.log(`      ❌ Exception: ${err}`);
        }
        records.push({ label: 'B3-PUT-editPost', method: 'PUT', url, body, response: resp, error: err });

        // Verify
        const vUrl = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], { postId: TARGET_POST_ID, view: EnumBloggerViewMode.AUTHOR });
        const vResp = await client.httpGet(vUrl, authOptions);
        const vStatus = _hasError(vResp) ? undefined : extractStatus(vResp);
        console.log(`      Verify → status: ${vStatus ?? '(omitted)'}, title: ${_hasError(vResp) ? 'ERROR' : vResp.title}`);
        records.push({ label: 'B3-verify', method: 'GET', url: vUrl, response: _hasError(vResp) ? null : vResp, verifyStatus: vStatus, verifyTitle: _hasError(vResp) ? undefined : vResp.title, error: _hasError(vResp) ? 'GET failed' : undefined });
    }

    // ── Scenario C: 變更標題，不改變狀態 ──
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Scenario C: Change title only (keep current status)');
    console.log('═══════════════════════════════════════════════════');

    // Test C1: PATCH isDraft=true + NO status in body
    {
        const title = getReqTitle('C', 'PATCH-draftTrue');
        console.log(`\n  C1: PATCH isDraft=true (no status in body)`);
        console.log(`      Title: "${title}"`);

        const url = getUrl(endpoints[EnumBloggerRestEndpoint.patchPost], {
            postId: TARGET_POST_ID,
            isDraft: true,
        });
        const body = buildBody(creds.blogId, title);

        let resp: IBloggerPostApiReturn | null = null;
        let err: string | undefined;
        try
        {
            resp = await client.httpPatch(url, body as any, authOptions);
            if (_hasError(resp))
            {
                err = 'API returned error';
                console.log(`      ⚠️  Response: ERROR`);
                console.dir(resp, { depth: null });
            }
            else
            {
                const s = extractStatus(resp);
                console.log(`      Response → status: ${s ?? '(omitted)'}, title: ${resp.title}`);
            }
        }
        catch (ex)
        {
            err = String(ex);
            console.log(`      ❌ Exception: ${err}`);
        }
        records.push({ label: 'C1-PATCH-isDraftTrue', method: 'PATCH', url, body, response: resp, error: err });

        // Verify
        const vUrl = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], { postId: TARGET_POST_ID, view: EnumBloggerViewMode.AUTHOR });
        const vResp = await client.httpGet(vUrl, authOptions);
        const vStatus = _hasError(vResp) ? undefined : extractStatus(vResp);
        console.log(`      Verify → status: ${vStatus ?? '(omitted)'}, title: ${_hasError(vResp) ? 'ERROR' : vResp.title}`);
        records.push({ label: 'C1-verify', method: 'GET', url: vUrl, response: _hasError(vResp) ? null : vResp, verifyStatus: vStatus, verifyTitle: _hasError(vResp) ? undefined : vResp.title, error: _hasError(vResp) ? 'GET failed' : undefined });
    }

    // Test C2: PATCH isDraft=false + NO status in body
    {
        const title = getReqTitle('C', 'PATCH-draftFalse');
        console.log(`\n  C2: PATCH isDraft=false (no status in body)`);
        console.log(`      Title: "${title}"`);

        const url = getUrl(endpoints[EnumBloggerRestEndpoint.patchPost], {
            postId: TARGET_POST_ID,
            isDraft: false,
        });
        const body = buildBody(creds.blogId, title);

        let resp: IBloggerPostApiReturn | null = null;
        let err: string | undefined;
        try
        {
            resp = await client.httpPatch(url, body as any, authOptions);
            if (_hasError(resp))
            {
                err = 'API returned error';
                console.log(`      ⚠️  Response: ERROR`);
                console.dir(resp, { depth: null });
            }
            else
            {
                const s = extractStatus(resp);
                console.log(`      Response → status: ${s ?? '(omitted)'}, title: ${resp.title}`);
            }
        }
        catch (ex)
        {
            err = String(ex);
            console.log(`      ❌ Exception: ${err}`);
        }
        records.push({ label: 'C2-PATCH-isDraftFalse', method: 'PATCH', url, body, response: resp, error: err });

        // Verify
        const vUrl = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], { postId: TARGET_POST_ID, view: EnumBloggerViewMode.AUTHOR });
        const vResp = await client.httpGet(vUrl, authOptions);
        const vStatus = _hasError(vResp) ? undefined : extractStatus(vResp);
        console.log(`      Verify → status: ${vStatus ?? '(omitted)'}, title: ${_hasError(vResp) ? 'ERROR' : vResp.title}`);
        records.push({ label: 'C2-verify', method: 'GET', url: vUrl, response: _hasError(vResp) ? null : vResp, verifyStatus: vStatus, verifyTitle: _hasError(vResp) ? undefined : vResp.title, error: _hasError(vResp) ? 'GET failed' : undefined });
    }

    // Test C3: PUT editPost + NO status in body
    {
        const title = getReqTitle('C', 'PUT-editPost');
        console.log(`\n  C3: PUT (editPost) (no status in body)`);
        console.log(`      Title: "${title}"`);

        const url = getUrl(endpoints[EnumBloggerRestEndpoint.editPost], {
            postId: TARGET_POST_ID,
            isDraft: false,
        });
        const body = buildBody(creds.blogId, title);

        let resp: IBloggerPostApiReturn | null = null;
        let err: string | undefined;
        try
        {
            resp = await client.httpPut(url, body as any, authOptions);
            if (_hasError(resp))
            {
                err = 'API returned error';
                console.log(`      ⚠️  Response: ERROR`);
                console.dir(resp, { depth: null });
            }
            else
            {
                const s = extractStatus(resp);
                console.log(`      Response → status: ${s ?? '(omitted)'}, title: ${resp.title}`);
            }
        }
        catch (ex)
        {
            err = String(ex);
            console.log(`      ❌ Exception: ${err}`);
        }
        records.push({ label: 'C3-PUT-editPost', method: 'PUT', url, body, response: resp, error: err });

        // Verify
        const vUrl = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], { postId: TARGET_POST_ID, view: EnumBloggerViewMode.AUTHOR });
        const vResp = await client.httpGet(vUrl, authOptions);
        const vStatus = _hasError(vResp) ? undefined : extractStatus(vResp);
        console.log(`      Verify → status: ${vStatus ?? '(omitted)'}, title: ${_hasError(vResp) ? 'ERROR' : vResp.title}`);
        records.push({ label: 'C3-verify', method: 'GET', url: vUrl, response: _hasError(vResp) ? null : vResp, verifyStatus: vStatus, verifyTitle: _hasError(vResp) ? undefined : vResp.title, error: _hasError(vResp) ? 'GET failed' : undefined });
    }

    // ===== 4. 摘要 =====
    console.log('\n============================================================');
    console.log('  Results Summary');
    console.log('============================================================');

    saveRecords(records);
    printSummary(result);

    console.log(`\n  💡 All responses saved to: ${OUTPUT_DIR}`);
    console.log(`  💡 The post title and status may have been modified during testing.`);
}

main().catch((err) =>
{
    console.error(err);
    process.exit(1);
});
