import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { remult } from 'remult'
import { getTenantContext, runWithTenantContext } from '$lib/server/tenant/context'
import { resolveTenantFromHost } from '$lib/server/tenant/domain-resolver'

// ponytail: dev-only tenant fallback. The real multi-tenancy flow
// (plans → pricing → payment → domains → per-reader login) is deferred;
// on localhost / 127.0.0.1 we synthesize one dev tenant so SSR pages
// render locally. Remove once the tenant flow is wired (prod host paths
// are unaffected — they still go through resolveTenantFromHost).
const DEV_TENANT = { organizationId: 'dev', domain: 'localhost' }

const handleTenant: Handle = async ({ event, resolve }) => {
	const host = event.request.headers.get('host') || 'localhost:5173'
	const isDevHost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
	const tenant = isDevHost ? DEV_TENANT : resolveTenantFromHost(host)
	if (!tenant) {
		return new Response('Unknown tenant', { status: 404 })
	}
	return runWithTenantContext(tenant, () => resolve(event))
}

// Frontend is a Remult *client*: SSR data calls + remote functions proxy to the
// backend worker through the `BACKEND` service binding. The browser uses the
// backend URL directly (configured in `$lib/remult-realtime`).
const handleRemult: Handle = async ({ event, resolve }) => {
	const env = event.platform?.env as
		| { BACKEND?: Fetcher; PUBLIC_BACKEND_WS_HOST?: string }
		| undefined
	const backend = env?.BACKEND

	// SSR talks to the backend worker through the `BACKEND` service binding.
	// Resolve remult's (relative) URLs against the incoming request so the
	// binding receives an absolute URL, and forward the session cookie/header
	// so the backend can read the authenticated user.
	remult.apiClient.url = '/api'
	remult.apiClient.httpClient = backend
		? (input, init) => {
				const rawUrl =
					input instanceof URL
						? input.href
						: typeof input === 'string'
							? new URL(input, event.url).href
							: input.url
				const headers = new Headers((init as RequestInit)?.headers)
				const cookie = event.request.headers.get('cookie')
				if (cookie) headers.set('cookie', cookie)
				const auth = event.request.headers.get('authorization')
				if (auth) headers.set('authorization', auth)
				// Forward the resolved tenant so the backend scopes data to this
				// org. Overwritten here, so a client cannot spoof it.
				const tenant = getTenantContext()
				if (tenant?.organizationId) headers.set('x-organization-id', tenant.organizationId)
				return backend.fetch(rawUrl, {
					method: (init as RequestInit)?.method ?? 'GET',
					headers,
					body: (init as RequestInit)?.body,
				})
			}
		: event.fetch

	return resolve(event)
}

export const handle = sequence(handleTenant, handleRemult)
