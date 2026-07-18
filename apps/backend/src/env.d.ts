/// <reference types="@cloudflare/workers-types" />

export interface Bindings {
	DB: D1Database
	REMULT_ROOM: DurableObjectNamespace
	REMULT_LIVEQUERY: DurableObjectNamespace
	BETTER_AUTH_URL?: string
	BETTER_AUTH_SECRET?: string
	AUTH_BASE_URL?: string
	AUTH_TRUSTED_ORIGINS?: string
	RESEND_API_KEY?: string
	RESEND_FROM?: string
	MAX_CONNECTIONS_PER_SHARD?: string
}

export type ServiceBindings = Record<string, never>
