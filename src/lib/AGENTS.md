## Purpose

Remult + Better Auth integration: entities, server API, D1 database, multi-tenant scoping, Svelte 5 reactivity.

## Ownership

- `entities/` — Remult entity definitions (User, Session, Account, Verification, Test)
- `server/api.ts` — Remult API entry point
- `server/auth/` — BetterAuth instance config + deferred DataProvider
- `server/tenant/` — Tenant context (ALS), scoped DataProvider, domain resolver
- `index.ts` — re-exports

## Local Contracts

- `index.ts` re-exports only stable public symbols; internal server modules are not re-exported
- Entity key names must match Better Auth schema table names (`user`, `session`, `account`, `verification`)

## Work Guidance

- Register new entities in `server/api.ts` `remultApi({ entities: [...] })`
- Regenerate auth entities after Better Auth plugin changes: `bunx better-auth generate --config src/lib/server/auth/config --output src/lib/entities/auth.ts`
- `BETTER_AUTH_URL` env var sets the base URL

## Verification

`bun run check` — svelte-check + tsc + biome + fallow (advisory)

## Child DOX Index

### server/auth/
| Child | Scope |
|---|---|
| `server/auth/AGENTS.md` | BetterAuth config, deferred DataProvider |

### server/tenant/
| Child | Scope |
|---|---|
| `server/tenant/AGENTS.md` | Tenant context, scoped DataProvider, domain resolver |

### realtime/
| Child | Scope |
|---|---|
| `realtime/` | Client WS pool + universal room resolver (browser-safe) |

### server/realtime/
| Child | Scope |
|---|---|
| `server/realtime/AGENTS.md` | Server broadcaster, DO-backed live-query storage, Durable Object rooms |
