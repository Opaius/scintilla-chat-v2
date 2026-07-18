## Purpose

Multi-tenant data isolation per request, applied at the Remult `DataProvider` layer. Every query for `user`, `session`, `account` is transparently scoped by `organizationId`.

## Ownership

- `context.ts` — `TenantContext` interface (`organizationId`, `domain`), `AsyncLocalStorage` from `node:async_hooks`. Set once per request by `handleTenant` in `hooks.server.ts`
- `domain-resolver.ts` — `resolveTenantFromHost(host)` maps request hostnames to `TenantContext`. MVP: hardcoded map, future: D1-backed
- `scoped-dp.ts` — `TenantScopedDataProvider` wraps Remult D1 `DataProvider`, injects `organizationId` into queries for scoped tables

## Local Contracts

- `handleTenant` runs FIRST in hooks `sequence` (before Remult) so both Remult routes and BetterAuth handler inherit the tenant context
- `handleTenant` does NOT initialize D1 — only sets ALS context. D1 init stays in Remult's `initRequest`
- Scoped tables: `user`, `session`, `account`. `Verification` is NOT scoped (shared across tenants)
- Transactions are wrapped recursively so scoping applies inside them too

## Work Guidance

- To add a scoped table: add it to the entity check in `scoped-dp.ts` and add `organizationId` field to the entity
- To move from hardcoded domain map to D1-backed: update `domain-resolver.ts` only — context and scoping are unaffected

## Verification

`bun run check`
