import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import * as esbuild from 'esbuild';

export default defineConfig({
	ssr: {
		noExternal: [/better-auth/, /@nerdfolio/, /jose/, /@noble/, /better-call/, /defu/, /kysely/, /zod/],
	},
	plugins: [
		{
			name: 'decorator-transform',
			transform(code, id) {
				if (!id.includes('src/lib/entities/')) return;
				const result = esbuild.transformSync(code, {
					loader: 'ts',
					tsconfigRaw: {
						compilerOptions: {
							experimentalDecorators: true,
							useDefineForClassFields: false,
						},
					},
					target: 'es2022',
				});
				return { code: result.code, map: result.map };
			},
		},
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true },
			},
			adapter: adapter(),
			experimental: { remoteFunctions: true },
		}),
	],
});
