import { runWithTenantContext, Subscription } from '@scintilla/shared'
import { remult } from 'remult'
import type { BillingEvent, BillingProvider } from './types.js'

// Registry of providers. Register a Creem/Dodo/Stripe/... adapter and the
// webhook route handles it with no other changes.
const providers = new Map<string, BillingProvider>()

export function registerBillingProvider(p: BillingProvider) {
	providers.set(p.key, p)
}

export async function handleBillingWebhook(providerKey: string, rawBody: string, headers: Headers) {
	const provider = providers.get(providerKey)
	if (!provider) throw new Error(`Unknown billing provider: ${providerKey}`)
	const signature = headers.get(provider.signatureHeader) ?? ''
	// Flow A (our plans): a single global secret for the platform's provider.
	// Flow B (reader integrations) needs a per-org secret resolved after parsing
	// the payload — tracked as a seam gap (getSecret receives the org post-parse).
	const secret = await provider.getSecret('*')
	if (!secret) throw new Error(`No webhook secret for provider ${providerKey}`)
	if (!(await provider.verify(rawBody, signature, secret))) {
		throw new Error('Invalid webhook signature')
	}
	const events = await provider.map(rawBody)
	// Process each event independently so one failure doesn't drop the rest.
	for (const event of events) {
		try {
			await applyEvent(event, providerKey)
		} catch (err) {
			console.error(`[billing] applyEvent failed for ${event.type}:`, err)
		}
	}
}

async function applyEvent(event: BillingEvent, providerKey: string) {
	// Run inside the event's tenant context so the entity apiPrefilter isolates
	// the write to the correct org and the saving interceptor stamps it.
	await runWithTenantContext({ organizationId: event.organizationId, domain: '' }, async () => {
		switch (event.type) {
			case 'subscription.active':
				await remult.repo(Subscription).upsert({
					where: {
						organizationId: event.organizationId,
						providerSubscriptionId: event.providerSubscriptionId,
					},
					set: {
						organizationId: event.organizationId,
						planId: event.planId,
						provider: providerKey,
						providerSubscriptionId: event.providerSubscriptionId,
						status: 'active',
						currentPeriodStart: event.periodStart ? new Date(event.periodStart) : undefined,
						currentPeriodEnd: event.periodEnd ? new Date(event.periodEnd) : undefined,
					},
				})
				break
			case 'subscription.updated': {
				const set: Partial<Subscription> = {
					status: event.status ?? 'active',
					cancelAtPeriodEnd: event.cancelAtPeriodEnd ?? false,
				}
				if (event.periodStart) set.currentPeriodStart = new Date(event.periodStart)
				if (event.periodEnd) set.currentPeriodEnd = new Date(event.periodEnd)
				if (event.planId) set.planId = event.planId
				await remult.repo(Subscription).upsert({
					where: {
						organizationId: event.organizationId,
						providerSubscriptionId: event.providerSubscriptionId,
					},
					set,
				})
				break
			}
			case 'subscription.canceled':
			case 'subscription.past_due':
				await remult.repo(Subscription).update(
					{
						organizationId: event.organizationId,
						providerSubscriptionId: event.providerSubscriptionId,
					},
					{ status: event.type === 'subscription.canceled' ? 'canceled' : 'past_due' },
				)
				break
			// payment.* is handled by Flow B adapters (reader-side) in Phase 3.
			default:
				break
		}
	})
}
