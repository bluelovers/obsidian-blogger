## 1. 基礎建設：RestClient 新增 httpPatch 方法

- [ ] 1.1 在 `src/client/blogger/rest-client.ts` 新增 `httpPatch()` 方法，遵循與 `httpPut()` 相同的簽名與實作模式
- [ ] 1.2 確認 `httpPatch()` 使用 HTTP `PATCH` 方法，支援 JSON body 序列化
- [ ] 1.3 在 `IBloggerRestEndpoint` 介面（`blogger-client.ts`）新增 `patchPost` 端點欄位

## 2. 修正發布流程：editPost 端點加入 isDraft

- [ ] 2.1 修改 `BloggerRestClientGoogleOAuth2Context.endpoints.editPost` URL 範本從 `/${blogId}/posts/<%= postId %>` 改為 `/${blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>`
- [ ] 2.2 新增 `BloggerRestClientGoogleOAuth2Context.endpoints.patchPost` URL 範本 `/${blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>`
- [ ] 2.3 修改 `BloggerRestClient.publish()` 在 `postParams.postId` 存在時，也傳遞 `isDraft` 參數給 URL 建構（單一事實來源：從 `postParams.status === EnumPostStatus.Draft` 推導 `isDraft` 值）
- [ ] 2.4 確保 `isDraft` 的推導邏輯只出現在一處（利用 `getUrl()` 的 params 參數傳遞），不重複計算

## 3. 狀態切換 API：新增 updatePostStatus 方法

- [ ] 3.1 在 `IBloggerClient` 介面（`blogger-client-interface.ts`）新增 `updatePostStatus(postId, newStatus)` 方法簽名
- [ ] 3.2 在 `AbstractBloggerClient` 實作 `updatePostStatus()` 的通用邏輯包裝（錯誤處理、Notice 提示、Front Matter 更新）
- [ ] 3.3 在 `BloggerRestClient` 覆寫 `updatePostStatus()`：使用 `httpPatch()` 呼叫 Blogger API，只傳送 `{ status }` 主體
- [ ] 3.4 狀態切換成功後呼叫 `_updateFrontMatterTagsByPostStatus()` 更新 Front Matter 標籤（復用現有單一事實來源）

## 4. 插件命令：註冊新命令

- [ ] 4.1 在 `src/main.ts` 新增 `togglePostStatus` 命令（Toggle Post Status）：讀取當前 frontmatter 狀態 → 切換為相反狀態
- [ ] 4.2 在 `src/main.ts` 新增 `publishDraft` 命令（Publish Draft to Live）：將草稿設為 Live
- [ ] 4.3 在 `src/main.ts` 新增 `unpublishPost` 命令（Revert to Draft）：將發布設為草稿
- [ ] 4.4 命令執行前檢查 `postId` 是否存在於 Front Matter，若無則顯示錯誤提示並中止
- [ ] 4.5 呼叫 `getBloggerClient()` 取得 client 實例，在其上呼叫 `updatePostStatus()`

## 5. i18n 翻譯更新

- [ ] 5.1 在 `src/i18n/en.json` 新增：
  - `"command_togglePostStatus"` — 「Toggle post status (Draft ↔ Live)」
  - `"command_publishDraft"` — 「Publish draft to Live」
  - `"command_unpublishPost"` — 「Revert post to draft」
  - `"message_postStatusUpdated"` — 「Post status updated to <%= status %>」
  - `"error_noPostId"` — 「No post ID found in Front Matter.」
- [ ] 5.2 在 `src/i18n/zh-cn.json` 新增對應的簡體中文翻譯
- [ ] 5.3 更新 publish modal 的 status description 文字（移除「currently only available for new posts」限制）
- [ ] 5.4 確認 `ITranslateKey` 型別正確推導（透過 `langs.ts` 的 `satisfies Record<ILanguageID, ILanguage>`）

## 6. 發布 Modal 更新

- [ ] 6.1 修改 `src/blogger-publish-modal.ts`：將 status dropdown 的描述從 `publishModal_postStatusDesc`（含限制文字）改為更新後的翻譯鍵值

## 7. 測試腳本

- [ ] 7.1 檢查專案是否需要安裝測試依賴（jest、ts-jest 或 vitest），若需要則安裝
- [ ] 7.2 建立 `test/toggle-post-status/rest-client-httpPatch.spec.ts`：測試 `httpPatch()` 方法正確發送 PATCH 請求
- [ ] 7.3 建立 `test/toggle-post-status/updatePostStatus.spec.ts`：測試 `updatePostStatus()` 的 API 呼叫邏輯（mock RestClient）
- [ ] 7.4 建立 `test/toggle-post-status/isDraft-calculation.spec.ts`：測試 `isDraft` 值從 `EnumPostStatus` 推導的正確性（單一事實來源驗證）
- [ ] 7.5 測試 Front Matter 標籤更新邏輯（復用 `_updateFrontMatterTagsByPostStatus` 現有行為）

## 8. 驗證與建置

- [ ] 8.1 執行 `pnpm run build`（含 `tsc -noEmit -skipLibCheck`）確認無型別錯誤
- [ ] 8.2 執行 `pnpm run dev` 確認無建置錯誤
- [ ] 8.3 檢查所有修改檔案的 import/export 正確無誤
