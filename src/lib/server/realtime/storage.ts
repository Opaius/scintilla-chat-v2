/// <reference types="@cloudflare/workers-types" />
import type { LiveQueryStorage, StoredQuery } from 'remult'

const STORAGE_ROOM = 'global'

// Backs Remult's LiveQueryStorage with a single global Durable Object so registered
// live queries survive across Cloudflare isolates (the default InMemoryLiveQueryStorage
// is per-isolate). Server-safe: only uses the DO namespace binding + fetch.
export class DurableObjectLiveQueryStorage implements LiveQueryStorage {
	constructor(private readonly binding: DurableObjectNamespace) {}

	private stub() {
		return this.binding.get(this.binding.idFromName(STORAGE_ROOM))
	}

	async add(query: StoredQuery): Promise<void> {
		await this.stub().fetch('http://dummy/add', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: query.id, entityKey: query.entityKey, data: query.data }),
		})
	}

	async remove(queryId: string): Promise<void> {
		await this.stub().fetch('http://dummy/remove', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: queryId }),
		})
	}

	async forEach(
		entityKey: string,
		callback: (args: {
			query: StoredQuery
			setData: (data: unknown) => Promise<void>
		}) => Promise<void>,
	): Promise<void> {
		const resp = await this.stub().fetch(
			`http://dummy/list?entityKey=${encodeURIComponent(entityKey)}`,
		)
		if (!resp.ok) return
		const stored = (await resp.json()) as Array<{ id: string; entityKey: string; data: unknown }>
		for (const row of stored) {
			await callback({
				query: { id: row.id, entityKey: row.entityKey, data: row.data },
				setData: async (data: unknown) => {
					await this.stub().fetch('http://dummy/setData', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ id: row.id, data }),
					})
				},
			})
		}
	}

	async keepAliveAndReturnUnknownQueryIds(queryIds: string[]): Promise<string[]> {
		const resp = await this.stub().fetch('http://dummy/keepAlive', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ids: queryIds }),
		})
		if (!resp.ok) return []
		return (await resp.json()) as string[]
	}
}
