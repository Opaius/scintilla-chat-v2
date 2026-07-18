import type { RequestHandler } from './$types'

// Same-origin proxy for Better Auth. The browser calls /api/auth/* on the
// frontend origin; we forward to the backend worker via the BACKEND service
// binding so the session cookie stays on the frontend origin (enabling SSR
// session forwarding).
//
// We strip host/origin/referer so the backend treats the request as
// same-origin to itself (no cross-origin validation). The service binding
// returns a cross-realm Response that SvelteKit's route handler rejects
// ("handler should return a Response object"), so we rebuild it in this realm.
const handler: RequestHandler = async ({ request, platform }) => {
	const backend = (platform?.env as { BACKEND?: Fetcher } | undefined)?.BACKEND
	if (!backend) {
		return new Response('BACKEND binding not configured', { status: 500 })
	}
	const url = new URL(request.url)
	const headers = new Headers(request.headers)
	headers.delete('host')
	headers.delete('origin')
	headers.delete('referer')
	const target = `http://localhost:8788${url.pathname}${url.search}`
	const res = await backend.fetch(target, {
		method: request.method,
		headers,
		body: request.body,
	})
	const text = await res.text()
	return new Response(text, { status: res.status, headers: new Headers(res.headers) })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
