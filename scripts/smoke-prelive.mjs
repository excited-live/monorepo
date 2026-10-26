#!/usr/bin/env node
/**
 * Live smoke test for prelive: the webapp is the MCP authorization server
 * (Pages, https://prelive.excited.live/api/auth) and the API Worker is the
 * protected resource, reached at the public host clients call
 * (https://prelive.api.excited.live).
 *
 * It is the executable form of the five checks #154 asked for, plus the
 * discovery assertions that make the OAuth chain close:
 *
 *   1. GET  <issuer>/.well-known/oauth-authorization-server  200, issuer matches
 *      (and the path-insert URLs under /.well-known/…/api/auth, 200 JSON)
 *   2. GET  <issuer>/ok                                      200 (the 503 regression)
 *   3. POST <issuer>/oauth2/register                         200/201 + client_id,
 *      whose `resources` bind <api>/mcp (the AS audience, #123 B)
 *   4. POST <api>/mcp without a token                        401 + WWW-Authenticate
 *                                                            carrying resource_metadata
 *                                                            on the same host, whose
 *                                                            document's `resource` IS
 *                                                            <api>/mcp (the host the
 *                                                            client connected to, #116)
 *                                                            and whose every
 *                                                            authorization_servers entry
 *                                                            answers JSON AS metadata, not
 *                                                            HTML/404 (#123 B). The 401
 *                                                            body must name the API-key
 *                                                            alternative (#123 A.1).
 *      GET  <api>/api/v1/settings without a token            401 (the REST mount)
 *   5. GET  <api>/health                                     200 + status "ok"
 *   6. GET  <landing>/ and <landing>/llms.txt                every advertised
 *      https://<host>/mcp answers a usable MCP handshake, and /llms.txt is
 *      text (not the landing HTML) naming the canonical API and auth origins.
 *      #99 (dead mcp.excited.live) and #100 (HTML /llms.txt) lived here, not in
 *      1-5. Off by default so a prelive deploy is not failed by a prod landing;
 *      prelive-smoke.yml runs it explicitly.
 *
 * It runs after each deploy (prelive.yml, api-prelive.yml) and every six hours
 * (prelive-smoke.yml). It is deliberately not wired into PR workflows: prelive
 * serves main, so a PR run would assert on a build the PR never changed.
 *
 * Usage:
 *   node scripts/smoke-prelive.mjs
 *   node scripts/smoke-prelive.mjs --only 4,5 --retries 10 --wait 3
 *
 * Flags:
 *   --only 1,2,5   run only these checks (default: all)
 *   --retries N    attempts for the whole run (default: 1)
 *   --wait S       seconds between attempts (default: 5)
 *   --timeout MS   per-request timeout (default: 20000)
 *   --issuer URL   authorization server origin (default: the prelive webapp)
 *   --api URL      API origin (default: the public prelive API host)
 *   --landing URL  landing origin for check 6 (default: https://excited.live)
 *
 * Exits 0 only when every selected check passed; any failure exits 1. Raw
 * status and body are printed per check so a failure shows what the deployment
 * actually returned.
 */

// Explicit import: scripts/**.mjs only declares the Node globals it uses in
// eslint.config.mjs, and `URL` is not one of them.
import { URL } from "node:url"
import { PRELIVE_API_ORIGIN, PRELIVE_ISSUER } from "./prelive-hosts.mjs"

const DEFAULTS = {
	issuer: PRELIVE_ISSUER,
	api: PRELIVE_API_ORIGIN,
	landing: "https://excited.live",
}

const CHECK_NAMES = {
	1: "authorization-server metadata",
	2: "auth health endpoint",
	3: "dynamic client registration",
	4: "protected resources accept no anonymous call",
	5: "API worker health",
	6: "landing entry points (advertised MCP host + /llms.txt)",
}

const BODY_LIMIT = 1600

function usage(message) {
	console.error(`smoke-prelive: ${message}`)
	console.error(
		"usage: node scripts/smoke-prelive.mjs [--only 1,2,3,4,5,6] [--retries N] [--wait S] [--timeout MS] [--issuer URL] [--api URL] [--landing URL]",
	)
	process.exit(2)
}

const argv = process.argv.slice(2)

function flag(name, fallback) {
	const index = argv.indexOf(`--${name}`)
	if (index < 0) return fallback
	const value = argv[index + 1]
	if (value === undefined || value.startsWith("--")) usage(`--${name} needs a value`)
	return value
}

function positiveInt(name, fallback, { allowZero = false } = {}) {
	const raw = flag(name, String(fallback))
	const value = Number(raw)
	const minimum = allowZero ? 0 : 1
	if (!Number.isInteger(value) || value < minimum) usage(`--${name} must be an integer >= ${minimum}, got ${JSON.stringify(raw)}`)
	return value
}

const ISSUER = flag("issuer", DEFAULTS.issuer).replace(/\/+$/, "")
const API = flag("api", DEFAULTS.api).replace(/\/+$/, "")
const LANDING = flag("landing", DEFAULTS.landing).replace(/\/+$/, "")
const RETRIES = positiveInt("retries", 1)
const WAIT = positiveInt("wait", 5, { allowZero: true })
const TIMEOUT = positiveInt("timeout", 20000)

const only = flag("only", "1,2,3,4,5")
	.split(",")
	.map((entry) => entry.trim())
	.filter(Boolean)
	.map(Number)
if (only.length === 0 || only.some((id) => !Number.isInteger(id) || !CHECK_NAMES[id])) usage("--only takes comma-separated check numbers from 1 to 6")

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function describeError(error) {
	if (error?.name === "TimeoutError") return `timed out after ${TIMEOUT} ms`
	return error?.cause?.code ?? error?.message ?? String(error)
}

async function request(url, { method = "GET", body } = {}) {
	const started = Date.now()
	let response
	try {
		response = await fetch(url, {
			method,
			headers: body === undefined ? undefined : { "content-type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(TIMEOUT),
		})
	} catch (error) {
		throw new Error(`${method} ${url} failed: ${describeError(error)}`)
	}
	let text = ""
	try {
		text = await response.text()
	} catch (error) {
		throw new Error(`${method} ${url} body unreadable: ${describeError(error)}`)
	}
	return { status: response.status, headers: response.headers, text, ms: Date.now() - started }
}

/** Print the status and raw body of one request, so a failure is evidence. */
function report(method, url, response) {
	console.log(`  ${method} ${url} -> ${response.status} in ${response.ms} ms`)
	const body = response.text.length > BODY_LIMIT ? `${response.text.slice(0, BODY_LIMIT)}… (${response.text.length} bytes)` : response.text
	if (body.trim()) console.log(`  body: ${body.trim()}`)
}

function parseJson(response, what) {
	try {
		return JSON.parse(response.text)
	} catch {
		throw new Error(`${what} did not return JSON: ${JSON.stringify(response.text.slice(0, 200))}`)
	}
}

function expectStatus(response, wanted, what) {
	if (response.status === wanted) return
	throw new Error(`${what} returned ${response.status}, want ${wanted}`)
}

/**
 * A discovery document must be JSON. A 200 HTML page is the #123 B failure
 * mode: the client parses HTML and reports an unrelated error.
 */
function expectJson(response, what) {
	const type = response.headers.get("content-type") ?? "(no content-type)"
	if (!type.includes("application/json")) {
		throw new Error(`${what} returned ${type}, want application/json — a 200 HTML page breaks discovery harder than a 404`)
	}
}

/** The URL must be on `origin`, i.e. the host the client actually called. */
function assertSameOrigin(url, origin, what) {
	let parsed
	try {
		parsed = new URL(url)
	} catch {
		throw new Error(`${what} is not a URL: ${JSON.stringify(url)}`)
	}
	if (parsed.origin !== origin) {
		throw new Error(`${what} points at ${parsed.origin}, want ${origin} (the host the client connected to)`)
	}
}

async function checkMetadata() {
	const url = `${ISSUER}/.well-known/oauth-authorization-server`
	const response = await request(url)
	report("GET", url, response)
	expectStatus(response, 200, "authorization-server metadata")
	const document = parseJson(response, "authorization-server metadata")
	if (document.issuer !== ISSUER) {
		throw new Error(`metadata issuer is ${JSON.stringify(document.issuer)}, want exactly ${JSON.stringify(ISSUER)}`)
	}
	for (const key of ["authorization_endpoint", "token_endpoint", "jwks_uri", "registration_endpoint"]) {
		if (typeof document[key] !== "string" || document[key].length === 0) throw new Error(`metadata is missing ${key}`)
	}
	// RFC 8414 path-insert form: the MCP SDK tries these first and aborts on a 5xx.
	const { origin, pathname } = new URL(ISSUER)
	for (const name of ["oauth-authorization-server", "openid-configuration"]) {
		const insert = `${origin}/.well-known/${name}${pathname.replace(/\/+$/, "")}`
		const inserted = await request(insert)
		report("GET", insert, inserted)
		expectStatus(inserted, 200, `path-insert ${name}`)
		const body = parseJson(inserted, `path-insert ${name}`)
		if (body.issuer !== ISSUER) throw new Error(`path-insert ${name} issuer is ${JSON.stringify(body.issuer)}, want ${JSON.stringify(ISSUER)}`)
	}
	return `issuer ${document.issuer} (+ both path-insert URLs)`
}

async function checkHealthEndpoint() {
	const url = `${ISSUER}/ok`
	const response = await request(url)
	report("GET", url, response)
	if (response.status === 503) throw new Error("/ok is 503: the authorization server is not configured in this deployment")
	expectStatus(response, 200, "/ok")
	const body = parseJson(response, "/ok")
	if (body.ok !== true) throw new Error(`/ok body is ${JSON.stringify(body)}, want {"ok":true}`)
	return "/ok answers 200"
}

async function checkRegistration() {
	const url = `${ISSUER}/oauth2/register`
	const response = await request(url, {
		method: "POST",
		body: {
			client_name: "prelive-ci-smoke",
			redirect_uris: ["https://example.com/callback"],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
			scope: "openid profile email offline_access",
		},
	})
	report("POST", url, response)
	if (response.status !== 200 && response.status !== 201) {
		throw new Error(`dynamic client registration returned ${response.status}, want 200 or 201`)
	}
	const client = parseJson(response, "dynamic client registration")
	if (typeof client.client_id !== "string" || client.client_id.length < 8) {
		throw new Error(`registration returned no usable client_id: ${JSON.stringify(client.client_id)}`)
	}
	const resources = Array.isArray(client.resources) ? client.resources : []
	// The AS binds the token audience here (#123 B). An absent list is not
	// "fine": packages/auth falls back to the production API, which a prelive
	// token must never be minted for.
	if (!resources.includes(`${API}/mcp`)) {
		throw new Error(
			`client resources are ${JSON.stringify(resources)}, want ${API}/mcp — the AS must bind the public API host it advertises as the resource`,
		)
	}
	return `client_id issued (${client.client_id.length} chars)`
}

async function checkMcpProtected() {
	const url = `${API}/mcp`
	const response = await request(url, { method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/list" } })
	report("POST", url, response)
	expectStatus(response, 401, "POST /mcp without a token")

	const header = response.headers.get("www-authenticate") ?? ""
	console.log(`  WWW-Authenticate: ${header || "(absent)"}`)
	const match = header.match(/resource_metadata="([^"]+)"/) ?? header.match(/resource_metadata=([^,\s]+)/)
	if (!match) throw new Error(`WWW-Authenticate must point at resource_metadata; got ${JSON.stringify(header)}`)

	// The challenge URL must live on the host the client called. Advertising the
	// Worker's internal address here is the #116 regression.
	const metadataUrl = match[1]
	assertSameOrigin(metadataUrl, API, "WWW-Authenticate resource_metadata")

	const metadata = await request(metadataUrl)
	report("GET", metadataUrl, metadata)
	expectStatus(metadata, 200, "protected-resource metadata")
	expectJson(metadata, "protected-resource metadata")
	const document = parseJson(metadata, "protected-resource metadata")

	// RFC 9728 / RFC 8707: the resource identifier must be the host the client
	// connected to. #123 B: PRM said prelive.api.excited.live was not the
	// resource, so strict clients refused and lenient ones minted the wrong aud.
	const wantedResource = `${API}/mcp`
	if (document.resource !== wantedResource) {
		throw new Error(
			`PRM resource is ${JSON.stringify(document.resource)}, want ${JSON.stringify(wantedResource)} (the host the client connected to)`,
		)
	}

	const servers = Array.isArray(document.authorization_servers) ? document.authorization_servers : []
	if (!servers.includes(ISSUER)) {
		throw new Error(`protected-resource metadata advertises ${JSON.stringify(servers)}, want ${ISSUER}`)
	}

	// Every advertised AS must actually be one. A 200 HTML page is worse than a
	// 404 (the client parses it and dies opaquely), which is what #123 B hit.
	for (const server of servers) {
		if (typeof server !== "string" || !server.startsWith("https://")) {
			throw new Error(`authorization_servers entry is not an https origin: ${JSON.stringify(server)}`)
		}
		const asUrl = `${server.replace(/\/+$/, "")}/.well-known/oauth-authorization-server`
		const as = await request(asUrl)
		report("GET", asUrl, as)
		expectStatus(as, 200, `authorization-server metadata at ${server}`)
		expectJson(as, `authorization-server metadata at ${server}`)
		const asDocument = parseJson(as, `authorization-server metadata at ${server}`)
		if (asDocument.issuer !== server.replace(/\/+$/, "")) {
			throw new Error(`${asUrl} issuer is ${JSON.stringify(asDocument.issuer)}, want ${JSON.stringify(server)}`)
		}
		for (const key of ["authorization_endpoint", "token_endpoint", "jwks_uri"]) {
			if (typeof asDocument[key] !== "string" || asDocument[key].length === 0) {
				throw new Error(`${asUrl} is missing ${key}; discovery cannot complete`)
			}
		}
	}

	// #123 A.1: the 401 body must name the API-key alternative, not only OAuth.
	const body = parseJson(response, "POST /mcp 401 body")
	const hint = typeof body.hint === "string" ? body.hint : ""
	if (!hint.includes("elk_") || !/x-api-key/i.test(hint)) {
		throw new Error(`the 401 body must name the API-key alternative (Bearer elk_… or x-api-key); got ${JSON.stringify(body)}`)
	}

	// The REST mount is the other half of #140: a route that answers without a
	// bearer token is the same bug as an open /mcp.
	const restUrl = `${API}/api/v1/settings`
	const rest = await request(restUrl)
	report("GET", restUrl, rest)
	expectStatus(rest, 401, "GET /api/v1/settings without a token")

	return `401 on /mcp and /api/v1/settings, resource ${document.resource}, AS JSON at ${servers.join(", ")}`
}

async function checkApiHealth() {
	const url = `${API}/health`
	const response = await request(url)
	report("GET", url, response)
	expectStatus(response, 200, "/health")
	const body = parseJson(response, "/health")
	if (body.status !== "ok") throw new Error(`/health body is ${JSON.stringify(body)}, want status "ok"`)
	return `/health answers 200 (${body.service ?? "unknown service"})`
}

/**
 * The agent's first step is the landing page's copy-paste snippet, not the API.
 * #99 shipped a dead host (`mcp.excited.live`, NXDOMAIN) in all six snippets and
 * #100 served the landing HTML as /llms.txt; checks 1-5 never touch that
 * surface, so both stayed green here. This follows the advertised endpoint
 * instead of assuming it, and reads /llms.txt as an agent would.
 */
async function checkLandingEntryPoints() {
	const landingUrl = `${LANDING}/`
	const landing = await request(landingUrl)
	console.log(`  GET ${landingUrl} -> ${landing.status} in ${landing.ms} ms · ${landing.text.length} bytes`)
	expectStatus(landing, 200, "landing page")

	const advertised = [
		...new Set(
			[...landing.text.matchAll(/https:\/\/([a-z0-9][a-z0-9.-]*)\/mcp\b/gi)].map((match) => `https://${match[1]}/mcp`),
		),
	]
	if (advertised.length === 0) throw new Error("the landing page advertises no MCP endpoint at all")
	console.log(`  advertised MCP endpoint(s): ${advertised.join(", ")}`)

	const working = []
	for (const url of advertised) {
		// A dead host throws here with ENOTFOUND and names itself in the message.
		const probe = await request(url, { method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/list" } })
		const header = probe.headers.get("www-authenticate") ?? ""
		console.log(`  POST ${url} -> ${probe.status} in ${probe.ms} ms`)
		if (probe.status === 200) working.push(`${url} (200)`)
		else if (probe.status === 401 && /resource_metadata/.test(header)) working.push(`${url} (401 + resource_metadata)`)
		else throw new Error(`the landing page tells agents to use ${url}, which answered ${probe.status} without a usable MCP handshake`)
	}

	const llmsUrl = `${LANDING}/llms.txt`
	const llms = await request(llmsUrl)
	const type = llms.headers.get("content-type") ?? "(none)"
	console.log(`  GET ${llmsUrl} -> ${llms.status} in ${llms.ms} ms · ${type} · ${llms.text.length} bytes`)
	expectStatus(llms, 200, "/llms.txt")
	if (/text\/html/i.test(type)) throw new Error(`/llms.txt is served as ${type} (${llms.text.length} bytes) — that is the landing page, not a machine-readable entry point`)
	if (/^\s*<(!doctype|html)/i.test(llms.text)) throw new Error("/llms.txt body starts with HTML")
	if (!/https:\/\/api\.excited\.live\/mcp/.test(llms.text)) throw new Error("/llms.txt does not name the canonical MCP endpoint https://api.excited.live/mcp")
	if (!/https:\/\/auth\.excited\.live/.test(llms.text)) throw new Error("/llms.txt does not name the authorization server https://auth.excited.live")

	return `${working.length} advertised endpoint(s) live · /llms.txt is ${type}`
}

const CHECKS = {
	1: { run: checkMetadata, needs: [] },
	2: { run: checkHealthEndpoint, needs: [] },
	3: { run: checkRegistration, needs: [] },
	4: { run: checkMcpProtected, needs: [] },
	5: { run: checkApiHealth, needs: [] },
	6: { run: checkLandingEntryPoints, needs: [] },
}

async function runAttempt(selected, attempt) {
	console.log(`\nprelive smoke · attempt ${attempt}/${RETRIES} · ${selected.length} check(s) · issuer ${ISSUER} · api ${API}`)
	const failures = []
	for (const id of selected) {
		console.log(`[check ${id}] ${CHECK_NAMES[id]}`)
		try {
			const detail = await CHECKS[id].run()
			console.log(`  PASS ${detail}`)
		} catch (error) {
			failures.push(id)
			console.log(`  FAIL ${error.message}`)
		}
	}
	return failures
}

async function main() {
	const selected = [...new Set(only)].sort((a, b) => a - b)
	let failures = []
	for (let attempt = 1; attempt <= RETRIES; attempt++) {
		failures = await runAttempt(selected, attempt)
		if (failures.length === 0) {
			console.log(`\nPASS ${selected.length}/${selected.length} prelive checks`)
			return 0
		}
		if (attempt < RETRIES) {
			console.log(`\n${failures.length} check(s) failed; retrying in ${WAIT}s`)
			await sleep(WAIT * 1000)
		}
	}
	console.log(`\nFAIL ${failures.length}/${selected.length} prelive checks failed: ${failures.map((id) => `${id} (${CHECK_NAMES[id]})`).join(", ")}`)
	return 1
}

process.exitCode = await main()
