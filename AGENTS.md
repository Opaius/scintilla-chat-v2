## Project Configuration

- **Language**: TypeScript
- **Package Manager**: bun
- **Add-ons**: remult, PandaCSS, Ark UI Svelte
- **Design**: `docs/DESIGN.md` (Google Labs format) + PandaCSS theme tokens


---

# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

## Child DOX Index

### src/
| Child | Scope |
|---|---|
| `src/lib/AGENTS.md` | Entities, server API, auth config, tenant scoping |

### src/routes/
No child doc — simple page + remote function + API catch-all route + Better Auth handler.

### docs/
| Child | Scope |
|---|---|
| `docs/AGENTS.md` | Planning docs index, multi-tenancy architecture reference |


### Better Auth

- `src/routes/api/auth/[...auth]/+server.ts` — routes to `auth.handler`
- Remult adapter `@nerdfolio/remult-better-auth` connects Better Auth to Remult's dataProvider
- Entities auto-generated via `@better-auth/cli generate`

### PandaCSS

- Config at `panda.config.ts` — includes `src/**/*.svelte` files
- PostCSS via `postcss.config.cjs` — `@pandacss/dev/postcss` plugin
- Layer definitions at `src/app.css` — imported in `+layout.svelte`
- Generated utilities in `styled-system/` — gitignored, regenerate via `bunx panda codegen` after config changes
- CSS utilities import from `styled-system/css`, patterns from `styled-system/patterns`

### docs/DESIGN.md

- `docs/DESIGN.md` — Google Labs design spec format
- Defines colors, typography, spacing, radii, elevation, and component patterns
- PandaCSS `panda.config.ts` tokens mirror the DESIGN.md values
- Run `bunx panda codegen` after changing either file to regenerate `styled-system/`

## Build Workflow

- `bun run build` — runs `panda codegen` (via postcss), SvelteKit build, Cloudflare adapter
- `bun run check` — runs all checks via `scripts/check-all.sh`: svelte-kit sync → svelte-check → tsc → biome → fallow. Only outputs findings.
- `bun run format` — `biome format --write src/`
- `bun run lint` — `biome check --write src/`

### Biome

- Config at `biome.json` — v2.5.4 with Svelte support via `html.experimentalFullSupportEnabled`
- Svelte-specific nursery rules enabled: `noSvelteUnnecessaryStateWrap` (error), `useSvelteRequireEachKey` (warn)
- Uses `.gitignore` via VCS integration; additional excludes for `styled-system`, `.svelte-kit`, `build`, `.wrangler`, `packages`
- Quote style: single; semicolons: as-needed

### Fallow

- Config at `fallow.toml` — dead code, duplication, dependency, and complexity analysis
- Entry: `src/**/*.{ts,svelte}`
- Duplicate detection ignores generated dirs; `minOccurrences = 3`
- Run standalone: `bun x fallow`

## Multi-Tenancy

Single D1 database, all rows scoped by `organizationId` on `user`, `session`, `account`.
See `docs/AGENTS.md` for the full architecture breakdown and `docs/multi-tenancy-plan.md`
for the complete plan (evolution path, security, edge cases).
