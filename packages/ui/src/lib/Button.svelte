<script lang="ts">
	import { clsx } from 'clsx'

	let {
		label = 'Button',
		onclick,
	}: { label?: string; onclick?: () => void } = $props()
</script>

<button class={clsx('rounded-md bg-slate-900 px-4 py-2 text-white')} {onclick}>
	{label}
</button>
