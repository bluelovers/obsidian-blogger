## Why

目前 Obsidian Blogger 插件無法將已發布為草稿（Draft）的文章切換為發布狀態（Live），也無法將已發布的文章改回草稿。當用戶透過插件發布文章為草稿後，必須手動登入 Blogger 後台才能變更狀態，這破壞了「在 Obsidian 中完成一切」的工作流程。

問題根源：更新已有文章時，API 請求 URL 缺少 `isDraft=false` 查詢參數，導致 Blogger API 忽略請求主體中的 `status` 欄位，始終維持草稿狀態。

## What Changes

- **修正更新文章的 API 請求**：在 `editPost` 端點的 PUT 請求中加上 `isDraft` 查詢參數，使更新文章時能正確切換 Draft ↔ Live 狀態
- **新增 `httpPatch` 方法**：在 RestClient 中新增 PATCH 請求方法，用於輕量的部分更新
- **新增`變更文章狀態`（Toggle Post Status）功能**：無需重新發布文章內容，僅透過 API 切換 Draft ↔ Live 狀態
- **新增 `發布為 Live`（Publish Draft）命令**：將當前草稿文章直接設為 Live
- **新增 `設為草稿`（Unpublish / Revert to Draft）命令**：將當前已發布文章設回 Draft
- **更新發布 Modal**：移除「NOTE: currently only available for new posts.」的提示文字，因功能已完整支援新文章和更新
- **更新 Front Matter 標籤**：狀態切換後自動更新 Obsidian 筆記中的內部標籤（`obsidian-blogger/live`、`obsidian-blogger/draft` 等）
- **新增 i18n 翻譯字串**：支援中英文狀態切換相關訊息

## Capabilities

### New Capabilities

- `toggle-post-status`: 提供在 Obsidian 中直接切換 Blogger 文章 Draft ↔ Live 狀態的能力，無須離開編輯器

### Modified Capabilities

<!-- No existing capability requirements are changing — this is purely additive functionality -->

## Impact

- **`src/client/blogger/rest-client.ts`**：新增 `httpPatch()` 方法，用於部分更新文章內容
- **`src/blogger-client.ts`**：修改 `BloggerRestClientGoogleOAuth2Context.endpoints.editPost` 的 URL 格式，加入 `isDraft` 模板變數；修改 `BloggerRestClient.publish()` 在更新時傳遞正確的 `isDraft`；新增 `updatePostStatus()` 方法
- **`src/types/const.ts`**：可能需要新增「切換文章狀態」相關的狀態標籤（目前已有 `EnumobsidianBloggerTags`）
- **`src/main.ts`**：新增 2-3 個命令（Toggle Status、Publish Draft、Unpublish）
- **`src/blogger-publish-modal.ts`**：移除 status dropdown 上的限制文字
- **`src/i18n/en.json`、`src/i18n/zh-cn.json`**：新增翻譯字串
- **`src/types/blogger-client-interface.ts`**：可能需要擴展 `IBloggerClient` 介面新增方法
