/// <reference types="@cloudflare/workers-types" />
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
				BACKEND: Fetcher
				PUBLIC_BACKEND_WS_HOST?: string
				ASSETS?: Fetcher
			}
		}
	}
}

export {}
