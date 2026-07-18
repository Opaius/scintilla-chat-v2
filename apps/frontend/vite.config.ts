import { fileURLToPath } from 'node:url'
import adapter from '@sveltejs/adapter-cloudflare'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	resolve: {
		alias: {
			// PandaCSS generated dir is gitignored and not linked into node_modules,
			// so resolve the bare `styled-system/*` specifier to it directly.
			'styled-system': fileURLToPath(new URL('./styled-system', import.meta.url)),
		},
	},
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
