import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app"
import { getDb, resetDbCache } from "."
import { getTokensAuth, resetTokensAuthCache } from "../lib/auth"
import { createD1SqliteStub } from "./d1-sqlite-stub"
import type { D1DatabaseLike } from "./types"

/**
 * #158: on Workers, a promise started by one request and left pending when that
 * request ends never settles. Anything cached at module scope that a LATER
 * request awaits then hangs that request for the whole wall clock at ~0 CPU.
 *
 * The Workers runtime is not available in vitest, so these tests pin the
 * invariant instead: with a D1 binding, no in-flight promise and no Better Auth
 * instance (whose init() starts eagerly) is shared between calls. The runtime
 * proof is apps/api/scripts/auth-hang-probe.mjs against `wrangler dev`.
 */

const tempDirs: string[] = []
function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-scope-"))
	tempDirs.push(dir)
	return join(dir, "d1.sqlite")
}

afterEach(() => {
	delete process.env.BETTER_AUTH_SECRET
	delete process.env.BETTER_AUTH_URL
	resetDbCache()
	resetTokensAuthCache()
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const settles = (promise: Promise<unknown>, ms = 1500) =>
	Promise.race([
		promise.then(() => true),
		new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
	])

describe("D1 requests share no in-flight state (#158)", () => {
	it("getDb: a request whose D1 query never settles does not hang the next request", async () => {
		const stub = createD1SqliteStub(tempDbFile())
		let abandonFirst = true
		const binding: D1DatabaseLike = {
			...stub.binding,
			prepare(sql: string) {
				if (abandonFirst) {
					abandonFirst = false
					// The first request's query: its request ended, so it never answers.
					return { ...stub.binding.prepare(sql), bind: () => ({ all: () => new Promise(() => {}) }) } as never
				}
				return stub.binding.prepare(sql)
			},
		}
		const env = { DB: binding }

		void getDb(env) // request A: abandoned mid-boot, promise left pending forever
		await expect(settles(getDb(env))).resolves.toBe(true) // request B must not wait on A
	})

	it("getDb: after a successful boot the hot path issues no migration queries", async () => {
		const stub = createD1SqliteStub(tempDbFile())
		const env = { DB: stub.binding }
		await getDb(env)
		const before = stub.calls.length
		await getDb(env)
		await getDb(env)
		expect(stub.calls.length).toBe(before)
	})

	it("getTokensAuth: an instance is published for reuse only after its init settled", async () => {
		process.env.BETTER_AUTH_SECRET = "scope-test-secret-0123456789abcdef0123456789"
		const stub = createD1SqliteStub(tempDbFile())
		const env = { DB: stub.binding }
		const url = "http://localhost:8787/api/v1/auth/get-session"
		const first = await getTokensAuth(url, env)
		expect(first).not.toBeNull()
		// Reused on the hot path, and its context is already settled.
		expect(await getTokensAuth(url, env)).toBe(first)
		await expect(settles(first!.$context)).resolves.toBe(true)
	})

	it("an anonymous 401 first does not stop sign-up and get-session from answering", async () => {
		process.env.BETTER_AUTH_SECRET = "scope-test-secret-0123456789abcdef0123456789"
		process.env.BETTER_AUTH_URL = "http://localhost:8787"
		const stub = createD1SqliteStub(tempDbFile())
		const env = { DB: stub.binding }
		const app = createApp()

		expect((await app.request("/api/v1/settings", {}, env)).status).toBe(401)
		expect((await app.request("/mcp", { method: "POST" }, env)).status).toBe(401)

		const signUp = await app.request(
			"/api/v1/auth/sign-up/email",
			{
				method: "POST",
				headers: { "content-type": "application/json", origin: "http://localhost:8787" },
				body: JSON.stringify({ name: "V", email: "verify+scope@example.com", password: "verify-pass-1234" }),
			},
			env,
		)
		expect(signUp.status).toBe(200)
		expect((await app.request("/api/v1/auth/get-session", {}, env)).status).toBe(200)
	})
})
