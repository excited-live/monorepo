import { describe, expect, it } from "vitest"
import { jsonWellKnownError, pathInsertTarget, rewritePathInsert, withNativeLoopbackDefault } from "./well-known"

const origin = "https://auth.excited.live"

describe("path-insert discovery", () => {
	it.each(["oauth-authorization-server", "openid-configuration"])("maps %s onto the auth mount", (doc) => {
		const target = pathInsertTarget(new URL(`${origin}/.well-known/${doc}/api/auth`))
		expect(target?.pathname).toBe(`/api/auth/.well-known/${doc}`)
		const req = rewritePathInsert(new Request(`${origin}/.well-known/${doc}/api/auth`, { headers: { accept: "application/json" } }))
		expect(new URL(req!.url).pathname).toBe(`/api/auth/.well-known/${doc}`)
		expect(req!.headers.get("accept")).toBe("application/json")
	})

	it("leaves other paths and non-GET methods alone", () => {
		expect(rewritePathInsert(new Request(`${origin}/.well-known/foo/api/auth`))).toBeNull()
		expect(rewritePathInsert(new Request(`${origin}/.well-known/oauth-authorization-server`))).toBeNull()
		expect(rewritePathInsert(new Request(`${origin}/.well-known/oauth-authorization-server/api/auth`, { method: "POST" }))).toBeNull()
	})
})

describe("jsonWellKnownError", () => {
	it("turns an HTML 500 or 404 into a JSON 404", async () => {
		for (const status of [404, 500]) {
			const out = jsonWellKnownError(new Response("<html>", { status, headers: { "content-type": "text/html" } }))
			expect(out.status).toBe(404)
			expect(out.headers.get("content-type")).toBe("application/json")
			expect(await out.json()).toEqual({ error: "not_found" })
		}
	})
	it("passes successes and JSON 4xx through", () => {
		const ok = new Response("{}", { status: 200 })
		expect(jsonWellKnownError(ok)).toBe(ok)
		const bad = new Response("{}", { status: 400, headers: { "content-type": "application/json" } })
		expect(jsonWellKnownError(bad)).toBe(bad)
	})
})

describe("withNativeLoopbackDefault", () => {
	const register = (body: unknown, path = "/api/auth/oauth2/register") =>
		new Request(`${origin}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
	const typeOf = async (req: Request) => ((await req.json()) as Record<string, unknown>).application_type

	it("defaults loopback-only registrations to native", async () => {
		for (const uri of ["http://localhost:33418/callback", "http://127.0.0.1:8080/cb", "http://[::1]:9/cb"]) {
			expect(await typeOf(await withNativeLoopbackDefault(register({ client_name: "x", redirect_uris: [uri] })))).toBe("native")
		}
	})
	it("keeps explicit types, https and mixed redirects as they were", async () => {
		const cases = [
			{ redirect_uris: ["http://localhost:1/cb"], application_type: "web" },
			{ redirect_uris: ["https://example.com/cb"] },
			{ redirect_uris: ["http://localhost:1/cb", "https://example.com/cb"] },
			{ redirect_uris: ["http://evil.example.com/cb"] },
			{ redirect_uris: [] },
		]
		for (const body of cases) {
			const out = await withNativeLoopbackDefault(register(body))
			expect(await typeOf(out)).toBe((body as { application_type?: string }).application_type)
		}
	})
	it("ignores other paths, methods and non-JSON bodies", async () => {
		const other = register({ redirect_uris: ["http://localhost:1/cb"] }, "/api/auth/sign-in/email")
		expect(await withNativeLoopbackDefault(other)).toBe(other)
		const bad = new Request(`${origin}/api/auth/oauth2/register`, { method: "POST", body: "nope" })
		expect(await withNativeLoopbackDefault(bad)).toBe(bad)
	})
})
