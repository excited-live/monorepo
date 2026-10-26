#!/usr/bin/env node
/**
 * Live guard: the bundle served on the **production** iam host is a production
 * build (#88, #93 item 7).
 *
 * `scripts/check-iam-production-bundle.mjs` guards `dist/` before a deploy. This
 * guards the host afterwards, because on 2026-10-25 the prelive workflow
 * deployed a prelive bundle to `excited-live-iam` three times and every
 * build-time check passed. A byte-level look at what the host serves is the only
 * thing that catches that class of drift.
 *
 * It asserts, from the served HTML and its entry JS:
 *   - the page answers 200 and its <title> is the iam shell (the site soft-404s
 *     with 200, so a status check alone proves nothing)
 *   - the JS names https://api.excited.live and https://auth.excited.live
 *   - zero hits for every marker in the #88 guard list
 *
 * Runs on a schedule and after each "Deploy Prelive" in prelive-smoke.yml. It
 * needs no secrets: everything is fetched over plain GET.
 *
 * Usage:
 *   node scripts/check-iam-live-bundle.mjs
 *   node scripts/check-iam-live-bundle.mjs --origin https://excited-live-iam.pages.dev
 *   node scripts/check-iam-live-bundle.mjs --retries 3 --wait 10
 *
 * Exits 0 only when every assertion passes. A failure prints the status, the
 * title and each offending marker with its hit count, so the run is evidence.
 */
import { URL } from "node:url"

const REQUIRED = ["https://api.excited.live", "https://auth.excited.live"]
const FORBIDDEN = [
	"workers.dev",
	"prelive.excited.live",
	"mcp.excited.live",
	"ex_live_",
	"/api/v1/plan",
	"/api/v1/sim",
	"play.google.com",
]

const argv = process.argv.slice(2)

function flag(name, fallback) {
	const index = argv.indexOf(`--${name}`)
	if (index < 0) return fallback
	const value = argv[index + 1]
	if (value === undefined || value.startsWith("--")) usage(`--${name} needs a value`)
	return value
}

function positiveInt(name, fallback) {
	const value = Number(flag(name, String(fallback)))
	if (!Number.isInteger(value) || value < 1) usage(`--${name} must be an integer >= 1`)
	return value
}

function usage(message) {
	console.error(`check-iam-live-bundle: ${message}`)
	console.error("usage: node scripts/check-iam-live-bundle.mjs [--origin URL] [--retries N] [--wait S] [--timeout MS]")
	process.exit(2)
}

const ORIGIN = flag("origin", "https://iam.excited.live").replace(/\/+$/, "")
const RETRIES = positiveInt("retries", 1)
const WAIT = positiveInt("wait", 10)
const TIMEOUT = positiveInt("timeout", 20000)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function describeError(error) {
	if (error?.name === "TimeoutError") return `timed out after ${TIMEOUT} ms`
	return error?.cause?.code ?? error?.message ?? String(error)
}

async function get(url) {
	const started = Date.now()
	try {
		const response = await fetch(url, {
			method: "GET",
			headers: { accept: "text/html, application/javascript" },
			redirect: "follow",
			signal: AbortSignal.timeout(TIMEOUT),
		})
		const text = await response.text()
		return { status: response.status, headers: response.headers, text, ms: Date.now() - started }
	} catch (error) {
		throw new Error(`GET ${url} failed: ${describeError(error)}`)
	}
}

/** One attempt. Returns a list of problems; empty means clean. */
async function check() {
	const problems = []
	const root = await get(`${ORIGIN}/`)
	console.log(`  GET ${ORIGIN}/ -> HTTP ${root.status} · ${root.text.length} bytes · ${root.ms} ms`)
	if (root.status !== 200) {
		problems.push(`the shell returned ${root.status}, want 200`)
		return problems
	}

	const title = (root.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1]?.replace(/\s+/g, " ").trim() ?? ""
	console.log(`  title: ${JSON.stringify(title)}`)
	if (!/iam/i.test(title)) problems.push(`the title is ${JSON.stringify(title)}, not the iam shell — a soft 404 answers 200 too`)

	// Same-origin only: Cloudflare injects its beacon into the served HTML.
	const sources = [...root.text.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/gi)]
		.map((match) => new URL(match[1], `${ORIGIN}/`).toString())
		.filter((url) => new URL(url).origin === ORIGIN)
	if (sources.length === 0) {
		problems.push("the shell has no same-origin <script src=…js> entry")
		return problems
	}

	let js = ""
	for (const src of sources.slice(0, 3)) {
		const asset = await get(src)
		console.log(`  GET ${src} -> HTTP ${asset.status} · ${asset.text.length} bytes`)
		if (asset.status !== 200) problems.push(`${src} returned ${asset.status}`)
		js += asset.text
	}

	const hits = (needle) => js.split(needle).length - 1
	for (const needle of REQUIRED) {
		if (hits(needle) === 0) problems.push(`the bundle never mentions ${needle}`)
		else console.log(`  ok: mentions ${needle} (${hits(needle)}×)`)
	}
	for (const needle of FORBIDDEN) {
		const count = hits(needle)
		if (count !== 0) problems.push(`${needle} appears ${count} time(s); zero allowed`)
		else console.log(`  ok: zero hits for ${needle}`)
	}
	return problems
}

let problems = []
for (let attempt = 1; attempt <= RETRIES; attempt++) {
	console.log(`\niam live bundle guard · attempt ${attempt}/${RETRIES} · ${ORIGIN}`)
	problems = await check()
	if (problems.length === 0) break
	if (attempt < RETRIES) {
		console.log(`  ${problems.length} problem(s); retrying in ${WAIT}s (the custom hostname stalls ~5% of requests)`)
		await sleep(WAIT * 1000)
	}
}

if (problems.length > 0) {
	console.error(`\nFAIL — the production iam host is serving a bundle that fails the #88 guard:`)
	for (const problem of problems) console.error(`  - ${problem}`)
	process.exit(1)
}
console.log(`\nPASS — ${ORIGIN} serves a production-clean iam bundle`)
