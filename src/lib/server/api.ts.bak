import { remultApi } from 'remult/remult-sveltekit';
import { createD1DataProvider } from 'remult/remult-d1';
import type { RequestEvent } from '@sveltejs/kit';
import { User, Session, Account, Verification } from '$lib/entities/auth';
import { Test } from '$lib/entities/test-todo';
import { initDataProvider } from './data-provider';
import type { UserInfo } from 'remult';

export const api = remultApi({
	entities: [User, Session, Account, Verification, Test],
	initRequest: async (event: RequestEvent, { remult }) => {
		initDataProvider(event);
		const db = event.platform?.env?.DB;
		if (db) {
			remult.dataProvider = createD1DataProvider(db);
		}
	},
	getUser: async (event) => {
		const { auth } = await import('./auth');
		const session = await auth.api.getSession({
			headers: event.request.headers,
		});
		if (!session) return undefined;
		const { id, name, image } = session.user;
		return { id, name, roles: [] } satisfies UserInfo;
	},
});
