## Purpose

BetterAuth instance configuration and D1 DataProvider bridge for the `@nerdfolio/remult-better-auth` adapter.

## Ownership

- `config.ts` — BetterAuth instance (email/password), wired via `remultAdapter`
- `data-provider.ts` — Deferred `DataProvider` promise: D1 not available at module init, so BetterAuth receives the provider via `setProvider()` once `initRequest` fires

## Local Contracts

- `setProvider(dp)` must be called in Remult's `initRequest` before any auth route can query the DB
- Do not initialize D1 at module load — only wire it via `setProvider()` at request time

## Work Guidance

- Adding a Better Auth plugin: update `config.ts`, then regenerate entities via `bunx better-auth generate`

## Verification

`bun run check`
