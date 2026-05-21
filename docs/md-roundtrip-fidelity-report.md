# Markdown 雙向轉換還原率改善報告
# Markdown Round-Trip Fidelity Improvement Report

## Why / 動機 & 背景

### 問題 / Problem

為了實現「從 Blogger 同步文章內容到 Obsidian」的功能，需要建立以下資料流：

```
Obsidian MD  →  markdown-it  →  HTML  →  Blogger API (儲存)
Blogger API  →  HTML          →  turndown  →  MD (回存到本地)
```

關鍵在於 HTML 與 MD 之間的雙向轉換必須盡可能一致，否則每次同步都會產生大量無意義的 diff 雜訊，甚至遺失格式資訊。

### 初始狀態 / Baseline

測試套件包含 **33 個測試案例**，涵蓋 7 個群組：

| 群組 | 案例數 | 涵蓋範圍 |
|------|--------|---------|
| Block Elements | 7 | 段落、標題、引言、列表、程式碼、水平線 |
| Inline Formatting | 6 | 粗體、斜體、刪除線、程式碼、連結、圖片 |
| Lists | 4 | 有序、無序、巢狀、行內格式 |
| Tables | 3 | 表格基本、對齊、巢狀 |
| Code Blocks | 3 | 圍柵式、含語言標記、水平線 |
| Mixed Content | 4 | 標題+段落、引言+列表、多段落 |
| Edge Cases | 6 | 空字串、純空白、特殊字元、多空行 |

初始 pipeline（MD → markdown-it → HTML → turndown → MD）的比對率僅 **39.4% (13/33)**。

---

## What / 採取的改善措施

### 第一層：turndown 選項配置（+6 案例）

**檔案**：`src/utils/md-compare-utils.ts`

| 選項 | 設定值 | 影響 |
|------|--------|------|
| `emDelimiter` | `'*'` | 斜體使用 `*text*` 而非 `_text_` |
| `headingStyle` | `'atx'` | 標題使用 `# ` 而非 setext 底線 |
| `bulletListMarker` | `'-'` | 無序列表使用 `-` 而非 `*` |
| `codeBlockStyle` | `'fenced'` | 程式碼區塊使用 ` ``` ` 而非縮排 |
| `hr` | `'---'` | 水平線使用 `---` 而非 `* * *` |
| `br` | `'\n'` | 換行保留為 `\n` |

### 第二層：turndown 自訂規則（+1 案例）

**檔案**：`src/utils/md-compare-utils.ts`

| 規則 | 說明 |
|------|------|
| `headingAnchor` | 移除標題內的錨點連結（`<a>` in `<h1-6>`） |
| `strikethrough` | `<s>` / `<del>` → `~~text~~` |
| `fencedCodeBlock` | `<pre><code class="language-xxx">` → ```` ```xxx ```` |

### 第三層：markdown-it 修正（+4 案例）

**檔案**：`src/utils/markdown/markdown-it-default.ts`

| 修正 | 說明 |
|------|------|
| 圖片渲染器 Bug 修復 | 原來 `&lt;img ${src}="../.."&gt;` → 修正為 `<img src="${src}">` |
| 圖片 title 屬性輸出 | 新增 `title` 屬性到所有 `<img>` 輸出 |
| strikethrough 啟用 | `.use(strikethrough)` 讓 `~~text~~` 產生 `<s>text</s>` |

### 第四層：後製正規化函數 `normalizeMarkdown()`（+8 案例）

**檔案**：`src/utils/md-compare-utils.ts`

turndown 為了多行列表對齊會在標記後加入額外空白（如 `-   Item`），巢狀列表會加上 4 空格縮排，這些都是格式風格差異而非語義差異。為此建立了後製正規化函數：

```typescript
export function normalizeMarkdown(md: string): string
```

| 規則 | 正規化 | 範例 |
|------|--------|------|
| 多餘空白行 | `\n{3,}` → `\n\n` | 保留段落間單一空行 |
| 無序列表多餘空白 | `^([> ]*[-*+])\s{2,}` | `-   Item` → `- Item` |
| 有序列表多餘空白 | `^([> ]*\d+\.)\s{2,}` | `1.  Item` → `1. Item` |
| 引言空白行 | `^> \n` → `>\n` | 移除 `>` 後多餘空格 |
| 巢狀縮排 | `((?: {4})+)([-*+])` | `    - Child` → `  - Child` |

規則 2-3 支援：
- **巢狀縮排**：`    -   Child` → `    - Child`
- **引言前綴**：`> -   Item` → `> - Item`

此函數已匯出（`export`），可在測試或同步流程中獨立使用。

---

## Results / 成果

### Pipeline 比對率歷程

| 階段 | 匹配率 | 改善數 | 累計 |
|------|--------|--------|------|
| 初始（無客製） | **39.4%** (13/33) | — | — |
| + turndown 選項配置 | **57.6%** (19/33) | +6 | +6 |
| + turndown 自訂規則 | **60.6%** (20/33) | +1 | +7 |
| + markdown-it 圖片 Bug 修復 | **66.7%** (22/33) | +2 | +9 |
| + markdown-it strikethrough 啟用 | **72.7%** (24/33) | +2 | +11 |
| + `normalizeMarkdown()` 空白/縮排正規化 | **97.0%** (32/33) | +8 | **+19** |

### 測試結果

- **3 個測試檔案全部通過**：210 tests passed
- **快照更新**：依階段 3~6 個
- **測試框架**：Vitest v4.1.7

### 剩餘 1 個不匹配案例

**`blockquote with list inside`** — turndown 在 `<p>` + `<ul>` 之間正確插入結構性空行：

```
# Pipeline 輸出                          # 原始 MD
> A blockquote                           > A blockquote
>                                        > - with a list    ← 無空行
> - with a list                          > - inside it
> - inside it
```

這是語義正確的行為（區分段落與列表），不適合強行壓平。實際 diff 僅顯示一行差異。

---

## Architecture / 架構設計

### 資料流

```
             +------------+     +------------------+
  Obsidian   | markdown-it | --> |  HTML (to Blogger)|  寫入路徑
  MD 檔案    +------------+     +------------------+

             +------------+     +------------------+
  Blogger    |  turndown  | --> |  MD (回存本地)    |  讀取路徑
  HTML       +------------+     +------------------+
                    |
             +------------+
             | normalize  | --> 後製正規化（格式統一）
             | Markdown() |
             +------------+
```

### `compareWithLocal()` 比較流程

```
remoteHtml  → convertHtmlToMarkdown()  → remoteMd (正規化)
localMd     → trim() + normalizeMarkdown() (可選) → localMd

比較 remoteMd === localMd
  → 相等：回傳 isEqual: true
  → 不相等：diffLines() 產生 HTML diff + text diff
```

### 測試架構

- **測試資料集**：`test/fixtures/md-conversion-test-cases.ts`（7 群組 33 案例）
- **MD → HTML 測試**：`test/utils/md-to-html.spec.ts`（快照驗證）
- **HTML → MD 測試**：`test/utils/html-to-md.spec.ts`（Direct + Pipeline 雙路徑）
- **Round-trip 測試**：`test/utils/md-roundtrip.spec.ts`（不等價不拋錯，快照記錄）

---

## Files Changed / 異動檔案清單

| 檔案 | 異動摘要 |
|------|---------|
| `src/utils/md-compare-utils.ts` | 新增 `normalizeMarkdown()`（匯出）、整合至 `convertHtmlToMarkdown()`；turndown 選項 + 自訂規則 |
| `src/utils/markdown/markdown-it-default.ts` | 圖片渲染器 title 屬性輸出；啟用 strikethrough |
| `test/utils/html-to-md.spec.ts` | 匯入 `normalizeMarkdown`，原始 MD 正規化後比對；空字串相等性邏輯修正 |
| `test/utils/md-to-html.spec.ts` | 無變更（僅快照更新） |
| `test/utils/md-roundtrip.spec.ts` | 無變更（僅快照更新） |
| `test/fixtures/md-conversion-test-cases.ts` | 無變更（7 群組 33 案例維持一致） |
| `package.json` | 新增 `turndown@7.2.4`、`diff`、`@types/turndown`、`@types/diff`、`vitest@4.1.7` |


*報告產生日期：2026-05-21*
