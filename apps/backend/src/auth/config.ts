import { remultAdapter } from '@nerdfolio/remult-better-auth'
import { Account, Session, User, Verification } from '@scintilla/shared'
import { betterAuth } from 'better-auth'
import type { Bindings } from '../env.js'

// Constructed from the Worker env bindings — never process.env (no process in workers).
// Return type is inferred per-call so it matches betterAuth's generic exactly.
function buildAuth(env: Bindings) {
	return betterAuth({
		baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:8788',
		secret: env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-production-32chars',
		trustedOrigins: (env.AUTH_TRUSTED_ORIGINS ?? 'http://localhost:5173')
			.split(',')
			.map((o) => o.trim())
			.filter(Boolean),
		database: remultAdapter({
			authEntities: { User, Session, Account, Verification },
			dataProvider: import('./data-provider.js').then((m) => m.dataProvider),
		}),
		emailAndPassword: {
			enabled: true,
		},
	})
}

type AuthInstance = ReturnType<typeof buildAuth>

let authInstance: AuthInstance | undefined

export function initAuth(env: Bindings): AuthInstance {
	if (authInstance) return authInstance
	authInstance = buildAuth(env)
	return authInstance
}

export function getAuth(): AuthInstance {
	if (!authInstance) throw new Error('auth not initialized')
	return authInstance
}
