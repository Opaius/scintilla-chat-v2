// Provider-agnostic billing seam. Any payment provider (Creem, Dodo, Paddle,
// Stripe, PayPal, crypto, manual) implements BillingProvider so Flow A (our
// plans) and Flow B (reader's clients) share one metering/enforcement path.
// No provider is hard-coded — register an adapter and the rest is unchanged.

export type BillingEvent =
	| {
			type: 'subscription.active'
			organizationId: string
			planId: string
			providerSubscriptionId: string
			periodStart?: string
			periodEnd?: string
	  }
	| {
			type: 'subscription.updated'
			organizationId: string
			providerSubscriptionId: string
			planId?: string
			status?: string
			cancelAtPeriodEnd?: boolean
			periodStart?: string
			periodEnd?: string
	  }
	| { type: 'subscription.canceled'; organizationId: string; providerSubscriptionId: string }
	| { type: 'subscription.past_due'; organizationId: string; providerSubscriptionId: string }
	| {
			type: 'payment.succeeded'
			organizationId: string
			amount: number
			currency: string
			reference: string
	  }
	| { type: 'payment.failed'; organizationId: string; reference: string }

export interface BillingProvider {
	readonly key: string
	readonly signatureHeader: string
	getSecret(organizationId: string): Promise<string | undefined>
	verify(rawBody: string, signature: string, secret: string): Promise<boolean>
	map(rawBody: string): Promise<BillingEvent[]>
}
