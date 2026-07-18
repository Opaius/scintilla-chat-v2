import type { RequestEvent } from '@sveltejs/kit'
import { auth } from '$lib/server/auth/config'
export const GET = async (event: RequestEvent) => auth.handler(event.request)
export const POST = async (event: RequestEvent) => auth.handler(event.request)
