## Purpose

SvelteKit frontend (Cloudflare Workers mode via `@sveltejs/adapter-cloudflare` v7). Remult **client** only — no Remult server, no Durable Objects, no auth server.

## Ownership

Client app. Talks to `apps/backend` (the Remult + DO + Better Auth worker).

## Local Contracts

- Realtime (browser): connects directly to the backend worker WebSocket at `wss://<PUBLIC_BACKEND_WS_HOST>/party/remult`.
- SSR / server-side data + remote functions: use the `BACKEND` service binding (`env.BACKEND.fetch(request)`) — no HTTP round-trip.
- `app.d.ts` declares `Platform.env`: `BACKEND: Fetcher`, `PUBLIC_BACKEND_WS_HOST?: string`, `ASSETS`.
- Remult entities come from `@scintilla/shared`; realtime client from `@scintilla/realtime`.

## Work Guidance

- Never import `$lib/server/realtime`, `$lib/realtime`, or `$lib/entities` — use the `@scintilla/*` packages.
- `vite.config.ts` must NOT use `cloudflareDoExporter` or the entity decorator plugin (entities are pre-compiled in `@scintilla/shared`).
- `bun run check` = `svelte-kit sync && svelte-check`.

## Verification

- `bun run check` (svelte-check) clean.
- `bun run build` (vite + adapter-cloudflare) succeeds.

## Child DOX Index

None yet.
