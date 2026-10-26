#!/usr/bin/env node
/**
 * Guard + Pages deployment-config builder for the prelive auth split (#154).
 *
 * The MCP authorization server is the prelive webapp (Pages), the protected
 * resource is the prelive API (Worker), and they must agree on three things or
 * OAuth breaks silently:
 *
 *   1. the same D1 database (sessions + JWKS written by one, read by the other)
 *   2. issuer = <webapp origin>/api/auth exactly as the API advertises it
 *   3. resource = <public API origin>/mcp: the host clients connect to, which
 *      the API advertises from the request (#116) and therefore the audience
 *      the webapp must bind. The Worker's own workers.dev address is not it.
 *
 * `node scripts/check-prelive-auth-config.mjs` validates the checked-in files
 * and fails CI on drift. `--json` additionally prints the Pages project
 * `deployment_configs` body that prelive.yml PATCHes into the Pages project:
 * `wrangler pages deploy` only sends a hash of the configuration file, so the
 * bindings and vars have to be applied to the project explicitly.
 *
 * Both TOML files are read as text so this needs no dependency.
 */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
	PRELIVE_API_ORIGIN,
	PRELIVE_IAM_ORIGIN,
	PRELIVE_WEBAPP_ORIGIN,
	PRELIVE_WORKER_ORIGIN,
} from "./prelive-hosts.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (file) => readFileSync(path.join(root, file), "utf8")

const PAGES_CONFIG = "apps/webapp/wrangler.prelive.toml"
const API_CONFIG = "apps/api/wrangler.toml"
const PROJECT_NAME = "excited-live-prelive"
/** The Worker's own origin: BETTER_AUTH_URL pin and the BFF's internal hop. */
const API_WORKER_ORIGIN = PRELIVE_WORKER_ORIGIN
/** The public origin clients call; the OAuth resource/audience (#116, #123). */
const API_RESOURCE_ORIGIN = PRELIVE_API_ORIGIN
const WEBAPP_ORIGIN = PRELIVE_WEBAPP_ORIGIN
/** Prelive iam (#88). It calls the prelive API and auth server cross-origin. */
const IAM_ORIGIN = PRELIVE_IAM_ORIGIN
const DATABASE_ID = "f7bd3f26-5296-4832-96a3-1cbb01046112"

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

const problems = []
const expect = (label, actual, wanted) => {
	if (actual !== wanted) problems.push(`${label}: expected ${JSON.stringify(wanted)}, found ${JSON.stringify(actual)}`)
}

const apiToml = read(API_CONFIG)
const pagesToml = read(PAGES_CONFIG)

const apiPrelive = section(apiToml, "[env.prelive]")
const apiDb = section(apiToml, "[[env.prelive.d1_databases]]")
const pagesVars = section(pagesToml, "[vars]")
const pagesDb = section(pagesToml, "[[d1_databases]]")

const apiOrigin = stringValue(apiPrelive, "BETTER_AUTH_URL")
const apiWebappOrigin = stringValue(apiPrelive, "EXCITED_WEBAPP_URL")
const apiDatabaseId = stringValue(apiDb, "database_id")

const pagesName = stringValue(pagesToml, "name")
const pagesOrigin = stringValue(pagesVars, "BETTER_AUTH_URL")
const pagesApiOrigin = stringValue(pagesVars, "EXCITED_API_URL")
const pagesBackendOrigin = stringValue(pagesVars, "BACKEND_API_URL")
const pagesDatabaseId = stringValue(pagesDb, "database_id")
const pagesDatabaseName = stringValue(pagesDb, "database_name")
const pagesTrusted = stringValue(pagesVars, "BETTER_AUTH_TRUSTED_ORIGINS")
const pagesAuthCors = stringValue(pagesVars, "AUTH_CORS_ORIGINS")
const compatibilityDate = stringValue(pagesToml, "compatibility_date")
const compatibilityFlags = stringArray(pagesToml, "compatibility_flags")

expect("apps/api [env.prelive] BETTER_AUTH_URL", apiOrigin, API_WORKER_ORIGIN)
expect("apps/api [env.prelive] EXCITED_WEBAPP_URL", apiWebappOrigin, WEBAPP_ORIGIN)
expect("apps/api [env.prelive] D1 database_id", apiDatabaseId, DATABASE_ID)
expect(`${PAGES_CONFIG} name`, pagesName, PROJECT_NAME)
expect(`${PAGES_CONFIG} [vars] BETTER_AUTH_URL`, pagesOrigin, WEBAPP_ORIGIN)
// The OAuth audience. PRM advertises the request host (#116), so binding the
// Worker's workers.dev address here mints tokens the API will reject on the
// public host — the #123 B split. Backend traffic keeps the internal origin.
expect(`${PAGES_CONFIG} [vars] EXCITED_API_URL`, pagesApiOrigin, API_RESOURCE_ORIGIN)
// The BFF (src/lib/bff-proxy.ts) proxies /api/v1/* to this origin; unset means
// http://localhost:8000 inside workerd, i.e. Cloudflare 1016 on every call.
expect(`${PAGES_CONFIG} [vars] BACKEND_API_URL`, pagesBackendOrigin, API_WORKER_ORIGIN)
expect(`${PAGES_CONFIG} D1 binding`, stringValue(pagesDb, "binding"), "DB")
expect(`${PAGES_CONFIG} D1 database_name`, pagesDatabaseName, "excited-live-api-prelive")
expect(`${PAGES_CONFIG} D1 database_id must equal the API's (shared sessions/JWKS)`, pagesDatabaseId, apiDatabaseId)
// iam is a no-BFF SPA on its own origin: it calls the API and the auth server
// directly with credentials, so both prelive allowlists must name it (#89).
const apiPreliveTrusted = stringValue(apiPrelive, "BETTER_AUTH_TRUSTED_ORIGINS")
if (!apiPreliveTrusted) {
	problems.push("apps/api [env.prelive] BETTER_AUTH_TRUSTED_ORIGINS is missing")
} else {
	const trusted = apiPreliveTrusted.split(",").map((value) => value.trim())
	for (const origin of [WEBAPP_ORIGIN, IAM_ORIGIN]) {
		if (!trusted.includes(origin)) {
			problems.push(`apps/api [env.prelive] BETTER_AUTH_TRUSTED_ORIGINS is missing ${origin}`)
		}
	}
}
for (const [label, value] of [
	[`${PAGES_CONFIG} [vars] BETTER_AUTH_TRUSTED_ORIGINS`, pagesTrusted],
	[`${PAGES_CONFIG} [vars] AUTH_CORS_ORIGINS`, pagesAuthCors],
]) {
	if (!value) {
		problems.push(`${label} is missing`)
		continue
	}
	if (!value.split(",").map((entry) => entry.trim()).includes(IAM_ORIGIN)) {
		problems.push(`${label} is missing ${IAM_ORIGIN}`)
	}
}
if (!compatibilityDate) problems.push(`${PAGES_CONFIG} compatibility_date is missing`)
if (!compatibilityFlags?.includes("nodejs_compat")) problems.push(`${PAGES_CONFIG} compatibility_flags must include nodejs_compat`)

if (problems.length > 0) {
	console.error("Prelive auth configuration is inconsistent:\n")
	for (const problem of problems) console.error(`  - ${problem}`)
	console.error(`\nFix ${PAGES_CONFIG} or apps/api/wrangler.toml [env.prelive], not the CI.`)
	process.exit(1)
}

// `wrangler pages deploy` sends sha256 of the configuration file it read; the
// Pages project must carry the same hash or the deployment is rejected as
// out of sync. prelive.yml copies the file to apps/webapp/wrangler.toml, so
// the bytes hashed here are exactly the bytes deployed.
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
					...(pagesAuthCors ? { AUTH_CORS_ORIGINS: { type: "plain_text", value: pagesAuthCors } } : {}),
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
		`Prelive auth configuration OK: issuer ${pagesOrigin}/api/auth, resource ${pagesApiOrigin}/mcp, backend ${pagesBackendOrigin}, D1 ${apiDatabaseId}`
	)
}
