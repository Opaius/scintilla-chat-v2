import { ConsumptionEvent, CreditBalance, Subscription } from '@scintilla/shared'
import { remult } from 'remult'

export async function getActiveSubscription(organizationId: string) {
	return remult.repo(Subscription).findFirst({ organizationId, status: 'active' })
}

export async function getCreditBalance(organizationId: string) {
	let bal = await remult.repo(CreditBalance).findFirst({ organizationId })
	if (!bal) bal = await remult.repo(CreditBalance).insert({ organizationId })
	return bal
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
}
