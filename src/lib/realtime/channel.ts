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
