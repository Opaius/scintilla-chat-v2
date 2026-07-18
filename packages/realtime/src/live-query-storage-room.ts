/// <reference types="@cloudflare/workers-types" />

// Cross-isolate live query storage. Remult's default InMemoryLiveQueryStorage is
// per-isolate, so a repo.save() in isolate A wouldn't see live queries registered in
// isolate B. We back the storage with a single global DO whose state lives across all
// isolates.
export interface StoredLiveQuery {
	entityKey: string
	id: string
	data: {
		requestJson: unknown
		findOptionsJson: unknown
		lastIds: unknown[]
	}
	lastUsed: string
}

const FIVE_MIN_MS = 5 * 60 * 1000

export class RemultLiveQueryStorageRoom {
	constructor(
		private state: DurableObjectState,
		_env: unknown,
	) {
		this.state.blockConcurrencyWhile(async () => {
			this.state.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS live_queries (
					id TEXT PRIMARY KEY,
					entityKey TEXT,
					requestJson TEXT,
					findOptionsJson TEXT,
					lastIds TEXT,
					lastUsed TEXT
				)
			`)
			this.state.storage.sql.exec(`
				CREATE INDEX IF NOT EXISTS idx_entityKey_lastUsed ON live_queries(entityKey, lastUsed)
			`)
		})
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)

		if (url.pathname === '/add' && request.method === 'POST') {
			try {
				const body = (await request.json()) as Omit<StoredLiveQuery, 'lastUsed'>
				const now = new Date().toISOString()
				this.state.storage.sql.exec(
					`INSERT OR REPLACE INTO live_queries (id, entityKey, requestJson, findOptionsJson, lastIds, lastUsed)
					 VALUES (?, ?, ?, ?, ?, ?)`,
					body.id,
					body.entityKey,
					JSON.stringify(body.data.requestJson),
					JSON.stringify(body.data.findOptionsJson),
					JSON.stringify(body.data.lastIds),
					now,
				)
				return new Response('OK')
			} catch (err) {
				console.error('[realtime] /add error:', err)
				return new Response(String(err), { status: 400 })
			}
		}

		if (url.pathname === '/remove' && request.method === 'POST') {
			try {
				const body = (await request.json()) as { id: string }
				this.state.storage.sql.exec(`DELETE FROM live_queries WHERE id = ?`, body.id)
				return new Response('OK')
			} catch (err) {
				console.error('[realtime] /remove error:', err)
				return new Response(String(err), { status: 400 })
			}
		}

		if (url.pathname === '/list' && request.method === 'GET') {
			const entityKey = url.searchParams.get('entityKey')
			if (!entityKey) return new Response('entityKey required', { status: 400 })
			const cutoff = new Date(Date.now() - FIVE_MIN_MS).toISOString()
			try {
				const cursor = this.state.storage.sql.exec(
					`SELECT id, entityKey, requestJson, findOptionsJson, lastIds, lastUsed
					 FROM live_queries
					 WHERE entityKey = ? AND lastUsed >= ?`,
					entityKey,
					cutoff,
				)
				const result: StoredLiveQuery[] = []
				for (const row of cursor) {
					result.push({
						id: row.id as string,
						entityKey: row.entityKey as string,
						data: {
							requestJson: JSON.parse(row.requestJson as string),
							findOptionsJson: JSON.parse(row.findOptionsJson as string),
							lastIds: JSON.parse(row.lastIds as string),
						},
						lastUsed: row.lastUsed as string,
					})
				}
				return Response.json(result)
			} catch (err) {
				console.error('[realtime] /list error:', err)
				return new Response(String(err), { status: 500 })
			}
		}

		if (url.pathname === '/setData' && request.method === 'POST') {
			try {
				const body = (await request.json()) as { id: string; data: StoredLiveQuery['data'] }
				const now = new Date().toISOString()
				this.state.storage.sql.exec(
					`UPDATE live_queries
					 SET requestJson = ?, findOptionsJson = ?, lastIds = ?, lastUsed = ?
					 WHERE id = ?`,
					JSON.stringify(body.data.requestJson),
					JSON.stringify(body.data.findOptionsJson),
					JSON.stringify(body.data.lastIds),
					now,
					body.id,
				)
				return new Response('OK')
			} catch (err) {
				console.error('[realtime] /setData error:', err)
				return new Response(String(err), { status: 400 })
			}
		}

		if (url.pathname === '/keepAlive' && request.method === 'POST') {
			try {
				const body = (await request.json()) as { ids: string[] }
				const unknown: string[] = []
				const now = new Date().toISOString()
				for (const id of body.ids) {
					const cursor = this.state.storage.sql.exec(`SELECT 1 FROM live_queries WHERE id = ?`, id)
					const row = cursor.next().value
					if (row) {
						this.state.storage.sql.exec(
							`UPDATE live_queries SET lastUsed = ? WHERE id = ?`,
							now,
							id,
						)
					} else {
						unknown.push(id)
					}
				}
				return Response.json(unknown)
			} catch (err) {
				console.error('[realtime] /keepAlive error:', err)
				return new Response(String(err), { status: 400 })
			}
		}

		return new Response('Not Found', { status: 404 })
	}
}
