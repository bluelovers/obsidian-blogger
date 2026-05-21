# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build System

- **Dev** (no type-check): `pnpm run dev` — runs `node esbuild.config.mjs` only
- **Build** (with type-check): `pnpm run build` — runs `tsc -noEmit -skipLibCheck` then `node esbuild.config.mjs production`
- **No test command exists** — there is no test infrastructure (no Jest config, no test files, no test deps). The `package.json` "test" field does not exist.
- **No lint script** — `.eslintrc` and `.prettierrc` exist but `package.json` has no `lint` or `format` script. Run `npx eslint src/` and `npx prettier --write src/` manually.

## Architecture

- **Obsidian Plugin** — all source lives under `src/`, entry is `src/main.ts` which exports `BloggerPlugin extends Plugin`.
- **Global singleton pattern** — four module-level accessors used across the codebase instead of dependency injection:
  - `getGlobalI18n()` — from `src/i18n/i18n.ts`
  - `t()` — from `src/utils/i18n-utils.ts` (shortcut wrapping `getGlobalI18n().t()`)
  - `getGlobalMarkdownParser()` — from `src/utils/markdown/markdown-it-default.ts`
  - `getBloggerClient()` — from `src/blogger-client.ts`
- **Settings** live in `src/plugin-settings.ts`. `DEFAULT_SETTINGS` is the base; `upgradeSettings()` returns `{ needUpgrade, settings }` but currently always returns `needUpgrade: false` (stub for future migrations).
- **OAuth2 has two code paths** — desktop (`reauthorizeGoogleTokenOnLocalHost`, uses `createServer` on 127.0.0.1) and web (`reauthorizeGoogleTokenOnWeb`, uses `privet-kitty.github.io` proxy). Selection is via `Platform.isMobile` in `main.ts`.
- **`IObsidianContext`** (`src/utils/obsidian/obsidian-context.ts`) — central context object built by `createObsidianContextMain()`. Always carries a `plugin: BloggerPlugin` reference in production; test environments may omit it. Components with `ctx` should use `ctx.plugin` instead of threading callbacks through constructor chains.
- **Dashboard view** — two view classes registered in `main.ts`:
  - `BloggerDashboardView` (`BLOGGER_DASHBOARD_VIEW_TYPE`) — Obsidian standard view leaf, registered via `registerView()`
  - `BloggerBasesView` (`BLOGGER_BASES_VIEW_TYPE`) — Obsidian Bases system view, registered via `registerBasesView()`
  - Leaf lifecycle is managed by `BloggerPlugin._ensureDashboardView(action)` (`EnumDashboardAction.Init | Activate | Toggle`)

## Shared Utilities (src/utils/)

The following shared utility modules were extracted during refactoring to eliminate duplication:

| File | Exports | Purpose |
|------|---------|---------|
| `src/utils/blogger-status-utils.ts` | `getArticleStatusInfo()`, `STATUS_BADGE_STYLE_MAP`, `applyStatusBadgeStyle()` | Post status lookup + badge inline-style application |
| `src/utils/date-utils.ts` | `formatDate()` | ISO date string → human-readable format |
| `src/utils/i18n-utils.ts` | `t()` | Global shortcut for `getGlobalI18n().t(key, vars)` |

Use these instead of duplicating inline logic in view files or other consumers.

## Refactoring Principles

- **低階工具函數不應複雜化** — 工具函數應保持最小依賴簽章，不要為了統一而強制改為接受 `ctx: IObsidianContext`。例如：
  - `getActiveFile(app: App)` 只需 `App`，不需要 `ctx`
  - `loadSettingsFromObsidianPlugin(plugin: Pick<Plugin, 'loadData'>)` 只需 `plugin`，名稱已表明意圖
  - `processFile(file: TFile, app: App)` 只需 `App`，不需要 `ctx`
  - **判斷標準**：函數是否僅使用 `ctx.app` 或 `ctx.plugin` 中單一職責的 API？如果是，應直接接受該最小依賴，而非整個 `ctx`。
  - **例外**：Obsidian API 的子類別（`Modal`、`PluginSettingTab`）由於框架限制不得不傳入 `app`，此為可接受的例外。
- **提取重複 catch 區塊** — 當 `catch (error) { if (error instanceof Error) return ctx.showError(error); else throw error; }` 模式出現兩次以上，應提取為 `_handleError()` 方法（參考 `abstract-blogger-client.ts`）。
- **不要為了封裝而犧牲型別安全** — 如果一個 `protected` 方法需要從外部類別（如 `BloggerSettingTab`）呼叫，直接改為 `public`，避免 `(this.ctx.plugin as any).xxx()` 的型別不安全模式。

## Non-Obvious Patterns

- **`Brand<K, T>` type** in `src/types/types.ts` — branded type used to distinguish `IFreshInternalOAuth2Token` from expired `IInternalOAuth2Token`. The `isFreshInternalOAuth2Token` guard checks `expiresAt > Date.now()`.
- **`FormItems` class** in `src/types/types.ts` — builds `multipart/form-data` as `ArrayBuffer`. Uses private field `#formData` and overloaded `append()` (string vs `IMedia`). Call `.toArrayBuffer()` to get the final payload.
- **`showError()` in `src/utils/obsidian/obsidian-context.ts`** — displays an Obsidian `Notice` and returns a `IBloggerClientResult` error object. Do NOT throw after calling it.
- **`doClientPublish()` in `src/main.ts`** — throws `Error` when profile is not found, which is inconsistent with the `showError()` pattern used elsewhere. This is a known rough edge.
- **`processFile()` in `src/utils/obsidian/obsidian-utils.ts`** — strips YAML frontmatter via `FRONT_MATTER_REGEX` (`/^---[\s\S]+?---/`) rather than using Obsidian's frontmatter API. This means non-standard frontmatter delimiters could break it. The same regex is shared via `stripFrontMatter()` used by `obsidian-file-context.ts`.
- **`EnumPostStatus`** in `src/types/const.ts` — accepts `Draft | Live | Scheduled | SoftTrashed`. `IBloggerPostParams.status` only accepts `'draft'` or `'live'`, but the enum includes additional states for internal tracking.
- **`enableSmartPreCheck`** in `IPluginSettings` (default `false`) — when enabled, `BloggerCoreApiClient.publish()` queries current post status via GET before updating. Decides operation order: LIVE→DRAFT reverts first then PATCH; DRAFT→LIVE PATCHes first then publishes. The toggle appears both in settings tab and publish modal (only for existing posts), synced via the same `settings` reference. Publish modal uses `ctx.plugin.saveSettings()` to persist.
- **`EnumDashboardAction`** in `src/types/const.ts` — used by `BloggerPlugin._ensureDashboardView()`. Three actions: `Init` (create if absent), `Activate` (reveal or create), `Toggle` (enable/disable based on settings).
- **`_publishWithDefault()` in `BloggerPlugin`** — shared implementation for both `defaultPublish` and `mcpPublish` commands. The two commands differ only in their Obsidian callback type (`editorCallback` vs `callback`).
- **`_handleError()` in `AbstractBloggerClient`** — extracted to avoid duplicating the `error instanceof Error` guard + `showError` pattern in multiple catch blocks.

## Source File Map

| File | Purpose |
|------|---------|
| `src/main.ts` | Plugin entry, commands, settings lifecycle, Leaf management (`_ensureDashboardView`), default publish (`_publishWithDefault`) |
| `src/blogger-client.ts` | Core publishing logic, `getBloggerClient()` factory, `BloggerRestClient` class, `handleBloggerClientOptions()` validator |
| `src/types/blogger-client-interface.ts` | `EnumPostStatus` values in docs, `IBloggerPostParams`, `IBloggerClientResult`, `IBloggerPublishResult` types |
| `src/blogger-oauth2-client.ts` | OAuth2 desktop + web flows, `MobileOAuth2Helper` |
| `src/client/blogger/oauth2-client.ts` | `OAuth2Client` class, token refresh, code verifier/challenge |
| `src/plugin-settings.ts` | `IPluginSettings` type, `DEFAULT_SETTINGS`, `isPluginSettingsWithOAuth2()` type guard, `upgradeSettings()` |
| `src/types/types.ts` | `ISafeAny`, `IBrand`, `IMedia`, `FormItems`, `isMedia()`, `IMatterData` |
| `src/types/const.ts` | `EnumPostStatus`, `EnumDashboardAction`, `EnumBloggerClientReturnCode`, `EnumMathJaxOutputType`, `EnumConfirmCode`, `EnumSettingsVersion`, `EnumobsidianBloggerTags`, `EnumLanguageIDAll` |
| `src/consts.ts` | All OAuth2 endpoints, `BLOGGER_API_ENDPOINT`, `ERROR_NOTICE_TIMEOUT` |
| `src/utils.ts` | URL generation helpers (`generateLink`, `generateQueryString`) |
| `src/utils/obsidian/obsidian-context.ts` | `IObsidianContext`, `createObsidianContext()`, `showError()` context factory |
| `src/utils/obsidian/obsidian-context-main.ts` | `createObsidianContextMain()` production context builder, always provides `plugin` |
| `src/utils/obsidian/obsidian-utils.ts` | `processFile()`, `stripFrontMatter()`, `FRONT_MATTER_REGEX` |
| `src/utils/obsidian/obsidian-file-context.ts` | `createFileContext()`, `IFileContext`, lazy frontmatter + content reader |
| `src/utils/obsidian/obsidian-frontmatter-context.ts` | `createFrontmatterContext()`, frontmatter read/write/update with MetdataCache fallback |
| `src/utils/blogger-status-utils.ts` | `getArticleStatusInfo()`, `STATUS_BADGE_STYLE_MAP`, `applyStatusBadgeStyle()` |
| `src/utils/date-utils.ts` | `formatDate()` ISO → human-readable |
| `src/utils/i18n-utils.ts` | `t()` global translation shortcut |
| `src/utils/obsidian/icons.ts` | SVG icon registration (`blogger-logo`, refresh, etc.) |
| `src/i18n/i18n.ts` | Translation function, `getGlobalI18n()`, `setGlobalLang()` |
| `src/i18n/langs/` | Translation key type definitions |
| `src/utils/markdown/markdown-it-default.ts` | Markdown parser setup with plugins, `getGlobalMarkdownParser()` |
| `src/utils/markdown/markdown-it-mathjax3-plugin.ts` | MathJax v3 rendering plugin |
| `src/utils/markdown/markdown-it-image-plugin.ts` | Custom image handling in markdown |
| `src/client/obsidian/settings/setting-tab.ts` | Obsidian settings UI |
| `src/client/obsidian/view/blogger-dashboard-view.ts` | Dashboard view listing recent posts |
| `src/client/obsidian/view/blogger-bases-view.ts` | Bases view showing post status per file |
| `src/client/obsidian/modal/blogger-profile-chooser-modal.ts` | Profile selection modal |
| `src/client/obsidian/modal/blogger-profile-manage-modal.ts` | Profile CRUD management |
| `src/client/obsidian/modal/blogger-publish-modal.ts` | Publish confirmation & status toggle modal |
| `src/client/obsidian/modal/confirm-modal.ts` | Generic confirmation modal |
| `src/client/blogger/abstract-blogger-client.ts` | Abstract base: shared publish workflow, pre-checks, `_handleError()` |
| `src/client/blogger/blogger-core-api-client.ts` | Core Blogger API client (publish, update, status toggle) |
| `src/client/blogger/blogger-rest-client-google-o-auth2-context.ts` | OAuth2 context for REST client |
| `src/client/blogger/rest-client.ts` | Low-level HTTP REST client |
| `src/client/blogger/utils/url.ts` | URL construction helpers |
| `src/plugin/settings.ts` | `findDefaultProfile()`, `handleSettingsUpgrade()` |

## Gotchas

- `this.#settings` in `BloggerPlugin` is `PluginSettings | undefined` but accessed with `!` non-null assertion — will throw if accessed before `onload` completes.
- The `#settings` private field uses a getter that asserts non-null — always access via `this.settings` (the getter), never `this.#settings` directly.
- `BloggerPlugin._ensureDashboardView()` is `public` — it is deliberately not `protected` because `BloggerSettingTab` (which does not extend `BloggerPlugin`) needs to call it. Do NOT revert to `protected` without updating the caller in `setting-tab.ts`.
- `esbuild.config.mjs` is an ESM module (`.mjs`), loaded via `node esbuild.config.mjs`, not `tsx`.

## references

- https://obsidian.md/zh-TW/help/developers
- https://docs.obsidian.md/Home
