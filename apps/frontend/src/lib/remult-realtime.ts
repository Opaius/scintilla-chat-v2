import { RemultPartySubscriptionClient } from '@scintilla/realtime/client'
import { type ClassType, type FindOptions, remult } from 'remult'

interface RealtimeConfig {
	// Host the browser opens the WebSocket against, e.g. `localhost:8788`.
	// Comes from `PUBLIC_BACKEND_WS_HOST`; the browser connects DIRECTLY to
	// the backend worker (no SvelteKit proxy).
	host: string
	// Current tenant org, used to partition the realtime room.
	organizationId?: string
}

let config: RealtimeConfig | null = null
let clientKey = ''
let clientPromise: Promise<void> | null = null

function configKey(c: RealtimeConfig): string {
	return `${c.host}|${c.organizationId ?? ''}`
}

// Called from +layout.svelte (browser) with the WS host + current org.
export function setRemultRealtimeConfig(c: RealtimeConfig) {
	const nextKey = configKey(c)
	if (config && clientKey === nextKey) return
	config = c
	clientKey = ''
	clientPromise = null
}

// Lazily builds the Remult SubscriptionClient that talks straight to the
// backend's `/party/remult` endpoint, partitioned per tenant.
export async function ensureRemultRealtime() {
	if (typeof window === 'undefined') return
	if (!config) return

	const cfg = config
	const nextKey = configKey(cfg)
	if (clientKey === nextKey && remult.apiClient.subscriptionClient) return

	if (!clientPromise) {
		clientPromise = (async () => {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
			remult.apiClient.subscriptionClient = new RemultPartySubscriptionClient({
				getSocketUrl: (roomName: string) =>
					`${protocol}//${cfg.host}/party/remult?room=${encodeURIComponent(roomName)}`,
				resolveRoomId: (_channel: string) => {
					if (cfg.organizationId) return `org:${cfg.organizationId}`
					// No tenant context: single global room (matches the package default).
					return 'global'
				},
			})
			clientKey = nextKey
		})().catch((error) => {
			clientPromise = null
			throw error
		})
	}

	await clientPromise
}

// Convenience helper: subscribe a live query over the realtime transport.
export async function subscribeLiveQuery<T>(
	entity: ClassType<T>,
	options: {
		where?: Record<string, unknown>
		include?: Record<string, unknown>
		orderBy?: Record<string, unknown>
	},
	handler: (items: T[]) => void,
	getCurrent: () => T[],
): Promise<() => void> {
	await ensureRemultRealtime()
	const repo = remult.repo(entity)
	const q = repo.liveQuery(options as unknown as FindOptions<T>)
	return q.subscribe((info) => {
		const current = getCurrent()
		const fresh = info.applyChanges([...current])
		handler(fresh)
	})
}
