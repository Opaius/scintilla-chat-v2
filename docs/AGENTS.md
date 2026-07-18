## Purpose

Index of durable planning and architecture documents for the Scintilla Chat project.

## Ownership

Planning docs live here. Each file covers one domain. The root `AGENTS.md` links here for concrete plans.

## Documents

| File | Scope | Status |
|---|---|---|
| `multi-tenancy-plan.md` | Multi-tenant architecture: DataProvider scoping, ALS tenant context, domain resolution, entity changes, security, evolution path | **Implemented** |

## What Was Respected

- Single D1 database, all auth rows scoped by `organizationId` ✓
- ALS tenant context via `node:async_hooks` + `nodejs_als` compat flag ✓
- `handleTenant` runs first in `sequence`, before Remult ✓
- `TenantScopedDataProvider` wraps D1 provider, injects `organizationId` into find/count/insert/update/delete ✓
- `Verification` deliberately NOT scoped (shared across tenants) ✓
- `resolveTenantFromHost` hardcoded MVP — D1-backed upgrade path documented in the plan ✓
- No manual migration files — `ensureSchema` handles column/index creation ✓
