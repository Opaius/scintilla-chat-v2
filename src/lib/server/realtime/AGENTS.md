## Purpose

Realtime sync engine for Remult, vendored from `remult-partykit` and adapted to this
project's multi-tenant paradigm. Client WebSocket pool + server broadcaster + Cloudflare
Durable Object rooms, with a DO-backed cross-isolate live-query storage.

## Ownership

- `src/lib/realtime/` — client-safe + shared: `client.ts` (WS pool), `rooms.ts`
  (universal room resolver), `channel.ts` (wire protocol). Importable from the browser.
- `server.ts` — `RemultPartySubscriptionServer` (Remult `SubscriptionServer`); safe in the
  Node build, forwards entity changes to the DO room over HTTP.
- `storage.ts` — `DurableObjectLiveQueryStorage` (Remult `LiveQueryStorage`); backs the
  registry in a single global DO so live queries survive across isolates.
- `durable-object.ts` — `RemultPartyRoom` + `RemultLiveQueryStorageRoom`. Cloudflare-only;
  imported solely by the worker entry, never by the SvelteKit build.

## Deployment

- Durable Object classes MUST be exported from the single Cloudflare Worker entry
  (`.svelte-kit/cloudflare/_worker.js`) so workerd stops warning
  "no such Durable Object class is exported from the worker."
- Injection is handled by the `sveltekit-cloudflare-durable-objects` Vite plugin in
  `vite.config.ts` (`cloudflareDoExporter({ durableObjects: ['src/lib/server/realtime/durable-object.ts'] })`).
  It appends `export * from '…/durable-object.ts'` to `_worker.js` after `vite build`
  (idempotent, guarded by a marker comment). The `package.json` `build` script is plain
  `vite build` — do NOT re-add a manual post-build inject step.
- The plugin is **build-only**: it skips `vite dev`. Therefore `bun dev` (workerd) warns
  that the DO classes are not exported and realtime DO features do NOT work there. This is
  a known Cloudflare limitation for DOs defined in the main worker entry; local realtime
  dev via `vite dev` would require a separate Worker (the `script_name`/realtime-worker
  pattern), which was deliberately not adopted.
- Local realtime dev (single worker): `bun run dev:cf` runs `vite build --watch` and serves
  the built worker under real workerd via `wrangler dev` (see `scripts/dev-cf.mjs`). Because
  the build output already has the injected DO exports, the DO bindings resolve locally with
  no warning. Use this (not `bun dev`) when exercising realtime/WebSocket behavior.

## Local Contracts

- Room = tenant boundary. `rooms.ts#resolveRoomId` returns `org:<organizationId>`; the
  proxy derives the room from the authenticated session before forwarding the socket, so a
  connection can only reach its own org's room (mirrors `tenant/scoped-dp.ts`).
- `resolveRoomId` is the single extension point for finer partitioning (per-entity/user);
  client and server wiring must not be touched when making it granular.
- `durable-object.ts` must NOT be imported from any SvelteKit-server or client module.

## Work Guidance

- Sharding (father/brother DOs) was intentionally dropped from the upstream source; add it
  back in `durable-object.ts` only if a single room's connection count is a bottleneck.
- `sql-parser.ts` and the upstream `Channel` class were dead code and are NOT vendored.

## Verification

`bun run check` — svelte-check + tsc + biome + fallow.
