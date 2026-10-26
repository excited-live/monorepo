#!/usr/bin/env node
/**
 * #58 task 1 — a brand-new user must be able to create an account **inside** an
 * agent's OAuth flow and land back on the same step, without restarting it.
 *
 * This is the launch gate Product named, and the one thing `mcp-real-client-e2e.mjs`
 * cannot prove: that gate signs in an existing account over HTTP, so it never
 * exercises the sign-in page's own resume logic. Here the human half is a real
 * browser (Playwright), because resume is a client-side decision — the page has
 * to forward the signed authorization query (`client_id` + `sig`) from /sign-in
 * back to /api/auth/oauth2/authorize after a successful sign-up. A cookie-jar
 * test would only prove that the script can rebuild that URL itself.
 *
 * The flow (all against the deployed prelive stack, no secrets):
 *   1. authorize with no session            -> /sign-in?client_id…&sig…
 *   2. switch to "create account" in the UI -> mode=signup, signed query intact
 *   3. sign up with a fresh email           -> the page RESUMES the flow
 *   4. consent page names the agent         -> Allow
 *   5. loopback redirect                    -> code + the original state
 *   6. code exchange (PKCE)                 -> access token for the new user
 *   7. tools/list with that token           -> the account is usable by an agent
 *
 * Step 3 is the assertion this script exists for: landing on `/` (the dashboard)
 * is a failure, and so is a consent page carrying a different `state`.
 *
 * Usage:
 *   node scripts/mcp-signup-resume-e2e.mjs                     # prelive, fresh account
 *   node scripts/mcp-signup-resume-e2e.mjs --headed            # watch it
 *   node scripts/mcp-signup-resume-e2e.mjs --json /tmp/out.json
 *
 * Flags:
 *   --env prelive|prod    target preset (default: prelive)
 *   --mcp URL             MCP endpoint, overrides --env
 *   --issuer URL          authorization server, overrides discovery
 *   --email EMAIL         reuse a fixed address (it must not exist; the run creates it)
 *   --redirect-uri URI    loopback redirect, must be 127.0.0.1/localhost
 *   --expect-tools N      tools/list count (default: 1, i.e. non-empty)
 *   --headed              show the browser
 *   --timeout MS          per-step timeout (default 30000)
 *   --json FILE           write the transcript as JSON
 *
 * Exit codes: 0 the new account was created and the flow resumed; 1 anything
 * failed; 2 usage. Requires `@playwright/test` (workspace dep of apps/webapp) and
 * its chromium: `pnpm --filter @excited-live/webapp exec playwright install chromium`,
 * then `pnpm test:e2e:signup` (see package.json).
 */

import { createHash, randomBytes, randomUUID } from "node:crypto"
import { createServer } from "node:http"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { URL, URLSearchParams } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const webappRequire = createRequire(path.join(repoRoot, "apps/webapp/package.json"))

const PRESETS = {
	prelive: {
		mcp: "https://excited-live-api-prelive.preamza02.workers.dev/mcp",
	},
	prod: {
		mcp: "https://api.excited.live/mcp",
	},
}

const SCOPES = "openid profile email offline_access onboarding accounting:read accounting:write"
const DEFAULT_REDIRECT = "http://127.0.0.1:33418/callback"

// The signed authorization query expires; #58 task 4 pinned it at 600s. A run
// that cannot reach the browser in this window is a broken environment, not a
// product regression, so say that instead of reporting a resume failure.
const SIGNED_QUERY_BUDGET_MS = 600_000

const argv = process.argv.slice(2)

function flag(name, fallback) {
	const index = argv.indexOf(`--${name}`)
	if (index < 0) return fallback
	const value = argv[index + 1]
	if (!value || value.startsWith("--")) usage(`--${name} needs a value`)
	return value
}

function bool(name) {
	return argv.includes(`--${name}`)
}

function usage(message) {
	console.error(`signup-resume-e2e: ${message}`)
	console.error(
		"usage: node scripts/mcp-signup-resume-e2e.mjs [--env prelive|prod] [--mcp URL] [--issuer URL] " +
			"[--email EMAIL] [--redirect-uri URI] [--expect-tools N] [--headed] [--timeout MS] [--json FILE]",
	)
	process.exit(2)
}

const ENVIRONMENT = flag("env", "prelive")
if (!PRESETS[ENVIRONMENT]) usage(`unknown --env ${ENVIRONMENT}`)

const MCP_URL = flag("mcp", PRESETS[ENVIRONMENT].mcp)
const REDIRECT_URI = flag("redirect-uri", DEFAULT_REDIRECT)
const EXPECT_TOOLS = Number(flag("expect-tools", "1"))
const TIMEOUT = Number(flag("timeout", "30000"))
const JSON_FILE = flag("json", null)
const HEADED = bool("headed")

const redirect = new URL(REDIRECT_URI)
if (!["127.0.0.1", "localhost", "[::1]"].includes(redirect.hostname)) {
	usage("--redirect-uri must be a loopback address (this script catches the code there)")
}

const STATE = randomUUID()
const CODE_VERIFIER = base64url(randomBytes(32))
const CODE_CHALLENGE = base64url(createHash("sha256").update(CODE_VERIFIER).digest())

const EMAIL = flag("email", `qa+resume-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}@excited.live`)
const PASSWORD = `qa-${randomBytes(9).toString("hex")}`
const NAME = "Signup Resume QA"

const startedAt = new Date().toISOString()
const transcript = []
const failures = []
let current = null

function start(step) {
	current = { step, notes: [], failures: [] }
	console.log(`\n▸ ${step}`)
}

function note(text) {
	current?.notes.push(text)
	console.log(`  · ${text}`)
}

function pass(text) {
	current?.notes.push(`PASS ${text}`)
	console.log(`  \u001b[32m✓\u001b[0m ${text}`)
}

function fail(text) {
	current?.failures.push(text)
	failures.push(`${current?.step ?? "?"}: ${text}`)
	console.log(`  \u001b[31m✗\u001b[0m ${text}`)
}

function skip(text) {
	current?.notes.push(`SKIP ${text}`)
	failures.push(`${current?.step ?? "?"}: skipped — ${text}`)
	console.log(`  \u001b[33m-\u001b[0m ${text}`)
}

function done() {
	if (current) {
		transcript.push({ ...current, ok: current.failures.length === 0 })
		current = null
	}
}

function base64url(buffer) {
	return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function snippet(text, limit = 120) {
	const flat = String(text ?? "").replace(/\s+/g, " ").trim()
	return flat.length > limit ? `${flat.slice(0, limit)}…` : flat
}

async function request(url, init = {}) {
	const response = await fetch(url, {
		...init,
		headers: { accept: "application/json", ...(init.headers ?? {}) },
		signal: AbortSignal.timeout(TIMEOUT),
	})
	const text = await response.text()
	let json = null
	try {
		json = text ? JSON.parse(text) : null
	} catch {
		json = null
	}
	return { status: response.status, text, json }
}

/**
 * The loopback listener is the agent's redirect endpoint. It must exist before
 * DCR, because the redirect URI is registered with it.
 */
function startLoopback() {
	let resolveCapture
	const captured = new Promise((resolve) => {
		resolveCapture = resolve
	})
	const server = createServer((req, res) => {
		const url = new URL(req.url ?? "/", REDIRECT_URI)
		res.writeHead(200, { "content-type": "text/html; charset=utf-8", connection: "close" })
		res.end(
			"<!doctype html><title>callback received</title>" +
				"<p>You can close this tab — the agent has the authorization code.</p>",
		)
		resolveCapture({ url, at: Date.now() })
	})
	return new Promise((resolve, reject) => {
		server.once("error", reject)
		server.listen(Number(redirect.port || 80), redirect.hostname, () => resolve({ server, captured }))
	})
}

/**
 * DCR + PKCE authorize URL. Hand-rolled on purpose: this script's subject is the
 * human half, and the agent half (discovery, SDK, MCP calls) is already gated by
 * scripts/mcp-real-client-e2e.mjs. Fewer moving parts means a red run here points
 * at the sign-up page, not at the SDK.
 */
async function beginAuthorization(issuer) {
	const metadata = await request(`${issuer}/.well-known/oauth-authorization-server`)
	if (metadata.status !== 200 || !metadata.json) {
		throw new Error(`authorization-server metadata: HTTP ${metadata.status} ${snippet(metadata.text, 100)}`)
	}
	const registrationEndpoint = metadata.json.registration_endpoint ?? `${issuer}/oauth2/register`
	const tokenEndpoint = metadata.json.token_endpoint ?? `${issuer}/oauth2/token`

	const registration = await request(registrationEndpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			client_name: "Pixel sign-up resume gate (#58)",
			redirect_uris: [REDIRECT_URI],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
			scope: SCOPES,
			application_type: "native",
		}),
	})
	if (registration.status >= 400 || !registration.json?.client_id) {
		throw new Error(`DCR: HTTP ${registration.status} ${snippet(registration.text, 140)}`)
	}

	const authorize = new URL(`${issuer}/oauth2/authorize`)
	authorize.search = new URLSearchParams({
		client_id: registration.json.client_id,
		redirect_uri: REDIRECT_URI,
		response_type: "code",
		scope: SCOPES,
		state: STATE,
		code_challenge: CODE_CHALLENGE,
		code_challenge_method: "S256",
		// RFC 8707: binds the access token's audience to this MCP endpoint. Without
		// it the AS issues a token no resource server accepts, and step 7 would
		// report a 401 that has nothing to do with sign-up.
		resource: MCP_URL,
	}).toString()

	return {
		authorizeUrl: authorize,
		clientId: registration.json.client_id,
		clientName: "Pixel sign-up resume gate (#58)",
		tokenEndpoint,
	}
}

async function loadPlaywright() {
	const entry = webappRequire.resolve("@playwright/test")
	const loaded = await import(pathToFileURL(entry).href)
	// CJS interop: the named exports are not re-exported under ESM.
	return loaded.default ?? loaded
}

const summary = {
	environment: ENVIRONMENT,
	mcpUrl: MCP_URL,
	email: EMAIL,
	redirectUri: REDIRECT_URI,
	startedAt,
	steps: transcript,
	ok: false,
}

let browser = null
let loopback = null
let exitCode = 1

try {
	// 1. authorize signed out -> the sign-in page, query intact -----------------
	start("1. signed-out authorize lands on /sign-in with the flow query")
	loopback = await startLoopback()
	note(`loopback listening on ${REDIRECT_URI}`)

	const issuer = flag("issuer", null) ?? (await discoverIssuer())
	const flow = await beginAuthorization(issuer.replace(/\/+$/, ""))
	note(`issuer ${issuer}`)
	note(`client_id ${flow.clientId.length} chars · state ${STATE.slice(0, 8)}…`)

	const playwright = await loadPlaywright()
	browser = await playwright.chromium.launch({ headless: !HEADED })
	const context = await browser.newContext({ locale: "en-US", timezoneId: "Asia/Bangkok" })
	const page = await context.newPage()

	const consoleErrors = []
	page.on("console", (message) => {
		if (message.type() === "error") consoleErrors.push(snippet(message.text(), 160))
	})
	page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${snippet(error.message, 160)}`))

	await page.goto(flow.authorizeUrl.toString(), { waitUntil: "domcontentloaded", timeout: TIMEOUT })
	await page.waitForURL(/\/sign-in/, { timeout: TIMEOUT }).catch(() => {})

	const landing = new URL(page.url())
	note(`landed on ${landing.origin}${landing.pathname}`)
	if (!/\/sign-in$/.test(landing.pathname)) {
		fail(`expected /sign-in for a signed-out agent, got ${landing.origin}${landing.pathname}`)
	} else {
		const signedQuery = landing.searchParams
		if (signedQuery.get("client_id") !== flow.clientId) {
			fail("the sign-in page did not receive client_id from the authorization request")
		} else if (!signedQuery.get("sig")) {
			fail("the sign-in page did not receive the signed query (sig) — resume is impossible")
		} else {
			pass("sign-in page carries client_id + sig, so the flow can be resumed")
		}
	}
	await page.getByRole("heading", { level: 2 }).first().waitFor({ timeout: TIMEOUT })
	note(`heading: ${snippet(await page.getByRole("heading", { level: 2 }).first().innerText(), 80)}`)
	done()

	// 2. switch to create-account without losing the signed query ---------------
	start("2. 'Create an account' keeps the signed query")
	// The page is server-rendered, so the button exists before React hydrates and
	// a click in that window does nothing. The mode change is also the hydration
	// probe: once it lands, the form's inputs are controlled by React and safe to
	// fill without React resetting them.
	const switchButton = page.getByRole("button", { name: /create an account|สร้างบัญชี/i }).first()
	let switched = false
	for (let attempt = 1; attempt <= 6 && !switched; attempt++) {
		await switchButton.click({ timeout: TIMEOUT }).catch(() => {})
		switched = await page
			// eslint-disable-next-line no-undef -- this callback runs in the browser, not in Node
			.waitForFunction(() => new URL(window.location.href).searchParams.get("mode") === "signup", null, {
				timeout: 3000,
			})
			.then(() => true)
			.catch(() => false)
		if (!switched) await page.waitForTimeout(500 * attempt)
	}
	if (!switched) fail("the sign-in page never switched to sign-up mode (hydrated too late or the button is inert)")
	const signupUrl = new URL(page.url())
	note(`switched to ${signupUrl.pathname}${signupUrl.search.replace(/sig=[^&]+/, "sig=…")}`)
	if (!switched) {
		// already reported above; do not pile a second failure on the same cause
	} else if (signupUrl.searchParams.get("mode") !== "signup") {
		fail("mode=signup was not set")
	} else if (signupUrl.searchParams.get("client_id") !== flow.clientId) {
		fail("client_id was dropped when switching to sign-up")
	} else if (signupUrl.searchParams.get("sig") !== landing.searchParams.get("sig")) {
		fail("the signed query changed or was dropped when switching to sign-up — the flow would restart")
	} else {
		pass("mode=signup added, client_id and the signed query untouched")
	}
	done()

	// 3. sign up as a new user -> resume ------------------------------------
	start("3. sign-up resumes the same authorization request")
	const signedAt = landing.searchParams.get("sig") ? Date.now() : null
	// Locators follow the browser-autofill contract instead of the visible label:
	// Astryx appends a "∙ Required" marker to each label, and the page is bilingual.
	await page.locator('input[autocomplete="name"]').fill(NAME)
	await page.locator('input[autocomplete="email"]').fill(EMAIL)
	await page.locator('input[autocomplete="new-password"]').fill(PASSWORD)
	await page.getByRole("button", { name: /^(create account|สร้างบัญชี)$/i }).first().click()

	// The resume is the assertion: leave /sign-in for the authorize endpoint (or
	// straight for the consent page / the loopback redirect).
	await page
		.waitForURL(
			(url) => {
				const target = url.toString()
				return /\/api\/auth\/oauth2\/authorize/.test(target) || /\/consent/.test(target) || target.startsWith(REDIRECT_URI)
			},
			{ timeout: TIMEOUT, waitUntil: "domcontentloaded" },
		)
		.catch(() => {})

	let after = new URL(page.url())
	note(`after sign-up: ${after.origin}${after.pathname}`)

	if (after.pathname === "/" || after.pathname === "") {
		fail("sign-up dropped the user on the dashboard — the agent flow was restarted, not resumed")
	} else if (/\/api\/auth\/oauth2\/authorize/.test(after.pathname)) {
		// The page returned to the authorize endpoint; the provider redirects on.
		await page.waitForURL((url) => /\/consent/.test(url.pathname) || url.toString().startsWith(REDIRECT_URI), {
			timeout: TIMEOUT,
		})
		after = new URL(page.url())
		note(`authorize redirected to ${after.pathname}`)
	}

	if (/\/consent$/.test(after.pathname)) {
		const consentQuery = after.searchParams
		if (consentQuery.get("client_id") !== flow.clientId) {
			fail("the consent page is for a different client than the agent that started the flow")
		} else {
			pass(`resumed at /consent for client_id ${flow.clientId.slice(0, 8)}… with the new session`)
		}
	} else if (after.toString().startsWith(REDIRECT_URI)) {
		pass("resumed straight to the loopback redirect (no consent step required)")
	} else {
		fail(`expected /consent or the loopback redirect, got ${after.origin}${after.pathname}`)
	}
	if (consoleErrors.length > 0) note(`console errors during sign-up: ${consoleErrors.slice(0, 3).join(" · ")}`)
	if (signedAt && Date.now() - signedAt > SIGNED_QUERY_BUDGET_MS) {
		note("the signed query window (600s) was exceeded during this run; treat a resume failure as environmental")
	}
	done()

	// 4. consent as the new user --------------------------------------------
	start("4. consent names the agent and can be allowed")
	if (/\/consent$/.test(new URL(page.url()).pathname)) {
		const heading = await page.getByRole("heading", { level: 2 }).first().innerText()
		const body = await page.locator("main, body").first().innerText()
		note(`consent: ${snippet(heading, 80)}`)
		if (!body.includes("Pixel sign-up resume gate")) {
			note("the client name is not rendered in the visible copy — checking the allow button only")
		}
		// Same hydration window as step 2: the page is SSR'd, so the first click can
		// land before React attaches the handler.
		const allow = page.getByRole("button", { name: /^(allow|อนุญาต)$/i }).first()
		let reachedCallback = false
		for (let attempt = 1; attempt <= 6 && !reachedCallback; attempt++) {
			await allow.click({ timeout: TIMEOUT }).catch(() => {})
			reachedCallback = await page
				.waitForURL((url) => url.toString().startsWith(REDIRECT_URI), { timeout: 5000 })
				.then(() => true)
				.catch(() => false)
			if (!reachedCallback) {
				const alert = await page.locator('[role="alert"]').first().innerText().catch(() => "")
				if (alert) note(`consent error shown: ${snippet(alert, 120)}`)
				await page.waitForTimeout(500 * attempt)
			}
		}
		if (!reachedCallback) fail("Allow never redirected to the loopback callback")
		else pass("Allow redirected to the loopback callback")
	} else {
		skip("the flow did not ask for consent (already at the callback)")
	}
	done()

	// 5. the code and the original state ------------------------------------
	start("5. callback carries the code and the original state")
	const captured = await Promise.race([
		loopback.captured,
		new Promise((_, reject) => setTimeout(() => reject(new Error("no callback within the timeout")), TIMEOUT)),
	])
	const params = captured.url.searchParams
	const code = params.get("code")
	if (params.get("error")) {
		fail(`authorization error: ${params.get("error")} ${params.get("error_description") ?? ""}`)
	} else if (!code) {
		fail("no authorization code in the callback")
	} else if (params.get("state") !== STATE) {
		fail(`state mismatch: got ${params.get("state") ?? "(absent)"}, want the one this run started with`)
	} else {
		pass("code present and state matches the request the agent started with")
	}
	done()

	// 6. token exchange (PKCE, public client) -------------------------------
	start("6. code exchange issues a token for the new account")
	let accessToken = null
	if (!code) {
		skip("no code to exchange")
	} else {
		const token = await request(flow.tokenEndpoint, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: REDIRECT_URI,
				client_id: flow.clientId,
				code_verifier: CODE_VERIFIER,
				resource: MCP_URL,
			}).toString(),
		})
		// Never print the body: it carries the access token.
		if (token.status !== 200 || !token.json?.access_token) {
			fail(`token endpoint HTTP ${token.status} ${token.json?.error ?? snippet(token.text, 100)}`)
		} else {
			accessToken = token.json.access_token
			pass(`access token issued (${String(accessToken).length} chars, ${token.json.token_type ?? "Bearer"})`)
		}
	}
	done()

	// 7. the new account can actually drive the server ----------------------
	start("7. tools/list with the new account's token")
	if (!accessToken) {
		skip("no token to call /mcp with")
	} else {
		const call = await mcpRequest(MCP_URL, accessToken, {
			jsonrpc: "2.0",
			id: 2,
			method: "tools/list",
			params: {},
		})
		if (!call.ok) {
			fail(`tools/list failed: ${call.error}`)
		} else {
			const tools = call.result?.tools ?? []
			note(`tools: ${tools.length}`)
			if (tools.length < EXPECT_TOOLS) fail(`want at least ${EXPECT_TOOLS} tools, got ${tools.length}`)
			else pass(`${tools.length} tools available to the account created two steps ago`)
		}
	}
	done()

	await context.close()
	summary.ok = failures.length === 0
	exitCode = summary.ok ? 0 : 1
} catch (error) {
	// A thrown error (network, browser, discovery) is a failure of the run, not
	// a silent pass: the gate never reports green without reaching the callback.
	if (current) {
		fail(`threw: ${snippet(error?.message ?? String(error), 200)}`)
		done()
	} else {
		failures.push(`run: ${snippet(error?.message ?? String(error), 200)}`)
		console.error(`\n✗ ${error?.stack ?? error}`)
	}
	summary.ok = false
	exitCode = 1
} finally {
	await browser?.close().catch(() => {})
	loopback?.server?.close()
	summary.email = EMAIL
	summary.ok = failures.length === 0
	summary.failures = failures
	if (JSON_FILE) {
		const { writeFile } = await import("node:fs/promises")
		await writeFile(JSON_FILE, `${JSON.stringify(summary, null, 2)}\n`, "utf8")
		console.log(`\ntranscript: ${JSON_FILE}`)
	}
	console.log(
		summary.ok
			? `\n\u001b[32mPASS\u001b[0m sign-up resumed the agent flow on ${ENVIRONMENT} · account ${EMAIL}`
			: `\n\u001b[31mFAIL\u001b[0m ${failures.length} problem(s) on ${ENVIRONMENT}:\n  - ${failures.join("\n  - ")}`,
	)
	process.exit(exitCode)
}

/**
 * The protected resource names its own authorization server (RFC 9728), so the
 * script follows the deployment instead of hard-coding an issuer that a topology
 * change would silently invalidate.
 */
async function discoverIssuer() {
	const response = await fetch(MCP_URL, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
		},
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "pixel-signup-resume", version: "0.0.1" } } }),
		signal: AbortSignal.timeout(TIMEOUT),
	})
	const challenge = response.headers.get("www-authenticate") ?? ""
	const match = /resource_metadata="?([^",]+)"?/i.exec(challenge)
	if (!match) throw new Error(`no resource_metadata in WWW-Authenticate: ${snippet(challenge, 120)}`)
	const metadata = await request(match[1])
	const issuer = metadata.json?.authorization_servers?.[0]
	if (!issuer) throw new Error("protected-resource document names no authorization server")
	return issuer
}

/**
 * One JSON-RPC call over Streamable HTTP. The response may be JSON or SSE, so
 * both shapes are accepted; a 401/403 is reported as such.
 */
async function mcpRequest(url, token, payload) {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			authorization: `Bearer ${token}`,
			"MCP-Protocol-Version": "2025-11-25",
		},
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(TIMEOUT),
	})
	const text = await response.text()
	if (response.status !== 200) return { ok: false, error: `HTTP ${response.status} ${snippet(text, 120)}` }
	const jsonLine = text
		.split("\n")
		.filter((line) => line.startsWith("data: "))
		.map((line) => line.slice(6))
		.find((line) => line.trim().startsWith("{"))
	const body = safeJson(jsonLine ?? text)
	if (!body) return { ok: false, error: `unreadable response ${snippet(text, 120)}` }
	if (body.error) return { ok: false, error: `${body.error.code ?? ""} ${body.error.message ?? ""}`.trim() }
	return { ok: true, result: body.result }
}

function safeJson(text) {
	try {
		return JSON.parse(text)
	} catch {
		return null
	}
}
