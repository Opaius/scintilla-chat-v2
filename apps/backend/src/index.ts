import { runWithTenantContext } from '@scintilla/shared'
import { Hono } from 'hono'
import { contextStorage } from 'hono/context-storage'
import { api } from './api.js'
import { auth } from './auth/config.js'
import { handleBillingWebhook } from './billing/webhook.js'
import type { Bindings } from './env.js'

const app = new Hono<{ Bindings: Bindings }>()

app.use(contextStorage())

// Establish tenant context for backend requests. The frontend resolves the org
// (subdomain / dev fallback) and forwards it on the trusted service-binding hop
// via the x-organization-id header, overwritten so a client cannot spoof it.
// Billing webhooks set their own context from the payload instead.
app.use('*', async (c, next) => {
	if (c.req.path.startsWith('/api/billing/webhook/')) return next()
	const orgId = c.req.header('x-organization-id')
	if (orgId) {
		return runWithTenantContext({ organizationId: orgId, domain: c.req.header('host') ?? '' }, () =>
			next(),
		)
	}
	return next()
})

// Handler for /party/remult — forward WebSocket upgrades to the DO.
// CORS headers allow the browser to connect directly to this worker
// (service bindings can't proxy WS upgrades).
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
	const url = new URL(c.req.url)
	const room = url.searchParams.get('room') || 'global'
	const doId = env.REMULT_ROOM.idFromName(room)
	const stub = env.REMULT_ROOM.get(doId)
	const resp = await stub.fetch(c.req.raw)
	// For WebSocket upgrades (101) the response is passed through as-is.
	// For HTTP requests we add CORS headers.
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
	} catch (err) {
		return c.json({ error: String(err) }, 400)
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
