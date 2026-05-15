# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build System

- **Dev** (no type-check): `pnpm run dev` — runs `node esbuild.config.mjs` only
- **Build** (with type-check): `pnpm run build` — runs `tsc -noEmit -skipLibCheck` then `node esbuild.config.mjs production`
- **No test command exists** — there is no test infrastructure (no Jest config, no test files, no test deps). The `package.json` "test" field does not exist.
- **No lint script** — `.eslintrc` and `.prettierrc` exist but `package.json` has no `lint` or `format` script. Run `npx eslint src/` and `npx prettier --write src/` manually.

## Architecture

- **Obsidian Plugin** — all source lives under `src/`, entry is `src/main.ts` which exports `BloggerPlugin extends Plugin`.
- **Global singleton pattern** — three module-level accessors used across the codebase instead of dependency injection:
  - `getGlobalI18n()` — from `src/i18n.ts`
  - `getGlobalMarkdownParser()` — from `src/markdown-it-default.ts`
  - `getBloggerClient()` — from `src/blogger-client.ts`
- **Settings** live in `src/plugin-settings.ts`. `DEFAULT_SETTINGS` is the base; `upgradeSettings()` returns `{ needUpgrade, settings }` but currently always returns `needUpgrade: false` (stub for future migrations).
- **OAuth2 has two code paths** — desktop (`reauthorizeGoogleTokenOnLocalHost`, uses `createServer` on 127.0.0.1) and web (`reauthorizeGoogleTokenOnWeb`, uses `privet-kitty.github.io` proxy). Selection is via `Platform.isMobile` in `main.ts` line 61.

## Non-Obvious Patterns

- **`Brand<K, T>` type** in `src/types.ts` — branded type used to distinguish `FreshInternalOAuth2Token` from expired `InternalOAuth2Token`. The `isFreshInternalOAuth2Token` guard checks `expiresAt > Date.now()`.
- **`FormItems` class** in `src/types.ts` — builds `multipart/form-data` as `ArrayBuffer`. Uses private field `#formData` and overloaded `append()` (string vs `Media`). Call `.toArrayBuffer()` to get the final payload.
- **`showError()` in `src/utils.ts`** — displays an Obsidian `Notice` and returns a `BloggerClientResult` error object. Do NOT throw after calling it.
- **`doClientPublish()` in `src/main.ts`** — throws `Error` when profile is not found (line 41), which is inconsistent with the `showError()` pattern used elsewhere. This is a known rough edge.
- **`processFile()` in `src/utils.ts`** — strips YAML frontmatter via regex (`/^---[\s\S]+?---/`) rather than using Obsidian's frontmatter API. This means non-standard frontmatter delimiters could break it.
- **`BloggerPostParams`** — `status` accepts only `'draft'` or `'live'` (from `EnumPostStatus` enum in `blogger-client-interface.ts`). Labels is always `[]` in the default publish command.

## Source File Map

| File | Purpose |
|------|---------|
| `src/main.ts` | Plugin entry, commands, settings lifecycle |
| `src/blogger-client.ts` | Core publishing logic, `getBloggerClient()` singleton |
| `src/blogger-client-interface.ts` | `EnumPostStatus` enum, `BloggerPostParams`, `BloggerClientResult` types |
| `src/blogger-oauth2-client.ts` | OAuth2 desktop + web flows, `MobileOAuth2Helper` |
| `src/oauth2-client.ts` | `OAuth2Client` class, token refresh, code verifier/challenge |
| `src/plugin-settings.ts` | `PluginSettings` type, `DEFAULT_SETTINGS`, `upgradeSettings()` |
| `src/types.ts` | `SafeAny`, `Brand`, `Media`, `FormItems`, `isMedia()` |
| `src/utils.ts` | `showError()`, `processFile()`, `openWithBrowser()`, `getBoundary()` |
| `src/consts.ts` | All OAuth2 endpoints, `BLOGGER_API_ENDPOINT`, `ERROR_NOTICE_TIMEOUT` |
| `src/i18n.ts` | Translation function, `setGlobalLang()` |
| `src/markdown-it-default.ts` | Markdown parser setup with plugins |
| `src/markdown-it-mathjax3-plugin.ts` | MathJax v3 rendering plugin |
| `src/markdown-it-image-plugin.ts` | Custom image handling in markdown |
| `src/setting-tab.ts` | Obsidian settings UI |
| `src/blogger-profile*.ts` | Profile chooser, manage, and modal UIs |
| `src/blogger-publish-modal.ts` | Publish confirmation modal |
| `src/confirm-modal.ts` | Generic confirmation modal |
| `src/icons.ts` | SVG icon registration |

## Gotchas

- `this.#settings` in `BloggerPlugin` is `PluginSettings | undefined` but accessed with `!` non-null assertion (line 49 of `main.ts`) — will throw if accessed before `onload` completes.
- The `#settings` private field uses a getter that asserts non-null — always access via `this.settings` (the getter), never `this.#settings` directly.
- `esbuild.config.mjs` is an ESM module (`.mjs`), loaded via `node esbuild.config.mjs`, not `tsx`.
