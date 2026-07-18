/// <reference types="@cloudflare/workers-types" />

import type { SubscriptionServer } from 'remult'
import { resolveRoomIdFromChannel } from './channel.js'

export interface RemultPartyServerOptions {
	/**
	 * Resolves room name from subscription channel. Falls back to the shared
	 * channel→room resolver when omitted.
	 */
	resolveRoomId?: (channel: string) => string

	/**
	 * Validates if connection to room can subscribe to channel.
	 * Returns true if allowed, false otherwise.
	 */
	validateSubscription?: (channel: string, roomName: string) => boolean | Promise<boolean>
}

// Server-side SubscriptionServer that forwards Remult entity-change events to the
// partitioned Durable Object room over HTTP. No partyserver/cloudflare runtime imports,
// so it is safe to bundle in the SvelteKit Node.js build.
export class RemultPartySubscriptionServer implements SubscriptionServer {
	constructor(
		private readonly binding: DurableObjectNamespace,
		private readonly options: RemultPartyServerOptions = {},
	) {}

	async publishMessage<T>(channel: string, message: T): Promise<void> {
		try {
			const room = (this.options.resolveRoomId ?? resolveRoomIdFromChannel)(channel)
			const doId = this.binding.idFromName(room)
			const stub = this.binding.get(doId)
			const resp = await stub.fetch('http://dummy/publish', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ channel, data: message }),
			})
			if (!resp.ok) {
				console.error('[realtime] publish failed:', resp.status)
			}
		} catch (e) {
			console.error('[realtime] publish error:', e)
		}
	}
}
