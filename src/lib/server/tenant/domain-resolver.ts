import type { TenantContext } from '$lib/server/tenant/context'

const domainMap: Record<string, { organizationId: string }> = {
	'janed.tarot.com': { organizationId: 'org_janed' },
	'bobreads.tarot.com': { organizationId: 'org_bob' },
	'localhost:5173': { organizationId: process.env.DEFAULT_TENANT_ID || 'dev' },
}

export function resolveTenantFromHost(host: string): TenantContext | null {
	const mapping = domainMap[host]
	if (!mapping) return null
	return { organizationId: mapping.organizationId, domain: host }
}
