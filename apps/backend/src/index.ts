import { getTenantContext, runWithTenantContext } from '@scintilla/shared'
import { type Context, Hono } from 'hono'
import { contextStorage } from 'hono/context-storage'
import { api } from './api.js'
import { auth } from './auth/config.js'
import { handleBillingWebhook } from './billing/webhook.js'
import type { Bindings } from './env.js'

const app = new Hono<{ Bindings: Bindings }>()

app.use(contextStorage())

// Resolve the tenant for a request. Priority:
//  1. x-organization-id header  — SSR proxy hop (server-overwritten, not spoofable)
//  2. ?room=org:<id>           — browser-direct WS (can't set headers)
//  3. authenticated session     — best-effort fallback
async function resolveOrgId(c: Context): Promise<string | undefined> {
	const fromHeader = c.req.header('x-organization-id')
	if (fromHeader) return fromHeader
	const room = c.req.query('room')
	if (room?.startsWith('org:')) return room.slice(4)
	try {
		const session = await auth.api.getSession({ headers: c.req.raw.headers })
		const org = (session?.user as { organizationId?: string } | undefined)?.organizationId
		if (org) return org
	} catch {
		// No data provider / no session yet — fall through to reject.
	}
	return undefined
}

// Establish tenant context for backend requests. Fail closed: a request that
// cannot be resolved to a tenant is rejected (400), so org-scoped queries can
// never fall back to match-all. Billing webhooks set their own context.
app.use('*', async (c, next) => {
	if (c.req.path.startsWith('/api/billing/webhook/')) return next()
	const orgId = await resolveOrgId(c)
	if (!orgId) return c.text('Unknown tenant', 400)
	return runWithTenantContext({ organizationId: orgId, domain: c.req.header('host') ?? '' }, () =>
		next(),
	)
})

// Handler for /party/remult — forward WebSocket upgrades to the DO. The room is
// ALWAYS the tenant's, derived from the context the middleware set — a
// client-supplied ?room is never trusted, so a socket can only reach its org.
app.options('/party/remult', (c) => {
	return new Response(null, {
		status: 204,
		headers: corsHeaders(c.req.header('origin')),
	})
})

app.get('/party/remult', async (c) => {
	const env = c.env
	if (!env.REMULT_ROOM) {
		return c.text('REMULT_ROOM binding not available', 500)
	}
	const orgId = getTenantContext()?.organizationId
	if (!orgId) return c.text('Unknown tenant', 400)
	const doId = env.REMULT_ROOM.idFromName(`org:${orgId}`)
	const stub = env.REMULT_ROOM.get(doId)
	const resp = await stub.fetch(c.req.raw)
	if (resp.status !== 101) {
		const headers = new Headers(resp.headers)
		const origin = c.req.header('origin')
		if (origin) headers.set('access-control-allow-origin', origin)
		return new Response(resp.body, { status: resp.status, headers })
	}
	return resp
})

app.on('POST', '/api/billing/webhook/:provider', async (c) => {
	const provider = c.req.param('provider')
	const rawBody = await c.req.text()
	try {
		await handleBillingWebhook(provider, rawBody, c.req.raw.headers)
		return c.json({ received: true })
	} catch {
		// Never echo internal error text to the caller.
		return c.json({ error: 'webhook processing failed' }, 400)
	}
})

app.route('', api)

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

function corsHeaders(origin: string | undefined): Record<string, string> {
	return {
		'access-control-allow-origin': origin ?? '*',
		'access-control-allow-methods': 'GET, OPTIONS',
		'access-control-allow-headers': 'content-type, upgrade, connection',
		'access-control-allow-credentials': 'true',
	}
}

export default app

export { RemultLiveQueryStorageRoom, RemultPartyRoom } from '@scintilla/realtime/durable-object'
