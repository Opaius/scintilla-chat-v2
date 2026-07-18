import { DurableObjectLiveQueryStorage, RemultPartySubscriptionServer } from '@scintilla/realtime'
import {
	Account,
	ConsumptionEvent,
	CreditBalance,
	getTenantContext,
	PaymentIntegration,
	Plan,
	Session,
	Subscription,
	Test,
	User,
	Verification,
} from '@scintilla/shared'
import {
	type ClassType,
	type DataProvider,
	InMemoryLiveQueryStorage,
	remult,
	withRemult,
} from 'remult'
import { createD1DataProvider } from 'remult/remult-d1'
import { remultApi } from 'remult/remult-hono'
import { getAuth } from './auth/config.js'
import { setProvider } from './auth/data-provider.js'
import type { Bindings } from './env.js'
import './billing/providers/index.js'
import { seedPlans } from './billing/seed.js'

type Entity =
	| User
	| Session
	| Account
	| Verification
	| Test
	| Plan
	| Subscription
	| CreditBalance
	| ConsumptionEvent
	| PaymentIntegration
type EntityClass =
	| typeof User
	| typeof Session
	| typeof Account
	| typeof Verification
	| typeof Test
	| typeof Plan
	| typeof Subscription
	| typeof CreditBalance
	| typeof ConsumptionEvent
	| typeof PaymentIntegration
const entities: EntityClass[] = [
	User,
	Session,
	Account,
	Verification,
	Test,
	Plan,
	Subscription,
	CreditBalance,
	ConsumptionEvent,
	PaymentIntegration,
]

let schemaPromise: Promise<void> | undefined

export async function initProvider(env: Bindings, dataProvider?: DataProvider) {
	const inner = dataProvider ?? createD1DataProvider(env.DB)
	remult.dataProvider = inner
	setProvider(inner)

	if (env.REMULT_ROOM) {
		remult.subscriptionServer = new RemultPartySubscriptionServer(env.REMULT_ROOM, {
			resolveRoomId: (_channel: string) => {
				const org = getTenantContext()?.organizationId?.trim()
				return org ? `org:${org}` : 'global'
			},
		})
	}

	remult.liveQueryStorage = env.REMULT_LIVEQUERY
		? new DurableObjectLiveQueryStorage(env.REMULT_LIVEQUERY)
		: new InMemoryLiveQueryStorage()

	if (inner.ensureSchema) {
		const entityMetadatas = entities.map((e) => remult.repo(e as ClassType<Entity>).metadata)
		schemaPromise ??= inner.ensureSchema(entityMetadatas)
		await schemaPromise
	}
	await seedPlans()
}

// Run `fn` inside a Remult request cycle with the per-request D1 data provider.
// Custom Hono routes (checkout, webhook) bypass remultApi's initRequest and must
// establish the context + provider themselves. ponytail: no per-request caching of
// the provider; D1 provider is cheap to construct.
export async function withEnv(env: Bindings, fn: () => Promise<void>) {
	const inner = createD1DataProvider(env.DB)
	await withRemult(
		async () => {
			await initProvider(env, inner)
			await fn()
		},
		{ dataProvider: inner },
	)
}

export const api = remultApi({
	entities,
	ensureSchema: false,

	// initRequest receives the Hono context, so we can read the Worker bindings
	// (DB, REMULT_ROOM, REMULT_LIVEQUERY) directly — no module-level fallback needed.
	initRequest: async (req) => {
		const env = req.env as Bindings
		if (!env?.DB) throw new Error('D1 binding (DB) not found')
		await initProvider(env)
	},

	getUser: async (c) => {
		const session = await getAuth().api.getSession({ headers: c.req.raw.headers })
		if (!session) return undefined
		const { id, name } = session.user
		return { id, name, roles: [] }
	},
})
