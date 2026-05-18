# Blogger API 標題 + 狀態變更測試報告

## 測試目的

驗證 Blogger API 是否能「單次請求同時更改文章標題與狀態」。

## 測試方法

- 目標文章：`984648475646277424`
- 使用 `RestClient` + Node.js 發送真實 HTTP 請求
- 對每種端點組合測試三個情境

## 測試結果（2026-05-18）

初始狀態：**DRAFT**

### 三種端點的 URL 模板

| 端點 | HTTP 方法 | URL 模板 |
|------|-----------|----------|
| `patchPost` | PATCH | `/{blogId}/posts/{postId}?isDraft={isDraft}` |
| `editPost` | PUT | `/{blogId}/posts/{postId}?isDraft={isDraft}` |

### DRAFT 狀態下的測試

#### Scenario A：更改標題 → 設為 DRAFT ✅

| 端點 | HTTP 方法 | URL 模板 |
|------|-----------|----------|
| `patchPost` | PATCH | `/{blogId}/posts/{postId}?isDraft={isDraft}` |
| `editPost` | PUT | `/{blogId}/posts/{postId}?isDraft={isDraft}` |

### Scenario A：更改標題 → 設為 DRAFT ✅

| 測試 | 方法 | body.status | isDraft | 標題 | 結果狀態 |
|------|------|-------------|---------|------|---------|
| A1 | PATCH | DRAFT | true | ✅ 改變 | DRAFT |
| A2 | PATCH | DRAFT | false | ✅ 改變 | DRAFT |
| A3 | PUT | DRAFT | false | ✅ 改變 | DRAFT |

### Scenario B：更改標題 → 設為 LIVE ❌

| 測試 | 方法 | body.status | isDraft | 標題 | 結果狀態 |
|------|------|-------------|---------|------|---------|
| B1 | PATCH | LIVE | true | ✅ 改變 | **DRAFT** (未改變) |
| B2 | PATCH | LIVE | false | ✅ 改變 | **DRAFT** (未改變) |
| B3 | PUT | LIVE | false | ✅ 改變 | **DRAFT** (未改變) |

### LIVE 狀態下的測試

先將文章 publish 為 LIVE，再測試只更改標題。

| 測試 | 方法 | body 狀態 | isDraft | 標題 | 結果狀態 |
|------|------|-----------|---------|------|---------|
| D1 | PATCH | (無) | true | ✅ 改變 | **LIVE** (不變) |
| D2 | PATCH | (無) | false | ✅ 改變 | **LIVE** (不變) |
| D3 | PUT | (無) | false | ✅ 改變 | **LIVE** (不變) |

關鍵發現：**LIVE 狀態下，`isDraft=true` 不會強制退回 DRAFT。** `isDraft` 參數在 LIVE 文章上無效。

### Scenario C：只更改標題（不改變狀態）✅

| 測試 | 方法 | body.status | isDraft | 標題 | 結果狀態 |
|------|------|-------------|---------|------|---------|
| C1 | PATCH | (無) | true | ✅ 改變 | DRAFT |
| C2 | PATCH | (無) | false | ✅ 改變 | DRAFT |
| C3 | PUT | (無) | false | ✅ 改變 | DRAFT |

## 結論

**不行 — 無法在單次請求內同時更改文章狀態與內容。**

`isDraft` query parameter 的行為取決於文章當前狀態：

### `isDraft` 參數行為（依文章狀態）

| 當前狀態 | `isDraft=true` | `isDraft=false` |
|----------|----------------|-----------------|
| DRAFT | 維持 DRAFT | 維持 DRAFT（無法提升為 LIVE） |
| LIVE | 維持 LIVE（不會退回 DRAFT） | 維持 LIVE |

1. PATCH/PUT 搭配 body 中的 `status` 欄位**無法將 DRAFT 轉為 LIVE**
   - body 的 `status` 欄位被 `isDraft` query parameter 覆蓋或忽略
   - `isDraft=true` 在 DRAFT 時維持草稿
   - `isDraft=false` 也無法將 DRAFT 提升為 LIVE

2. 改變狀態必須使用專用的 `publish` / `revert` 端點（POST，無主體）

3. 改變標題/內容可以使用 PATCH 或 PUT（在 DRAFT 和 LIVE 狀態下均可正常運作）

## 建議

目前的實作設計（先用 publish/revert 改狀態，再用 PATCH 改內容）是正確的，**不需要修正**。

## 原始紀錄

JSON 格式的完整 API 回應請見：
`test/temp/title-change-test/test-results-{timestamp}.json`
