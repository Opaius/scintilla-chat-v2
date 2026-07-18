import {
	ConsumptionEvent,
	CreditBalance,
	runWithTenantContext,
	Subscription,
} from '@scintilla/shared'
import { remult } from 'remult'

// Every helper runs inside the tenant context for its org, so it is self-scoped
// and consistent with applyEvent (webhooks) regardless of any outer request
// context. organizationId is also passed explicitly so the where-clause is
// always scoped.

export async function getActiveSubscription(organizationId: string) {
	return runWithTenantContext({ organizationId, domain: '' }, async () => {
		const sub = await remult.repo(Subscription).findFirst({ organizationId, status: 'active' })
		if (!sub) return undefined
		// An expired-but-uncanceled subscription is treated as inactive.
		if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return undefined
		return sub
	})
}

export async function getCreditBalance(organizationId: string) {
	return runWithTenantContext({ organizationId, domain: '' }, async () => {
		// Exactly one balance per org (organizationId is unique); upsert is idempotent.
		return remult.repo(CreditBalance).upsert({
			where: { organizationId },
			set: { organizationId },
		})
	})
}

// Records consumption (Flow A metering + Flow B ledger). Enforces the org's
// plan minute limit; throws when over limit unless allowOverage is set.
// organizationId is passed explicitly so server-side calls are always scoped.
export async function recordConsumption(input: {
	organizationId: string
	readerId?: string
	clientId?: string
	minutes: number
	credits?: number
	billingProvider?: string
	billingRef?: string
	billed?: boolean
	allowOverage?: boolean
}) {
	await runWithTenantContext({ organizationId: input.organizationId, domain: '' }, async () => {
		// Flow B dedupe: a reader's payment provider may redeliver a webhook, so
		// don't double-count an already-billed charge.
		if (input.billingRef && input.billingProvider) {
			const existing = await remult.repo(ConsumptionEvent).findFirst({
				organizationId: input.organizationId,
				billingRef: input.billingRef,
				billingProvider: input.billingProvider,
			})
			if (existing) return
		}
		const bal = await getCreditBalance(input.organizationId)
		const remaining = bal.minutesTotal - bal.minutesUsed
		if (!input.allowOverage && input.minutes > remaining) {
			throw new Error(`Minute limit exceeded for organization ${input.organizationId}`)
		}
		bal.minutesUsed += input.minutes
		bal.creditsUsed += input.credits ?? 0
		await remult.repo(CreditBalance).save(bal)
		await remult.repo(ConsumptionEvent).insert({
			organizationId: input.organizationId,
			readerId: input.readerId ?? '',
			clientId: input.clientId ?? '',
			minutes: input.minutes,
			credits: input.credits ?? 0,
			billingProvider: input.billingProvider ?? '',
			billingRef: input.billingRef ?? '',
			billed: input.billed ?? false,
		})
	})
}
