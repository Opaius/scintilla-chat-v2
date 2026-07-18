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
export function orgApiPrefilter<T>(): EntityFilter<T> {
	const org = getTenantContext()?.organizationId
	return (org ? { organizationId: org } : {}) as EntityFilter<T>
}
