// Realtime wire protocol shared by the client pool, server broadcaster, and DO rooms.
// Keep in sync with the remult-partykit message format.

export interface RemultPartyMessage {
	type:
		| 'subscribe'
		| 'unsubscribe'
		| 'data'
		| 'error'
		| 'connected'
		| 'disconnected'
		| 'remult:subscribe'
		| 'remult:unsubscribe'
		| 'signal'
		| 'ping'
	channel: string
	payload?: unknown
	data?: unknown
	id?: string
	error?: string
}

// Default channel→room resolver. The consuming app usually supplies its own via
// RemultPartyServerOptions.resolveRoomId, and the Durable Object overrides it with
// its own instance name; this preserves the v2 fallback of a single global room so
// the engine works out of the box. Client, server, and DO all share this default.
export function resolveRoomIdFromChannel(_channel: string): string {
	return 'global'
}
