import { afterEach, describe, expect, it, vi } from "vitest"
import { createD1SqliteStub } from "../db/d1-sqlite-stub"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * #158 regression: the instance one request builds must not reach another
 * request until its init() has settled. The first build here gets an init that
 * never settles (a request that ended mid-init); a later request must still get
 * a usable instance.
 */
const builds: { $context: Promise<unknown> }[] = []
vi.mock("@excited-live/auth", () => ({
	createAuth: () => {
		const context = builds.length === 0 ? new Promise<unknown>(() => {}) : Promise.resolve({})
		const auth = { $context: context }
		builds.push(auth)
		return auth
	},
}))

const { getTokensAuth, resetTokensAuthCache } = await import("./auth")

const dir = mkdtempSync(join(tmpdir(), "excited-api-auth-scope-"))
afterEach(() => {
	delete process.env.BETTER_AUTH_SECRET
	resetTokensAuthCache()
})

const settles = (promise: Promise<unknown>, ms = 1000) =>
	Promise.race([promise.then(() => true), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms))])

describe("getTokensAuth (D1)", () => {
	it("never hands another request an instance whose init has not settled", async () => {
		process.env.BETTER_AUTH_SECRET = "scope-test-secret-0123456789abcdef0123456789"
		const env = { DB: createD1SqliteStub(join(dir, "d1.sqlite")).binding }
		const url = "http://localhost:8787/api/v1/auth/get-session"

		void getTokensAuth(url, env) // request A: init never finishes, A is gone
		await new Promise((resolve) => setTimeout(resolve, 20)) // let A reach its build
		const authB = await getTokensAuth(url, env) // request B
		expect(await settles(authB!.$context)).toBe(true)

		rmSync(dir, { recursive: true, force: true })
	})
})
