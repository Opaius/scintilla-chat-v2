import { resolveRoomId } from '$lib/realtime/rooms'
import { getTenantContext } from '$lib/server/tenant/context'
import type { RequestHandler } from './$types'

// Forwards WebSocket upgrades to the partitioned Durable Object room. The room is
// derived from the authenticated session (tenant), not from a client-supplied param,
// so a socket can only land in its own org's room.
export const GET: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env
	if (!env?.REMULT_ROOM) return new Response('Realtime unavailable', { status: 503 })
	const room = resolveRoomId({ organizationId: getTenantContext()?.organizationId })
	const doId = env.REMULT_ROOM.idFromName(room)
	return env.REMULT_ROOM.get(doId).fetch(request)
}
