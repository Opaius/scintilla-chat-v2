import { remultAdapter } from '@nerdfolio/remult-better-auth'
import { Account, Session, User, Verification } from '@scintilla/shared'
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:8788',
	secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-production-32chars',
	trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS ?? 'http://localhost:5173')
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
