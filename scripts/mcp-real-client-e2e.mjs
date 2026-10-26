#!/usr/bin/env node
/* global Headers, URL */
/**
 * Real-client gate for the MCP OAuth chain (#31, #55).
 *
 * The team rule: a change to MCP, OAuth discovery/DCR or auth routing merges
 * only after the official `@modelcontextprotocol/sdk` client completes the
 * flow against the target host. HTTP status checks are not enough — CI was
 * green while every standard MCP client failed discovery.
 *
 * This script is that gate, in one command with one exit code. It uses the
 * same `auth()` + `StreamableHTTPClientTransport` pair real clients use, and
 * drives the browser half (sign-in + consent) over HTTP with a cookie jar so
 * it runs unattended:
 *
 *   1. unauthenticated POST /mcp          -> 401 + WWW-Authenticate
 *   2. RFC 9728 protected-resource        -> resource + authorization server
 *   3. discovery, path-append             -> 200, issuer exact
 *      GET <issuer>/.well-known/oauth-authorization-server
 *   4. discovery, path-insert             -> 200, issuer exact
 *      GET <origin>/.well-known/oauth-authorization-server<issuer path>
 *      (this is the URL the SDK tries first, and the one PR #60 fixes)
 *   5. SDK discovery                      -> discoverAuthorizationServerMetadata()
 *   6. DCR, explicit native + loopback    -> 201 + client_id
 *   7. DCR, no application_type (the SDK/Claude Code shape) -> 201 + client_id
 *   8. SDK auth()                         -> REDIRECT + authorization URL
 *   9. authorize -> sign-in -> consent    -> code + original state
 *  10. token exchange                     -> access token
 *  11. tools/list                         -> exactly --expect-tools (16)
 *  12. tools/call get_onboarding_status   -> non-error, real onboarding data
 *
 * With `--iam <origin>` it also runs the iam stage (#93) after step 12. The
 * twelve MCP steps above are untouched, so a run without --iam is bit-for-bit
 * the same gate as before.
 *
 *   I1. bundle        iam / is the shell (title, not status: the site soft-404s),
 *                     its JS names the target API + auth origins and contains
 *                     zero forbidden markers (the #88 guard list on prod)
 *   I2. CORS          <iam> gets ACAO + ACAC on the API and the auth server;
 *                     an evil origin and `null` get no ACAO
 *   I3. tokens mount  sign-in from <iam> on <api>/api/v1/auth/email returns 200,
 *                     exposes set-auth-token, and is not 403 INVALID_ORIGIN
 *   I4. AS session    sign in on the auth server, then get-session cross-origin
 *                     with the cookie -> 200 with a session
 *   I5. keys          mint an agent key from <iam>, see it in the list, delete it
 *   I6. DB isolation  the same throwaway account must not sign in on the other
 *                     environment's API (prod vs prelive D1 are separate)
 *
 * Usage:
 *   node scripts/mcp-real-client-e2e.mjs --env prelive --email qa@example.com --password '…'
 *   node scripts/mcp-real-client-e2e.mjs --mcp https://api.excited.live/mcp …
 *   node scripts/mcp-real-client-e2e.mjs --env prelive --iam https://excited-live-iam-prelive.pages.dev --create-user …
 *
 * Credentials come from --email/--password or MCP_QA_EMAIL/MCP_QA_PASSWORD.
 * Pass --create-user when the account does not exist yet (prelive QA only).
 *
 * Flags:
 *   --env prelive|prod   target preset (default: prod)
 *   --mcp URL            MCP endpoint, overrides --env
 *   --iam URL            run the iam stage against this origin (off by default)
 *   --api URL            API origin for the iam stage (default: from --env)
 *   --as URL             auth-server origin for the iam stage (default: from --env)
 *   --email EMAIL        QA account (or MCP_QA_EMAIL)
 *   --password PW        QA password (or MCP_QA_PASSWORD)
 *   --create-user        sign up first; a throwaway address is fine on prelive
 *   --name NAME          display name for --create-user
 *   --expect-tools N     tools/list count (default 16)
 *   --redirect-uri URI   loopback redirect (default http://127.0.0.1:33418/callback)
 *   --timeout MS         per-request timeout (default 20000)
 *   --bootstrap-discovery
 *                        DIAGNOSTIC ONLY: when SDK discovery fails, continue
 *                        with the path-append document so the rest of the
 *                        chain can be exercised. Discovery still counts as a
 *                        failure and the process still exits 1.
 *   --json FILE          write the full transcript as JSON
 *
 * Exit codes: 0 every required step passed; 1 anything failed or was skipped
 * (a skip is not a pass, so a red prelive baseline cannot look green); 2 usage.
 */

import { randomUUID } from "node:crypto"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
// The SDK is a dependency of apps/api; resolve it from there so this script
// needs no root install and always uses the version the API ships with.
const apiRequire = createRequire(path.join(repoRoot, "apps/api/package.json"))
const loadSdk = (specifier) => import(pathToFileURL(apiRequire.resolve(specifier)).href)

const { Client } = await loadSdk("@modelcontextprotocol/sdk/client/index.js")
const { auth, UnauthorizedError, discoverAuthorizationServerMetadata } = await loadSdk(
	"@modelcontextprotocol/sdk/client/auth.js",
)
const { StreamableHTTPClientTransport } = await loadSdk("@modelcontextprotocol/sdk/client/streamableHttp.js")

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2)
const args = new Map()
for (let i = 0; i < argv.length; i++) {
	const arg = argv[i]
	if (!arg.startsWith("--")) continue
	const key = arg.slice(2)
	const next = argv[i + 1]
	if (next && !next.startsWith("--")) {
		args.set(key, next)
		i++
	} else {
		args.set(key, "true")
	}
}

function usage(message) {
	if (message) console.error(`mcp-real-client-e2e: ${message}`)
	console.error(
		"usage: node scripts/mcp-real-client-e2e.mjs --env prelive|prod [--email E --password P] [--create-user] [--mcp URL] [--iam URL] [--api URL] [--as URL] [--expect-tools N] [--bootstrap-discovery] [--json FILE]",
	)
	process.exit(2)
}

const PRESETS = {
	prelive: {
		mcp: "https://excited-live-api-prelive.preamza02.workers.dev/mcp",
		api: "https://excited-live-api-prelive.preamza02.workers.dev",
		as: "https://prelive.excited.live",
		otherApi: "https://api.excited.live",
		otherAs: "https://auth.excited.live",
	},
	prod: {
		mcp: "https://api.excited.live/mcp",
		api: "https://api.excited.live",
		as: "https://auth.excited.live",
		otherApi: "https://excited-live-api-prelive.preamza02.workers.dev",
		otherAs: "https://prelive.excited.live",
	},
}

const ENVIRONMENT = args.get("env") ?? "prod"
if (!(ENVIRONMENT in PRESETS) && !args.has("mcp")) usage(`--env must be prelive or prod, got ${JSON.stringify(ENVIRONMENT)}`)

const preset = PRESETS[ENVIRONMENT] ?? PRESETS.prod
const MCP_URL = args.get("mcp") ?? preset.mcp
const API_URL = (args.get("api") ?? preset.api).replace(/\/+$/, "")
const AS_URL = (args.get("as") ?? preset.as).replace(/\/+$/, "")
const OTHER_API_URL = preset.otherApi.replace(/\/+$/, "")
const OTHER_AS_URL = preset.otherAs.replace(/\/+$/, "")

/** `--iam` turns the iam stage on; absent means the gate is exactly the 12 MCP steps. */
const IAM_ORIGIN = (() => {
	const raw = args.get("iam")
	if (!raw) return null
	let url
	try {
		url = new URL(raw)
	} catch {
		usage(`--iam must be an absolute URL, got ${JSON.stringify(raw)}`)
	}
	if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
		usage("--iam must be https (http is allowed only for localhost)")
	}
	return url.origin
})()

const EMAIL = args.get("email") ?? process.env.MCP_QA_EMAIL
const PASSWORD = args.get("password") ?? process.env.MCP_QA_PASSWORD
const CREATE_USER = args.has("create-user")
const NAME = args.get("name") ?? "QA Rigel"
const BOOTSTRAP = args.has("bootstrap-discovery")
const JSON_OUT = args.get("json")
const REDIRECT_URI = args.get("redirect-uri") ?? "http://127.0.0.1:33418/callback"

function positiveInt(name, fallback) {
	const raw = args.get(name)
	if (raw === undefined) return fallback
	const value = Number(raw)
	if (!Number.isInteger(value) || value < 1) usage(`--${name} must be a positive integer`)
	return value
}

const EXPECT_TOOLS = positiveInt("expect-tools", 16)
const TIMEOUT = positiveInt("timeout", 20000)
const STATE = `rigel-${randomUUID()}`

if (!MCP_URL) usage("no MCP endpoint")
if (!EMAIL || !PASSWORD) usage("--email/--password or MCP_QA_EMAIL/MCP_QA_PASSWORD are required")

const mcpUrl = new URL(MCP_URL)
const startedAt = new Date().toISOString()

// ---------------------------------------------------------------------------
// reporting
// ---------------------------------------------------------------------------
const steps = []
let current = null

function start(name, detail) {
	current = { name, detail: detail ?? "", ok: null, notes: [], startedAt: new Date().toISOString() }
	steps.push(current)
	process.stdout.write(`\n▶ ${name}${current.detail ? ` — ${current.detail}` : ""}\n`)
	return current
}
function note(text) {
	if (!current) return
	current.notes.push(text)
	process.stdout.write(`   ${text}\n`)
}
function pass(extra) {
	if (!current) return
	current.ok = true
	current.notes.push(extra ?? "ok")
	process.stdout.write(`   PASS${extra ? `: ${extra}` : ""}\n`)
}
function fail(extra) {
	if (!current) return
	current.ok = false
	current.notes.push(extra ?? "failed")
	process.stdout.write(`   FAIL${extra ? `: ${extra}` : ""}\n`)
}
function skip(extra) {
	if (!current) return
	current.ok = "skip"
	current.notes.push(extra ?? "skipped")
	process.stdout.write(`   SKIP${extra ? `: ${extra}` : ""}\n`)
}
function done() {
	if (current) current.ms = Date.now() - new Date(current.startedAt).getTime()
	current = null
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function describeError(error) {
	if (error?.name === "TimeoutError") return `timed out after ${TIMEOUT} ms`
	return error?.cause?.code ?? error?.message ?? String(error)
}

async function request(url, { method = "GET", headers, body, redirect = "follow" } = {}) {
	const started = Date.now()
	try {
		const response = await fetch(url, {
			method,
			headers,
			body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
			redirect,
			signal: AbortSignal.timeout(TIMEOUT),
		})
		const text = await response.text()
		return {
			status: response.status,
			headers: response.headers,
			text,
			json: safeJson(text),
			ms: Date.now() - started,
		}
	} catch (error) {
		throw new Error(`${method} ${url} failed: ${describeError(error)}`)
	}
}

function safeJson(text) {
	try {
		return JSON.parse(text)
	} catch {
		return null
	}
}

function snippet(text, limit = 220) {
	const flat = String(text ?? "")
		.replace(/\s+/g, " ")
		.trim()
	return flat.length > limit ? `${flat.slice(0, limit)}…` : flat
}

function describe(response) {
	const contentType = response.headers.get("content-type") ?? "?"
	return `HTTP ${response.status} · ${contentType} · ${snippet(response.text, 160) || "(empty body)"}`
}

function requireMetadata(document, what, expectedIssuer) {
	const problems = []
	if (document.issuer !== expectedIssuer) {
		problems.push(`issuer is ${JSON.stringify(document.issuer)}, want ${JSON.stringify(expectedIssuer)}`)
	}
	for (const key of ["authorization_endpoint", "token_endpoint", "jwks_uri", "registration_endpoint"]) {
		if (typeof document[key] !== "string" || document[key].length === 0) problems.push(`${key} is missing`)
	}
	if (problems.length > 0) fail(`${what}: ${problems.join("; ")}`)
	return problems.length === 0
}

// ---------------------------------------------------------------------------
// cookie jar + tiny browser (the human half: sign-in and consent)
// ---------------------------------------------------------------------------
class CookieJar {
	constructor() {
		this.cookies = new Map()
	}
	store(headers) {
		const list = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : []
		for (const raw of list) {
			const [pair, ...attrs] = raw.split(";")
			const eq = pair.indexOf("=")
			if (eq < 0) continue
			const name = pair.slice(0, eq).trim()
			const value = pair.slice(eq + 1).trim()
			const expired = attrs.some((attr) => /max-age=0\b/i.test(attr.trim()))
			if (!value || expired) this.cookies.delete(name)
			else this.cookies.set(name, value)
		}
	}
	header() {
		return [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; ")
	}
}

class Browser {
	constructor() {
		this.jar = new CookieJar()
	}
	async request(url, init = {}) {
		const headers = new Headers(init.headers ?? {})
		const cookie = this.jar.header()
		if (cookie) headers.set("cookie", cookie)
		const response = await fetch(url, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT) })
		this.jar.store(response.headers)
		return response
	}
	/**
	 * Walk the flow the way a browser would: HTTP 3xx Location redirects and
	 * Better Auth's JSON form (`{redirect: true, url}`).
	 */
	async follow(url, init = {}, max = 10) {
		let currentUrl = new URL(url)
		const chain = [currentUrl.toString()]
		for (let hop = 0; hop <= max; hop++) {
			const response = await this.request(currentUrl, init)
			init = { method: "GET", headers: init.headers }
			const location = response.headers.get("location")
			if (location && response.status >= 300 && response.status < 400) {
				await response.body?.cancel()
				currentUrl = new URL(location, currentUrl)
				chain.push(currentUrl.toString())
				continue
			}
			const contentType = response.headers.get("content-type") ?? ""
			const text = await response.text()
			if (contentType.includes("application/json")) {
				const json = safeJson(text)
				if (json?.redirect === true && typeof json.url === "string") {
					currentUrl = new URL(json.url, currentUrl)
					chain.push(currentUrl.toString())
					continue
				}
				return { status: response.status, url: currentUrl, chain, text, json, headers: response.headers }
			}
			return { status: response.status, url: currentUrl, chain, text, headers: response.headers }
		}
		throw new Error(`too many redirects from ${url}`)
	}
}

// ---------------------------------------------------------------------------
// in-memory OAuthClientProvider (no browser storage in a CLI)
// ---------------------------------------------------------------------------
class MemoryProvider {
	constructor(store) {
		this.store = store
		this.authorizationUrl = null
	}
	get redirectUrl() {
		return REDIRECT_URI
	}
	get clientMetadata() {
		return {
			client_name: "Rigel real-client gate (#31 #55)",
			redirect_uris: [REDIRECT_URI],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
			scope: "openid profile email offline_access onboarding accounting:read accounting:write",
			// Not in the SDK's 1.32.1 zod type, but the client is a native CLI and
			// sends it verbatim. Step 7 covers the SDK default that omits it.
			application_type: "native",
		}
	}
	state() {
		return STATE
	}
	clientInformation() {
		return this.store.clientInformation
	}
	saveClientInformation(info) {
		this.store.clientInformation = info
	}
	tokens() {
		return this.store.tokens
	}
	saveTokens(tokens) {
		this.store.tokens = tokens
	}
	async redirectToAuthorization(url) {
		this.authorizationUrl = new URL(url)
	}
	saveCodeVerifier(verifier) {
		this.store.codeVerifier = verifier
	}
	codeVerifier() {
		return this.store.codeVerifier
	}
	saveDiscoveryState(state) {
		this.store.discovery = state
	}
	discoveryState() {
		return this.store.discovery
	}
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const store = {}
const provider = new MemoryProvider(store)
const summary = {
	environment: ENVIRONMENT,
	mcpUrl: MCP_URL,
	email: EMAIL,
	startedAt,
	steps,
	ok: false,
}

let resourceDocument = null
let pathAppendDocument = null
let registrationEndpoint = null
let authorizationCode = null

try {
	// 1. unauthenticated /mcp ---------------------------------------------------
	// The SDK's UnauthorizedError carries no response, so capture the challenge
	// with a raw request and then prove the transport refuses the same call.
	start("1. unauthenticated POST /mcp")
	const rawProbe = await request(mcpUrl, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			"MCP-Protocol-Version": "2025-11-25",
		},
		body: {
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2025-11-25",
				capabilities: {},
				clientInfo: { name: "rigel-real-client-probe", version: "0.0.1" },
			},
		},
	})
	const wwwAuthenticate = rawProbe.headers.get("www-authenticate") ?? ""
	note(`POST ${mcpUrl} -> HTTP ${rawProbe.status} · ${snippet(rawProbe.text, 80) || "(empty body)"}`)
	note(`WWW-Authenticate: ${wwwAuthenticate || "(absent)"}`)
	let step1Ok = true
	if (rawProbe.status !== 401) {
		fail(`want HTTP 401 without a token, got ${rawProbe.status}`)
		step1Ok = false
	} else if (!/resource_metadata="?https?:/i.test(wwwAuthenticate)) {
		fail("401 without a resource_metadata challenge")
		step1Ok = false
	}
	const probeClient = new Client({ name: "rigel-real-client-probe", version: "0.0.1" })
	const probeTransport = new StreamableHTTPClientTransport(mcpUrl)
	try {
		await probeClient.connect(probeTransport)
		fail("the SDK transport connected without a token")
		step1Ok = false
	} catch (error) {
		if (error instanceof UnauthorizedError || /unauthori[sz]ed|401/i.test(String(error?.message))) {
			note("SDK transport surfaced UnauthorizedError")
		} else {
			fail(`SDK transport raised an unexpected error: ${describeError(error)}`)
			step1Ok = false
		}
	} finally {
		await probeClient.close().catch(() => {})
	}
	if (step1Ok) pass("401 + resource_metadata, and the SDK refuses the anonymous call")
	done()

	// 2. protected-resource metadata (RFC 9728) ---------------------------------
	start("2. protected-resource metadata")
	const resourceUrl = new URL("/.well-known/oauth-protected-resource", mcpUrl)
	const resourceResponse = await request(resourceUrl, { headers: { accept: "application/json" } })
	note(`GET ${resourceUrl} -> ${describe(resourceResponse)}`)
	resourceDocument = resourceResponse.json
	if (resourceResponse.status !== 200) {
		fail(`want HTTP 200, got ${resourceResponse.status}`)
	} else if (!resourceDocument || !Array.isArray(resourceDocument.authorization_servers) || !resourceDocument.authorization_servers[0]) {
		fail("no authorization_servers[0] in the document")
	} else if (resourceDocument.resource !== `${mcpUrl.origin}/mcp`) {
		fail(`resource is ${JSON.stringify(resourceDocument.resource)}, want ${JSON.stringify(`${mcpUrl.origin}/mcp`)}`)
	} else {
		pass(`resource ${resourceDocument.resource} · AS ${resourceDocument.authorization_servers[0]}`)
	}
	done()

	const issuer = resourceDocument?.authorization_servers?.[0]
	if (!issuer) throw new Error("cannot continue without an authorization server")
	const issuerUrl = new URL(issuer)
	const issuerPath = issuerUrl.pathname.replace(/\/+$/, "")
	const pathAppendUrl = new URL(`${issuerPath}/.well-known/oauth-authorization-server`, issuerUrl.origin)
	const pathInsertUrl = new URL(`/.well-known/oauth-authorization-server${issuerPath}`, issuerUrl.origin)

	// 3. discovery: path-append (the control) ----------------------------------
	start("3. discovery — path-append", pathAppendUrl.toString())
	const appendResponse = await request(pathAppendUrl, {
		headers: { accept: "application/json", "MCP-Protocol-Version": "2025-11-25" },
	})
	note(`GET ${pathAppendUrl} -> ${describe(appendResponse)}`)
	pathAppendDocument = appendResponse.json
	if (appendResponse.status !== 200) {
		fail(`want HTTP 200, got ${appendResponse.status}`)
	} else if (!requireMetadata(pathAppendDocument, "path-append metadata", issuer)) {
		// fail() already recorded the reason
	} else {
		registrationEndpoint = pathAppendDocument.registration_endpoint
		pass(`issuer ${pathAppendDocument.issuer} · DCR ${registrationEndpoint}`)
	}
	done()

	// 4. discovery: path-insert (what the SDK tries first) ---------------------
	start("4. discovery — path-insert", pathInsertUrl.toString())
	const insertResponse = await request(pathInsertUrl, {
		headers: { accept: "application/json", "MCP-Protocol-Version": "2025-11-25" },
	})
	note(`GET ${pathInsertUrl} -> ${describe(insertResponse)}`)
	if (insertResponse.status !== 200) {
		fail(`want HTTP 200, got ${insertResponse.status}`)
	} else if (!insertResponse.json) {
		fail(`want JSON, got ${insertResponse.headers.get("content-type") ?? "no content-type"}`)
	} else if (!requireMetadata(insertResponse.json, "path-insert metadata", issuer)) {
		// fail() already recorded the reason
	} else {
		const keys = ["authorization_endpoint", "token_endpoint", "jwks_uri", "registration_endpoint"]
		const drifted = keys.filter((key) => insertResponse.json[key] !== pathAppendDocument?.[key])
		if (drifted.length > 0) fail(`path-insert differs from path-append on ${drifted.join(", ")}`)
		else pass(`same issuer and endpoints as path-append`)
	}
	done()

	// 5. SDK discovery ----------------------------------------------------------
	start("5. SDK discovery — discoverAuthorizationServerMetadata()")
	try {
		const metadata = await discoverAuthorizationServerMetadata(issuerUrl, { protocolVersion: "2025-11-25" })
		if (!metadata) {
			fail("returned undefined")
		} else if (metadata.issuer !== issuer) {
			fail(`metadata issuer is ${JSON.stringify(metadata.issuer)}, want ${JSON.stringify(issuer)}`)
		} else {
			pass(`issuer ${metadata.issuer}`)
		}
	} catch (error) {
		fail(`threw: ${describeError(error)}`)
	}
	done()

	// 6. DCR with an explicit native loopback client ---------------------------
	start("6. DCR — explicit application_type native")
	async function register(label, { includeApplicationType }) {
		if (!registrationEndpoint) {
			skip("no registration_endpoint")
			return null
		}
		const body = {
			client_name: label,
			redirect_uris: [REDIRECT_URI],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
			scope: "openid profile email offline_access onboarding accounting:read accounting:write",
		}
		if (includeApplicationType) body.application_type = "native"
		const response = await request(registrationEndpoint, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body,
		})
		const safe =
			response.status < 400
				? `client_id ${response.json?.client_id ? `${String(response.json.client_id).length} chars` : "missing"}`
				: snippet(response.text, 160)
		note(`POST ${registrationEndpoint} -> HTTP ${response.status} · ${safe}`)
		return response
	}
	const nativeRegistration = await register("Rigel real-client gate (native)", { includeApplicationType: true })
	if (nativeRegistration && (nativeRegistration.status === 200 || nativeRegistration.status === 201) && nativeRegistration.json?.client_id) {
		pass(`client_id issued (${String(nativeRegistration.json.client_id).length} chars)`)
	} else if (nativeRegistration) {
		fail(`want 200/201 + client_id, got ${nativeRegistration.status} ${snippet(nativeRegistration.text, 120)}`)
	}
	done()

	// 7. DCR as the SDK sends it: loopback, no application_type ----------------
	start("7. DCR — no application_type (the SDK / Claude Code shape)")
	const defaultRegistration = await register("Rigel real-client gate (sdk default)", { includeApplicationType: false })
	if (defaultRegistration && (defaultRegistration.status === 200 || defaultRegistration.status === 201) && defaultRegistration.json?.client_id) {
		pass(`loopback accepted without application_type (client_id ${String(defaultRegistration.json.client_id).length} chars)`)
	} else if (defaultRegistration) {
		fail(
			`loopback rejected (${defaultRegistration.status} ${defaultRegistration.json?.error ?? snippet(defaultRegistration.text, 80)}) — this is the DCR blocker PR #60 fixes`,
		)
	}
	done()

	// 8. SDK auth(): discovery -> DCR -> authorization URL ---------------------
	start("8. SDK auth() — discovery + DCR + authorization URL")
	if (BOOTSTRAP && !store.discovery) {
		if (pathAppendDocument && resourceDocument) {
			store.discovery = {
				authorizationServerUrl: issuer,
				resourceMetadata: resourceDocument,
				authorizationServerMetadata: pathAppendDocument,
			}
			note("--bootstrap-discovery: seeded discovery from the path-append document (diagnostic only; step 5 still fails)")
		} else {
			note("--bootstrap-discovery: no path-append document to seed")
		}
	}
	try {
		const result = await auth(provider, { serverUrl: MCP_URL })
		if (result === "REDIRECT" && provider.authorizationUrl) {
			pass(`auth() -> REDIRECT · client_id ${store.clientInformation?.client_id ?? "?"}`)
		} else if (result === "AUTHORIZED") {
			fail("auth() returned AUTHORIZED before any human sign-in")
		} else {
			fail(`auth() returned ${result} without an authorization URL`)
		}
	} catch (error) {
		fail(`auth() threw: ${describeError(error)}`)
	}
	done()

	// 9. authorize -> sign-in -> consent ---------------------------------------
	start("9. authorize -> sign-in -> consent")
	if (!provider.authorizationUrl) {
		skip("no authorization URL from step 8")
	} else {
		const browser = new Browser()
		const firstHop = await browser.follow(provider.authorizationUrl)
		note(`signed-out authorize lands on ${firstHop.url.origin}${firstHop.url.pathname}`)
		if (!/\/sign-in/.test(firstHop.url.pathname)) {
			fail(`expected the sign-in page, got ${firstHop.url.origin}${firstHop.url.pathname}`)
		} else {
			const authBase = new URL("/api/auth", firstHop.url.origin)
			if (CREATE_USER) {
				const signUp = await browser.request(new URL(`${authBase.pathname}/sign-up/email`, authBase.origin), {
					method: "POST",
					headers: { "content-type": "application/json", origin: authBase.origin },
					body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: NAME }),
				})
				const signUpText = await signUp.text()
				// Never print the body: Better Auth returns a session token in it.
				note(`sign-up: HTTP ${signUp.status} · user ${safeJson(signUpText)?.user?.id ?? "(none)"}`)
				if (signUp.status >= 400 && !/exist/i.test(signUpText)) {
					fail(`sign-up failed: HTTP ${signUp.status}`)
				}
			}
			const signIn = await browser.request(new URL(`${authBase.pathname}/sign-in/email`, authBase.origin), {
				method: "POST",
				headers: { "content-type": "application/json", origin: authBase.origin },
				body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
			})
			const signInText = await signIn.text()
			// Never print the body: Better Auth returns a session token in it.
			note(`sign-in: HTTP ${signIn.status} · user ${safeJson(signInText)?.user?.id ?? "(none)"}`)
			if (signIn.status !== 200) {
				fail("sign-in did not return 200 (check --email/--password)")
			} else {
				const authorized = await browser.follow(provider.authorizationUrl)
				note(`authorize now lands on ${authorized.url.origin}${authorized.url.pathname}`)
				let redirectTarget = null
				if (authorized.url.pathname === new URL(REDIRECT_URI).pathname && authorized.url.origin === new URL(REDIRECT_URI).origin) {
					redirectTarget = authorized.url
				} else if (/\/consent/.test(authorized.url.pathname)) {
					const consentQuery = authorized.url.search.replace(/^\?/, "")
					const consent = await browser.request(new URL("/api/auth/oauth2/consent", authBase.origin), {
						method: "POST",
						headers: { "content-type": "application/json", origin: new URL(provider.authorizationUrl).origin },
						body: JSON.stringify({ accept: true, oauth_query: consentQuery }),
					})
					const consentText = await consent.text()
					// The consent body carries the authorization code; never print it.
					note(`consent: HTTP ${consent.status} · redirect=${safeJson(consentText)?.redirect === true}`)
					try {
						redirectTarget = new URL(safeJson(consentText)?.url)
					} catch {
						fail("consent response carried no redirect url")
					}
				} else {
					fail(`expected the consent page or the loopback redirect, got ${authorized.url.origin}${authorized.url.pathname}`)
				}

				if (redirectTarget) {
					const code = redirectTarget.searchParams.get("code")
					const state = redirectTarget.searchParams.get("state")
					const error = redirectTarget.searchParams.get("error")
					note(`redirect: code ${code ? "present" : "MISSING"} · state ${state === STATE ? "matches" : `MISMATCH (${state ?? "absent"})`}`)
					if (error) fail(`authorization error: ${error} ${redirectTarget.searchParams.get("error_description") ?? ""}`)
					else if (!code) fail("no code in the redirect")
					else if (state !== STATE) fail(`state mismatch: ${state ?? "absent"}`)
					else {
						authorizationCode = code
						pass("code + original state returned to the loopback redirect")
					}
				}
			}
		}
	}
	done()

	// 10. token exchange --------------------------------------------------------
	start("10. token exchange — StreamableHTTPClientTransport.finishAuth()")
	if (!authorizationCode) {
		skip("no authorization code from step 9")
	} else {
		const transport = new StreamableHTTPClientTransport(mcpUrl, { authProvider: provider })
		try {
			await transport.finishAuth(authorizationCode)
			const tokens = store.tokens
			if (!tokens?.access_token) fail("no access token after finishAuth()")
			else {
				summary.token = {
					tokenType: tokens.token_type,
					expiresIn: tokens.expires_in,
					scope: tokens.scope,
					length: tokens.access_token.length,
				}
				pass(
					`${tokens.token_type ?? "Bearer"} · expires_in ${tokens.expires_in ?? "?"} · scope ${tokens.scope ?? "(none)"} · ${tokens.access_token.length}-char token`,
				)
			}
		} catch (error) {
			fail(`token exchange failed: ${describeError(error)}`)
		}
	}
	done()

	// 11. tools/list -----------------------------------------------------------
	start(`11. tools/list — expect ${EXPECT_TOOLS}`)
	let client = null
	if (!store.tokens?.access_token) {
		skip("no access token from step 10")
	} else {
		const transport = new StreamableHTTPClientTransport(mcpUrl, { authProvider: provider })
		client = new Client({ name: "rigel-real-client-gate", version: "1.0.0" })
		try {
			await client.connect(transport)
			const listed = await client.listTools()
			const names = listed.tools.map((tool) => tool.name).sort()
			summary.toolCount = names.length
			summary.tools = names
			note(`tools: ${names.join(", ")}`)
			if (names.length === EXPECT_TOOLS) pass(`${names.length} tools listed`)
			else fail(`${names.length} tools listed, want ${EXPECT_TOOLS}`)
		} catch (error) {
			fail(`connect/listTools failed: ${describeError(error)}`)
		}
	}
	done()

	// 12. tools/call get_onboarding_status -------------------------------------
	start("12. tools/call get_onboarding_status")
	if (!client) {
		skip("no authenticated client from step 11")
	} else {
		try {
			const call = await client.callTool({ name: "get_onboarding_status", arguments: {} })
			const textPart = Array.isArray(call.content) ? call.content.find((part) => part.type === "text") : null
			const data = call.structuredContent ?? safeJson(textPart?.text)
			if (call.isError) {
				fail(`isError: ${snippet(textPart?.text ?? JSON.stringify(call), 200)}`)
			} else if (!data || !Array.isArray(data.steps)) {
				fail(`answered without an onboarding snapshot: ${snippet(JSON.stringify(call), 200)}`)
			} else {
				summary.onboarding = {
					isComplete: data.isComplete,
					completedCount: data.completedCount,
					totalSteps: data.totalSteps,
					nextStep: data.nextStep,
				}
				pass(
					`isComplete=${data.isComplete} · ${data.completedCount}/${data.totalSteps} steps · next=${data.nextStep ?? "none"}`,
				)
			}
		} catch (error) {
			fail(`tools/call failed: ${describeError(error)}`)
		}
	}
	done()

	// -----------------------------------------------------------------------
	// iam stage (#93) — only with --iam. The twelve MCP steps above are untouched.
	// -----------------------------------------------------------------------
	let hubToken = null

	async function iamStep(name, detail, body) {
		start(name, detail)
		try {
			await body()
		} catch (error) {
			fail(describeError(error))
		}
		done()
	}

	if (IAM_ORIGIN) {
		// I1. bundle ---------------------------------------------------------
		await iamStep("I1. iam bundle — shell, title, baked origins", IAM_ORIGIN, async () => {
			const root = await request(`${IAM_ORIGIN}/`, { headers: { accept: "text/html" } })
			note(`GET ${IAM_ORIGIN}/ -> ${describe(root)}`)
			if (root.status !== 200) return fail(`want HTTP 200, got ${root.status}`)
			const title = (root.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1]?.replace(/\s+/g, " ").trim() ?? ""
			note(`title: ${JSON.stringify(title)}`)
			// The site soft-404s with 200, so the title is the real signal.
			if (!/iam/i.test(title)) return fail(`the page title is ${JSON.stringify(title)}, not the iam shell — a soft 404 passes a status check`)
			const sources = [...root.text.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/gi)].map((match) =>
				new URL(match[1], `${IAM_ORIGIN}/`).toString(),
			)
			if (sources.length === 0) return fail("the shell has no <script src=…js> entry")
			let js = ""
			for (const src of sources.slice(0, 3)) {
				const asset = await request(src)
				note(`GET ${src} -> HTTP ${asset.status} · ${asset.text.length} bytes`)
				if (asset.status !== 200) return fail(`asset ${src} returned ${asset.status}`)
				js += asset.text
			}
			const preliveTarget = /prelive|workers\.dev/i.test(API_URL)
			const required = [API_URL, AS_URL]
			const forbidden = [
				...(preliveTarget ? ["https://api.excited.live", "https://auth.excited.live"] : ["workers.dev", "prelive.excited.live"]),
				"mcp.excited.live",
				"ex_live_",
				"/api/v1/plan",
				"/api/v1/sim",
				"play.google.com",
			]
			const hits = (needle) => js.split(needle).length - 1
			const missing = required.filter((needle) => hits(needle) === 0)
			const dirty = forbidden.map((needle) => [needle, hits(needle)]).filter(([, count]) => count > 0)
			if (missing.length > 0) return fail(`the bundle never mentions ${missing.join(", ")}`)
			if (dirty.length > 0) return fail(`forbidden markers in the bundle: ${dirty.map(([needle, count]) => `${needle} ×${count}`).join(", ")}`)
			pass(`${js.length} bytes of JS · ${required.length} required origins present · ${forbidden.length} forbidden markers at zero`)
		})

		// I2. CORS -----------------------------------------------------------
		await iamStep("I2. CORS — iam allowed, evil and null refused", IAM_ORIGIN, async () => {
			const targets = [
				{ label: "api /api/v1/agent-keys", url: `${API_URL}/api/v1/agent-keys` },
				{ label: "auth /api/auth/get-session", url: `${AS_URL}/api/auth/get-session` },
			]
			const problems = []
			const shape = (response) =>
				`HTTP ${response.status} · ACAO ${response.headers.get("access-control-allow-origin") ?? "(none)"} · ACAC ${
					response.headers.get("access-control-allow-credentials") ?? "(none)"
				}`
			for (const target of targets) {
				const preflight = await request(target.url, {
					method: "OPTIONS",
					headers: {
						origin: IAM_ORIGIN,
						"access-control-request-method": "GET",
						"access-control-request-headers": "content-type",
					},
				})
				const real = await request(target.url, { headers: { origin: IAM_ORIGIN, accept: "application/json" } })
				const evil = await request(target.url, { headers: { origin: "https://evil.example", accept: "application/json" } })
				const nullOrigin = await request(target.url, { headers: { origin: "null", accept: "application/json" } })
				note(`${target.label} preflight -> ${shape(preflight)}`)
				note(`${target.label} real      -> ${shape(real)}`)
				note(`${target.label} evil      -> ${shape(evil)}`)
				note(`${target.label} null      -> ${shape(nullOrigin)}`)
				for (const [phase, response] of [
					["preflight", preflight],
					["real", real],
				]) {
					const acao = response.headers.get("access-control-allow-origin")
					if (acao !== IAM_ORIGIN) problems.push(`${target.label} ${phase}: ACAO ${JSON.stringify(acao)}, want ${JSON.stringify(IAM_ORIGIN)}`)
					if (response.headers.get("access-control-allow-credentials") !== "true") problems.push(`${target.label} ${phase}: ACAC is not true`)
				}
				for (const [phase, response] of [
					["evil", evil],
					["null", nullOrigin],
				]) {
					const leaked = response.headers.get("access-control-allow-origin")
					if (leaked) problems.push(`${target.label} ${phase}: leaked ACAO ${JSON.stringify(leaked)}`)
				}
			}
			if (problems.length > 0) return fail(problems.join("; "))
			pass("both mounts: ACAO + ACAC for iam, no ACAO for an evil origin or null")
		})

		// I3. tokens mount ---------------------------------------------------
		await iamStep("I3. tokens mount — sign-in from iam returns set-auth-token", `${API_URL}/api/v1/auth`, async () => {
			const signIn = () =>
				request(`${API_URL}/api/v1/auth/sign-in/email`, {
					method: "POST",
					headers: { "content-type": "application/json", origin: IAM_ORIGIN },
					body: { email: EMAIL, password: PASSWORD },
				})
			let response = await signIn()
			note(`POST /api/v1/auth/sign-in/email -> HTTP ${response.status} · ${response.json?.code ?? response.json?.error ?? "(no code)"}`)
			if (response.status === 401 && CREATE_USER) {
				const signUp = await request(`${API_URL}/api/v1/auth/sign-up/email`, {
					method: "POST",
					headers: { "content-type": "application/json", origin: IAM_ORIGIN },
					body: { email: EMAIL, password: PASSWORD, name: NAME },
				})
				note(`POST /api/v1/auth/sign-up/email -> HTTP ${signUp.status} · ${signUp.json?.code ?? "(no code)"}`)
				response = await signIn()
			}
			const token = response.headers.get("set-auth-token")
			const exposed = response.headers.get("access-control-expose-headers") ?? ""
			note(`set-auth-token: ${token ? `${token.length} chars` : "(absent)"} · expose-headers: ${exposed || "(absent)"}`)
			const code = String(response.json?.code ?? response.json?.error ?? "")
			if (response.status === 403 && /INVALID_ORIGIN/i.test(code)) return fail(`403 INVALID_ORIGIN — the API does not trust ${IAM_ORIGIN}`)
			if (response.status !== 200) return fail(`want HTTP 200 from the tokens mount, got ${response.status}`)
			if (!token) return fail("no set-auth-token header on sign-in (the tokens mount needs BETTER_AUTH_SECRET)")
			if (!/set-auth-token/i.test(exposed)) return fail("set-auth-token is absent from access-control-expose-headers, so a browser cannot read it")
			hubToken = token
			pass("200 · set-auth-token present and exposed · no INVALID_ORIGIN")
		})

		// I4. credentialed AS session ----------------------------------------
		await iamStep("I4. AS session — sign in, then get-session cross-origin", `${AS_URL}/api/auth`, async () => {
			const browser = new Browser()
			// Sign-in itself is a same-origin top-level navigation in the real flow
			// (the user is on the AS's /sign-in page). Better Auth rejects a
			// cross-origin POST as INVALID_ORIGIN by design, so the Origin here is
			// the AS, not iam. What iam does cross-origin is read the session.
			const signIn = await browser.request(`${AS_URL}/api/auth/sign-in/email`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: AS_URL },
				body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
			})
			const signInBody = safeJson(await signIn.text())
			note(`sign-in (Origin ${AS_URL}): HTTP ${signIn.status} · user ${signInBody?.user?.id ?? "(none)"}`)
			if (signIn.status !== 200) return fail(`sign-in on the authorization server returned ${signIn.status}`)
			const session = await browser.request(`${AS_URL}/api/auth/get-session`, { headers: { origin: IAM_ORIGIN, accept: "application/json" } })
			const body = safeJson(await session.text())
			note(
				`get-session (Origin ${IAM_ORIGIN}): HTTP ${session.status} · ACAO ${session.headers.get("access-control-allow-origin") ?? "(none)"} · session ${
					body?.session ? "present" : "null"
				}`,
			)
			if (session.status !== 200) return fail(`get-session returned ${session.status}`)
			if (session.headers.get("access-control-allow-origin") !== IAM_ORIGIN) return fail(`get-session did not allow ${IAM_ORIGIN}`)
			if (!body?.session) return fail("get-session returned no session for the cookie it had just set")
			pass("the cookie session survived a cross-origin get-session")
		})

		// I5. agent keys -----------------------------------------------------
		await iamStep("I5. agent keys — mint from iam, list, revoke", `${API_URL}/api/v1/agent-keys`, async () => {
			if (!hubToken) return skip("no hub token from I3")
			const authHeaders = { authorization: `Bearer ${hubToken}`, origin: IAM_ORIGIN, "content-type": "application/json" }
			const minted = await request(`${API_URL}/api/v1/agent-keys`, {
				method: "POST",
				headers: authHeaders,
				body: { agentId: "qa-rigel-iam-gate", name: "Rigel iam stage (#93)" },
			})
			const keyId = minted.json?.id
			note(`POST /api/v1/agent-keys -> HTTP ${minted.status} · id ${keyId ?? "(none)"} · key ${minted.json?.key ? "returned" : "MISSING"}`)
			if (minted.status !== 201 || !keyId || !minted.json?.key) return fail(`want 201 + id + key, got ${minted.status}`)
			const listed = await request(`${API_URL}/api/v1/agent-keys`, {
				headers: { authorization: `Bearer ${hubToken}`, origin: IAM_ORIGIN },
			})
			const keys = Array.isArray(listed.json?.keys) ? listed.json.keys : []
			note(`GET /api/v1/agent-keys -> HTTP ${listed.status} · ${keys.length} key(s)`)
			if (listed.status !== 200) return fail(`list returned ${listed.status}`)
			if (!keys.some((key) => key.id === keyId)) return fail("the key just minted is not in the list")
			const revoked = await request(`${API_URL}/api/v1/agent-keys/${encodeURIComponent(keyId)}`, {
				method: "DELETE",
				headers: { authorization: `Bearer ${hubToken}`, origin: IAM_ORIGIN },
			})
			note(`DELETE /api/v1/agent-keys/${keyId} -> HTTP ${revoked.status}`)
			if (revoked.status !== 200) return fail(`revoke returned ${revoked.status}; key ${keyId} may be left behind`)
			pass("201 minted · listed · revoked")
		})

		// I6. DB isolation ---------------------------------------------------
		await iamStep("I6. DB isolation — the throwaway account is absent from the other environment", OTHER_API_URL, async () => {
			// A trusted Origin from the *other* environment: without one, Better Auth
			// answers 403 MISSING_OR_NULL_ORIGIN, which says nothing about the account.
			const response = await request(`${OTHER_API_URL}/api/v1/auth/sign-in/email`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: OTHER_AS_URL },
				body: { email: EMAIL, password: PASSWORD },
			})
			const code = String(response.json?.code ?? response.json?.error ?? "")
			note(`POST ${OTHER_API_URL}/api/v1/auth/sign-in/email (Origin ${OTHER_AS_URL}) -> HTTP ${response.status} · ${code || "(no code)"}`)
			if (response.status === 200) return fail(`${EMAIL} can sign in on BOTH environments — the D1s are not isolated`)
			if (response.status === 401) return pass(`no such account on the other environment (HTTP 401 ${code || "unauthorized"})`)
			return fail(`${response.status} ${code || "(no code)"} is inconclusive: the probe must reach the account lookup`)
		})
	}

	if (client) await client.close().catch(() => {})
} catch (error) {
	summary.error = String(error?.stack ?? error)
	if (current) {
		fail(String(error?.message ?? error))
		done()
	}
}

const notPassed = steps.filter((step) => step.ok !== true)
summary.ok = notPassed.length === 0
summary.finishedAt = new Date().toISOString()
summary.notPassed = notPassed.map((step) => step.name)
summary.exitCode = summary.ok ? 0 : 1
summary.iamOrigin = IAM_ORIGIN
const mcpSteps = steps.filter((step) => /^\d+\./.test(step.name))
const iamSteps = steps.filter((step) => /^I\d/.test(step.name))
const scope =
	iamSteps.length > 0
		? `${mcpSteps.filter((step) => step.ok === true).length}/${mcpSteps.length} MCP + ${iamSteps.filter((step) => step.ok === true).length}/${iamSteps.length} iam steps`
		: `${steps.length}/${steps.length} steps`

process.stdout.write(`\n${"=".repeat(78)}\n`)
for (const step of steps) {
	const label = step.ok === true ? "PASS" : step.ok === "skip" ? "SKIP" : "FAIL"
	process.stdout.write(`${label}  ${step.name}${step.ms ? ` (${step.ms} ms)` : ""}\n`)
}
process.stdout.write(
	summary.ok
		? `RESULT: PASS — ${scope} on ${ENVIRONMENT} (${MCP_URL}${IAM_ORIGIN ? `, iam ${IAM_ORIGIN}` : ""})\n`
		: `RESULT: FAIL — ${notPassed.length}/${steps.length} steps not passed on ${ENVIRONMENT} (${MCP_URL}${
				IAM_ORIGIN ? `, iam ${IAM_ORIGIN}` : ""
			})\n`,
)

if (JSON_OUT) {
	const { writeFileSync } = await import("node:fs")
	writeFileSync(JSON_OUT, `${JSON.stringify(summary, null, 2)}\n`)
	process.stdout.write(`json: ${JSON_OUT}\n`)
}

// Give the runtime a tick to flush the transcript before the exit code lands.
await sleep(0)
process.exitCode = summary.exitCode
