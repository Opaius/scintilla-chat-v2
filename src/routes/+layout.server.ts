import { remult } from 'remult'
import { getTenantContext } from '$lib/server/tenant/context'
import type { LayoutServerLoad } from './$types'

export const load = (async () => {
	return {
		user: remult.user,
		organizationId: getTenantContext()?.organizationId,
	}
}) satisfies LayoutServerLoad
