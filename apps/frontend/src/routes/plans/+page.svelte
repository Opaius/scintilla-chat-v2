<script lang="ts">
import { Plan } from '@scintilla/shared'
import { repo } from 'remult'
import { css } from 'styled-system/css'
import { onMount } from 'svelte'
import { authClient } from '$lib/auth-client'

// better-auth/svelte useSession() returns a nanostores Atom (Svelte-store compatible).
const session = authClient.useSession()
const isSignedIn = $derived(!!$session.data?.user)

let plans = $state<Plan[]>([])
let loading = $state(true)
let loadError = $state<string | null>(null)

// Billing: one subscription in flight at a time; track outcome per plan id.
let subscribingId = $state<string | null>(null)
const subscribed = $state<Record<string, string>>({})
const subscribeErrors = $state<Record<string, string>>({})

// Sign-in (Better Auth email/password). No dedicated route exists, so inline.
let showSignIn = $state(false)
let email = $state('')
let password = $state('')
let signingIn = $state(false)
let signInError = $state<string | null>(null)

const pageCss = css({
	minHeight: '100vh',
	backgroundColor: 'neutral',
	color: 'onSurface',
	padding: '8',
	fontFamily: 'sans',
})
const containerCss = css({ maxWidth: '960px', marginX: 'auto' })
const titleCss = css({
	fontSize: '2xl',
	fontWeight: 'bold',
	letterSpacing: 'tight',
	color: 'primary',
	marginBottom: '2',
})
const subCss = css({
	fontSize: 'md',
	color: 'onSurfaceVariant',
	marginBottom: '8',
})
const gridCss = css({
	display: 'grid',
	gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
	gap: '6',
})
const cardCss = css({
	display: 'flex',
	flexDirection: 'column',
	gap: '4',
	backgroundColor: 'surface',
	borderWidth: '1px',
	borderColor: 'neutralBorder',
	borderRadius: 'lg',
	padding: '6',
	boxShadow: 'sm',
})
const planNameCss = css({
	fontSize: 'xl',
	fontWeight: 'semibold',
	color: 'primary',
})
const priceCss = css({
	fontSize: '2xl',
	fontWeight: 'bold',
	color: 'tertiary',
})
const metaCss = css({
	fontSize: 'sm',
	color: 'onSurfaceVariant',
})
const featuresCss = css({
	listStyleType: 'disc',
	paddingLeft: '5',
	display: 'flex',
	flexDirection: 'column',
	gap: '1',
	fontSize: 'sm',
	color: 'onSurface',
	flex: '1',
})
const primaryBtnCss = css({
	marginTop: '4',
	backgroundColor: 'tertiary',
	color: 'onTertiary',
	border: 'none',
	borderRadius: 'md',
	padding: '2 4',
	fontSize: 'sm',
	fontWeight: 'medium',
	cursor: 'pointer',
	_disabled: { opacity: '0.6', cursor: 'not-allowed' },
})
const bannerCss = css({
	backgroundColor: 'tertiaryContainer',
	color: 'onTertiaryContainer',
	borderRadius: 'md',
	padding: '4',
	marginBottom: '6',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: '4',
})
const formCss = css({
	display: 'flex',
	flexDirection: 'column',
	gap: '3',
	backgroundColor: 'surface',
	borderWidth: '1px',
	borderColor: 'neutralBorder',
	borderRadius: 'lg',
	padding: '6',
	maxWidth: '360px',
	marginBottom: '6',
})
const inputCss = css({
	borderWidth: '1px',
	borderColor: 'neutralBorder',
	borderRadius: 'md',
	padding: '2 3',
	fontSize: 'sm',
	backgroundColor: 'surface',
	color: 'onSurface',
	_focus: {
		borderColor: 'tertiary',
		outlineStyle: 'solid',
		outlineWidth: '2px',
		outlineColor: 'tertiary',
	},
})
const errorCss = css({ color: 'error', fontSize: 'sm' })
const successCss = css({
	color: 'tertiary',
	fontSize: 'sm',
	fontWeight: 'medium',
	marginTop: '4',
})

onMount(async () => {
	try {
		plans = await repo(Plan).find({ where: { active: true } })
	} catch (e) {
		loadError = e instanceof Error ? e.message : String(e)
	} finally {
		loading = false
	}
})

async function subscribe(p: Plan) {
	subscribingId = p.id
	delete subscribeErrors[p.id]
	delete subscribed[p.id]
	try {
		const res = await fetch('/api/billing/checkout', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ planId: p.id }),
		})
		const json = (await res.json().catch(() => ({}))) as {
			url?: string
			error?: string
			message?: string
		}
		if (!res.ok) {
			subscribeErrors[p.id] = json.error ?? json.message ?? `Request failed (${res.status})`
		} else if (json.url) {
			// Real Creem checkout — hand off to the provider.
			window.location.href = json.url
		} else {
			subscribed[p.id] = p.name
		}
	} catch (e) {
		subscribeErrors[p.id] = e instanceof Error ? e.message : String(e)
	} finally {
		subscribingId = null
	}
}

async function signIn() {
	signingIn = true
	signInError = null
	try {
		const { error } = await authClient.signIn.email({ email, password })
		if (error) signInError = error.message ?? 'Sign in failed'
		else showSignIn = false
	} catch (e) {
		signInError = e instanceof Error ? e.message : String(e)
	} finally {
		signingIn = false
	}
}
</script>

<div class={pageCss}>
	<div class={containerCss}>
		<h1 class={titleCss}>Plans</h1>
		<p class={subCss}>Choose a plan that fits your team.</p>

		{#if !isSignedIn}
			<div class={bannerCss}>
				<span>Sign in to subscribe.</span>
				<button type="button" class={primaryBtnCss} onclick={() => (showSignIn = !showSignIn)}>
					Sign in
				</button>
			</div>
			{#if showSignIn}
				<form class={formCss} onsubmit={(e) => { e.preventDefault(); signIn() }}>
					<input class={inputCss} type="email" placeholder="Email" bind:value={email} required>
					<input
						class={inputCss}
						type="password"
						placeholder="Password"
						bind:value={password}
						required
					>
					<button class={primaryBtnCss} type="submit" disabled={signingIn}>
						{signingIn ? 'Signing in…' : 'Sign in'}
					</button>
					{#if signInError}
						<p class={errorCss}>{signInError}</p>
					{/if}
				</form>
			{/if}
		{/if}

		{#if loading}
			<p class={metaCss}>Loading plans…</p>
		{:else if loadError}
			<p class={errorCss}>{loadError}</p>
		{:else}
			<div class={gridCss}>
				{#each plans as p (p.id)}
					<div class={cardCss}>
						<h3 class={planNameCss}>{p.name}</h3>
						<div class={priceCss}>${p.priceMonthly}/mo</div>
						<div class={metaCss}>{p.includedMinutes} included minutes</div>
						<div class={metaCss}>{p.seatLimit} seat{p.seatLimit === 1 ? '' : 's'}</div>
						{#if p.features.length}
							<ul class={featuresCss}>
								{#each p.features as f (f)}
									<li>{f}</li>
								{/each}
							</ul>
						{/if}
						{#if subscribed[p.id]}
							<p class={successCss}>Subscribed to {p.name}</p>
						{:else if isSignedIn}
							<button
								type="button"
								class={primaryBtnCss}
								aria-label="Subscribe to {p.name}"
								onclick={() => subscribe(p)}
								disabled={subscribingId === p.id}
							></button>
						{/if}
						{#if subscribeErrors[p.id]}
							<p class={errorCss}>{subscribeErrors[p.id]}</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
