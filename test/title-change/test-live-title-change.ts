/**
 * LIVE 狀態下更改標題測試
 * Test title change while post is LIVE
 *
 * 先將文章 publish 為 LIVE，再測試 PATCH/PUT 是否能更改標題。
 *
 * @example
 * tsx test/title-change/test-live-title-change.ts
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
import { loadCredentials } from '../lib/test-utils';
import { __TEST_TEMP } from '../__root';
import { IHttpHeaders } from '../../src/types/http';

const TARGET_POST_ID = '984648475646277424' as const;
const TIMESTAMP = Date.now();
const OUTPUT_DIR = path.join(__TEST_TEMP, 'title-change-test');
const TEST_CONTENT = '<p>Test content for LIVE title change.</p>';

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

function saveRecords(records: ITestRecord[]): void
{
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const filePath = path.join(OUTPUT_DIR, `live-title-test-${TIMESTAMP}.json`);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
    console.log(`  📁 Results saved: ${filePath}`);
}

function extractStatus(resp: IBloggerPostApiReturn): EnumPostStatus | undefined
{
    return _extractStatusCore(resp);
}

function getTitle(variant: string): string
{
    return `[Test-LIVE-${variant}] ${new Date(TIMESTAMP).toISOString()}`;
}

function buildBody(blogId: string, title: string, status?: EnumPostStatus): Partial<IBloggerPostApiBody>
{
    const body: Partial<IBloggerPostApiBody> = {
        kind: 'blogger#post',
        blog: { id: blogId },
        title,
        content: TEST_CONTENT,
        labels: [],
    };
    if (status !== undefined) body.status = status;
    return body;
}

async function main(): Promise<void>
{
    const records: ITestRecord[] = [];

    console.log('');
    console.log('============================================================');
    console.log('  LIVE Title Change Test');
    console.log('============================================================');

    const creds = await loadCredentials();
    console.log(`  Blog ID: ${creds.blogId}`);
    console.log(`  Post ID: ${TARGET_POST_ID}`);

    const client = new RestClient({ url: new URL(BLOGGER_API_ENDPOINT) }, nodeRequest);
    const authOptions: { headers: IHttpHeaders } = {
        headers: { authorization: `Bearer ${creds.accessToken}` },
    };
    const endpoints = getBloggerRestEndpoint(creds.blogId);

    // ===== Step 1: Check current state =====
    console.log('\n📋 Step 1: Check current state');
    const getUrl_ = getUrl(endpoints[EnumBloggerRestEndpoint.getPost], {
        postId: TARGET_POST_ID,
        view: EnumBloggerViewMode.AUTHOR,
    });
    const beforeResp = await client.httpGet(getUrl_, authOptions);
    const beforeStatus = _hasError(beforeResp) ? undefined : extractStatus(beforeResp);
    console.log(`  Current: ${beforeStatus ?? '(omitted)'} — "${_hasError(beforeResp) ? 'ERROR' : beforeResp.title}"`);

    records.push({ label: '00-before-publish', method: 'GET', url: getUrl_, response: _hasError(beforeResp) ? null : beforeResp, verifyStatus: beforeStatus });

    // ===== Step 2: Publish (make LIVE) =====
    console.log('\n📋 Step 2: Publish post');
    const pubUrl = getUrl(endpoints[EnumBloggerRestEndpoint.setPostStatusLive], {
        postId: TARGET_POST_ID,
    });
    const pubResp = await client.httpPublish(pubUrl, authOptions);
    const pubStatus = _hasError(pubResp) ? undefined : extractStatus(pubResp);
    console.log(`  After publish: ${pubStatus ?? '(omitted)'}`);

    records.push({ label: '01-publish', method: 'POST', url: pubUrl, response: _hasError(pubResp) ? null : pubResp, verifyStatus: pubStatus, error: _hasError(pubResp) ? 'publish failed' : undefined });

    if (_hasError(pubResp) || pubStatus !== EnumPostStatus.Live)
    {
        console.error('  ❌ Publish failed, aborting');
        saveRecords(records);
        process.exit(1);
    }

    // Verify LIVE via GET
    const liveVerify = await client.httpGet(getUrl_, authOptions);
    const liveStatus = _hasError(liveVerify) ? undefined : extractStatus(liveVerify);
    console.log(`  Verify LIVE: ${liveStatus ?? '(omitted)'}`);
    records.push({ label: '02-verify-live', method: 'GET', url: getUrl_, response: _hasError(liveVerify) ? null : liveVerify, verifyStatus: liveStatus });

    // ===== Step 3: Test title changes while LIVE =====

    // Test 1: PATCH isDraft=true + new title (no status)
    {
        const title = getTitle('PATCH-draftTrue');
        console.log(`\n📋 Test 1: PATCH isDraft=true + title only`);
        console.log(`  Title: "${title}"`);

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
            if (_hasError(resp)) { err = 'API error'; console.log(`  ⚠️ ERROR:`, resp); }
            else console.log(`  Response → title: ${resp.title}, status: ${extractStatus(resp) ?? '(omitted)'}`);
        }
        catch (ex) { err = String(ex); console.log(`  ❌ ${err}`); }
        records.push({ label: '03-PATCH-isDraftTrue', method: 'PATCH', url, body, response: resp, error: err });

        // Verify
        const v = await client.httpGet(getUrl_, authOptions);
        const s = _hasError(v) ? undefined : extractStatus(v);
        console.log(`  Verify → title: ${_hasError(v) ? 'ERROR' : v.title}, status: ${s ?? '(omitted)'}`);
        records.push({ label: '03-verify', method: 'GET', url: getUrl_, response: _hasError(v) ? null : v, verifyStatus: s, verifyTitle: _hasError(v) ? undefined : v.title, error: _hasError(v) ? 'GET failed' : undefined });
    }

    // Test 2: PATCH isDraft=false + new title (no status)
    {
        const title = getTitle('PATCH-draftFalse');
        console.log(`\n📋 Test 2: PATCH isDraft=false + title only`);
        console.log(`  Title: "${title}"`);

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
            if (_hasError(resp)) { err = 'API error'; console.log(`  ⚠️ ERROR:`, resp); }
            else console.log(`  Response → title: ${resp.title}, status: ${extractStatus(resp) ?? '(omitted)'}`);
        }
        catch (ex) { err = String(ex); console.log(`  ❌ ${err}`); }
        records.push({ label: '04-PATCH-isDraftFalse', method: 'PATCH', url, body, response: resp, error: err });

        // Verify
        const v = await client.httpGet(getUrl_, authOptions);
        const s = _hasError(v) ? undefined : extractStatus(v);
        console.log(`  Verify → title: ${_hasError(v) ? 'ERROR' : v.title}, status: ${s ?? '(omitted)'}`);
        records.push({ label: '04-verify', method: 'GET', url: getUrl_, response: _hasError(v) ? null : v, verifyStatus: s, verifyTitle: _hasError(v) ? undefined : v.title, error: _hasError(v) ? 'GET failed' : undefined });
    }

    // Test 3: PUT editPost + new title (no status)
    {
        const title = getTitle('PUT-editPost');
        console.log(`\n📋 Test 3: PUT (editPost) + title only`);
        console.log(`  Title: "${title}"`);

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
            if (_hasError(resp)) { err = 'API error'; console.log(`  ⚠️ ERROR:`, resp); }
            else console.log(`  Response → title: ${resp.title}, status: ${extractStatus(resp) ?? '(omitted)'}`);
        }
        catch (ex) { err = String(ex); console.log(`  ❌ ${err}`); }
        records.push({ label: '05-PUT-editPost', method: 'PUT', url, body, response: resp, error: err });

        // Verify
        const v = await client.httpGet(getUrl_, authOptions);
        const s = _hasError(v) ? undefined : extractStatus(v);
        console.log(`  Verify → title: ${_hasError(v) ? 'ERROR' : v.title}, status: ${s ?? '(omitted)'}`);
        records.push({ label: '05-verify', method: 'GET', url: getUrl_, response: _hasError(v) ? null : v, verifyStatus: s, verifyTitle: _hasError(v) ? undefined : v.title, error: _hasError(v) ? 'GET failed' : undefined });
    }

    // ===== Summary =====
    console.log('\n============================================================');
    console.log('  Summary');
    console.log('============================================================');
    saveRecords(records);
    console.log(`\n  💡 Post is currently LIVE with modified title.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
