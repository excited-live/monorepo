import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "./app"
import { DB_FILE_ENV, resetDbCache } from "./db"
import { resetTokensAuthCache } from "./lib/auth"
import { ALL_TOOLS } from "./modules/mcp/registry"

/**
 * Route-by-route lockdown (issue #30): with auth configured, every /api/v1
 * route and every MCP tool must answer 401 to a call with no bearer token or
 * an invalid one. The route list comes from the app's own route table, so a
 * new route cannot ship open without this test noticing.
 */

const tempDirs: string[] = []

afterEach(() => {
	delete process.env.BETTER_AUTH_SECRET
	delete process.env.BETTER_AUTH_URL
	delete process.env[DB_FILE_ENV]
	resetTokensAuthCache()
	resetDbCache()
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function configuredApp() {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-lockdown-"))
	tempDirs.push(dir)
	process.env.BETTER_AUTH_SECRET = "test-secret-for-lockdown-tests-0123456789"
	process.env.BETTER_AUTH_URL = "http://localhost:8787"
	process.env[DB_FILE_ENV] = join(dir, "api.sqlite")
	resetDbCache()
	return createApp()
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const
// The sign-in/sign-up/OAuth-metadata surface is public by design.
const PUBLIC_PREFIX = "/api/v1/auth"

function protectedRoutes(app: ReturnType<typeof configuredApp>): Array<{ method: string; path: string }> {
	const seen = new Map<string, { method: string; path: string }>()
	for (const route of app.routes) {
		if (!route.path.startsWith("/api/v1")) continue
		if (route.path === PUBLIC_PREFIX || route.path.startsWith(`${PUBLIC_PREFIX}/`)) continue
		if (route.path.endsWith("*")) continue
		// Middleware registers as ALL: probe every concrete verb for those.
		const methods = route.method === "ALL" ? METHODS : [route.method]
		for (const method of methods) {
			const path = route.path.replace(/:[A-Za-z0-9_]+(\{[^}]*\})?/g, "x")
			seen.set(`${method} ${path}`, { method, path })
		}
	}
	return [...seen.values()]
}

const credentials: Array<[string, Record<string, string>]> = [
	["no credentials", {}],
	["an empty bearer", { Authorization: "Bearer" }],
	["an invalid bearer", { Authorization: "Bearer not-a-real-token" }],
	["an x-user-id header only", { "x-user-id": "user-a" }],
]

describe("auth lockdown: /api/v1", () => {
	it("discovers the real routes", () => {
		const routes = protectedRoutes(configuredApp())
		const paths = new Set(routes.map((r) => r.path))
		for (const expected of [
			"/api/v1/settings",
			"/api/v1/onboarding",
			"/api/v1/agent-keys",
			"/api/v1/catalog",
			"/api/v1/accounting",
		]) {
			expect([...paths].some((p) => p.startsWith(expected)), `missing ${expected}`).toBe(true)
		}
	})

	it("covers every path in the OpenAPI document", async () => {
		const app = configuredApp()
		const doc = (await (await app.request("/openapi.json")).json()) as { paths: Record<string, unknown> }
		const covered = new Set(protectedRoutes(app).map((r) => r.path.replace(/\/x(?=\/|$)/g, "/{}")))
		for (const path of Object.keys(doc.paths)) {
			if (!path.startsWith("/api/v1") || path.startsWith(PUBLIC_PREFIX)) continue
			expect(covered.has(path.replace(/\{[^}]+\}/g, "{}")), `${path} is not probed`).toBe(true)
		}
	})

	it("answers 401 on every route without a valid bearer token", async () => {
		const app = configuredApp()
		const routes = protectedRoutes(app)
		expect(routes.length).toBeGreaterThan(10)
		const failures: string[] = []
		for (const { method, path } of routes) {
			for (const [label, headers] of credentials) {
				const hasBody = method !== "GET" && method !== "DELETE"
				const res = await app.request(path, {
					method,
					headers: { ...(hasBody ? { "content-type": "application/json" } : {}), ...headers },
					...(hasBody ? { body: "{}" } : {}),
				})
				if (res.status !== 401) failures.push(`${method} ${path} with ${label} -> ${res.status}`)
			}
		}
		expect(failures).toEqual([])
	})
})

describe("auth lockdown: /mcp", () => {
	const rpcHeaders = { "content-type": "application/json", accept: "application/json, text/event-stream" }

	it("answers 405 to GET/DELETE before auth and 401 to POST without a key", async () => {
		const app = configuredApp()
		// The optional SSE stream is not implemented, so the method gate runs
		// before auth resolution (#142); POST is the only MCP verb.
		for (const method of ["GET", "DELETE"] as const) {
			const res = await app.request("/mcp", { method, headers: rpcHeaders })
			expect(res.status, method).toBe(405)
			expect(res.headers.get("allow"), method).toBe("POST")
		}
		const post = await app.request("/mcp", {
			method: "POST",
			headers: rpcHeaders,
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		})
		expect(post.status).toBe(401)
	})

	it("answers 401 to every tool call with no key or an invalid key", async () => {
		const app = configuredApp()
		expect(ALL_TOOLS.length).toBeGreaterThan(0)
		const failures: string[] = []
		for (const tool of ALL_TOOLS) {
			for (const auth of [undefined, "Bearer not-a-real-key", "Bearer exl_invalid"]) {
				const res = await app.request("/mcp", {
					method: "POST",
					headers: { ...rpcHeaders, ...(auth ? { Authorization: auth } : {}) },
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method: "tools/call",
						params: { name: tool.name, arguments: {} },
					}),
				})
				if (res.status !== 401) failures.push(`${tool.name} with ${auth ?? "no key"} -> ${res.status}`)
			}
		}
		expect(failures).toEqual([])
	})
})
