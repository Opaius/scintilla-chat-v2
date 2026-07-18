import { DurableObjectLiveQueryStorage, RemultPartySubscriptionServer } from '@scintilla/realtime'
import { Account, Session, Test, User, Verification } from '@scintilla/shared'
import { type ClassType, InMemoryLiveQueryStorage, remult } from 'remult'
import { createD1DataProvider } from 'remult/remult-d1'
import { remultApi } from 'remult/remult-hono'
import { auth } from './auth/config.js'
import { setProvider } from './auth/data-provider.js'
import type { Bindings } from './env.js'
import { getTenantContext } from './tenant/context.js'
import { TenantScopedDataProvider } from './tenant/scoped-dp.js'

type Entity = User | Session | Account | Verification | Test
type EntityClass = typeof User | typeof Session | typeof Account | typeof Verification | typeof Test
const entities: EntityClass[] = [User, Session, Account, Verification, Test]

let schemaPromise: Promise<void> | undefined

async function initProvider(env: Bindings) {
	const inner = createD1DataProvider(env.DB)
	const provider = new TenantScopedDataProvider(inner)
	remult.dataProvider = provider
	setProvider(provider)

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

	if (provider.ensureSchema) {
		const entityMetadatas = entities.map((e) => remult.repo(e as ClassType<Entity>).metadata)
		schemaPromise ??= provider.ensureSchema(entityMetadatas)
		await schemaPromise
	}
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
		const session = await auth.api.getSession({ headers: c.req.raw.headers })
		if (!session) return undefined
		const { id, name } = session.user
		return { id, name, roles: [] }
	},
})
