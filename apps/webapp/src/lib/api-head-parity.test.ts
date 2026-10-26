import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Route as AuthRoute } from "../routes/api/auth/$"
import { Route as SettingsRoute } from "../routes/api/v1/settings"

/**
 * #HEAD guard: HEAD must answer exactly like GET (same status and headers, no
 * body) on every webapp server route. Monitors, link checkers and `curl -I`
 * probe with HEAD; a 404 there reports a healthy service as down. Better Auth
 * answers 404 to HEAD itself, so the auth mount has to dispatch it as GET.
 */

const state = vi.hoisted(() => ({
	authMethod: "",
	settingsMethod: "",
}))

vi.mock("./auth", () => ({
	getAuth: async () => ({
		handler: async (request: Request) => {
			state.authMethod = request.method
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "content-type": "application/json" },
			})
		},
	}),
}))

vi.mock("./bff-proxy", () => ({
	forwardToBackend: async (request: Request, path: string) => {
		state.settingsMethod = request.method
		return new Response(JSON.stringify({ path }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})
	},
}))

type Handler = (context: { request: Request }) => Promise<Response>

function handler(route: unknown, method: string): Handler {
	const handlers = (route as { options: { server: { handlers: Record<string, Handler | undefined> } } }).options
		.server.handlers
	const found = handlers[method]
	if (!found) throw new Error(`route has no ${method} handler`)
	return found
}

function probe(method: string, path: string, headers?: Record<string, string>): Request {
	return new Request(`http://localhost${path}`, { method, headers })
}

async function parity(get: Response, head: Response): Promise<void> {
	expect(head.status).toBe(get.status)
	expect(await head.text()).toBe("")
	for (const name of ["content-type", "cache-control", "access-control-allow-origin", "vary"]) {
		expect(head.headers.get(name), `${name} parity`).toBe(get.headers.get(name))
	}
}

describe("auth mount HEAD/GET parity", () => {
	beforeEach(() => {
		delete process.env.BETTER_AUTH_SECRET
		state.authMethod = ""
	})

	afterEach(() => {
		delete process.env.BETTER_AUTH_SECRET
	})

	it("answers 503 like GET, never 404, when auth is not configured", async () => {
		const authGet = handler(AuthRoute, "GET")
		const authHead = handler(AuthRoute, "HEAD")
		const origin = { Origin: "https://iam.excited.live" }

		const get = await authGet({ request: probe("GET", "/api/auth/ok", origin) })
		const head = await authHead({ request: probe("HEAD", "/api/auth/ok", origin) })

		expect(get.status).toBe(503)
		await parity(get, head)
		// CORS for the iam SPA survives the HEAD rewrite.
		expect(head.headers.get("access-control-allow-origin")).toBe("https://iam.excited.live")
	})

	it("answers 200 like GET with no body when auth is configured", async () => {
		process.env.BETTER_AUTH_SECRET = "head-parity-test-secret"
		const authGet = handler(AuthRoute, "GET")
		const authHead = handler(AuthRoute, "HEAD")

		const get = await authGet({ request: probe("GET", "/api/auth/ok") })
		expect(get.status).toBe(200)

		state.authMethod = ""
		const head = await authHead({ request: probe("HEAD", "/api/auth/ok") })

		await parity(get, head)
		// Better Auth only knows GET, so HEAD must have been dispatched as GET.
		expect(state.authMethod).toBe("GET")
	})
})

describe("settings BFF route HEAD/GET parity", () => {
	beforeEach(() => {
		state.settingsMethod = ""
	})

	it("forwards HEAD as the GET it mirrors and returns status/headers with no body", async () => {
		const settingsGet = handler(SettingsRoute, "GET")
		const settingsHead = handler(SettingsRoute, "HEAD")

		const get = await settingsGet({ request: probe("GET", "/api/v1/settings") })
		expect(state.settingsMethod).toBe("GET")

		const head = await settingsHead({ request: probe("HEAD", "/api/v1/settings") })

		expect(state.settingsMethod).toBe("GET")
		await parity(get, head)
	})
})
