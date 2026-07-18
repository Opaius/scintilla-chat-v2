<script lang="ts">
import { getMessage } from './data.remote'

const data = getMessage()
</script>

<h1>Welcome to SvelteKit</h1>
{#if data.loading}
	Loding
{:else}
	<p>{data.current?.length}</p>
	<p>Server time: {data.current?.[0]}</p>
{/if}
<p>
	Visit
	<a href="https://svelte.dev/docs/kit/remote-functions">svelte.dev/docs/kit/remote-functions</a>
	to read the docs
</p>
