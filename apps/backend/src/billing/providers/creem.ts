import type { BillingEvent, BillingProvider } from '../types.js'

// Reference Creem (Merchant of Record) adapter. Creem is ONE option for Flow A
// (our plans); swap/extend by adding another BillingProvider — nothing else
// changes. Webhook signature: HMAC-SHA256(rawBody, webhookSecret), hex, in the
// `creem-signature` header.
//
// ponytail: field names below follow Creem's documented webhook shape
// (eventType + object.metadata). Verify against https://docs.creem.io/code/webhooks
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
	async getSecret() {
		return process.env.CREEM_WEBHOOK_SECRET
	},
	async verify(rawBody, signature, secret) {
		return (await hmacHex(rawBody, secret)) === signature
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
					periodStart: payload.object?.current_period_start
						? new Date(payload.object.current_period_start * 1000).toISOString()
						: undefined,
					periodEnd: payload.object?.current_period_end
						? new Date(payload.object.current_period_end * 1000).toISOString()
						: undefined,
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
