import { createAuthClient } from 'better-auth/svelte'
import { env as publicEnv } from '$env/dynamic/public'

// Browser-side Better Auth client. baseURL points at the backend worker:
// `PUBLIC_BACKEND_URL` if set, otherwise derived from the WS host
// (`PUBLIC_BACKEND_WS_HOST` -> https://<host>). The backend exposes its auth
// handlers at `/api/auth`.
const backendUrl =
	publicEnv.PUBLIC_BACKEND_URL ??
	(publicEnv.PUBLIC_BACKEND_WS_HOST ? `https://${publicEnv.PUBLIC_BACKEND_WS_HOST}` : '')

export const authClient = createAuthClient({
	baseURL: backendUrl || undefined,
})
