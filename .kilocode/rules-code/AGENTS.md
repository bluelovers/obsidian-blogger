# Project Coding Rules (Non-Obvious Only)

## Critical Patterns

- `showError()` in `src/utils.ts` returns a `IBloggerClientResult` error — do NOT throw after calling it
- `doClientPublish()` in `src/main.ts` (line 41) throws `Error` directly — this is a known inconsistency with the `showError()` pattern used everywhere else
- `this.#settings` is `PluginSettings | undefined` — always access via `this.settings` (the getter with `!` assertion), never `this.#settings` directly, or it will throw before `onload` completes
- `processFile()` in `src/utils.ts` strips YAML frontmatter via regex (`/^---[\s\S]+?---/`) instead of Obsidian's frontmatter API — non-standard delimiters will break it

## Architecture Patterns

- Three global singletons replace dependency injection: `getGlobalI18n()` (`src/i18n.ts`), `getGlobalMarkdownParser()` (`src/markdown-it-default.ts`), `getBloggerClient()` (`src/blogger-client.ts`)
- `Brand<K, T>` type in `src/types.ts` distinguishes `IFreshInternalOAuth2Token` from expired tokens; the `isFreshInternalOAuth2Token` guard checks `expiresAt > Date.now()`
- `FormItems` class in `src/types.ts` builds `multipart/form-data` as `ArrayBuffer` — call `.toArrayBuffer()` for the final payload

## OAuth2 Flow

- Two code paths selected by `Platform.isMobile` (line 61 of `src/main.ts`):
  - Desktop: `reauthorizeGoogleTokenOnLocalHost` — creates HTTP server on `127.0.0.1`
  - Web: `reauthorizeGoogleTokenOnWeb` — uses `privet-kitty.github.io` proxy
- `BloggerPostParams.status` only accepts `'draft'` or `'live'` (from `EnumPostStatus` enum in `src/blogger-client-interface.ts`)
- Labels is always `[]` in the default publish command

## Build & Tooling

- `esbuild.config.mjs` is an ESM module — load via `node esbuild.config.mjs`, NOT `tsx`
- No test infrastructure exists — no Jest config, no test files, no test deps in `package.json`
- No lint or format scripts in `package.json` — run `npx eslint src/` and `npx prettier --write src/` manually
- Build runs `tsc -noEmit -skipLibCheck` first, then `node esbuild.config.mjs production`

## Settings

- `upgradeSettings()` in `src/plugin-settings.ts` is a stub — always returns `needUpgrade: false`
- `DEFAULT_SETTINGS` is defined in `src/plugin-settings.ts`; all settings are optional via `Partial<Oauth2ClientCredentials>` intersection
