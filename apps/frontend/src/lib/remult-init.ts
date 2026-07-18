import { Remult, remult } from 'remult'
import { createSubscriber } from 'svelte/reactivity'

// Wires Remult's auth + entity reactivity into Svelte 5 runes so `$derived`/
// `$effect` tracking of `remult.user` and entity refs actually re-renders.
export function initRemultSvelteReactivity() {
	// Auth reactivity (remult.user, remult.authenticated(), ...)
	{
		let update = () => {}
		const s = createSubscriber((u) => {
			update = u
		})
		remult.subscribeAuth({
			reportObserved: () => s(),
			reportChanged: () => update(),
		})
	}

	// Entities reactivity
	Remult.entityRefInit = (x) => {
		let update = () => {}
		const s = createSubscriber((u) => {
			update = u
		})
		x.subscribe({
			reportObserved: () => s(),
			reportChanged: () => update(),
		})
	}
}
