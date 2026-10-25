import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it } from "vitest"
import { createAuth, OAUTH_CODE_TTL_SECONDS } from "./server"
import type { AuthD1DatabaseLike } from "./types"

/**
 * Round-trip proof for the auth foundation: the 0001_init.sql ledger file
 * (read from apps/api, the single source of truth; its generated Better Auth
 * block is what this package owns) must be exactly what a `both`-mount auth
 * instance needs to sign a user up and resolve their credentials — through
 * BOTH driver paths (node:sqlite and the D1 dialect), since apps/api runs the
 * same code on either backend.
 *
 * Cookie-store session resolution is NOT asserted here on purpose: the
 * tanstackStartCookies plugin hands cookie writing to the TanStack Start
 * runtime, which does not exist in a bare Node process. That path is covered
 * by the webapp integration in Phase 2. What IS proven here is the set-cookie
 * wire format plus bearer-token and API-key resolution, which is what the api
 * mount depends on.
 */

const migrationSql = readFileSync(
	join(fileURLToPath(import.meta.url), "..", "..", "..", "..", "apps", "api", "migrations", "0001_init.sql"),
	"utf8",
)

const tempDirs: string[] = []

function freshFileDb(): DatabaseSync {
	const dir = mkdtempSync(join(tmpdir(), "excited-auth-"))
	tempDirs.push(dir)
	return new DatabaseSync(join(dir, "auth.sqlite"))
}

function applySchema(db: DatabaseSync): void {
	db.exec(migrationSql)
}

function createD1Stub(db: DatabaseSync): AuthD1DatabaseLike {
	return {
		prepare(sql: string) {
			const state: { values: (string | number | null)[] } = { values: [] }
			return {
				bind(...args: unknown[]) {
					state.values = args as (string | number | null)[]
					return this
				},
				async all<T = Record<string, unknown>>() {
					const results = db.prepare(sql).all(...state.values) as T[]
					return { results }
				},
				async run() {
					db.prepare(sql).run(...state.values)
					return { meta: { changes: 0 } }
				},
			}
		},
		async exec(sql: string) {
			db.exec(sql)
		},
	}
}

const SECRET = "test-secret-for-foundation-round-trip-only"
const BASE_URL = "http://localhost:3000"
const EMAIL = "prame@excited.live"
const PASSWORD = "correct-horse-battery"

describe("auth foundation", () => {
	let cleanup: (() => void) | null = null

	afterEach(() => {
		cleanup?.()
		cleanup = null
		for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
	})

	describe("node:sqlite path", () => {
		it("signs up, signs in, and issues a session cookie", async () => {
			const db = freshFileDb()
			applySchema(db)
			const auth = createAuth({
				database: { kind: "node-sqlite", database: db },
				secret: SECRET,
				baseURL: BASE_URL,
				mount: "both",
			})

			const signUp = await auth.api.signUpEmail({
				body: { name: "Prame", email: EMAIL, password: PASSWORD },
			})
			expect(signUp.user.email).toBe(EMAIL)
			expect(signUp.token).toBeTruthy()

			const signIn = await auth.api.signInEmail({
				body: { email: EMAIL, password: PASSWORD },
				returnHeaders: true,
			})
			expect(signIn.response.user.email).toBe(EMAIL)
			expect(signIn.headers.get("set-cookie")).toContain("better-auth")
		})

		it("resolves a session from a bearer token", async () => {
			const db = freshFileDb()
			applySchema(db)
			const auth = createAuth({
				database: { kind: "node-sqlite", database: db },
				secret: SECRET,
				baseURL: BASE_URL,
				mount: "both",
			})

			const signUp = await auth.api.signUpEmail({
				body: { name: "Prame", email: EMAIL, password: PASSWORD },
			})

			const viaBearer = await auth.api.getSession({
				headers: new Headers({ authorization: `Bearer ${signUp.token}` }),
			})
			expect(viaBearer?.user.email).toBe(EMAIL)
		})

		it("creates an api key over HTTP and verifies it without granting a session", async () => {
			const db = freshFileDb()
			applySchema(db)
			const auth = createAuth({
				database: { kind: "node-sqlite", database: db },
				secret: SECRET,
				baseURL: BASE_URL,
				mount: "both",
			})

			const signUp = await auth.api.signUpEmail({
				body: { name: "Prame", email: EMAIL, password: PASSWORD },
			})

			const createResponse = await auth.handler(
				new Request(`${BASE_URL}/api/auth/api-key/create`, {
					method: "POST",
					headers: {
						authorization: `Bearer ${signUp.token}`,
						"content-type": "application/json",
					},
					body: JSON.stringify({ name: "phase-1-proof" }),
				}),
			)
			expect(createResponse.status).toBe(200)
			const created = (await createResponse.json()) as { key?: string }
			expect(created.key).toBeTruthy()

			// verifyApiKey is a serverOnly endpoint (no HTTP route), so it is
			// called through the server API with a narrow local type — the
			// plugin-instantiated instance type is deliberately not exposed.
			const verifyApiKey = (
				auth.api as unknown as {
					verifyApiKey: (args: {
						body: { key: string }
					}) => Promise<{ valid: boolean; key?: { referenceId?: string } | null }>
				}
			).verifyApiKey
			const verified = await verifyApiKey({ body: { key: created.key ?? "" } })
			expect(verified.valid).toBe(true)
			// 1.7's apikey table stores the owner in referenceId, not userId.
			expect(verified.key?.referenceId).toBe(signUp.user.id)

			const viaKey = await auth.api.getSession({
				headers: new Headers({ authorization: `Bearer ${created.key}` }),
			})
			expect(viaKey).toBeNull()
		})

		it("serves OAuth provider metadata (tokens mount)", async () => {
			const db = freshFileDb()
			applySchema(db)
			const auth = createAuth({
				database: { kind: "node-sqlite", database: db },
				secret: SECRET,
				baseURL: BASE_URL,
				mount: "both",
			})
			const response = await auth.handler(
				new Request(`${BASE_URL}/api/auth/.well-known/oauth-authorization-server`),
			)
			expect(response.status).toBe(200)
			const metadata = (await response.json()) as { issuer?: string }
			expect(metadata.issuer).toContain("localhost")
		})

		// The prelive MCP authorization server (issue #154) depends on all three
		// of these on the same instance: /ok answers, the metadata issuer is
		// <baseURL>/api/auth (what apps/api advertises), and a public PKCE client
		// can register itself. With `mount: "both"` the cookies mount is absent,
		// but the OAuth provider, scopes and resource binding are the prelive
		// configuration, so a regression here fails before a deploy does.
		it("registers an MCP client and advertises the API resource (oauth configured)", async () => {
			const db = freshFileDb()
			applySchema(db)
			const auth = createAuth({
				database: { kind: "node-sqlite", database: db },
				secret: SECRET,
				baseURL: BASE_URL,
				mount: "both",
				oauth: {
					resource: "https://api.example.com/mcp",
					deviceVerificationUri: "https://app.example.com/device",
				},
			})

			const ok = await auth.handler(new Request(`${BASE_URL}/api/auth/ok`))
			expect(ok.status).toBe(200)

			const metadataResponse = await auth.handler(
				new Request(`${BASE_URL}/api/auth/.well-known/oauth-authorization-server`),
			)
			expect(metadataResponse.status).toBe(200)
			const metadata = (await metadataResponse.json()) as {
				issuer?: string
				registration_endpoint?: string
			}
			expect(metadata.issuer).toBe(`${BASE_URL}/api/auth`)
			expect(metadata.registration_endpoint).toBe(`${BASE_URL}/api/auth/oauth2/register`)

			const registerResponse = await auth.handler(
				new Request(`${BASE_URL}/api/auth/oauth2/register`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						client_name: "prelive-test",
						redirect_uris: ["https://example.com/callback"],
						grant_types: ["authorization_code", "refresh_token"],
						response_types: ["code"],
						token_endpoint_auth_method: "none",
						scope: "openid profile email offline_access",
					}),
				}),
			)
			expect([200, 201]).toContain(registerResponse.status)
			const client = (await registerResponse.json()) as { client_id?: string }
			expect(client.client_id).toBeTruthy()
		})

		// #58 task 4: the signed authorization query (`client_id` + `sig`) that
		// bounces a signed-out user through /sign-in and create-account carries
		// its own `exp`. If that expires first, the resume fails after the user
		// has already made an account. It must last at least 10 minutes.
		it("issues a signed resume query valid for at least 10 minutes (#58)", async () => {
			const db = freshFileDb()
			applySchema(db)
			const auth = createAuth({
				database: { kind: "node-sqlite", database: db },
				secret: SECRET,
				baseURL: BASE_URL,
				mount: "both",
				oauth: {
					resource: "https://api.example.com/mcp",
					deviceVerificationUri: "https://app.example.com/device",
				},
			})

			const registerResponse = await auth.handler(
				new Request(`${BASE_URL}/api/auth/oauth2/register`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						client_name: "ttl-test",
						redirect_uris: ["https://example.com/callback"],
						grant_types: ["authorization_code", "refresh_token"],
						response_types: ["code"],
						token_endpoint_auth_method: "none",
						scope: "openid profile email offline_access",
					}),
				}),
			)
			expect([200, 201]).toContain(registerResponse.status)
			const client = (await registerResponse.json()) as { client_id?: string }
			expect(client.client_id).toBeTruthy()

			const authorizeQuery = new URLSearchParams({
				client_id: client.client_id as string,
				redirect_uri: "https://example.com/callback",
				response_type: "code",
				scope: "openid profile email offline_access",
				state: "state-1",
				code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				code_challenge_method: "S256",
				resource: "https://api.example.com/mcp",
			})
			// No session cookie: the provider bounces us to the sign-in page with
			// the signed authorization query a real create-account flow resumes.
			const authorize = await auth.handler(
				new Request(`${BASE_URL}/api/auth/oauth2/authorize?${authorizeQuery}`),
			)
			expect(authorize.status).toBe(302)

			const location = new URL(authorize.headers.get("location") ?? "", BASE_URL)
			expect(location.pathname).toBe("/sign-in")
			expect(location.searchParams.get("sig")).toBeTruthy()

			const exp = Number(location.searchParams.get("exp"))
			const issuedAtMs = Number(location.searchParams.get("ba_iat"))
			expect(Number.isFinite(exp)).toBe(true)
			expect(Number.isFinite(issuedAtMs)).toBe(true)

			// `exp` is epoch seconds, `ba_iat` is epoch milliseconds.
			const ttlSeconds = exp - Math.floor(issuedAtMs / 1000)
			expect(ttlSeconds).toBe(OAUTH_CODE_TTL_SECONDS)
			expect(ttlSeconds).toBeGreaterThanOrEqual(10 * 60)
			expect(OAUTH_CODE_TTL_SECONDS).toBeGreaterThanOrEqual(10 * 60)
		})

		it("rejects a wrong password", async () => {
			const db = freshFileDb()
			applySchema(db)
			const auth = createAuth({
				database: { kind: "node-sqlite", database: db },
				secret: SECRET,
				baseURL: BASE_URL,
				mount: "both",
			})
			await auth.api.signUpEmail({ body: { name: "Prame", email: EMAIL, password: PASSWORD } })
			await expect(
				auth.api.signInEmail({ body: { email: EMAIL, password: "not-the-password" } }),
			).rejects.toThrow()
		})
	})

	describe("D1 dialect path", () => {
		it("runs the same round-trip through the D1 dialect", async () => {
			const db = freshFileDb()
			applySchema(db)
			const auth = createAuth({
				database: { kind: "d1", database: createD1Stub(db) },
				secret: SECRET,
				baseURL: BASE_URL,
				mount: "both",
			})

			const signUp = await auth.api.signUpEmail({
				body: { name: "Prame", email: EMAIL, password: PASSWORD },
			})
			expect(signUp.user.email).toBe(EMAIL)

			const viaBearer = await auth.api.getSession({
				headers: new Headers({ authorization: `Bearer ${signUp.token}` }),
			})
			expect(viaBearer?.user.email).toBe(EMAIL)
		})
	})

	describe("schema drift guard", () => {
		it("rejects a mount when the auth tables are missing", async () => {
			const db = freshFileDb()
			const auth = createAuth({
				database: { kind: "node-sqlite", database: db },
				secret: SECRET,
				baseURL: BASE_URL,
				mount: "both",
			})
			await expect(
				auth.api.signUpEmail({ body: { name: "Prame", email: EMAIL, password: PASSWORD } }),
			).rejects.toThrow()
		})

		it("requires cookiesPlugin for the cookies mount", () => {
			const db = freshFileDb()
			applySchema(db)
			expect(() =>
				createAuth({
					database: { kind: "node-sqlite", database: db },
					secret: SECRET,
					baseURL: BASE_URL,
					mount: "cookies",
				}),
			).toThrow("cookiesPlugin")
		})

		it("requires baseURL for the tokens mount", () => {
			const db = freshFileDb()
			applySchema(db)
			expect(() =>
				createAuth({
					database: { kind: "node-sqlite", database: db },
					secret: SECRET,
					mount: "tokens",
				}),
			).toThrow("baseURL is required")
		})
	})
})

describe("runtime schema check (#158)", () => {
	it("is off: its shared promise dies with the first request on Workers and hangs the rest", () => {
		const auth = createAuth({
			database: { kind: "node-sqlite", database: freshFileDb() },
			secret: "schema-check-test-secret-0123456789abcdef",
			baseURL: "http://localhost:8787/api/v1/auth",
			mount: "tokens",
		})
		const options = (auth as unknown as { options: { advanced?: { database?: { validateSchema?: boolean } } } }).options
		expect(options.advanced?.database?.validateSchema).toBe(false)
	})
})
