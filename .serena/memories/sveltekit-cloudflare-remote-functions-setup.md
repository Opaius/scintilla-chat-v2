Setting up a SvelteKit project with adapter-cloudflare and the experimental remote functions feature.

Key decisions/learnings:
- Scaffold with `npx sv create . --template minimal --types ts --no-add-ons --no-dir-check --install npm`. The `sv` CLI add-on syntax for adapters differs from the docs; easiest to scaffold with adapter-auto then swap.
- SvelteKit 2.63+ merges svelte.config into vite.config.ts. To enable remote functions, set `sveltekit({ adapter: adapter(), experimental: { remoteFunctions: true }, compilerOptions: { experimental: { async: true } } })` inside vite.config.ts (import adapter from '@sveltejs/adapter-cloudflare').
- Remote functions live in `*.remote.ts` files (e.g. `src/routes/data.remote.ts`) and export `query`/`form`/`command`/`prerender` from `$app/server`. Used in components via `await func()`.
- Cloudflare build output goes to `build/` (`_worker.js`, `_routes.json`, `_headers`). Deploy with `wrangler pages deploy build`; add `wrangler.toml` with `pages_build_output_dir = "./build"`.

Environment gotcha (this machine): global ~/.npmrc has `allow-scripts` allowlist. `npm install` fails with EALLOWSCRIPTS unless package.json declares its own `allowScripts` field. Add `allowScripts: { "@sveltejs/kit": true, esbuild: true, wrangler: true }`. workerd and sharp postinstall are blocked but only needed for `wrangler dev`/image optimization.

User preference to remember: "always use bun" (per /remember instruction) — prefer bun over npm in future sessions for this project.