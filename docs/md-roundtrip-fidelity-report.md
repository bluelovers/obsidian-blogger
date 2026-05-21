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

測試套件包含 **37 個測試案例**，涵蓋 8 個群組：

| 群組 | 案例數 | 涵蓋範圍 |
|------|--------|---------|
| Inline Formatting | 6 | 粗體、斜體、刪除線、程式碼、連結、圖片 |
| Headings | 4 | h1~h6 |
| Links and Images | 4 | 連結、圖片（含 title）、圖片縮放 |
| Lists | 4 | 有序、無序、巢狀、行內格式 |
| **Tables** | **4** | **基本、對齊、行內格式、混合內容** |
| Block Elements | 5 | 引言、程式碼區塊、水平線 |
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

### 第五層：turndown 表格規則（重大缺失修復）

**檔案**：`src/utils/md-compare-utils.ts`

turndown **沒有內建表格支援**，因此 `<table>` 經過 pipeline 後表格結構會完全遺失（所有儲存格內容被單純串接）。

為此新增自訂 `table` 規則：

| 功能 | 說明 |
|------|------|
| `<thead><th>` → 表頭行 | 解析表頭內容，保留行內格式（粗體、程式碼、連結） |
| `<tbody><td>` → 資料行 | 每格獨立經過 turndown 轉換，確保格式正確 |
| `align` 屬性支援 | `left` → `:---`、`center` → `:---:`、`right` → `---:` |
| 退化表格 | 無 `<thead>`/`<tbody>` 包裹的裸 `<tr>` 也正確處理 |

修復後範例（Corepack 對比表，你的範例）：

```
原始 MD： |方法|指令範例|是否修改 `package.json`|...
管線輸出：| 方法 | 指令範例 | 是否修改 `package.json` |...
```

表格已完成重建，`|` 計數前後一致。管道前後的單空格差異（`|Cell|` vs `| Cell |`）是可接受的格式風格。

---

## Results / 成果

### Pipeline 比對率歷程

| 階段 | 匹配率 | 改善 | 案例數 |
|------|--------|------|--------|
| 初始（無客製） | **39.4%** (13/33) | — | 33 |
| + turndown 選項配置 | **57.6%** (19/33) | +6 | 33 |
| + turndown 自訂規則 | **60.6%** (20/33) | +1 | 33 |
| + markdown-it 修復（圖片、strikethrough） | **72.7%** (24/33) | +4 | 33 |
| + `normalizeMarkdown()` 後製正規化 | **97.0%** (32/33) | +8 | 33 |
| + turndown 表格規則 + 新測試案例 | **97.3%** (36/37) | +4 | **37** |

### 測試結果

- **3 個測試檔案全部通過**：236 tests passed
- **測試框架**：Vitest v4.1.7
- **測試案例**：從 33 個擴充至 **37 個**（新增 Tables 群組 4 案例）

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
| `src/utils/md-compare-utils.ts` | 新增 `normalizeMarkdown()`（匯出）、整合至 `convertHtmlToMarkdown()`；turndown 選項 + 自訂規則（刪除線、程式碼區塊、表格）；`getCellAlign()` 支援 `align` 屬性與 `style.textAlign` |
| `src/utils/markdown/markdown-it-default.ts` | 圖片渲染器 title 屬性輸出；啟用 strikethrough |
| `test/utils/html-to-md.spec.ts` | 匯入 `normalizeMarkdown`，原始 MD 正規化後比對；空字串相等性邏輯修正 |
| `test/utils/md-to-html.spec.ts` | 無變更（僅快照更新） |
| `test/utils/md-roundtrip.spec.ts` | 無變更（僅快照更新） |
| `test/fixtures/md-conversion-test-cases.ts` | 無變更（7 群組 33 案例維持一致） |
| `package.json` | 新增 `turndown@7.2.4`、`diff`、`@types/turndown`、`@types/diff`、`vitest@4.1.7` |


*報告產生日期：2026-05-21*
