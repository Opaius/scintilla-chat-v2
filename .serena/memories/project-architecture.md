# Scintilla Chat — Architecture

## Stack
- SvelteKit (Cloudflare adapter)
- Remult (ORM/API framework)
- Better Auth (authentication)
- D1 (Cloudflare SQLite)

## Server Config
- `src/lib/server/api.ts` — Remult API with D1. `ensureSchema: false` at init (D1 not available module-scoped). `initRequest` creates `createD1DataProvider(db)`, sets it on `remult.dataProvider`, calls `ensureSchema` once (promise-guarded for concurrent requests). Shares provider with Better Auth via `setProvider()`.
- `src/lib/server/auth.ts` — Better Auth with email/password. Uses `remultAdapter` with a deferred `Promise<DataProvider>` from `data-provider.ts`.
- `src/lib/server/data-provider.ts` — Exports `dataProvider` (Promise) and `setProvider(dp)` to resolve it once D1 is created.
- `src/hooks.server.ts` — Just re-exports `api` as the handle.

## Key Patterns
- D1 binding (`event.platform.env.DB`) only available during requests, so dataProvider is set per-request in `initRequest`
- Module-level `provider` variable + `schemaEnsurePromise` guard prevent re-creating D1 provider or re-running ensureSchema
- `ensureSchema: false` prevents Remult from calling it at module init (when D1 unavailable)
- Adding entities to the `entities` array in `api.ts` is the only registration needed — schema auto-creates
