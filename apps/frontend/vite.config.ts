import adapter from '@sveltejs/adapter-cloudflare'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	ssr: {
		noExternal: [/better-auth/],
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				experimental: { async: true },
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
			},
			adapter: adapter(),
			experimental: { remoteFunctions: true },
		}),
	],
})
