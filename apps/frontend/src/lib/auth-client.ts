import { createAuthClient } from 'better-auth/svelte'

// Auth is same-origin: the browser calls /api/auth/* on the frontend origin,
// which is proxied to the backend worker (see
// src/routes/api/auth/[...auth]/+server.ts). Keeping it same-origin means the
// session cookie is set on the frontend origin, so SSR can forward it to the
// backend via the BACKEND service binding.
export const authClient = createAuthClient({})
