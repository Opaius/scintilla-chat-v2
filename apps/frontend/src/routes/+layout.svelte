<script lang="ts">
import '../app.css'
import { remult } from 'remult'
import { untrack } from 'svelte'
import { browser } from '$app/environment'
import { env as publicEnv } from '$env/dynamic/public'
import favicon from '$lib/assets/favicon.svg'
import { authClient } from '$lib/auth-client'
import { initRemultSvelteReactivity } from '$lib/remult-init'
import { ensureRemultRealtime, setRemultRealtimeConfig } from '$lib/remult-realtime'
import type { LayoutData } from './$types'

interface Props {
	data: LayoutData
	children?: import('svelte').Snippet
}

let { data, children }: Props = $props()

// Remult auth + entity reactivity (Svelte 5 runes)
initRemultSvelteReactivity()

// SSR auth — restore user from server-rendered data
$effect(() => {
	data.user
	untrack(() => {
		remult.user = data.user
	})
})

// Browser-only: point realtime + auth client at the backend worker directly.
if (browser) {
	const wsHost = publicEnv.PUBLIC_BACKEND_WS_HOST ?? 'localhost:8788'
	// Browser talks to the backend worker directly (REST + WS). SSR uses the
	// `BACKEND` service binding instead (see hooks.server.ts).
	const backendUrl = publicEnv.PUBLIC_BACKEND_URL ?? `https://${wsHost}`
	remult.apiClient.url = backendUrl
	untrack(() => {
		setRemultRealtimeConfig({ host: wsHost, organizationId: data.organizationId })
	})
	ensureRemultRealtime()
	authClient.getSession().then(({ data: session }) => {
		if (session?.user) {
			remult.user = { id: session.user.id, name: session.user.name ?? '', roles: [] }
		}
	})
}
</script>

<svelte:head>
	<link rel="icon" href={favicon}>
</svelte:head>

{@render children?.()}
