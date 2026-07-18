import { AsyncLocalStorage } from 'node:async_hooks'

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
