import type { RequestEvent } from '@sveltejs/kit'
import { type ClassType, type DataProvider, remult } from 'remult'
import { createD1DataProvider } from 'remult/remult-d1'
import { remultApi } from 'remult/remult-sveltekit'
import { Account, Session, User, Verification } from '$lib/entities/auth'
import { Test } from '$lib/entities/test-todo'
import { auth } from '$lib/server/auth/config'
import { setProvider } from '$lib/server/auth/data-provider'
import { TenantScopedDataProvider } from '$lib/server/tenant/scoped-dp'

type Entity = User | Session | Account | Verification | Test
type EntityClass = typeof User | typeof Session | typeof Account | typeof Verification | typeof Test
const entities: EntityClass[] = [User, Session, Account, Verification, Test]

let schemaPromise: Promise<void> | undefined

async function initProvider(inner: DataProvider) {
	const provider = new TenantScopedDataProvider(inner)
	remult.dataProvider = provider
	setProvider(provider)

	if (!provider.ensureSchema) return
	const entityMetadatas = entities.map((e) => remult.repo(e as ClassType<Entity>).metadata)
	schemaPromise ??= provider.ensureSchema(entityMetadatas)
	await schemaPromise
}

export const api = remultApi({
	entities,
	ensureSchema: false,

	initRequest: async (event: RequestEvent) => {
		const db = event.platform?.env?.DB
		if (!db) throw new Error('D1 binding (DB) not found')
		await initProvider(createD1DataProvider(db))
	},

	getUser: async (event) => {
		const session = await auth.api.getSession({
			headers: event.request.headers,
		})
		if (!session) return undefined
		const { id, name } = session.user
		return { id, name, roles: [] }
	},
})
