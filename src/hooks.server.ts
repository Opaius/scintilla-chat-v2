import { sequence } from '@sveltejs/kit/hooks';
import { api as handleRemult } from '$lib/server/api';
import { initDataProvider } from '$lib/server/data-provider';

export const handle = sequence(
	async ({ event, resolve }) => {
		initDataProvider(event);
		return resolve(event);
	},
	handleRemult,
);
