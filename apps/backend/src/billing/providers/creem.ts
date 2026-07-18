import type { Bindings } from '../../env.js'
import type { BillingEvent, BillingProvider } from '../types.js'

// Reference Creem (Merchant of Record) adapter. Creem is ONE option for Flow A
// (our plans); swap/extend by adding another BillingProvider — nothing else
// changes. Webhook signature: HMAC-SHA256(rawBody, webhookSecret), hex, in the
// `creem-signature` header. Signature is compared in constant time.
//
// ponytail: field names + timestamp units follow Creem's documented webhook
// shape (eventType + object.metadata). Verify against https://docs.creem.io/code/webhooks
// before production — the handler degrades safely (unknown events are ignored).
async function hmacHex(rawBody: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	)
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
	return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
// Constant-time compare that works in workerd (Web Crypto has no timingSafeEqual).
function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
	let diff = a.length ^ b.length
	for (let i = 0; i < a.length; i++) {
		diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
	}
	return diff === 0
}
function periodDates(obj?: CreemWebhook['object']) {
	const toISO = (s?: number) => (s ? new Date(s * 1000).toISOString() : undefined)
	// ponytail: Creem timestamps are UNIX seconds; confirm vs https://docs.creem.io/code/webhooks.
	return {
		periodStart: toISO(obj?.current_period_start),
		periodEnd: toISO(obj?.current_period_end),
	}
}

interface CreemWebhook {
	eventType: string
	object?: {
		id?: string
		status?: string
		current_period_start?: number
		current_period_end?: number
		metadata?: Record<string, string>
	}
}

export const creemProvider: BillingProvider = {
	key: 'creem',
	signatureHeader: 'creem-signature',
	// Flow A (our plans): the platform's MoR secret comes from the Worker env
	// binding, never process.env (workers have no process global).
	async getSecret(_organizationId: string, env?: Bindings) {
		return env?.CREEM_WEBHOOK_SECRET
	},
	async verify(rawBody, signature, secret) {
		const expected = await hmacHex(rawBody, secret)
		const a = new TextEncoder().encode(expected)
		const b = new TextEncoder().encode(signature)
		// Constant-time comparison to avoid a timing side-channel on the secret.
		return safeEqual(a, b)
	},
	async map(rawBody) {
		const payload = JSON.parse(rawBody) as CreemWebhook
		const meta = payload.object?.metadata ?? {}
		const orgId = meta.organization_id
		const subId = payload.object?.id
		if (!orgId || !subId) return []
		const events: BillingEvent[] = []
		switch (payload.eventType) {
			case 'subscription.paid':
			case 'checkout.completed':
				events.push({
					type: 'subscription.active',
					organizationId: orgId,
					planId: meta.plan_id ?? 'pro',
					providerSubscriptionId: subId,
					...periodDates(payload.object),
				})
				break
			case 'subscription.updated':
				events.push({
					type: 'subscription.updated',
					organizationId: orgId,
					providerSubscriptionId: subId,
					status: payload.object?.status,
					...periodDates(payload.object),
				})
				break
			case 'subscription.expired':
			case 'subscription.canceled':
				events.push({
					type: 'subscription.canceled',
					organizationId: orgId,
					providerSubscriptionId: subId,
				})
				break
			case 'subscription.past_due':
				events.push({
					type: 'subscription.past_due',
					organizationId: orgId,
					providerSubscriptionId: subId,
				})
				break
			default:
				break
		}
		return events
	},
}
