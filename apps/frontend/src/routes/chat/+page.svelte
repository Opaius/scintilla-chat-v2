<script lang="ts">
import type { RemultPartySubscriptionClient } from '@scintilla/realtime/client'
import { remult, SubscriptionChannel } from 'remult'

interface ChatMessage {
	id: string
	sender: string
	body: string
	ts: number
}

let room = $state('lobby')
let text = $state('')
let messages = $state<ChatMessage[]>([])
let status = $state('connecting…')

const channelKey = $derived(`chat/${room}`)

// Subscribe via Remult's SubscriptionChannel (the channel primitive, not liveQuery).
// The room is resolved to the org by the client/DO, so messages stay tenant-scoped.
$effect(() => {
	const key = channelKey
	let active = true
	let unsub: (() => void) | null = null
	status = 'connecting…'
	const channel = new SubscriptionChannel(key)
	channel
		.subscribe((msg: unknown) => {
			const m = msg as ChatMessage
			messages = messages.some((x) => x.id === m.id) ? messages : [...messages, m]
		})
		.then((u) => {
			if (!active) {
				u()
				return
			}
			unsub = u
			status = 'connected'
		})
		.catch(() => {
			status = 'realtime unavailable'
		})
	return () => {
		active = false
		unsub?.()
	}
})

function send() {
	const body = text.trim()
	if (!body) return
	const client = remult.apiClient.subscriptionClient as RemultPartySubscriptionClient | undefined
	if (!client) return
	const msg: ChatMessage = {
		id: crypto.randomUUID(),
		sender: remult.user?.name ?? 'anon',
		body,
		ts: Date.now(),
	}
	text = ''
	client.publish(channelKey, msg)
	// The DO echoes it back to every subscriber in the room; dedupe by id guards a
	// local double-add if the echo arrives.
	messages = messages.some((m) => m.id === msg.id) ? messages : [...messages, msg]
}
</script>

<svelte:head>
	<title>Realtime Chat (SubscriptionChannel)</title>
</svelte:head>

<main>
	<h1>Realtime chat</h1>
	<p class="meta">channel: <code>{channelKey}</code> · status: {status}</p>

	<label>
		room
		<input bind:value={room} placeholder="lobby">
	</label>

	<ul>
		{#each messages as m (m.id)}
			<li>
				<strong>{m.sender}</strong>
				<span class="time">{new Date(m.ts).toLocaleTimeString()}</span>
				<div>{m.body}</div>
			</li>
		{:else}
			<li class="empty">no messages yet</li>
		{/each}
	</ul>

	<form onsubmit={(e) => { e.preventDefault(); send() }}>
		<input bind:value={text} placeholder="type a message…" autocomplete="off">
		<button type="submit">send</button>
	</form>
</main>

<style>
main {
	max-width: 42rem;
	margin: 2rem auto;
	padding: 0 1rem;
	font-family: system-ui, sans-serif;
}
h1 {
	font-size: 1.25rem;
}
.meta {
	color: #666;
	font-size: 0.85rem;
}
code {
	background: #f0f0f0;
	padding: 0 0.25rem;
	border-radius: 4px;
}
label {
	display: block;
	margin: 0.5rem 0;
}
input {
	padding: 0.4rem;
	border: 1px solid #ccc;
	border-radius: 6px;
}
ul {
	list-style: none;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}
li {
	border: 1px solid #eee;
	border-radius: 8px;
	padding: 0.5rem 0.75rem;
}
li.empty {
	color: #999;
	font-style: italic;
}
.time {
	color: #999;
	font-size: 0.75rem;
	margin-left: 0.5rem;
}
form {
	display: flex;
	gap: 0.5rem;
	margin-top: 1rem;
}
form input {
	flex: 1;
}
button {
	padding: 0.4rem 1rem;
	border: 0;
	border-radius: 6px;
	background: #2563eb;
	color: #fff;
	cursor: pointer;
}
</style>
