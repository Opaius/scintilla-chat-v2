import '../app.css';
<script lang="ts">
import { Remult, remult } from 'remult'
import { untrack } from 'svelte'
import { createSubscriber } from 'svelte/reactivity'
import favicon from '$lib/assets/favicon.svg'
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
</script>

<svelte:head>
	<link rel="icon" href={favicon}>
</svelte:head>

{@render children?.()}
