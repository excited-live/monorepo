import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createApp } from "./app"
import { DB_FILE_ENV, resetDbCache, resolveDb } from "./db"
import { resetTokensAuthCache } from "./lib/auth"
import worker from "./worker"

/**
 * Worker fail-closed (#30, criterion 2).
 *
 * On Workers a missing or mistyped `BETTER_AUTH_SECRET` (a bad rotation, a
 * renamed binding) used to make every account impersonable: `getUserId()` falls
 * back to the plain `x-user-id` header whenever `tokensAuthConfigured()` is
 * false. The Worker entry now builds the app with `requireAuthConfig: true`, so
 * `/api/v1/*` and `/mcp` answer 503 before any handler or the dev identity
 * fallback runs. The Node dev entry (`index.ts`) is unchanged: it already exits
 * without the secret.
 *
 * The route list is taken from the app's own route table, so a route added
 * later cannot silently ship outside the gate.
 */

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const
const originalSecret = process.env.BETTER_AUTH_SECRET
const tempDirs: string[] = []

beforeEach(() => {
	delete process.env.BETTER_AUTH_SECRET
	resetTokensAuthCache()
})

afterEach(() => {
	if (originalSecret === undefined) delete process.env.BETTER_AUTH_SECRET
	else process.env.BETTER_AUTH_SECRET = originalSecret
	delete process.env[DB_FILE_ENV]
	resetTokensAuthCache()
	resetDbCache()
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-worker-lockdown-"))
	tempDirs.push(dir)
	return join(dir, "api.sqlite")
}

/** Every concrete /api/v1 route (params replaced with a literal) and /mcp. */
function protectedRoutes(): Array<{ method: string; path: string }> {
	const seen = new Map<string, { method: string; path: string }>()
	for (const route of createApp({ requireAuthConfig: true }).routes) {
		const isApi = route.path.startsWith("/api/v1")
		const isMcp = route.path === "/mcp"
		if (!isApi && !isMcp) continue
		// Wildcard entries are middleware/mounts, not callable routes.
		if (route.path.endsWith("*")) continue
		const methods = route.method === "ALL" ? METHODS : [route.method]
		for (const method of methods) {
			const path = route.path.replace(/:[A-Za-z0-9_]+(\{[^}]*\})?/g, "x")
			seen.set(`${method} ${path}`, { method, path })
		}
	}
	return [...seen.values()]
}

function probe(method: string, path: string, headers: Record<string, string>): Request {
	const hasBody = method !== "GET" && method !== "DELETE"
	return new Request(`http://localhost${path}`, {
		method,
		headers: {
			...(hasBody ? { "content-type": "application/json" } : {}),
			accept: "application/json, text/event-stream",
			...headers,
		},
		...(hasBody ? { body: method === "POST" && path === "/mcp" ? JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) : "{}" } : {}),
	})
}

describe("Worker entry: BETTER_AUTH_SECRET unset", () => {
	it("answers 503 on /api/v1/settings and /mcp instead of trusting x-user-id", async () => {
		const headers = { "x-user-id": "attacker" }
		for (const [method, path] of [
			["GET", "/api/v1/settings"],
			["GET", "/api/v1/books"],
			["GET", "/api/v1/onboarding"],
			["POST", "/mcp"],
		] as const) {
			const res = await worker.fetch(probe(method, path, headers), {} as never, {} as never)
			expect(res.status, `${method} ${path}`).toBe(503)
		}
	})

	it("answers 503 on every /api/v1 route and /mcp for x-user-id only", async () => {
		const routes = protectedRoutes()
		expect(routes.length).toBeGreaterThan(20)
		// The routes Ada called out in #30 must be among them.
		expect(routes).toContainEqual({ method: "GET", path: "/api/v1/settings" })
		expect(routes.filter((r) => r.path === "/mcp").map((r) => r.method)).toEqual(
			expect.arrayContaining(["GET", "POST", "DELETE"]),
		)

		const failures: string[] = []
		for (const { method, path } of routes) {
			const res = await worker.fetch(probe(method, path, { "x-user-id": "attacker" }), {} as never, {} as never)
			if (res.status !== 503) failures.push(`${method} ${path} -> ${res.status}`)
		}
		expect(failures).toEqual([])
	})

	it("keeps the public surface reachable", async () => {
		for (const path of ["/health", "/", "/openapi.json"]) {
			const res = await worker.fetch(probe("GET", path, {}), {} as never, {} as never)
			expect(res.status, path).toBe(200)
		}
	})
})

describe("Worker entry: BETTER_AUTH_SECRET set", () => {
	beforeEach(() => {
		process.env.BETTER_AUTH_SECRET = "worker-lockdown-test-secret-0123456789abcdef"
		resetTokensAuthCache()
	})

	it("401s x-user-id alone on /api/v1 and /mcp", async () => {
		for (const [method, path] of [
			["GET", "/api/v1/settings"],
			["GET", "/api/v1/books"],
			["POST", "/mcp"],
		] as const) {
			const res = await worker.fetch(probe(method, path, { "x-user-id": "attacker" }), {} as never, {} as never)
			expect(res.status, `${method} ${path}`).toBe(401)
		}
	})
})

describe("Node dev entry (no fail-closed flag)", () => {
	it("keeps today's x-user-id passthrough so local dev still works", async () => {
		const db = await resolveDb(undefined, { [DB_FILE_ENV]: tempDbFile() })
		const app = createApp({ db: db.driver })
		const res = await app.request("/api/v1/settings", { headers: { "x-user-id": "dev-user" } })
		expect(res.status).toBe(200)
	})
})
