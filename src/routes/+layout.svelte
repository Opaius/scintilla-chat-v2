<script lang="ts">
import '../app.css'
import { Remult, remult } from 'remult'
import { untrack } from 'svelte'
import { createSubscriber } from 'svelte/reactivity'
import { browser } from '$app/environment'
import favicon from '$lib/assets/favicon.svg'
import { RemultPartySubscriptionClient } from '$lib/realtime/client'
import { resolveRoomId } from '$lib/realtime/rooms'
import type { LayoutData } from './$types'

interface Props {
	data: LayoutData
	children?: import('svelte').Snippet
}

let { data, children }: Props = $props()

// Auth reactivity (remult.user, remult.authenticated(), ...)
let update = () => {}
let s = createSubscriber((u) => {
	update = u
})
remult.subscribeAuth({
	reportObserved: () => s(),
	reportChanged: () => update(),
})

// Entities reactivity
Remult.entityRefInit = (x) => {
	let update = () => {}
	let s = createSubscriber((u) => {
		update = u
	})
	x.subscribe({
		reportObserved: () => s(),
		reportChanged: () => update(),
	})
}

// SSR auth — restore user from server-rendered data
$effect(() => {
	data.user
	untrack(() => {
		remult.user = data.user
	})
})

// Realtime: client-side WebSocket subscription pool, partitioned by tenant.
if (browser) {
	remult.apiClient.subscriptionClient = new RemultPartySubscriptionClient({
		getSocketUrl: (roomName) => {
			const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
			return `${proto}//${location.host}/party/remult?room=${encodeURIComponent(roomName)}`
		},
		resolveRoomId: () => resolveRoomId({ organizationId: data.organizationId }),
	})
}
</script>

<svelte:head>
	<link rel="icon" href={favicon}>
</svelte:head>

{@render children?.()}
