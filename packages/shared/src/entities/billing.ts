import { Allow, Entity, Fields, Validators } from 'remult'
import { orgApiPrefilter } from '../tenant-context.js'
import { Roles } from './auth.js'

// Plan: global catalog of platform plans (Flow A — the plans WE sell).
// Not tenant-scoped (one catalog shared by all orgs).
@Entity<Plan>('plan', {
	allowApiCrud: Roles.admin,
	allowApiRead: Allow.authenticated,
})
export class Plan {
	@Fields.string({ required: true, defaultValue: () => crypto.randomUUID() })
	id!: string
	@Fields.string({ required: true })
	name = ''
	@Fields.number()
	priceMonthly = 0
	@Fields.number()
	includedMinutes = 0
	@Fields.number()
	seatLimit = 1
	@Fields.json()
	features: string[] = []
	@Fields.boolean({ defaultValue: () => true })
	active = true
	@Fields.createdAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	createdAt!: Date
	@Fields.updatedAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	updatedAt!: Date
}

// Subscription: an org's active plan (Flow A). Tenant-scoped.
// providerSubscriptionId is globally unique per provider, so Validators.unique
// gives us idempotent upserts across orgs.
@Entity<Subscription>('subscription', {
	allowApiCrud: Roles.admin,
	allowApiRead: Allow.authenticated,
	apiPrefilter: orgApiPrefilter,
})
export class Subscription {
	@Fields.string({ required: true, defaultValue: () => crypto.randomUUID() })
	id!: string
	@Fields.string({ required: true })
	organizationId = ''
	@Fields.string({ required: true })
	planId = ''
	@Fields.string({ required: true })
	provider = ''
	@Fields.string({ required: true, validate: Validators.unique() })
	providerSubscriptionId = ''
	@Fields.string({ defaultValue: () => 'active' })
	status = 'active' // active | trialing | past_due | canceled
	@Fields.date({ required: false })
	currentPeriodStart?: Date
	@Fields.date({ required: false })
	currentPeriodEnd?: Date
	@Fields.boolean({ defaultValue: () => false })
	cancelAtPeriodEnd = false
	@Fields.createdAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	createdAt!: Date
	@Fields.updatedAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	updatedAt!: Date
}

// CreditBalance: running minutes/credits per org. Exactly one per org
// (organizationId is unique); getCreditBalance upserts idempotently.
@Entity<CreditBalance>('credit_balance', {
	allowApiCrud: Roles.admin,
	allowApiRead: Allow.authenticated,
	apiPrefilter: orgApiPrefilter,
})
export class CreditBalance {
	@Fields.string({ required: true, defaultValue: () => crypto.randomUUID() })
	id!: string
	@Fields.string({ required: true, validate: Validators.unique() })
	organizationId = ''
	@Fields.number({ defaultValue: () => 0 })
	minutesTotal = 0
	@Fields.number({ defaultValue: () => 0 })
	minutesUsed = 0
	@Fields.number({ defaultValue: () => 0 })
	creditsTotal = 0
	@Fields.number({ defaultValue: () => 0 })
	creditsUsed = 0
	@Fields.createdAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	createdAt!: Date
	@Fields.updatedAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	updatedAt!: Date
}

// ConsumptionEvent: ledger of consumed minutes/credits. Drives Flow A metering
// and Flow B (reader's client) billing. Tenant-scoped. Flow B redeliveries are
// de-duped on (billingProvider, billingRef) in recordConsumption.
@Entity<ConsumptionEvent>('consumption_event', {
	allowApiCrud: Roles.admin,
	allowApiRead: Allow.authenticated,
	apiPrefilter: orgApiPrefilter,
})
export class ConsumptionEvent {
	@Fields.string({ required: true, defaultValue: () => crypto.randomUUID() })
	id!: string
	@Fields.string({ required: true })
	organizationId = ''
	@Fields.string()
	readerId = '' // which reader/user triggered consumption
	@Fields.string()
	clientId = '' // the reader's client (Flow B payer)
	@Fields.number({ required: true })
	minutes = 0
	@Fields.number({ defaultValue: () => 0 })
	credits = 0
	@Fields.string()
	billingProvider = '' // Flow B: which integration billed the client
	@Fields.string()
	billingRef = '' // provider txn id (Flow B dedupe key)
	@Fields.boolean({ defaultValue: () => false })
	billed = false // whether the client was charged (Flow B)
	@Fields.createdAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	createdAt!: Date
}

// PaymentIntegration: a reader's chosen billing integration(s) for Flow B.
// Tenant-scoped. config holds provider keys / webhook secrets (encrypt at rest later).
@Entity<PaymentIntegration>('payment_integration', {
	allowApiCrud: Roles.admin,
	allowApiRead: Allow.authenticated,
	apiPrefilter: orgApiPrefilter,
})
export class PaymentIntegration {
	@Fields.string({ required: true, defaultValue: () => crypto.randomUUID() })
	id!: string
	@Fields.string({ required: true })
	organizationId = ''
	@Fields.string({ required: true }) // stripe | paypal | crypto | manual | ...
	provider = ''
	@Fields.boolean({ defaultValue: () => true })
	enabled = true
	// ponytail: SECURITY DEBT — PaymentIntegration.config holds reader-side provider
	// secrets (Stripe/PayPal/crypto keys, webhook secrets) in plaintext in D1. For Flow B
	// these are the reader's own credentials, not ours, but a DB/dump leak exposes them.
	// TODO(security): encrypt at rest (envelope encryption via a secret store) or keep only
	// a secret-manager reference id. Owner: billing/security.
	@Fields.json()
	config: Record<string, string> = {}
	@Fields.createdAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	createdAt!: Date
	@Fields.updatedAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	updatedAt!: Date
}
