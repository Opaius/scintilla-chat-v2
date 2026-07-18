#!/usr/bin/env node
// Local realtime dev for the single Cloudflare Worker.
//
// `vite dev` (adapter-cloudflare) runs the Vite/Node pipeline and does NOT export
// Durable Object classes from the worker entry, so workerd warns and realtime is
// unavailable. The fix is to serve the *built* worker (which already has the DO
// exports injected by `sveltekit-cloudflare-durable-objects`) under the real
// workerd runtime via `wrangler dev`. `vite build --watch` keeps the build fresh.
//
// This keeps the single-worker model — no separate DO worker is introduced.
const PORT = process.env.CF_DEV_PORT ?? '8788';


// 1. One-shot build so .svelte-kit/cloudflare/_worker.js (with DO exports) exists
//    before wrangler dev starts, otherwise wrangler fails to find its entry.
const initial = spawnSync('bunx', ['vite', 'build'], {
	stdio: 'inherit',
	env: process.env,
});
if (initial.status !== 0) process.exit(initial.status ?? 1);

// 2. Keep the build fresh and serve it under workerd.
const build = spawn('bunx', ['vite', 'build', '--watch'], {
	stdio: 'inherit',
	env: process.env,
});
const wrangler = spawn('bunx', ['wrangler', 'dev', '--port', PORT], {
	stdio: 'inherit',
	env: process.env,
});

function shutdown(code) {
	build.kill('SIGTERM');
	wrangler.kill('SIGTERM');
	process.exit(code ?? 0);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
wrangler.on('exit', (code) => shutdown(code ?? 0));
build.on('exit', (code) => shutdown(code ?? 0));
