import { remultAdapter } from '@nerdfolio/remult-better-auth'
import { betterAuth } from 'better-auth'
import { Account, Session, User, Verification } from '$lib/entities/auth'

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',
	secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-production-32chars',
	database: remultAdapter({
		authEntities: { User, Session, Account, Verification },
		dataProvider: import('$lib/server/auth/data-provider').then((m) => m.dataProvider),
	}),
	emailAndPassword: {
		enabled: true,
	},
})
