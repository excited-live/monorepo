#!/usr/bin/env node
/**
 * Guard for the prelive MCP discovery identity (#123 B, the regression of #116).
 *
 * The protected-resource metadata lives on the API Worker and, since #116,
 * advertises the host the client connected to. The authorization server lives
 * on the webapp and binds OAuth tokens to ONE audience, taken from its
 * `EXCITED_API_URL`. When those disagree the chain still looks healthy — PRM
 * 200, AS metadata 200 — and only a real token fails, on `aud`. #123 B was
 * exactly that: PRM said `prelive.api.excited.live` while the AS minted
 * `aud=…workers.dev`.
 *
 * Static half (this script, every PR): the checked-in origins and the code path
 * that derives them, so a config or source edit cannot bring the split back.
 * Live half (smoke-prelive.mjs check 4, after every deploy and every 6h): the
 * deployed documents — PRM resource == the connected host, and every
 * `authorization_servers` entry resolves to JSON, not HTML/404.
 *
 * Reads both TOML files as text (no dependency) and two TS files as text.
 * A failure here means a config or code edit is wrong, not that the guard
 * needs loosening.
 *
 * Usage: node scripts/check-prelive-mcp-discovery.mjs
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
// Explicit import: scripts/**.mjs only declares the Node globals it uses in
// eslint.config.mjs, and `URL` is not one of them.
import { URL } from "node:url"
import {
	PRELIVE_API_ORIGIN,
	PRELIVE_WEBAPP_ORIGIN,
	PRELIVE_WORKER_ORIGIN,
} from "./prelive-hosts.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (file) => readFileSync(path.join(root, file), "utf8")

const PAGES_CONFIG = "apps/webapp/wrangler.prelive.toml"
const API_CONFIG = "apps/api/wrangler.toml"
const OAUTH_SOURCE = "apps/api/src/lib/oauth.ts"
const MCP_AUTH_SOURCE = "apps/api/src/modules/mcp/mcp.auth.ts"

/** Text of one TOML section/table header, up to the next header. */
function section(text, header) {
	// Header must start a line: comments mention these headers too.
	const start = text.search(new RegExp(`^${header.replace(/[[\]]/g, "\\$&")}\\s*$`, "m"))
	if (start < 0) return ""
	const rest = text.slice(start + header.length)
	const next = rest.search(/\n\s*\[/)
	return next < 0 ? rest : rest.slice(0, next)
}

/** First string value for `key` in a blob of TOML. */
function stringValue(text, key) {
	const match = text.match(new RegExp(`\\b${key}\\s*=\\s*"([^"]+)"`))
	return match?.[1]
}

/** Origin of a URL string, or undefined when it is not an absolute https URL. */
function httpsOrigin(value) {
	if (!value) return undefined
	try {
		const parsed = new URL(value)
		return parsed.protocol === "https:" ? parsed.origin : undefined
	} catch {
		return undefined
	}
}

/** Body of `[export ][async ]function <name>(…) { … }`, up to the closing brace at column 0. */
function functionBody(source, name) {
	const start = source.indexOf(`function ${name}(`)
	if (start < 0) return ""
	const end = source.indexOf("\n}", start)
	return end < 0 ? source.slice(start) : source.slice(start, end)
}

/**
 * Remove comments so a doc comment that explains the #116 bug does not read as
 * a hard-coded host. `//` is only a comment at line start or after whitespace:
 * stripping every `//` would also cut `https://`, which is where a regression
 * literal lives (the first version of this guard had that hole).
 */
function stripComments(source) {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1")
}

/** True when the given source still hard-codes the internal Worker host. */
function mentionsInternalHost(source) {
	return /workers\.dev/.test(stripComments(source))
}

/** `--self-test`: prove the detector both fires on a literal and ignores prose. */
function selfTest() {
	const planted = 'return "https://excited-live-api-prelive.preamza02.workers.dev";'
	const plantedAfterUrl = 'const base = "https://api.excited.live"\nconst bad = "https://x.workers.dev" // internal'
	const prose = "// the workers.dev pin is documented here\nconst x = 1"
	const checks = [
		["a hard-coded workers.dev literal is detected", mentionsInternalHost(planted), true],
		["a trailing comment does not hide the next line's literal", mentionsInternalHost(plantedAfterUrl), true],
		["a workers.dev mention in a comment is ignored", mentionsInternalHost(prose), false],
	]
	const failed = checks.filter(([, actual, wanted]) => actual !== wanted)
	for (const [label, actual, wanted] of checks) {
		console.log(`  ${actual === wanted ? "PASS" : "FAIL"} ${label} (${actual}, want ${wanted})`)
	}
	if (failed.length > 0) {
		console.error("\nself-test failed: the guard cannot tell a planted literal from prose")
		process.exit(1)
	}
	console.log("self-test OK\n")
}

const problems = []
const expect = (label, actual, wanted) => {
	if (actual !== wanted) problems.push(`${label}: expected ${JSON.stringify(wanted)}, found ${JSON.stringify(actual)}`)
}

const pagesToml = read(PAGES_CONFIG)
const apiToml = read(API_CONFIG)

const pagesVars = section(pagesToml, "[vars]")
const apiPrelive = section(apiToml, "[env.prelive]")

const pagesApiUrl = stringValue(pagesVars, "EXCITED_API_URL")
const pagesBackendUrl = stringValue(pagesVars, "BACKEND_API_URL")
const pagesWebappUrl = stringValue(pagesVars, "BETTER_AUTH_URL")
const apiWebappUrl = stringValue(apiPrelive, "EXCITED_WEBAPP_URL")
const apiAuthUrl = stringValue(apiPrelive, "BETTER_AUTH_URL")

if (process.argv.includes("--self-test")) selfTest()

// 1. The AS audience. This is the value that made #123 B fail: PRM advertised
//    the public host, the AS bound the Worker's internal workers.dev address.
const pagesApiOrigin = httpsOrigin(pagesApiUrl)
expect(`${PAGES_CONFIG} [vars] EXCITED_API_URL`, pagesApiUrl, PRELIVE_API_ORIGIN)
if (pagesApiUrl && !pagesApiOrigin) {
	problems.push(
		`${PAGES_CONFIG} [vars] EXCITED_API_URL is ${JSON.stringify(pagesApiUrl)}, not an absolute https URL; the AS audience must be ${PRELIVE_API_ORIGIN}`
	)
} else if (pagesApiUrl && pagesApiOrigin !== PRELIVE_API_ORIGIN) {
	problems.push(
		`${PAGES_CONFIG} [vars] EXCITED_API_URL must be the public API origin ${PRELIVE_API_ORIGIN}, not ${JSON.stringify(pagesApiUrl)}: MCP clients are told the request host, so a different audience is rejected (#123 B)`
	)
}
if (pagesApiOrigin && /(^|\.)workers\.dev$/.test(new URL(pagesApiOrigin).hostname)) {
	problems.push(
		`${PAGES_CONFIG} [vars] EXCITED_API_URL points at workers.dev; that is the Worker's internal address (#116), and tokens bound to it fail on the public host`
	)
}
// Server-to-server only: never advertised, so it may stay internal.
expect(`${PAGES_CONFIG} [vars] BACKEND_API_URL`, pagesBackendUrl, PRELIVE_WORKER_ORIGIN)

// 2. The issuer PRM advertises must be the webapp that actually serves the AS
//    metadata at <origin>/api/auth/.well-known/oauth-authorization-server.
expect(`${PAGES_CONFIG} [vars] BETTER_AUTH_URL`, pagesWebappUrl, PRELIVE_WEBAPP_ORIGIN)
expect(`${API_CONFIG} [env.prelive] EXCITED_WEBAPP_URL`, apiWebappUrl, PRELIVE_WEBAPP_ORIGIN)

// 3. The API's BETTER_AUTH_URL pin stays the Worker's own origin. If it drifts
//    to the public host, discovery can "pass" by coincidence and the #116 split
//    (pin != request host) stops being exercised by tests or by prelive.
expect(`${API_CONFIG} [env.prelive] BETTER_AUTH_URL`, apiAuthUrl, PRELIVE_WORKER_ORIGIN)

// 4. Discovery follows the request host, never the pin. This is the code half
//    of #116: mcpResource() and the 401 challenge both go through
//    mcpAdvertisedOrigin(), which parses the request URL; the audience check
//    uses the same function, so a token minted for the pin cannot pass either.
const oauthSource = read(OAUTH_SOURCE)
const mcpAuthSource = read(MCP_AUTH_SOURCE)

const advertisedBody = functionBody(oauthSource, "mcpAdvertisedOrigin")
if (!/export function mcpAdvertisedOrigin\s*\(/.test(oauthSource)) {
	problems.push(`${OAUTH_SOURCE} no longer exports mcpAdvertisedOrigin(); MCP discovery must derive its origin from the request URL (#116)`)
} else if (
	!/new URL\(\s*requestUrl\s*\)/.test(advertisedBody) ||
	/process\.env/.test(advertisedBody) ||
	/requestOrigin\s*\(/.test(advertisedBody)
) {
	problems.push(`${OAUTH_SOURCE} mcpAdvertisedOrigin() must parse requestUrl (new URL(requestUrl)) and must not read process.env or call requestOrigin() — either is the BETTER_AUTH_URL pin again (#116)`)
}
for (const [name, source, file] of [
	["mcpResource", oauthSource, OAUTH_SOURCE],
	["unauthorizedResponse", mcpAuthSource, MCP_AUTH_SOURCE],
]) {
	const body = functionBody(source, name)
	if (!/mcpAdvertisedOrigin\s*\(/.test(body)) {
		problems.push(`${file} ${name}() must build its URL from mcpAdvertisedOrigin(requestUrl), not from the BETTER_AUTH_URL pin (#116)`)
	}
	if (/requestOrigin\s*\(/.test(body)) {
		problems.push(`${file} ${name}() calls requestOrigin(), which honours the BETTER_AUTH_URL pin; discovery must follow the request host (#116)`)
	}
}
if (!/audience:\s*mcpResource\s*\(\s*requestUrl\s*\)/.test(functionBody(oauthSource, "verifyOAuthAccessToken"))) {
	problems.push(`${OAUTH_SOURCE} verifyOAuthAccessToken() must verify against mcpResource(requestUrl); a pinned audience would accept tokens minted for the internal host (#123 B)`)
}
for (const [file, text] of [
	[OAUTH_SOURCE, oauthSource],
	[MCP_AUTH_SOURCE, mcpAuthSource],
]) {
	if (mentionsInternalHost(text)) {
		problems.push(`${file} hard-codes workers.dev; MCP discovery must not name the internal Worker host (#116)`)
	}
}

// 5. The 401 body names the API-key alternative (#123 A.1). Without it a client
//    that stops at the 401 never learns `elk_` keys exist, even though both
//    header transports accept them. Body only: the comments above it say the
//    same thing and must not satisfy the guard.
const unauthorizedBody = functionBody(mcpAuthSource, "unauthorizedResponse")
if (!/elk_/.test(unauthorizedBody) || !/x-api-key/i.test(unauthorizedBody)) {
	problems.push(
		`${MCP_AUTH_SOURCE} unauthorizedResponse() must name the API-key alternative (Authorization: Bearer elk_… or x-api-key) in the 401 body (#123 A.1)`
	)
}

if (problems.length > 0) {
	console.error("Prelive MCP discovery identity is inconsistent:\n")
	for (const problem of problems) console.error(`  - ${problem}`)
	console.error(`\nFix ${PAGES_CONFIG}, ${API_CONFIG} or the API discovery code, not the CI.`)
	process.exit(1)
}

console.log(
	`Prelive MCP discovery identity OK: resource ${PRELIVE_API_ORIGIN}/mcp (request host), issuer ${PRELIVE_WEBAPP_ORIGIN}/api/auth, AS audience ${PRELIVE_API_ORIGIN}, internal Worker ${PRELIVE_WORKER_ORIGIN}`
)
