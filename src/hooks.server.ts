import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { api as handleRemult } from '$lib/server/api'
import { runWithTenantContext } from '$lib/server/tenant/context'
import { resolveTenantFromHost } from '$lib/server/tenant/domain-resolver'

const handleTenant: Handle = async ({ event, resolve }) => {
	const host = event.request.headers.get('host') || 'localhost:5173'
	const tenant = resolveTenantFromHost(host)
	if (!tenant) {
		return new Response('Unknown tenant', { status: 404 })
	}
	return runWithTenantContext(tenant, () => resolve(event))
}

export const handle = sequence(handleTenant, handleRemult)
