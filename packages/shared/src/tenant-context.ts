import { AsyncLocalStorage } from 'node:async_hooks'
import type { EntityFilter } from 'remult'

export interface TenantContext {
	organizationId: string
	domain: string
}

const asyncLocalStorage = new AsyncLocalStorage<TenantContext>()

export function getTenantContext(): TenantContext | undefined {
	return asyncLocalStorage.getStore()
}

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
	return asyncLocalStorage.run(context, fn)
}

export function requireTenantContext(): TenantContext {
	const ctx = getTenantContext()
	if (!ctx) throw new Error('No tenant context')
	return ctx
}

// Remult-native tenant scoping for org-scoped entities. Declared as each
// entity's `apiPrefilter`, so every API-layer query is isolated to the current
// tenant automatically. Server-side repo calls pass organizationId explicitly.
//
// Fails closed: without a tenant context an org-scoped query must NOT silently
// match every row. The backend middleware guarantees a context for every
// non-webhook request (header / ?room / session); webhooks set their own from
// the payload before touching the API.
export function orgApiPrefilter<T>(): EntityFilter<T> {
	const ctx = getTenantContext()
	if (!ctx) {
		throw new Error('Tenant context required for org-scoped query')
	}
	return { organizationId: ctx.organizationId } as EntityFilter<T>
}
