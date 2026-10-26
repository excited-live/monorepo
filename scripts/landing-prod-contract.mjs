#!/usr/bin/env node
/**
 * Production contract for the excited.live landing site (#190 step 2).
 *
 * Step 2 of the launch runbook is "landing deploy landed", and it used to be
 * judged by byte count. That is not enough: production answered /llms.txt and
 * /pricing.md with the 79 KB landing page (HTTP 200, text/html), and /docs/mcp/
 * soft-404ed to the same HTML, so a status check was green on a broken build.
 * These are the content assertions that actually distinguish the deployed
 * contract from the catch-all (#99, #100, #187, #192).
 *
 * Read-only: five GETs, no credentials, no cookies. The script exits 0 only
 * when every assertion passes.
 *
 * Usage:
 *   node scripts/landing-prod-contract.mjs
 *   node scripts/landing-prod-contract.mjs https://excited.live
 *   node scripts/landing-prod-contract.mjs https://excited.live --markdown
 *   node scripts/landing-prod-contract.mjs --self-test
 *
 * Options:
 *   --base URL       base URL (same as the positional argument)
 *   --markdown       print the table as Markdown, for a Gitea comment
 *   --timeout MS     per-request timeout (default 20000)
 *   --self-test      assert the checks against built-in before/after fixtures
 *
 * The /pricing.md content-type can only become text/markdown once the build
 * that contains the file is deployed (PR #196). On a pre-#196 build the 200
 * text/html answer is deploy lag plus the missing static file, not a new bug;
 * the baseline table records it as a FAIL against the target contract.
 */

import { Buffer } from "node:buffer"
import { URL } from "node:url"

const DEFAULT_BASE = "https://excited.live"
const DEFAULT_TIMEOUT = 20000
const LANDING_TITLE_FALLBACK = "excited.live — Financial planning for solopreneurs, first jobber, AI native"

const COST_PHRASES = ["free during launch", "No card is required", "Nothing is charged today"]
const FORBIDDEN_COST = [
	{ label: "฿", needle: "฿", caseInsensitive: false },
	{ label: "$", needle: "$", caseInsensitive: false },
	{ label: "THB", needle: "THB", caseInsensitive: true },
	{ label: "/mo", needle: "/mo", caseInsensitive: false },
	{ label: "coming soon", needle: "coming soon", caseInsensitive: true },
]

const argv = process.argv.slice(2)

function usage(message) {
	console.error(`landing-prod-contract: ${message}`)
	console.error("usage: node scripts/landing-prod-contract.mjs [BASE_URL] [--markdown] [--self-test] [--timeout MS]")
	process.exit(2)
}

function takeValue(name) {
	const index = argv.indexOf(`--${name}`)
	if (index < 0) return undefined
	const value = argv[index + 1]
	if (value === undefined || value.startsWith("--")) usage(`--${name} needs a value`)
	return value
}

if (argv.includes("--help") || argv.includes("-h")) {
	console.log("usage: node scripts/landing-prod-contract.mjs [BASE_URL] [--markdown] [--self-test] [--timeout MS]")
	process.exit(0)
}

const markdown = argv.includes("--markdown")
const selfTest = argv.includes("--self-test")
const timeout = Number(takeValue("timeout") ?? DEFAULT_TIMEOUT)
if (!Number.isInteger(timeout) || timeout < 1) usage("--timeout must be an integer >= 1")

const positional = argv.find((arg, index) => {
	if (arg.startsWith("--")) return false
	const previous = argv[index - 1]
	return previous !== "--base" && previous !== "--timeout"
})
const baseArg = takeValue("base") ?? positional ?? DEFAULT_BASE
let base
try {
	base = new URL(baseArg).toString().replace(/\/+$/, "")
} catch {
	usage(`not a URL: ${baseArg}`)
}

const countOf = (text, needle) => (needle === "" ? 0 : text.split(needle).length - 1)

function countOfInsensitive(text, needle) {
	return countOf(text.toLowerCase(), needle.toLowerCase())
}

function titleOf(html) {
	const raw = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? ""
	return raw
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim()
}

function hasCostSection(text) {
	const match = text.match(/^##\s+Cost\s*$/im)
	if (!match) return false
	const rest = text.slice(match.index + match[0].length)
	const nextHeading = rest.search(/\n##\s+/)
	return (nextHeading < 0 ? rest : rest.slice(0, nextHeading)).trim().length > 0
}

function describeError(error) {
	if (error?.name === "TimeoutError") return `timed out after ${timeout} ms`
	return error?.cause?.code ?? error?.message ?? String(error)
}

async function liveFetch(url) {
	const started = Date.now()
	try {
		const response = await fetch(url, {
			method: "GET",
			headers: { accept: "*/*", "cache-control": "no-cache" },
			redirect: "follow",
			signal: AbortSignal.timeout(timeout),
		})
		const text = await response.text()
		const rawContentType = response.headers.get("content-type") ?? ""
		return {
			status: response.status,
			contentType: rawContentType.split(";")[0].trim().toLowerCase(),
			text,
			bytes: Buffer.byteLength(text),
			finalUrl: response.url,
			ms: Date.now() - started,
		}
	} catch (error) {
		return {
			status: 0,
			contentType: "",
			text: "",
			bytes: 0,
			finalUrl: url,
			ms: Date.now() - started,
			error: describeError(error),
		}
	}
}

/** Run every assertion against a fetchPage(url) function. */
async function collect(fetchPage) {
	const [root, llms, pricing, docsPricing, docsMcp] = await Promise.all([
		fetchPage(`${base}/`),
		fetchPage(`${base}/llms.txt`),
		fetchPage(`${base}/pricing.md`),
		fetchPage(`${base}/docs/pricing/`),
		fetchPage(`${base}/docs/mcp/`),
	])

	const pages = { root, llms, pricing, docsPricing, docsMcp }
	const rows = []
	const add = (status, surface, check, expected, actual, note = "") => {
		rows.push({ status, surface, check, expected, actual, note })
	}
	const info = (surface, check, actual, note = "") => add("INFO", surface, check, "recorded", actual, note)
	const assert = (surface, check, pass, expected, actual, note = "") => add(pass ? "PASS" : "FAIL", surface, check, expected, actual, note)
	const statusOf = (page) => (page.error ? page.error : String(page.status))

	const landingTitle = titleOf(root.text)
	const expectedLandingTitle = landingTitle || LANDING_TITLE_FALLBACK

	// 1. / — status, bytes, title, dead-host references, demo keys.
	info("/", "response", `${statusOf(root)}${root.bytes ? ` · ${root.bytes} B` : ""}${root.contentType ? ` · ${root.contentType}` : ""}${root.error ? "" : ` · ${root.ms} ms`}`)
	info("/", "title", landingTitle ? `"${landingTitle}"` : "(none)", root.error ?? "")
	assert("/", "status 200", root.status === 200, "200", statusOf(root))
	assert("/", "title present", landingTitle.length > 0, "non-empty <title>", landingTitle ? `"${landingTitle}"` : "(none)")
	assert("/", "zero mcp.excited.live references", countOf(root.text, "mcp.excited.live") === 0, "0", String(countOf(root.text, "mcp.excited.live")), countOf(root.text, "mcp.excited.live") ? "the dead host is still in the landing build" : "")
	assert("/", "zero ex_live_ demo keys", countOf(root.text, "ex_live_") === 0, "0", String(countOf(root.text, "ex_live_")), countOf(root.text, "ex_live_") ? "a demo key is published in the page" : "")

	// 2. /llms.txt — a text document, not the landing catch-all.
	assert("/llms.txt", "status 200", llms.status === 200, "200", statusOf(llms))
	assert("/llms.txt", "content-type is text", ["text/plain", "text/markdown"].includes(llms.contentType), "text/plain | text/markdown", llms.contentType || "(none)", llms.contentType === "text/html" ? "text/html = the landing catch-all answered, not llms.txt" : "")
	const llmsBody = llms.text.replace(/^\uFEFF/, "").trimStart()
	assert("/llms.txt", "body starts '# excited.live'", llmsBody.startsWith("# excited.live"), "# excited.live", JSON.stringify(llmsBody.slice(0, 40)))
	assert("/llms.txt", "has a '## Cost' section", hasCostSection(llms.text), "## Cost with content", hasCostSection(llms.text) ? "present" : "missing")

	// 3. /pricing.md — the machine-readable cost answer.
	assert("/pricing.md", "status 200", pricing.status === 200, "200", statusOf(pricing))
	assert("/pricing.md", "content-type is text/markdown", pricing.contentType === "text/markdown", "text/markdown", pricing.contentType || "(none)", pricing.contentType === "text/html" ? "text/html = the landing catch-all answered; wait for the post-#196 landing deploy" : "")
	for (const phrase of COST_PHRASES) {
		assert("/pricing.md", `contains "${phrase}"`, pricing.text.toLowerCase().includes(phrase.toLowerCase()), phrase, pricing.text.toLowerCase().includes(phrase.toLowerCase()) ? "present" : "missing")
	}
	const forbiddenHits = FORBIDDEN_COST.map(({ label, needle, caseInsensitive }) => ({
		label,
		hits: caseInsensitive ? countOfInsensitive(pricing.text, needle) : countOf(pricing.text, needle),
	})).filter(({ hits }) => hits > 0)
	assert("/pricing.md", "zero price or 'coming soon' tokens", forbiddenHits.length === 0, "0 hits for ฿ $ THB /mo coming soon", forbiddenHits.length === 0 ? "0" : forbiddenHits.map(({ label, hits }) => `${label}×${hits}`).join(", "))

	// 4. /docs/pricing/ and /docs/mcp/ — real docs pages, not the landing title.
	const pricingTitle = titleOf(docsPricing.text)
	assert("/docs/pricing/", "status 200", docsPricing.status === 200, "200", statusOf(docsPricing))
	assert("/docs/pricing/", "title differs from the landing title", pricingTitle.length > 0 && pricingTitle !== expectedLandingTitle, `≠ "${expectedLandingTitle}"`, pricingTitle ? `"${pricingTitle}"` : "(none)", pricingTitle === expectedLandingTitle ? "soft 404: the landing catch-all answered" : "")

	const mcpTitle = titleOf(docsMcp.text)
	assert("/docs/mcp/", "status 200", docsMcp.status === 200, "200", statusOf(docsMcp))
	assert("/docs/mcp/", "title differs from the landing title", mcpTitle.length > 0 && mcpTitle !== expectedLandingTitle, `≠ "${expectedLandingTitle}"`, mcpTitle ? `"${mcpTitle}"` : "(none)", mcpTitle === expectedLandingTitle ? "soft 404: the landing catch-all answered" : "")

	// 5. /docs/mcp/ — names the live API, never the dead host.
	const endpointHits = countOf(docsMcp.text, "api.excited.live/mcp")
	const deadHits = countOf(docsMcp.text, "mcp.excited.live")
	assert("/docs/mcp/", "names api.excited.live/mcp", endpointHits >= 1, "≥ 1", String(endpointHits))
	assert("/docs/mcp/", "zero mcp.excited.live references", deadHits === 0, "0", String(deadHits), deadHits ? "the connect guide advertises the dead host" : "")

	return { rows, pages }
}

function escapeCell(value) {
	return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
}

function printTable(result) {
	const { rows } = result
	const headers = ["Status", "Surface", "Check", "Expected", "Actual", "Note"]
	const cells = rows.map((row) => [row.status, row.surface, row.check, row.expected, row.actual, row.note])

	if (markdown) {
		console.log(`| ${headers.join(" | ")} |`)
		console.log(`|${headers.map(() => " --- ").join("|")}|`)
		for (const cell of cells) console.log(`| ${cell.map(escapeCell).join(" | ")} |`)
	} else {
		const widths = headers.map((header, index) => Math.max(header.length, ...cells.map((cell) => String(cell[index]).length)))
		const line = (cell) => cell.map((value, index) => String(value).padEnd(widths[index])).join("  ").trimEnd()
		console.log(line(headers))
		console.log(widths.map((width) => "-".repeat(width)).join("  "))
		for (const cell of cells) console.log(line(cell))
	}

	const failed = rows.filter((row) => row.status === "FAIL")
	if (markdown) {
		console.log("")
		console.log(failed.length === 0 ? `**Result: PASS — ${rows.length} checks.**` : `**Result: FAIL — ${failed.length} of ${rows.length} checks failed.**`)
	} else {
		console.log("")
		console.log(failed.length === 0 ? `PASS — ${rows.length} checks` : `FAIL — ${failed.length} of ${rows.length} checks failed`)
	}
	return failed
}

function fixtureFetch(fixtures) {
	return async (url) => {
		const path = new URL(url).pathname
		const fixture = fixtures[path]
		if (!fixture) throw new Error(`self-test has no fixture for ${path}`)
		return {
			status: fixture.status ?? 200,
			contentType: fixture.contentType.split(";")[0].trim().toLowerCase(),
			text: fixture.text,
			bytes: Buffer.byteLength(fixture.text),
			finalUrl: url,
			ms: 1,
		}
	}
}

function fixtures(landing, overrides) {
	return {
		"/": { contentType: "text/html; charset=utf-8", text: landing },
		"/llms.txt": { contentType: "text/html; charset=utf-8", text: landing },
		"/pricing.md": { contentType: "text/html; charset=utf-8", text: landing },
		"/docs/pricing/": { contentType: "text/html; charset=utf-8", text: landing },
		"/docs/mcp/": { contentType: "text/html; charset=utf-8", text: landing },
		...overrides,
	}
}

async function runSelfTest() {
	const landingTitle = "excited.live — Financial planning for solopreneurs, first jobber, AI native"
	const landingHtml = (body = "") => `<!doctype html><html><head><title>${landingTitle}</title></head><body>${body}</body></html>`
	const deadRefs = Array.from({ length: 14 }, (_, index) => `<a href="https://mcp.excited.live/tool-${index}">tool</a>`).join("")

	const before = fixtures(landingHtml(deadRefs))
	const after = fixtures(landingHtml('<a href="https://api.excited.live/mcp">Connect</a>'), {
		"/llms.txt": {
			contentType: "text/plain; charset=utf-8",
			text: "# excited.live\n\n> Workspace for Thai small businesses.\n\n## Cost\n\nexcited.live is free during launch. No card is required, and nothing is charged today.\n",
		},
		"/pricing.md": {
			contentType: "text/markdown; charset=utf-8",
			text: "# Pricing — excited.live\n\nexcited.live is free during launch. No card is required, and nothing is charged today.\n\nThere is no trial to expire.\n",
		},
		"/docs/pricing/": { contentType: "text/html; charset=utf-8", text: "<html><head><title>Pricing — excited.live</title></head><body></body></html>" },
		"/docs/mcp/": {
			contentType: "text/html; charset=utf-8",
			text: '<html><head><title>Connect your agent over MCP — excited.live</title></head><body><code>https://api.excited.live/mcp</code></body></html>',
		},
	})

	const afterResult = await collect(fixtureFetch(after))
	const beforeResult = await collect(fixtureFetch(before))
	const afterFailures = afterResult.rows.filter((row) => row.status === "FAIL")
	const beforeFailures = beforeResult.rows.filter((row) => row.status === "FAIL")
	const beforeFailedChecks = beforeFailures.map((row) => `${row.surface} ${row.check}`)
	const requiredBeforeFailures = [
		"/ zero mcp.excited.live references",
		"/llms.txt content-type is text",
		"/pricing.md content-type is text/markdown",
		"/docs/pricing/ title differs from the landing title",
		"/docs/mcp/ title differs from the landing title",
	]
	const missing = requiredBeforeFailures.filter((check) => !beforeFailedChecks.includes(check))
	const problems = []
	if (afterFailures.length > 0) problems.push(`the post-#196 fixture should pass, but ${afterFailures.length} check(s) failed`)
	if (beforeFailures.length < requiredBeforeFailures.length) problems.push(`the pre-#196 fixture should fail at least ${requiredBeforeFailures.length} checks, but failed ${beforeFailures.length}`)
	if (missing.length > 0) problems.push(`the pre-#196 fixture did not fail: ${missing.join(", ")}`)

	if (problems.length > 0) {
		for (const problem of problems) console.error(`self-test: ${problem}`)
		console.error("\nPASS/FAIL rows for the pre-#196 fixture:")
		for (const row of beforeFailures) console.error(`  - ${row.surface} ${row.check}: ${row.actual}`)
		process.exit(1)
	}
	console.log(`self-test: PASS — post-#196 fixture has 0 failures, pre-#196 fixture fails ${beforeFailures.length} checks, including all ${requiredBeforeFailures.length} regressions`)
}

if (selfTest) {
	await runSelfTest()
	process.exit(0)
}

const result = await collect(liveFetch)
const failed = printTable(result)
process.exit(failed.length > 0 ? 1 : 0)
