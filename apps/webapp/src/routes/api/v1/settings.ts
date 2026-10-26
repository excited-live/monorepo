import { createFileRoute } from "@tanstack/react-router"
import { forwardToBackend } from "../../../lib/bff-proxy"

export const Route = createFileRoute("/api/v1/settings")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				return forwardToBackend(request, "/api/v1/settings")
			},
			// HEAD mirrors GET like every other server route: forward the same GET
			// upstream and return its status and headers with no body.
			HEAD: async ({ request }: { request: Request }) => {
				const response = await forwardToBackend(asGet(request), "/api/v1/settings")
				return withoutBody(response)
			},
			PUT: async ({ request }: { request: Request }) => {
				return forwardToBackend(request, "/api/v1/settings")
			},
		},
	},
})

/**
 * Show the backend a GET so HEAD gets the same answer the GET would.
 * Rebuild rather than `new Request(request, …)`: the SSR request may come from
 * another realm (vite dev / workerd) whose Request instances undici rejects.
 */
function asGet(request: Request): Request {
	const headers = new Headers()
	request.headers.forEach((value, key) => headers.set(key, value))
	return new Request(request.url, { method: "GET", headers })
}

/** Keep status, statusText and headers (including content-length, per RFC 9110) but send no body. */
function withoutBody(response: Response): Response {
	const headers = new Headers()
	response.headers.forEach((value, key) => headers.set(key, value))
	return new Response(null, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}
