#!/usr/bin/env node
/**
 * Guard + Pages deployment-config builder for the production webapp project
 * (`excited-live-web`).
 *
 * The MCP authorization server is the webapp (Pages, cookies mount) and the
 * protected resource is the production API Worker (`/mcp`). They agree through
 * three values, and a mismatch only shows up at runtime in a browser OAuth
 * flow, so CI fails here instead:
 *
 *   1. the same D1 database as apps/api (sessions + JWKS written by the
 *      webapp mount, read by the API mount)
 *   2. issuer = <BETTER_AUTH_URL>/api/auth on the webapp, which after the
 *      hostname flip must equal apps/api's EXCITED_WEBAPP_URL
 *   3. resource = <EXCITED_API_URL>/mcp, which must equal the API's own
 *      advertised protected resource
 *
 * `node scripts/check-web-production-config.mjs` validates the checked-in files
 * and fails CI on drift. `--json` additionally prints the Pages project
 * `deployment_configs` body that webapp-production.yml PATCHes in: `wrangler
 * pages deploy` only sends a hash of the configuration file, so bindings and
 * vars have to be applied to the project explicitly.
 *
 * Both TOML files are read as text so this needs no dependency.
 */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (file) => readFileSync(path.join(root, file), "utf8")

const PAGES_CONFIG = "apps/webapp/wrangler.web.toml"
const API_CONFIG = "apps/api/wrangler.toml"
const PROJECT_NAME = "excited-live-web"
/** Projects this config must never deploy into. */
const FORBIDDEN_PROJECTS = ["excited-live", "excited-live-prelive"]
const API_ORIGIN = "https://api.excited.live"
/** The webapp's canonical custom domain and OAuth issuer (since 2026-10-25). */
const WEBAPP_ORIGIN = "https://auth.excited.live"
/** Working aliases of the same deployment that must stay reachable while clients repoint.
 *  app.excited.live is NOT here: it 308-redirects to the issuer (one cookie jar), so it must
 *  not be trusted as an origin of its own — only the pages.dev deployment origin is. */
const TRANSITION_ORIGINS = ["https://excited-live-web.pages.dev"]
/** The no-BFF SPA (apps/iam). A production iam build calls the API and the auth
 *  server cross-origin with credentials, so both allowlists must name it (#89). */
const IAM_ORIGIN = "https://iam.excited.live"
const DATABASE_ID = "90bd930e-8bfe-49a4-b58c-b44531c20902"
const DATABASE_NAME = "excited-live-api-production"

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

/** String array value for `key` in a blob of TOML. */
function stringArray(text, key) {
	const match = text.match(new RegExp(`\\b${key}\\s*=\\s*\\[([^\\]]*)\\]`))
	if (!match) return undefined
	return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1])
}

/** Inline table values (`vars = { A = "x", B = "y" }`) as a plain object. */
function inlineTable(text, key) {
	const match = text.match(new RegExp(`^${key}\\s*=\\s*\\{([^}]*)\\}`, "m"))
	if (!match) return {}
	return Object.fromEntries([...match[1].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]))
}

const problems = []
const expect = (label, actual, wanted) => {
	if (actual !== wanted) problems.push(`${label}: expected ${JSON.stringify(wanted)}, found ${JSON.stringify(actual)}`)
}

const apiToml = read(API_CONFIG)
const pagesToml = read(PAGES_CONFIG)

// Top level of apps/api/wrangler.toml is production; [env.prelive] is a
// separate Worker with a separate database, so only the top level counts here.
const apiProdVars = inlineTable(apiToml, "vars")
const apiProdDb = section(apiToml, "[[d1_databases]]")
const pagesVars = section(pagesToml, "[vars]")
const pagesDb = section(pagesToml, "[[d1_databases]]")

const pagesName = stringValue(pagesToml, "name")
const pagesOrigin = stringValue(pagesVars, "BETTER_AUTH_URL")
const pagesApiOrigin = stringValue(pagesVars, "EXCITED_API_URL")
const pagesBackendOrigin = stringValue(pagesVars, "BACKEND_API_URL")
const pagesTrusted = stringValue(pagesVars, "BETTER_AUTH_TRUSTED_ORIGINS")
const pagesDatabaseId = stringValue(pagesDb, "database_id")
const pagesDatabaseName = stringValue(pagesDb, "database_name")
const pagesBinding = stringValue(pagesDb, "binding")
const compatibilityDate = stringValue(pagesToml, "compatibility_date")
const compatibilityFlags = stringArray(pagesToml, "compatibility_flags")

expect(`${PAGES_CONFIG} name`, pagesName, PROJECT_NAME)
if (FORBIDDEN_PROJECTS.includes(pagesName)) {
	problems.push(`${PAGES_CONFIG} name must not be ${pagesName}: that Pages project already serves another app`)
}
expect(`${PAGES_CONFIG} [vars] BETTER_AUTH_URL`, pagesOrigin, WEBAPP_ORIGIN)
expect(`${PAGES_CONFIG} [vars] EXCITED_API_URL`, pagesApiOrigin, API_ORIGIN)
expect(`${PAGES_CONFIG} [vars] BACKEND_API_URL`, pagesBackendOrigin, API_ORIGIN)
expect(`${PAGES_CONFIG} D1 binding`, pagesBinding, "DB")
expect(`${PAGES_CONFIG} D1 database_name`, pagesDatabaseName, DATABASE_NAME)
expect(`${PAGES_CONFIG} D1 database_id must equal apps/api production (shared sessions/JWKS)`, pagesDatabaseId, DATABASE_ID)
expect(`apps/api production D1 database_id`, stringValue(apiProdDb, "database_id"), DATABASE_ID)
expect(`apps/api production D1 database_name`, stringValue(apiProdDb, "database_name"), DATABASE_NAME)
// The API derives its advertised protected resource from the request origin,
// but its BETTER_AUTH_URL pins the public origin; keep the webapp's idea of the
// API in step with it.
expect("apps/api production BETTER_AUTH_URL", apiProdVars.BETTER_AUTH_URL, API_ORIGIN)

// The hostname flip is a two-file change and CI enforces it: the API's
// advertised authorization server must be the origin this project serves, or
// connectors discover an issuer that cannot mint the token the API expects.
const apiWebappOrigin = apiProdVars.EXCITED_WEBAPP_URL
expect("apps/api production EXCITED_WEBAPP_URL must equal this project's BETTER_AUTH_URL", apiWebappOrigin, pagesOrigin)

if (pagesTrusted) {
	for (const origin of [pagesOrigin, API_ORIGIN, IAM_ORIGIN, ...TRANSITION_ORIGINS]) {
		if (!pagesTrusted.split(",").map((value) => value.trim()).includes(origin)) {
			problems.push(`${PAGES_CONFIG} BETTER_AUTH_TRUSTED_ORIGINS is missing ${origin}`)
		}
	}
}

// The API derives BOTH its browser CORS allowlist (apps/api/src/lib/cors.ts)
// and the tokens-mount trusted origins (apps/api/src/lib/auth.ts) from this
// one production value. A missing origin is invisible until a browser calls
// the API from it: iam.excited.live was absent here while iam was live on
// prod, so every iam API call was CORS-blocked (#89).
const apiTrusted = apiProdVars.BETTER_AUTH_TRUSTED_ORIGINS
if (!apiTrusted) {
	problems.push(`${API_CONFIG} production BETTER_AUTH_TRUSTED_ORIGINS is missing`)
} else {
	const apiTrustedOrigins = apiTrusted.split(",").map((value) => value.trim())
	for (const origin of [pagesOrigin, IAM_ORIGIN]) {
		if (!apiTrustedOrigins.includes(origin)) {
			problems.push(`${API_CONFIG} production BETTER_AUTH_TRUSTED_ORIGINS is missing ${origin}`)
		}
	}
}

if (/AUTH_REQUIRED/.test(pagesVars)) {
	problems.push(`${PAGES_CONFIG} must not set AUTH_REQUIRED: the authorization server has to stay reachable signed out`)
}
// The issuer is a bare https origin: no trailing slash, no path, no port.
if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/.test(pagesOrigin ?? "")) {
	problems.push(`${PAGES_CONFIG} BETTER_AUTH_URL must be a bare https origin such as ${WEBAPP_ORIGIN}`)
}
if (!compatibilityDate) problems.push(`${PAGES_CONFIG} compatibility_date is missing`)
if (!compatibilityFlags?.includes("nodejs_compat")) problems.push(`${PAGES_CONFIG} compatibility_flags must include nodejs_compat`)

if (problems.length > 0) {
	console.error("Production webapp configuration is inconsistent:\n")
	for (const problem of problems) console.error(`  - ${problem}`)
	console.error(`\nFix ${PAGES_CONFIG} or apps/api/wrangler.toml, not the CI.`)
	process.exit(1)
}

// `wrangler pages deploy` sends sha256 of the configuration file it read; the
// Pages project must carry the same hash or the deployment is rejected as out
// of sync. The workflow copies this file to apps/webapp/wrangler.toml, so the
// bytes hashed here are exactly the bytes deployed.
if (process.argv.includes("--json")) {
	const body = {
		deployment_configs: {
			production: {
				d1_databases: { DB: { id: pagesDatabaseId } },
				env_vars: {
					BETTER_AUTH_URL: { type: "plain_text", value: pagesOrigin },
					EXCITED_API_URL: { type: "plain_text", value: pagesApiOrigin },
					BACKEND_API_URL: { type: "plain_text", value: pagesBackendOrigin },
					...(pagesTrusted ? { BETTER_AUTH_TRUSTED_ORIGINS: { type: "plain_text", value: pagesTrusted } } : {}),
				},
				compatibility_date: compatibilityDate,
				compatibility_flags: compatibilityFlags,
				wrangler_config_hash: createHash("sha256").update(readFileSync(path.join(root, PAGES_CONFIG))).digest("hex"),
			},
		},
	}
	process.stdout.write(JSON.stringify(body))
} else {
	console.log(
		`Production webapp configuration OK: issuer ${pagesOrigin}/api/auth, resource ${pagesApiOrigin}/mcp, ` +
			`backend ${pagesBackendOrigin}, D1 ${pagesDatabaseId} (${pagesDatabaseName}), project ${pagesName}`
	)
}
