# AGENTS.md

## 專案 Agent 執行規範

### 語言偏好
- 所有回覆與程式碼註解使用**繁體中文**（zh-TW）
- 英文技術術語保留原文

### 執行規則

#### TypeScript 檔案執行
1. 優先使用 `tsx` 執行：`tsx path/to/file.ts`
2. 若 tsx 失敗，改用 `ts-node`：`ts-node path/to/file.ts`
3. 禁止使用 `npx tsx` 或 `npx ts-node`

#### 測試框架執行
1. 優先直接呼叫模組：`jest`、`vitest` 等
2. 若直接呼叫失敗，改用 `pnpm dlx` 或 `npx`

#### 建構指令
- 開發模式：`pnpm run dev`
- 正式建構：`pnpm run build`

### 工具使用
- 使用 `list_files` 瀏覽檔案結構
- 使用 `read_file` 閱讀原始碼
- 使用 `edit_file` 進行精確的文字替換
- 使用 `execute_command` 執行 CLI 指令

### 問題處理流程
1. 執行 `pnpm run build` 取得完整錯誤訊息
2. 逐一修正每個錯誤
3. 每次修正後重新執行建構驗證
4. 確保零錯誤後完成

### 專案資訊
- 框架：Obsidian Plugin
- 語言：TypeScript 6.x
- 套件管理：pnpm
- 打包工具：esbuild
- 測試框架：Jest（若存在測試）