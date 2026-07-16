import type { DataProvider } from 'remult';
import type { RequestEvent } from '@sveltejs/kit';

let _resolve: ((dp: DataProvider) => void) | null = null;
let _resolved = false;

export const dataProvider: Promise<DataProvider> = new Promise((resolve) => {
	_resolve = resolve;
});

export function initDataProvider(event: RequestEvent) {
	if (_resolved) return;
	_resolved = true;

	const db = event.platform?.env?.DB;
	if (db) {
		import('remult/remult-d1').then(({ createD1DataProvider }) => {
			_resolve!(createD1DataProvider(db));
		});
	} else {
		import('remult').then(({ remult }) => {
			_resolve!(remult.dataProvider);
		});
	}
}
