import { mkdtempSync, rmSync } from "node:fs"
import { createServer, type Server } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { createHash, randomBytes } from "node:crypto"
import { SignJWT, exportJWK, generateKeyPair } from "jose"
import { afterEach, describe, expect, it } from "vitest"
import type { Hono } from "hono"
import { createAuth, type Auth } from "@excited-live/auth"
import { createApp } from "../../app"
import { DB_FILE_ENV, resetDbCache } from "../../db"
import { resetTokensAuthCache } from "../../lib/auth"
import {
	mcpResource,
	resetOAuthJwksCache,
	scopesFromOAuthClaim,
} from "../../lib/oauth"
import type { ApiEnv } from "../../lib/env"

/**
 * A2 resource-server tests.
 *
 *  - RFC 9728 metadata (both well-known paths).
 *  - OAuth JWT verification on /mcp: signature via the AS JWKS, issuer,
 *    audience, expiry; scopes come from the `scope` claim.
 *  - The full authorization-server flow driven in-process: dynamic client
 *    registration → authorize → consent → token → /mcp.
 *  - The RFC 8628 device flow end to end: code → approve → token → /mcp.
 *
 * The authorization server runs on a throwaway HTTP server that forwards
 * `/api/auth/*` to a `createAuth` instance backed by the same SQLite file as
 * the app. That is the same plugin set the webapp cookies mount uses; the
 * test mount is `tokens` because bare Node has no TanStack cookie runtime.
 */

const SECRET = "test-secret-for-oauth-tests-0123456789"
const API_URL = "http://localhost:8787"
const PASSWORD = "correct-horse-battery"
const CLIENT_REDIRECT = "http://localhost:9999/callback"

const tempDirs: string[] = []
const servers: Server[] = []

afterEach(async () => {
	delete process.env.BETTER_AUTH_SECRET
	delete process.env.BETTER_AUTH_URL
	delete process.env[DB_FILE_ENV]
	delete process.env.EXCITED_WEBAPP_URL
	resetOAuthJwksCache()
	resetTokensAuthCache()
	resetDbCache()
	for (const server of servers.splice(0)) {
		await new Promise<void>((resolve) => server.close(() => resolve()))
	}
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-oauth-"))
	tempDirs.push(dir)
	return join(dir, "api-oauth.sqlite")
}

type RpcBody = {
	jsonrpc: "2.0"
	id?: number
	method: string
	params?: Record<string, unknown>
}

type ToolResult = {
	content: Array<{ type: string; text: string }>
	structuredContent?: Record<string, unknown>
	isError?: boolean
}

async function rpc(
	app: Hono<ApiEnv>,
	body: RpcBody,
	token?: string,
): Promise<{ status: number; headers: Headers; json: Record<string, unknown> | null }> {
	const headers: Record<string, string> = {
		"content-type": "application/json",
		accept: "application/json, text/event-stream",
	}
	if (token) headers.Authorization = `Bearer ${token}`
	const res = await app.request(`${API_URL}/mcp`, { method: "POST", headers, body: JSON.stringify(body) })
	const text = await res.text()
	return {
		status: res.status,
		headers: res.headers,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	}
}

const toolsList = (id = 1): RpcBody => ({ jsonrpc: "2.0", id, method: "tools/list" })

function configuredApp(dbFile: string): Hono<ApiEnv> {
	process.env.BETTER_AUTH_SECRET = SECRET
	process.env.BETTER_AUTH_URL = API_URL
	process.env[DB_FILE_ENV] = dbFile
	resetDbCache()
	return createApp()
}

/**
 * A fake authorization server: an HTTP listener in front of a real auth
 * instance, so the API can fetch its real JWKS and tokens are signed by the
 * same keys the JWKS advertises.
 */
async function startAuthorizationServer(dbFile: string): Promise<{ origin: string; auth: Auth }> {
	let auth: Auth | null = null
	// The API fetches the real JWKS over HTTP; every other AS endpoint is
	// exercised in-process through auth.handler().
	const server = createServer(async (req, res) => {
		try {
			if (req.url !== "/api/auth/jwks") {
				res.statusCode = 404
				res.end()
				return
			}
			const url = new URL(req.url, origin)
			const response = await (auth as Auth).handler(new Request(url, { headers: headersFromNode(req.headers) }))
			res.statusCode = response.status
			res.setHeader("content-type", response.headers.get("content-type") ?? "application/json")
			res.end(Buffer.from(await response.arrayBuffer()))
		} catch (error) {
			console.error("[oauth-test] JWKS proxy failed", error)
			res.statusCode = 500
			res.end("error")
		}
	})
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()))
	servers.push(server)
	const address = server.address()
	if (!address || typeof address === "string") throw new Error("AS did not bind a port")
	const origin = `http://127.0.0.1:${address.port}`
	auth = createAuth({
		database: { kind: "node-sqlite", database: new DatabaseSync(dbFile) },
		secret: SECRET,
		baseURL: `${origin}/api/auth`,
		mount: "tokens",
		trustedOrigins: [origin],
		oauth: {
			resource: mcpResource(`${API_URL}/mcp`),
			deviceVerificationUri: `${origin}/device`,
		},
	})
	return { origin, auth }
}

/** In-process request to the authorization server (paths are relative to /api/auth). */
function callAuth(auth: Auth, origin: string, path: string, init?: RequestInit): Promise<Response> {
	return auth.handler(new Request(`${origin}/api/auth${path}`, init))
}

/** Plain HTTP listener serving a JWKS whose private key the test holds. */
async function startJwksServer(): Promise<{
	origin: string
	sign: (claims: Record<string, unknown>, options: { issuer: string; audience: string; expiresIn?: number }) => Promise<string>
}> {
	const { publicKey, privateKey } = await generateKeyPair("EdDSA", { crv: "Ed25519" })
	const jwk = await exportJWK(publicKey)
	const kid = "test-key"
	const server = createServer((req, res) => {
		if (req.url === "/api/auth/jwks") {
			res.setHeader("content-type", "application/json")
			res.end(JSON.stringify({ keys: [{ ...jwk, kid, alg: "EdDSA", use: "sig" }] }))
			return
		}
		res.statusCode = 404
		res.end()
	})
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()))
	servers.push(server)
	const address = server.address()
	if (!address || typeof address === "string") throw new Error("JWKS server did not bind a port")
	const issuer = `http://127.0.0.1:${address.port}/api/auth`
	return {
		origin: `http://127.0.0.1:${address.port}`,
		sign: async (claims, options) => {
			const now = Math.floor(Date.now() / 1000)
			return new SignJWT(claims)
				.setProtectedHeader({ alg: "EdDSA", kid, typ: "at+jwt" })
				.setIssuer(options.issuer)
				.setAudience(options.audience)
				.setSubject(String(claims.sub ?? "oauth-user"))
				.setIssuedAt(now)
				.setExpirationTime(now + (options.expiresIn ?? 300))
				.sign(privateKey)
				.then((token) => token)
		},
	}
}

function headersFromNode(source: Record<string, string | string[] | undefined>): Headers {
	const headers = new Headers()
	for (const [key, value] of Object.entries(source)) {
		if (typeof value === "string") headers.set(key, value)
		else if (Array.isArray(value)) headers.set(key, value.join(", "))
	}
	return headers
}

function setCookies(response: Response): string[] {
	const withCookies = response.headers as Headers & { getSetCookie?: () => string[] }
	return withCookies.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie") as string] : [])
}

function cookieHeader(response: Response): string {
	return setCookies(response)
		.map((cookie) => cookie.split(";")[0])
		.filter(Boolean)
		.join("; ")
}

function pkce(): { verifier: string; challenge: string } {
	const verifier = randomBytes(32).toString("base64url")
	return {
		verifier,
		challenge: createHash("sha256").update(verifier).digest("base64url"),
	}
}

describe("OAuth protected-resource metadata", () => {
	it("serves both well-known paths with the MCP resource and the webapp issuer", async () => {
		process.env.BETTER_AUTH_SECRET = SECRET
		process.env.EXCITED_WEBAPP_URL = "https://app.excited.live"
		process.env.BETTER_AUTH_URL = "https://api.excited.live"
		const app = createApp()

		for (const path of [
			"/.well-known/oauth-protected-resource",
			"/.well-known/oauth-protected-resource/mcp",
		]) {
			const res = await app.request(`https://api.excited.live${path}`)
			expect(res.status).toBe(200)
			expect(await res.json()).toEqual({
				resource: "https://api.excited.live/mcp",
				authorization_servers: ["https://app.excited.live/api/auth"],
				scopes_supported: ["onboarding", "accounting:read", "accounting:write"],
				bearer_methods_supported: ["header"],
			})
		}
	})

	it("returns 404 when no authorization server is configured", async () => {
		const app = createApp()
		const res = await app.request("/.well-known/oauth-protected-resource")
		expect(res.status).toBe(404)
	})

	it("keeps api.excited.live's challenge unchanged when its pin matches its host", async () => {
		process.env.BETTER_AUTH_SECRET = SECRET
		process.env.BETTER_AUTH_URL = "https://api.excited.live"
		process.env.EXCITED_WEBAPP_URL = "https://app.excited.live"
		process.env[DB_FILE_ENV] = tempDbFile()
		resetDbCache()
		const app = createApp()

		const res = await app.request("https://api.excited.live/mcp", {
			method: "POST",
			headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
			body: JSON.stringify(toolsList()),
		})
		expect(res.status).toBe(401)
		expect(res.headers.get("www-authenticate")).toBe(
			'Bearer resource_metadata="https://api.excited.live/.well-known/oauth-protected-resource"',
		)
	})

	it("advertises the request host, not the BETTER_AUTH_URL pin (#116)", async () => {
		process.env.BETTER_AUTH_SECRET = SECRET
		// The prelive Worker is reached through a custom domain but still pins
		// its workers.dev URL for the auth mount; discovery must not echo the pin.
		process.env.BETTER_AUTH_URL = "https://excited-live-api-prelive.preamza02.workers.dev"
		process.env.EXCITED_WEBAPP_URL = "https://prelive.excited.live"
		process.env[DB_FILE_ENV] = tempDbFile()
		resetDbCache()
		const app = createApp()

		const metadata = await app.request(
			"https://prelive.api.excited.live/.well-known/oauth-protected-resource",
		)
		expect(metadata.status).toBe(200)
		expect(await metadata.json()).toMatchObject({
			resource: "https://prelive.api.excited.live/mcp",
		})

		const challenge = await app.request("https://prelive.api.excited.live/mcp", {
			method: "POST",
			headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
			body: JSON.stringify(toolsList()),
		})
		expect(challenge.status).toBe(401)
		expect(challenge.headers.get("www-authenticate")).toBe(
			'Bearer resource_metadata="https://prelive.api.excited.live/.well-known/oauth-protected-resource"',
		)
	})
})

describe("OAuth scope mapping", () => {
	it("maps the onboarding umbrella to read + write and keeps accounting scopes", () => {
		const scopes = scopesFromOAuthClaim("openid onboarding accounting:read profile")
		expect([...scopes].sort()).toEqual([
			"accounting:read",
			"onboarding:read",
			"onboarding:write",
		])
	})

	it("ignores unknown scopes and non-string claims", () => {
		expect([...scopesFromOAuthClaim(undefined)]).toEqual([])
		expect([...scopesFromOAuthClaim("openid profile")]).toEqual([])
	})
})

describe("/mcp OAuth JWTs", () => {
	it("accepts a valid JWT and enforces its scopes", async () => {
		const jwks = await startJwksServer()
		process.env.EXCITED_WEBAPP_URL = jwks.origin
		const app = configuredApp(tempDbFile())
		const issuer = `${jwks.origin}/api/auth`
		const token = await jwks.sign(
			{ sub: "oauth-user", scope: "onboarding accounting:read" },
			{ issuer, audience: `${API_URL}/mcp` },
		)

		const list = await rpc(app, toolsList(), token)
		expect(list.status).toBe(200)

		const status = await rpc(
			app,
			{ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_onboarding_status", arguments: {} } },
			token,
		)
		expect(status.status).toBe(200)
		expect((status.json?.result as ToolResult).isError).toBeUndefined()

		const denied = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: { name: "add_expense", arguments: { name: "Spotify", category: "subscription", amount: 150 } },
			},
			token,
		)
		const deniedResult = denied.json?.result as ToolResult
		expect(deniedResult.isError).toBe(true)
		expect(deniedResult.content[0]?.text).toContain("accounting:write")
	})

	it("rejects a wrong audience", async () => {
		const jwks = await startJwksServer()
		process.env.EXCITED_WEBAPP_URL = jwks.origin
		const app = configuredApp(tempDbFile())
		const token = await jwks.sign(
			{ sub: "oauth-user", scope: "onboarding" },
			{ issuer: `${jwks.origin}/api/auth`, audience: "https://other.example/mcp" },
		)
		const res = await rpc(app, toolsList(), token)
		expect(res.status).toBe(401)
	})

	it("rejects a wrong issuer", async () => {
		const jwks = await startJwksServer()
		process.env.EXCITED_WEBAPP_URL = jwks.origin
		const app = configuredApp(tempDbFile())
		const token = await jwks.sign(
			{ sub: "oauth-user", scope: "onboarding" },
			{ issuer: "https://evil.example/api/auth", audience: `${API_URL}/mcp` },
		)
		const res = await rpc(app, toolsList(), token)
		expect(res.status).toBe(401)
	})

	it("rejects an expired token", async () => {
		const jwks = await startJwksServer()
		process.env.EXCITED_WEBAPP_URL = jwks.origin
		const app = configuredApp(tempDbFile())
		const token = await jwks.sign(
			{ sub: "oauth-user", scope: "onboarding" },
			{ issuer: `${jwks.origin}/api/auth`, audience: `${API_URL}/mcp`, expiresIn: -60 },
		)
		const res = await rpc(app, toolsList(), token)
		expect(res.status).toBe(401)
	})

	it("keeps the A1 behaviour when no AS is configured", async () => {
		const jwks = await startJwksServer()
		const app = configuredApp(tempDbFile())
		const token = await jwks.sign(
			{ sub: "oauth-user", scope: "onboarding" },
			{ issuer: `${jwks.origin}/api/auth`, audience: `${API_URL}/mcp` },
		)
		const res = await rpc(app, toolsList(), token)
		expect(res.status).toBe(401)
	})
})

describe("authorization-server flows", () => {
	it("registers a public client and issues a JWT that /mcp accepts", async () => {
		const dbFile = tempDbFile()
		const app = configuredApp(dbFile)
		// Run one request so the database starts out migrated.
		await app.request("/api/v1/settings")

		const { origin, auth } = await startAuthorizationServer(dbFile)
		process.env.EXCITED_WEBAPP_URL = origin

		const registration = await callAuth(auth, origin, "/oauth2/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				client_name: "Test Agent",
				redirect_uris: [CLIENT_REDIRECT],
				application_type: "native",
				token_endpoint_auth_method: "none",
				scope: "onboarding accounting:read",
				grant_types: ["authorization_code", "refresh_token"],
				response_types: ["code"],
			}),
		})
		expect(registration.status).toBe(201)
		const client = (await registration.json()) as { client_id: string; client_name: string }
		expect(client.client_id).toBeTruthy()
		expect(client.client_name).toBe("Test Agent")

		const signUp = await callAuth(auth, origin, "/sign-up/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "OAuth User", email: "oauth@excited.live", password: PASSWORD }),
		})
		expect(signUp.status).toBe(200)
		const cookie = cookieHeader(signUp)
		expect(cookie).toContain("better-auth.session_token")

		const { verifier, challenge } = pkce()
		const authorizeQuery = new URLSearchParams({
			client_id: client.client_id,
			redirect_uri: CLIENT_REDIRECT,
			response_type: "code",
			scope: "onboarding accounting:read",
			state: "state-1",
			code_challenge: challenge,
			code_challenge_method: "S256",
			resource: `${API_URL}/mcp`,
		})
		const authorize = await callAuth(auth, origin, `/oauth2/authorize?${authorizeQuery}`, {
			headers: { cookie },
		})
		expect(authorize.status).toBe(302)
		const consentLocation = authorize.headers.get("location") ?? ""
		expect(consentLocation).toContain("/consent?")

		const consent = await callAuth(auth, origin, "/oauth2/consent", {
			method: "POST",
			headers: { "content-type": "application/json", cookie, origin },
			body: JSON.stringify({
				accept: true,
				oauth_query: consentLocation.split("?")[1],
			}),
		})
		expect(consent.status).toBe(200)
		const consentBody = (await consent.json()) as { url: string }
		const code = new URL(consentBody.url).searchParams.get("code")
		expect(code).toBeTruthy()

		const tokenResponse = await callAuth(auth, origin, "/oauth2/token", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code: code as string,
				redirect_uri: CLIENT_REDIRECT,
				client_id: client.client_id,
				code_verifier: verifier,
			}),
		})
		expect(tokenResponse.status).toBe(200)
		const tokens = (await tokenResponse.json()) as { access_token: string; token_type: string }
		expect(tokens.token_type).toBe("Bearer")
		expect(tokens.access_token.split(".")).toHaveLength(3)

		const list = await rpc(app, toolsList(), tokens.access_token)
		expect(list.status).toBe(200)
		const tools = (list.json?.result as { tools: Array<{ name: string }> }).tools.map((tool) => tool.name)
		expect(tools).toContain("get_onboarding_status")

		const read = await rpc(
			app,
			{ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_onboarding_status", arguments: {} } },
			tokens.access_token,
		)
		expect((read.json?.result as ToolResult).isError).toBeUndefined()

		// Requested scopes were onboarding + accounting:read, so writes are denied.
		const write = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: { name: "add_expense", arguments: { name: "Netflix", category: "subscription", amount: 420 } },
			},
			tokens.access_token,
		)
		expect((write.json?.result as ToolResult).isError).toBe(true)
	})

	it("runs the device flow end to end: code → approve → token → /mcp tools/list", async () => {
		const dbFile = tempDbFile()
		const app = configuredApp(dbFile)
		await app.request("/api/v1/settings")

		const { origin, auth } = await startAuthorizationServer(dbFile)
		process.env.EXCITED_WEBAPP_URL = origin

		const codeResponse = await callAuth(auth, origin, "/device/code", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ client_id: "excited-live-agent", scope: "onboarding" }),
		})
		expect(codeResponse.status).toBe(200)
		const codeBody = (await codeResponse.json()) as {
			device_code: string
			user_code: string
			verification_uri: string
			verification_uri_complete: string
			interval: number
		}
		expect(codeBody.verification_uri).toBe(`${origin}/device`)
		expect(codeBody.verification_uri_complete).toContain(`user_code=${codeBody.user_code}`)

		const signUp = await callAuth(auth, origin, "/sign-up/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "Device User", email: "device@excited.live", password: PASSWORD }),
		})
		expect(signUp.status).toBe(200)
		const cookie = cookieHeader(signUp)

		// The /device page does this first: it claims the code for the session.
		const verify = await callAuth(auth, origin, `/device?user_code=${codeBody.user_code}`, {
			headers: { cookie },
		})
		expect(verify.status).toBe(200)
		const verified = (await verify.json()) as { status: string; client_id: string }
		expect(verified.status).toBe("pending")
		expect(verified.client_id).toBe("excited-live-agent")

		const approve = await callAuth(auth, origin, "/device/approve", {
			method: "POST",
			headers: { "content-type": "application/json", cookie, origin },
			body: JSON.stringify({ userCode: codeBody.user_code }),
		})
		expect(approve.status).toBe(200)

		const tokenResponse = await callAuth(auth, origin, "/device/token", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				device_code: codeBody.device_code,
				client_id: "excited-live-agent",
			}),
		})
		expect(tokenResponse.status).toBe(200)
		const tokens = (await tokenResponse.json()) as { access_token: string; token_type: string }
		expect(tokens.token_type).toBe("Bearer")
		// A first-party session token (not a JWT), accepted by the existing
		// session branch via the bearer plugin.
		expect(tokens.access_token).toBeTruthy()
		expect(tokens.access_token.split(".").length).not.toBe(3)

		const list = await rpc(app, toolsList(), tokens.access_token)
		expect(list.status).toBe(200)
		const tools = (list.json?.result as { tools: Array<{ name: string }> }).tools.map((tool) => tool.name)
		expect(tools).toContain("get_onboarding_status")
	})
})
