// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				DB: D1Database
				REMULT_ROOM: import('cloudflare:workers').DurableObjectNamespace
				REMULT_LIVEQUERY: import('cloudflare:workers').DurableObjectNamespace
			}
		}
	}
}

export {}
