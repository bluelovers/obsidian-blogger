## Context

目前 Obsidian Blogger 插件在發布新文章時能正確處理 `isDraft` 參數（`POST /{blogId}/posts?isDraft=<%= isDraft %>`），但在**更新**已有文章時（`PUT /{blogId}/posts/<%= postId %>`），URL 缺少 `isDraft` 查詢參數。

根據 Blogger API 規範，若要變更已有文章的發布狀態，更新請求的 URL 必須包含 `?isDraft=false`（或 `?isDraft=true`），否則 API 會忽略請求主體中的 `status` 欄位，維持原有狀態。

此外，目前沒有專門的「狀態切換」命令——用戶必須重新發布整篇文章才能切換狀態，這效率低且浪費 API 配額。

### 現有程式碼結構

- `RestClient`（`rest-client.ts`）：提供 `httpGet`、`httpPost`、`httpPut`，**沒有 `httpPatch`**
- `BloggerRestClientGoogleOAuth2Context`（`blogger-client.ts` 第 368-419 行）：定義 `endpoints`
  - `newPost`: `/${blogId}/posts?isDraft=<%= isDraft %>` ← ✅ 有 isDraft
  - `editPost`: `/${blogId}/posts/<%= postId %>` ← ❌ 缺少 isDraft
- `BloggerRestClient.publish()`（`blogger-client.ts` 第 253-317 行）：
  - 新文章 → `httpPost` 到 `newPost` URL（正確傳遞 isDraft）
  - 更新文章 → `httpPut` 到 `editPost` URL（**缺少 isDraft**）
- `IBloggerPostParams`（`blogger-client-interface.ts`）：包含 `status: EnumPostStatus` 和 `postId?: \`${number}\``
- Front Matter 更新：`_updateFrontMatterTagsByPostStatus()`（`tags-utils.ts`）**已存在**，可正確根據狀態更新內部標籤

## Goals / Non-Goals

**Goals:**

- 更新已有文章時能正確切換 Draft ↔ Live 狀態（修復核心 bug）
- 新增專用命令，無需重新發布內容即可切換文章狀態
- 命令支援從 Front Matter 讀取 `postId` 進行操作
- 狀態切換後自動更新 Front Matter 中的內部標籤
- 完整的 user feedback（Notice 提示、錯誤處理）
- 中英文 i18n 支援

**Non-Goals:**

- 不修改 Blogger 新文章發布流程（已正確運作）
- 不支援 Scheduled 或 SoftTrashed 狀態的切換（僅 Draft ↔ Live）
- 不新增設定 UI 或設定項（純粹命令驅動）
- 不處理沒有 `postId` 在 Front Matter 中的文件（無法找到對應 Blogger 文章）

## Decisions

### Decision 1：使用 PUT vs 新增 PATCH

**選擇：新增 `httpPatch()` 方法**

對照選項：
- **PUT（現有）**：需要傳送完整文章內容（title、content、labels、status），但對於單純切換狀態來說負載過重
- **PATCH（新增）**：只需傳送 `status` 欄位，更輕量、語義更精確

選擇 PATCH 的原因：
1. 純狀態切換不需重新傳送文章內容，節省頻寬
2. Blogger API 支援 PATCH 請求
3. 語義更符合 RESTful 設計原則
4. 減少不必要的 API 呼叫風險（內容不會被意外覆蓋）

### Decision 2：URL 設計

**選擇：讓 `editPost` 端點支援 `isDraft` 模板參數**

修改 `BloggerRestClientGoogleOAuth2Context.endpoints.editPost`：
```
// 修改前
editPost: () => `/${this.blogId}/posts/<%= postId %>`

// 修改後
editPost: () => `/${this.blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>`
```

這與 `newPost` 的設計一致，並保持向後相容（不破壞現有 `publish()` 邏輯）。

同時新增 `patchPost` 端點用於 PATCH 請求：
```
patchPost: () => `/${this.blogId}/posts/<%= postId %>?isDraft=<%= isDraft %>`
```

### Decision 3：命令設計

**選擇：新增三個命令，各自對應不同的使用情境**

| 命令 ID | 名稱 | 行為 |
|---------|------|------|
| `togglePostStatus` | Toggle Post Status | 讀取當前狀態 → 切換為相反狀態 |
| `publishDraft` | Publish Draft to Live | 將草稿設為 Live |
| `unpublishPost` | Revert to Draft | 將發布設為草稿 |

設計考量：
- 單一「Toggle」命令對多數用戶最直觀
- 分開的 `publishDraft` / `unpublishPost` 提供明確的語義，適合快捷鍵綁定
- 不需要 modal 彈窗——直接執行，減少操作步驟

### Decision 4：API 方法命名

**選擇：在 `BloggerRestClient` 新增 `updatePostStatus()`，在 `IBloggerClient` 新增 `togglePostStatus()`**

- `IBloggerClient` 合約層面新增 `togglePostStatus(postId, newStatus)` 方法
- `AbstractBloggerClient` 提供通用的邏輯包裝（錯誤處理、Notice、Front Matter 更新）
- `BloggerRestClient` 實作具體的 PATCH API 呼叫
- 可復用 `AbstractBloggerClient` 中的 `getHeaders()` 方法確保 token 刷新

### Decision 5：Front Matter 更新

**選擇：復用現有的 `_updateFrontMatterTagsByPostStatus()`**

此函式已完整實作 Draft/Live/Scheduled/SoftTrashed 的標籤轉換邏輯，只需在狀態切換成功後呼叫，與 `publishPost()` 的行為一致。

## Risks / Trade-offs

- **[API 失敗風險]** Blogger API 可能暫時不可用 → 捕捉錯誤並顯示 Notice，不影響本地檔案
- **[Token 過期風險]** 狀態切換時 OAuth2 token 可能已過期 → `getHeaders()` 已包含自動 refresh 邏輯，可安心復用
- **[postId 遺失風險]** 用戶可能手動刪除了 Front Matter 中的 `postId` → 命令執行前檢查，若無 `postId` 則顯示錯誤提示並中止
- **[狀態不一致風險]** 如果用戶在 Blogger 後台手動變更了狀態，與本地 Front Matter 不同步 → 命令執行後會從 API 回應中讀取最新狀態更新到 Front Matter，自動修正不一致
- **[內容遺失風險]** 使用 PUT 時若傳送不完整內容可能覆蓋 Blogger 上的文章 → PATCH 方式更安全，只更新 `status` 欄位
