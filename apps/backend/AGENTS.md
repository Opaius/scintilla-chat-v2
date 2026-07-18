## Purpose

Cloudflare Worker (Hono) hosting the Remult server, Better Auth, and the realtime Durable Objects. The single source of truth for data + auth.

## Ownership

Backend worker. Exposed to the frontend via the `BACKEND` service binding (SSR) and directly over HTTPS/WebSocket (browser realtime).

## Local Contracts

- Remult DO classes `RemultPartyRoom` + `RemultLiveQueryStorageRoom` are re-exported from `src/index.ts` (native export required by the Worker). DO classes live in `@scintilla/realtime/durable-object`.
- Wrangler config: `apps/backend/wrangler.toml` — bindings `REMULT_ROOM`, `REMULT_LIVEQUERY` (Durable Objects), `DB` (D1).
- Bindings are read inside `initRequest(req, …)` (Hono context gives `req.env`), not a module-level variable.
- Better Auth served at `/api/auth/*`; Remult API at `/api/*`; realtime WebSocket at `/party/remult`.

## Work Guidance

- `bun run build` = `wrangler deploy --dry-run` (verifies DO bindings resolve).
- `bun run dev` = `wrangler dev --port 8788`.
- Keep the DO class re-export at the bottom of `src/index.ts`.

## Verification

- `bun run build` (dry-run) resolves DO + D1 bindings with no warning.
- `bun run check` (biome) clean.
- `wrangler dev`: `GET /api/auth/get-session` reachable, `GET /api/user` enforces auth.

## Child DOX Index

None yet.
