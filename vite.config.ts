import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import cloudflareDoExporter from 'sveltekit-cloudflare-durable-objects';
import { defineConfig } from 'vite';
import { transformSync } from 'esbuild';

const decoratorPlugin = {
    name: 'decorators',
    transform(code: string, id: string) {
        if (!id.includes('src/lib/entities/')) return;
        return transformSync(code, {
            loader: 'ts',
            tsconfigRaw: {
                compilerOptions: {
                    experimentalDecorators: true,
                    useDefineForClassFields: false,
                },
            },
            target: 'es2022',
        });
    },
};

export default defineConfig({
    ssr: {
        noExternal: [/better-auth/, /@nerdfolio/],
    },
    plugins: [
        decoratorPlugin,
        sveltekit({
            compilerOptions: {
                experimental: { async: true },
            },
            adapter: adapter(),
            experimental: { remoteFunctions: true },
        }),
        cloudflareDoExporter({
            durableObjects: ['src/lib/server/realtime/durable-object.ts'],
        }),
    ],
});
