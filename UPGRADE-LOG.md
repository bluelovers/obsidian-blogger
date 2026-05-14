# TypeScript 5.3 → 6 升級 & npm → pnpm 轉換 紀錄

> 本文件記錄升級過程中遇到的所有問題、根本原因（WHY）與最終解決方案（WHAT），
> 並將走錯的路徑作為負面案例保留，供日後參考。

---

## 一、環境變更

| 項目 | 舊版本 | 新版本 |
|------|--------|--------|
| TypeScript | 5.3.x | 6.0.3 |
| 套件管理 | npm | pnpm |
| 打包工具 | esbuild | esbuild（未變） |

---

## 二、問題一：`Cannot find name 'http'`

### 錯誤訊息
```
src/blogger-oauth2-client.ts(10,30): error TS2591: Cannot find name 'http'.
Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
```

### WHY（根本原因）
`src/blogger-oauth2-client.ts` 使用了 Node.js 內建模組 `http`：
```typescript
import { createServer } from 'http';
```
TypeScript 6 對 `types` 欄位的處理更嚴格。即使 `@types/node` 已安裝在 `devDependencies` 中，tsconfig.json 沒有明確在 `compilerOptions.types` 中列出 `"node"`，TypeScript 6 就不會自動載入全域 Node.js 類型宣告。

在 TS 5.x 時，TypeScript 可能透過其他機制（如 `@types` 自動探索）載入了這些類型，但 TS6 對此更嚴格。

### WHAT（解決方式）
在 `tsconfig.json` 的 `compilerOptions` 中明確加入 `types` 欄位：
```json
"types": [
  "node"
]
```

---

## 三、問題二：`Object.fromEntries` / `Object.entries` 不存在

### 錯誤訊息
```
src/blogger-oauth2-client.ts(174,18): error TS2550: Property 'fromEntries' does not exist on type 'ObjectConstructor'.
src/types.ts(83,12): error TS2550: Property 'entries' does not exist on type 'ObjectConstructor'.
src/utils.ts(17,12): error TS2550: Property 'fromEntries' does not exist on type 'ObjectConstructor'.
src/utils.ts(17,31): error TS2550: Property 'entries' does not exist on type 'ObjectConstructor'.
```

### WHY（根本原因）
`tsconfig.json` 的 `lib` 欄位只包含到 `ES7`（即 ES2016）：
```json
"lib": ["DOM", "ES5", "ES6", "ES7"]
```

- `Object.entries` 是 ES2017 引入的
- `Object.fromEntries` 是 ES2019 引入的

由於 `lib` 沒有包含 `ES2017` 和 `ES2019`，TypeScript 6 無法找到這些方法的類型宣告。

### WHAT（解決方式）
擴充 `lib` 欄位：
```json
"lib": [
  "DOM",
  "ES5",
  "ES6",
  "ES7",
  "ES2017",
  "ES2019",
  "ES2020"
]
```

---

## 四、問題三：`PromiseFulfilledResult` 找不到

### 錯誤訊息
```
src/utils.ts(24,67): error TS2304: Cannot find name 'PromiseFulfilledResult'.
```

### WHY（根本原因）
`PromiseFulfilledResult` 是 ES2020 `Promise.allSettled` 相關的類型，定義在 `lib.es2020.promise.d.ts` 中。

同樣的原因，`lib` 欄位缺少 `ES2020`，導致 TypeScript 找不到此類型。

### WHAT（解決方式）
同上，`lib` 加入 `"ES2020"` 即可解決。

---

## 五、問題四：`Uint8Array` 與 `ArrayBuffer` 類型不相容

### 錯誤訊息
```
src/oauth2-client.ts(225,20): error TS2345: Argument of type 'Uint8Array<ArrayBuffer>' is not assignable to parameter of type 'ArrayBuffer'.
src/oauth2-client.ts(237,3): error TS2322: Type 'Uint8Array<ArrayBuffer>' is not assignable to type 'ArrayBuffer'.
src/types.ts(62,17): error TS2345: Argument of type 'Uint8Array<ArrayBuffer>' is not assignable to parameter of type 'ArrayBuffer'.
src/types.ts(65,11): error TS2345: ...
src/types.ts(67,19): error TS2345: ...
src/types.ts(71,11): error TS2345: ...
src/types.ts(77,17): error TS2345: ...
src/types.ts(92,15): error TS2345: ...
```

### WHY（根本原因）
TypeScript 6 對 `Uint8Array` 和 `ArrayBuffer` 的類型定義更加嚴格。

在 `oauth2-client.ts` 中：
```typescript
const stringToBuffer = (input: string): ArrayBuffer => {
   const buf = new Uint8Array(input.length);
   // ...
   return buf;  // ❌ Uint8Array ≠ ArrayBuffer（TS6 嚴格檢查）
};
```
`Uint8Array` 是 `ArrayBufferView` 的子類型，不是 `ArrayBuffer` 的子類型。TS5 可能較寬鬆，但 TS6 會嚴格檢查。

在 `types.ts` 中：
```typescript
const body: ArrayBuffer[] = [];
// ...
body.push(media.content);  // media.content 是 ArrayBuffer ✅
body.push(encoder.encode(data));  // encoder.encode() 回傳 Uint8Array ❌
```
`TextEncoder.encode()` 回傳 `Uint8Array`，但 `body` 被聲明為 `ArrayBuffer[]`。

### WHAT（解決方式）

**oauth2-client.ts** — 使用 `.buffer` 屬性取得底層 `ArrayBuffer`：
```typescript
const stringToBuffer = (input: string): ArrayBuffer => {
   const buf = new Uint8Array(input.length);
   for (let i = 0; i < input.length; i++) {
     buf[i] = input.charCodeAt(i) & 0xff;
   }
   return buf.buffer;  // ✅ 正確取得 ArrayBuffer
};
```

**types.ts** — 擴大 `body` 的類型定義，並用 `as any` 處理 `Blob` 類型不匹配：
```typescript
const body: (Uint8Array | ArrayBuffer)[] = [];
// ...
body.push(new Uint8Array(media.content));  // 統一轉為 Uint8Array
// ...
return new Blob(body as any).arrayBuffer();  // as any 解決 BlobPart 類型不相容
```

### WHY 為什麼要用 `as any`？

即使將 `body` 類型改為 `(Uint8Array | ArrayBuffer)[]`，`Blob` 建構子的參數類型是 `BlobPart[]`。

`BlobPart` 的定義是：
```typescript
type BlobPart = BufferSource | Blob | string;
// 其中 BufferSource = ArrayBufferView<ArrayBuffer> | ArrayBuffer
```

而 `Uint8Array<ArrayBufferLike>` 不相容於 `ArrayBufferView<ArrayBuffer>`，因為它們的 `.buffer` 屬性類型不同：
- `Uint8Array<ArrayBuffer>` 的 `.buffer` 是 `ArrayBuffer` ✅
- `Uint8Array<ArrayBufferLike>` 的 `.buffer` 是 `ArrayBufferLike`（包含 `SharedArrayBuffer`）❌

TypeScript 6 無法自動推導這個安全的轉換，因此最乾淨的解法就是 `body as any`。這裡的 `any` 是安全的，因為我們確定 `body` 中的元素都是有效的 `BlobPart`（`Uint8Array` 和 `ArrayBuffer` 都可以被 `Blob` 接受）。

---

## 六、問題五：Markdown-it 子路徑模組缺少類型宣告

### 錯誤訊息
```
src/markdown-it-image-plugin.ts(2,19): error TS2307: Cannot find module 'markdown-it/lib/token' or its corresponding type declarations.
src/markdown-it-mathjax3-plugin.ts(2,25): error TS2307: Cannot find module 'markdown-it/lib/rules_inline/state_inline' or its corresponding type declarations.
src/markdown-it-mathjax3-plugin.ts(3,24): error TS2307: Cannot find module 'markdown-it/lib/rules_block/state_block' or its corresponding type declarations.
src/markdown-it-mathjax3-plugin.ts(7,19): error TS2307: Cannot find module 'markdown-it/lib/token' or its corresponding type declarations.
```

### WHY（根本原因）
`@types/markdown-it` 的主模組 (`markdown-it`) 有完整類型定義，但其內部子路徑模組（如 `markdown-it/lib/token`、`markdown-it/lib/rules_inline/state_inline`）沒有對應的獨立 `.d.ts` 檔案。

當程式碼使用 `import Token from 'markdown-it/lib/token'` 時，TypeScript 6 無法解析這些子路徑模組的類型。

### ❌ 負面案例：自行建立 `markdown-it.d.ts`

**第一次嘗試** — 建立 `src/markdown-it.d.ts` 來宣告子路徑模組：
```typescript
declare module 'markdown-it/lib/token' {
  interface Token { ... }
  export = Token;
}
```
**問題：**
1. `interface` 無法被 `export =` 搭配使用，需要 `class`
2. 模組之間的類型交叉引用（`StateBlock` 引用 `Token`）在模組宣告中無法解析
3. 與 `@types/markdown-it` 的主模組定義衝突
4. 即便加上 `declare module 'markdown-it'` 擴充，`tsc` 仍然無法正確合併這些宣告

**第二次嘗試** — 使用 `tsconfig.json` 的 `paths` 映射：
```json
"paths": {
  "markdown-it/lib/token": ["node_modules/@types/markdown-it/lib/token"]
}
```
**問題：** `@types/markdown-it` 本身並沒有為子路徑提供獨立的 `.d.ts` 檔案，這些路徑不存在。

### WHAT（最終正確解決方式）

在 `tsconfig.json` 中加入 `"markdown-it"` 到 `types` 陣列：
```json
"types": [
  "markdown-it",
  "node"
]
```

這樣 TypeScript 會自動載入 `@types/markdown-it` 的完整類型定義。

**但是**，子路徑 `import`（如 `import Token from 'markdown-it/lib/token'`）仍然需要模組宣告。

**最終方案** — 將子路徑 `import` 改為從主模組匯入類型，並移除子路徑 import：

```typescript
// ❌ 原本（無法解析類型）
import Token from 'markdown-it/lib/token';
import StateInline from 'markdown-it/lib/rules_inline/state_inline';
import StateBlock from 'markdown-it/lib/rules_block/state_block';

// ✅ 改為使用 any 避免類型問題（因為這些是內部 API）
// 在 markdown-it-mathjax3-plugin.ts 中：
// 移除 Token import，改用 any[] 替代
// 移除 StateInline/StateBlock import，改用 any 替代
```

實際上，刪除自建的 `markdown-it.d.ts` 後，`@types/markdown-it` 的主模組已經提供了 `Token`、`StateInline`、`StateBlock` 的類型。問題在於子路徑 `import` 語句本身無法被解析。

最終的實際解決方案是：**保留子路徑 import，但讓 `@types/markdown-it` 的 types 欄位處理類型載入**。pnpm + TS6 的組合在 `types` 欄位正確設定的情況下，能夠自動解析子路徑模組。

---

## 七、問題六：`Parameter 'req' implicitly has an 'any' type`

### 錯誤訊息
```
src/blogger-oauth2-client.ts(149,31): error TS7006: Parameter 'req' implicitly has an 'any' type.
src/blogger-oauth2-client.ts(149,36): error TS7006: Parameter 'res' implicitly has an 'any' type.
```

### WHY（根本原因）
`server.on('request', async (req, res) => { ... })` 中的 `req` 和 `res` 沒有明確類型註解。

在 TS5 中，如果 `http` 模組的類型被載入，TypeScript 可以從 `createServer()` 的回傳型推導出 `req`/`res` 的類型。但之前 `http` 模組無法載入（問題一），所以推導失敗。

### WHAT（解決方式）
問題一解決後（`types: ["node"]`），`createServer()` 回傳的 `Server` 類型已包含 `request` 事件的回呼參數類型定義，因此 `req`/`res` 的類型可以被自動推導，不再需要手動註解。

---

## 八、問題七：`markdown-it` 類型衝突（`StateBlock` 缺少屬性）

### 錯誤訊息
```
src/markdown-it-mathjax3-plugin.ts(30,52): error TS2345: Argument of type '(state: StateBlock, ...)' is not assignable to parameter of type 'RuleBlock'.
  Types of parameters 'state' and 'state' are incompatible.
    Type 'StateBlock' is missing the following properties from type 'StateBlock': tokens_meta, listLines
```

### WHY（根本原因）
`@types/markdown-it` 的 `StateBlock` 類型定義有兩個版本：
1. `dist/index.cjs.d.ts` 中定義的 `StateBlock`（完整版，包含 `tokens_meta`、`listLines` 等）
2. `index.d.ts` 中匯出的版本（可能因快取或載入順序導致不完整）

自建的 `markdown-it.d.ts` 中的 `declare module 'markdown-it'` 與 `@types/markdown-it` 的主模組宣告衝突，導致 TypeScript 合併了不完整的定義。

### WHAT（解決方式）
刪除自建的 `src/markdown-it.d.ts`，讓 TypeScript 只使用 `@types/markdown-it` 的官方定義。

---

## 九、變更摘要

### `tsconfig.json` 變更
```diff
   "compilerOptions": {
     ...
+    "types": [
+      "markdown-it",
+      "node"
+    ]
   }
```

### `src/oauth2-client.ts` 變更
```diff
-  return base64Url(arr);
+  return base64Url(arr.buffer);

-  return buf;
+  return buf.buffer;
```

### `src/types.ts` 變更
```diff
-  const body: ArrayBuffer[] = [];
+  const body: (Uint8Array | ArrayBuffer)[] = [];

-  body.push(media.content);
+  body.push(new Uint8Array(media.content));
```

### 新增檔案
- `AGENTS.md` — Agent 執行規範

### 刪除檔案
- `src/markdown-it.d.ts` — 與 `@types/markdown-it` 衝突的自建宣告檔

---

## 十、經驗教訓

1. **TS6 的 `types` 欄位更嚴格** — 必須明確列出需要的全域類型（如 `node`），不能依賴自動探索
2. **`lib` 欄位決定可用的全域 API** — 使用 `Object.fromEntries`、`Object.entries` 等需要對應的 `lib` 版本
3. **不要輕易覆蓋第三方類型宣告** — `declare module` 與 `@types` 套件可能產生衝突，優先使用套件提供的類型
4. **子路徑 import 的類型解析** — 某些套件不為子路徑提供獨立 `.d.ts`，需要確認 `@types` 套件是否支援
5. **`Uint8Array` ≠ `ArrayBuffer`** — 在嚴格類型檢查下，這兩者不能互換，需要明確轉換