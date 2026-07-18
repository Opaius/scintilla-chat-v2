export interface RoomContext {
	organizationId?: string
	userId?: string
}

// Universal, auto-scoped room resolver.
//
// Policy: every live query is scoped to its tenant (organizationId) — no per-query
// params required, so realtime isolation mirrors TenantScopedDataProvider exactly.
// The client and server both call this single function, so going granular later
// (per-entity, per-user, or a custom partition) means editing ONE function; the
// subscription wiring on either side stays unchanged.
export function resolveRoomId(ctx: RoomContext): string {
	const org = ctx.organizationId?.trim()
	return org ? `org:${org}` : 'global'
}
