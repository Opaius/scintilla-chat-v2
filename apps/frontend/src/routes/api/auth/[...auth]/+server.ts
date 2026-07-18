import type { RequestHandler } from './$types'
import { getTenantContext } from '$lib/server/tenant/context'

// Same-origin proxy for Better Auth. The browser calls /api/auth/* on the
// frontend origin; we forward to the backend worker via the BACKEND service
// binding so the session cookie stays on the frontend origin (enabling SSR
// session forwarding).
//
// We forward the browser's headers transparently (Origin/Referer/Sec-Fetch-Site
// included) so Better Auth's origin-check + CSRF protections keep working.
// Strip nothing: Better Auth validates Origin against trustedOrigins, so
// dropping it would disable that check.
//
// Two realm quirks with the service binding:
//  - The request body is a cross-realm stream the binding can't read, which
//    500s POSTs, so we buffer it here with request.text().
//  - The binding returns a cross-realm Response that SvelteKit's route handler
//    rejects ("handler should return a Response object"), so we rebuild it here.
// The target URL host follows the browser connection (http dev / https prod)
// so the backend sets the session cookie's Secure flag correctly.
const handler: RequestHandler = async ({ request, platform }) => {
	const backend = (platform?.env as { BACKEND?: Fetcher } | undefined)?.BACKEND
	if (!backend) {
		return new Response('BACKEND binding not configured', { status: 500 })
	}
	const url = new URL(request.url)
	const target = `${url.protocol}//localhost:8788${url.pathname}${url.search}`
	const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
	const body = hasBody ? await request.text() : undefined
	const headers = new Headers(request.headers)
	headers.delete('content-length')
	headers.delete('transfer-encoding')
	// Forward the resolved tenant so the backend scopes auth data to this org.
	const tenant = getTenantContext()
	if (tenant?.organizationId) headers.set('x-organization-id', tenant.organizationId)
	const res = await backend.fetch(target, {
		method: request.method,
		headers,
		body,
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
