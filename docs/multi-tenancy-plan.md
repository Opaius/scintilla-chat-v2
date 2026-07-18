# Multi-Tenancy Plan — Scintilla Chat

## Architecture

```
Request → SvelteKit handle hook → runWithTenantContext → routing
                                                             │
                          ┌───────────────────────────────────┤
                          │                                   │
                    Remult API                          Better Auth
                 (initRequest, D1)                    (auth.handler)
                          │                                   │
                          └────────── D1 database ────────────┘
                                      (scoped at
                                   DataProvider layer)
```

Every database query for user/session/account is scoped by `organizationId`.
The tenant context is set once at the handle-hook level, **before routing**, so
both Remult API routes and Better Auth routes (`[...auth]/+server.ts`) inherit
it without any per-route wiring.

The scoping itself lives in a single wrapper around Remult's `DataProvider` —
one object that intercepts calls for the three scoped tables (`user`, `session`,
`account`) and injects `organizationId` into queries. This covers all callers
(Remult repos, Better Auth adapter queries) uniformly, without touching a
single adapter method.

---

## 2. Evolution Path — Solo → Teams → Multi-Business

The tenant model is built around the concept of an **organization** — the
business entity that owns a domain and contains users. This scales through
every phase without renaming.

| Phase | What it looks like | Organization concept |
|---|---|---|
| **MVP** — solo tarot reader | One user per org, hardcoded domain map | Sole practitioner = org of one |
| **Teams** — multi-reader tarot | Multiple users per org, team roles | Org with team hierarchy |
| **Multi-business** | Lawyers, coaches, consultants | Same org model, business-type metadata |

### Naming

The core tenant identifier is **`organizationId`** throughout:

| Layer | Field |
|---|---|
| ALS context (`TenantContext`) | `organizationId: string` |
| DB columns on `user`, `session`, `account` | `organizationId` |
| DataProvider filter injection | `{ organizationId }` |
| Domain-resolver return value | `TenantContext.organizationId` |

### Future extensions (plan-level only — YAGNI until code needs them)

```ts
// Phase 2 — teams: add teamId to User for intra-org grouping
// Phase 3 — business type: org metadata (tarot / legal / general)
```

---

## 3. Domain-to-Tenant Resolution

**File to create:** `src/lib/server/domain-tenant.ts`

Exports `resolveTenantFromHost(host: string): TenantContext | null`.

```
         host               →          TenantContext
  ──────────────────────────────────────────────────────────
  janed.tarot.com           →   { organizationId: "org_janed", domain: "janed.tarot.com" }
  bobreads.tarot.com        →   { organizationId: "org_bob",   domain: "bobreads.tarot.com" }
  localhost:5173            →   { organizationId: org from DEFAULT_TENANT_ID env or "dev", domain: "localhost:5173" }
```

For MVP the mapping is hardcoded (plain object, env var for local). Later it
lives in a D1 table with UI management.

---

## 4. Tenant Context (already exists — field rename only)

File: `src/lib/server/tenant-context.ts`

```ts
interface TenantContext {
  organizationId: string;
  domain: string;
}
```

- `getTenantContext()` → `TenantContext | undefined`
- `runWithTenantContext(ctx, fn)` → `T`
- `requireTenantContext()` → throws if missing

Already implemented. The only change is the field rename `tarotReaderId` → `organizationId`.

---

## 5. Hooks Wiring

**File: `src/hooks.server.ts`**

Add `handleTenant` before `handleRemult` in the sequence:

```ts
import { sequence } from '@sveltejs/kit/hooks';
import { api as handleRemult } from '$lib/server/api';
import { runWithTenantContext } from '$lib/server/tenant-context';
import { resolveTenantFromHost } from '$lib/server/domain-tenant';

async function handleTenant({ event, resolve }) {
  const host = event.request.headers.get('host') || 'localhost:5173';
  const tenant = resolveTenantFromHost(host);
  if (!tenant) {
    return new Response('Unknown tenant', { status: 404 });
  }
  return runWithTenantContext(tenant, () => resolve(event));
}

export const handle = sequence(handleTenant, handleRemult);
```

**Why first:** Better Auth's `auth.handler()` at `[...auth]/+server.ts` bypasses
Remult's `initRequest`. The handle-hook wrapper is the only place that runs
before ALL routes. It must be first so both Remult routes and Better Auth
routes inherit the tenant context.

**Critical:** `handleTenant` does NOT create the D1 provider or set
`remult.dataProvider`. It ONLY sets the ALS context. `handleRemult` still
handles D1 initialization.

---

## 6. Wrangler AsyncLocalStorage

**File: `wrangler.toml`**

```toml
compatibility_flags = ["nodejs_als"]
```

Enables `AsyncLocalStorage` from `node:async_hooks` on Cloudflare Workers.

---

## 7. DataProvider Scoping (the core piece)

**File to create:** `src/lib/server/tenant-scoped-dp.ts`

A single `DataProvider` wrapper that sits between Remult and D1. For the three
tenant-scoped tables (`user`, `session`, `account`), it transparently adds
`organizationId` filters to all queries and injects it on inserts. Everything
else passes through unchanged.

### `DataProvider` wrap

```ts
// DataProvider interface:
//   getEntityDataProvider(entity: EntityMetadata): EntityDataProvider
//   transaction(action): Promise<void>
//   ensureSchema?(entities): Promise<void>

class TenantScopedDataProvider implements DataProvider {
  private scopedTables = new Set(['user', 'session', 'account']);

  constructor(private inner: DataProvider) {}

  getEntityDataProvider(entity: EntityMetadata): EntityDataProvider {
    const inner = this.inner.getEntityDataProvider(entity);
    const table = entity.dbName;  // or entity.key — verify which maps to 'user'/'session'/'account'
    if (this.scopedTables.has(table)) {
      return new TenantScopedEDP(inner, table);
    }
    return inner;
  }

  transaction(action: (dp: DataProvider) => Promise<void>): Promise<void> {
    return this.inner.transaction((innerDp) =>
      action(new TenantScopedDataProvider(innerDp))
    );
  }

  ensureSchema?(entities: EntityMetadata[]): Promise<void> {
    return this.inner.ensureSchema!(entities);
  }
}
```

### `EntityDataProvider` wrap

```ts
// EntityDataProvider interface:
//   count(where): Promise<number>
//   find(options?): Promise<Array<any>>
//   groupBy(options?): Promise<any[]>
//   update(id, data, options?): Promise<any>
//   delete(id): Promise<void>
//   insert(data, options?): Promise<any>

class TenantScopedEDP implements EntityDataProvider {
  constructor(private inner: EntityDataProvider, private table: string) {}

  private tenantFilter(where?: Filter): Filter {
    const tenantId = getTenantContext()?.organizationId;
    if (!tenantId) return where ?? {};
    const tenantCond = { organizationId };
    return where ? { $and: [where, tenantCond] } : tenantCond;
  }

  // ── Where-based ops: inject tenant filter ──

  find(options?: EntityDataProviderFindOptions) {
    return this.inner.find({
      ...options,
      where: this.tenantFilter(options?.where),
    });
  }

  count(where?: Filter) {
    return this.inner.count(this.tenantFilter(where));
  }

  groupBy(options?: EntityDataProviderGroupByOptions) {
    return this.inner.groupBy({
      ...options,
      where: this.tenantFilter(options?.where),
    });
  }

  // ── ID-based ops: pre-check tenant ownership ──

  update(id: any, data: any, options?: InsertOrUpdateOptions) {
    const tenantId = getTenantContext()?.organizationId;
    if (tenantId) {
      // Verify the record belongs to this tenant before mutating
      return this.inner.find({ where: { id, organizationId: tenantId } }).then(
        (rows) => {
          if (!rows || rows.length === 0) {
            throw new Error(
              `Record not found in tenant ${tenantId} for ${this.table}#${id}`
            );
          }
          return this.inner.update(id, data, options);
        }
      );
    }
    return this.inner.update(id, data, options);
  }

  delete(id: any) {
    const tenantId = getTenantContext()?.organizationId;
    if (tenantId) {
      return this.inner.find({ where: { id, organizationId: tenantId } }).then(
        (rows) => {
          if (!rows || rows.length === 0) {
            throw new Error(
              `Record not found in tenant ${tenantId} for ${this.table}#${id}`
            );
          }
          return this.inner.delete(id);
        }
      );
    }
    return this.inner.delete(id);
  }

  // ── Insert: inject tenant ID ──

  insert(data: any, options?: InsertOrUpdateOptions) {
    const tenantId = getTenantContext()?.organizationId;
    if (!tenantId) return this.inner.insert(data, options);
    return this.inner.insert({ ...data, organizationId: tenantId }, options);
  }
}
```

### Simpler alternative for update/delete (avoids the pre-check SELECT)

If it turns out the pre-check adds measurable latency, replace the wrapper
approach for update/delete with a SQL-level intercept on `D1Client.execute`:

```ts
class TenantScopedD1Client implements D1Client {
  async execute(sql: string, params?: unknown[]) {
    const tenantId = getTenantContext()?.organizationId;
    if (!tenantId) return this.inner.execute(sql, params);
    // Rewrite: UPDATE user SET x=? WHERE id=? → UPDATE user SET x=? WHERE id=? AND organizationId=?
    // Same for DELETE ... WHERE id=?
    const updated = injectTenantWhere(sql, params, tenantId, this.scopedTables);
    return this.inner.execute(updated.sql, updated.params);
  }
}
```

But SQL rewriting is fragile (edge cases with subqueries, joins, compound
statements). Start with the pre-check; it's one extra SELECT per mutation call,
and auth operations are not high-frequency.

### Wiring into `initRequest`

In `api.ts`, wrap the D1 data provider before assigning it:

```ts
initRequest: async (event: RequestEvent) => {
  const db = event.platform?.env?.DB;
  if (!db) throw new Error('D1 binding (DB) not found');

  const rawProvider = createD1DataProvider(db);
  const provider = new TenantScopedDataProvider(rawProvider);
  remult.dataProvider = provider;
  setProvider(provider);
  // ... ensureSchema as before
},
```

No changes to `remult-ba.ts` at all. No `getTenantId` option needed. The
adapter stays a plain passthrough.

---

## 8. Better Auth Config

**File: `src/lib/server/auth.ts`**

No changes needed. The adapter no longer needs `getTenantId`. The DataProvider
wrapper handles scoping transparently.

```ts
export const auth = betterAuth({
  database: remultAdapter({
    authEntities: { User, Session, Account, Verification },
    dataProvider: import('$lib/server/data-provider').then(m => m.dataProvider),
  }),
  // ...
});
```

---

## 9. Entity Changes

**File: `src/lib/entities/auth.ts`**

### User entity

| Change | Reason |
|---|---|
| Remove `Validators.unique()` from `email` | Global uniqueness breaks per-tenant emails |
| Keep `Validators.email()` on `email` | Still validates email format |
| Add `@Fields.string()` `organizationId` | Tenant FK field |

@Fields.string({ required: true, validate: [Validators.email()], includeInApi: false })
email = ''

@Fields.string({ required: true, includeInApi: false })
organizationId = ''

### Account entity

Add `organizationId`:

```ts
@Fields.string({ required: true })
organizationId = ''
```

### Verification entity

No changes — verification is UUID-token scoped, not tenant-scoped.

No separate migration file needed. Remult's `ensureSchema` in `initRequest`
creates columns and indexes from the entity decorators automatically. The
composite unique index and lookup indexes are expressed through Remult
decorators and entity configuration — no raw SQL to maintain.

---

## 10. OAuth Flow

OAuth goes through the same adapter/DataProvider methods, scoped automatically:

```
1. User clicks "Sign in with Google" on janed.tarot.com
2. Google redirects back to janed.tarot.com/api/auth/callback/google
3. Better Auth gets the email from Google
4. Better Auth calls findUserByEmail(googleEmail)
5. Adapter → repository → DataProvider.find()
   → TenantScopedEDP adds { organizationId: 'org_janed' }
   → Query: SELECT * FROM user WHERE email = ? AND organizationId = ?
6. a) Found → link account to existing user
   b) Not found → createUser() → DataProvider.insert()
      → TenantScopedEDP injects organizationId into the row
```

**OAuth callback URLs are domain-scoped.** Each organization's domain
registers its own OAuth provider callback URL (or one app with multiple
callback URLs). This is an OAuth provider setup detail, not code.

leak to `bobreads.tarot.com`.

---

## 11. Security


| Threat | Mitigation |
|---|---|
| Missing tenant context | `getTenantContext()` returns `undefined` → scoping skips → platform mode. Non-platform requests get 404 in the handle hook |
| Cross-tenant via Remult API | Every `find`/`count`/`groupBy` has `organizationId` injected. `update`/`delete` pre-check ownership via a scoped `find` first |
| Cross-tenant via Better Auth | Same DataProvider covers Better Auth queries too — uniform enforcement |
| Race condition on sign-up | Better Auth's `findUserByEmail` + DataProvider scoping prevents same-tenant dupes. Composite unique index `(organizationId, email)` catches race |
| User forges `organizationId` | Field is `includeInApi: false` on User, not exposed via Remult API. When set, it comes only from the DataProvider wrapper, which reads from un-forgeable ALS context |
| Platform admin (future) | Route sets no tenant context → `getTenantContext()` returns `undefined` → no scoping. Requires admin role check |

---

## 12. Performance

- **AsyncLocalStorage:** `O(1)`, negligible.
- **`organizationId` on queries:** Adds `WHERE organizationId = ?` to every
  user/session/account query. Indexed, so fast.
- **Pre-check on update/delete:** One extra indexed `SELECT` per mutation.
  Auth operations are < 10/request, fine.
- **Recommended indexes:**
  - `user`: `(organizationId, email)` — covers `findUserByEmail` scoped
  - `session`: `(organizationId, token)` — covers session lookup
  - `account`: `(organizationId, providerId, accountId)` — covers OAuth linking

---

## 13. Implementation Steps (Ordered)

1. **Add `nodejs_als` to `wrangler.toml`**
2. **Create `src/lib/server/domain-tenant.ts`** — host → tenant context mapper
3. **Create `src/lib/server/tenant-scoped-dp.ts`** — the DataProvider wrapper
4. **Update `src/lib/server/api.ts`** — wrap D1 provider in `initRequest`
5. **Update `src/hooks.server.ts`** — add `handleTenant` before `handleRemult`
6. **Rename `tarotReaderId` → `organizationId`** in `src/lib/server/tenant-context.ts`
7. **Add `organizationId` to User/Session/Account entities** in `auth.ts`
8. **Remove `Validators.unique()` from email** in User entity
9. **Delete `tests/adapter-scoping.test.ts`** — old helper-based approach
10. **Update `tests/tenant-context.test.ts`** — rename field references
11. **Update AGENTS.md** to document multi-tenancy architecture
12. **Run type check** — zero errors
13. **Run tests** — all green
14. **Run `bun run build`** — zero errors

## 14. Edge Cases

- **Local dev without domain mapping:** Fall back to `DEFAULT_TENANT_ID` env
  var, or `"dev"` if unset. The handle hook wraps every request.
- **Existing users with no `organizationId`:** Fresh app, no production data.
  New migration handles it cleanly. If data exists later, backfill script.
- **Platform mode later:** Route handler skips setting tenant context →
  `getTenantContext()` returns `undefined` → `TenantScopedEDP` skips scoping.
  DataProvider wrapper handles this naturally.
- **Custom domain verification:** Future feature — DNS challenge before
  activating the tenant mapping. Outside this scope.
- **Remult `ensureSchema`:** The schema sync runs through the wrapper's
  `getEntityDataProvider`, so `organizationId` must exist on the Remult entity
  for the column to be created. The entity changes cover this.
- **Teams (Phase 2):** Add `teamId` to User. The `organizationId` scoping at
  the DataProvider layer stays the same — teams are an inner dimension.
- **Multi-business (Phase 3):** Organization metadata gains a `businessType`
  field. No structural changes needed — the tenant model is already generic.
