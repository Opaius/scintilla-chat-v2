import { remult } from 'remult';
import { createSubscriber } from 'svelte/reactivity';

// Svelte 5 reactivity for Remult auth state (remult.user, remult.authenticated())
const authSubscriber = createSubscriber(() => {});
remult.subscribeAuth(() => {
	authSubscriber();
});

export { remult };
