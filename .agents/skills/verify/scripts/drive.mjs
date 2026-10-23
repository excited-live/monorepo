// Drive the local biz-mobile web app (Vite dev server) the way a user does, and capture evidence.
//
// Usage (from the repo root, with `stack.sh up` running):
//   node .agents/skills/verify/scripts/drive.mjs <journey> [--snapshot]
// Journeys: see JOURNEYS below and features/README.md.
// Env: VERIFY_MOBILE_PORT (1530), VERIFY_API_PORT (8710), VERIFY_RUN_DIR (<repo>/.verify)
//
// Each run signs up a brand-new user, so journeys never share state.
// --snapshot prints the page's accessibility tree at the end, for finding selectors.
/* global process, console, fetch, localStorage, sessionStorage, document, NodeFilter */
import { execSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

const ROOT = execSync("git rev-parse --show-toplevel", { cwd: import.meta.dirname }).toString().trim()
const { chromium } = createRequire(join(ROOT, "apps/biz-mobile/package.json"))("@playwright/test")

const RUN_DIR = process.env.VERIFY_RUN_DIR || join(ROOT, ".verify")
const MOBILE_URL = `http://localhost:${process.env.VERIFY_MOBILE_PORT || 1530}`
const API_URL = `http://localhost:${process.env.VERIFY_API_PORT || 8710}`
const stamp = new Date().toISOString().replace(/[:.]/g, "-")

async function signUp(page) {
	const user = { name: "Verify Agent", email: `verify+${Date.now()}@example.com`, password: "verify-pass-1234" }
	await page.goto(MOBILE_URL)
	await page.getByRole("button", { name: "Create Account" }).first().click()
	await page.getByLabel("Full Name or Business Name").fill(user.name)
	await page.getByLabel("Email").fill(user.email)
	await page.getByLabel("Password").fill(user.password)
	await page.getByRole("checkbox").check()
	await page.getByRole("button", { name: "Create Cloud Account" }).click()
	await page.getByLabel("Email").waitFor({ state: "detached", timeout: 15_000 })
	return user
}

// Act as the user's external agent: a JSON-RPC call to /mcp with the agent key.
async function mcp(key, method, params = {}) {
	const res = await fetch(`${API_URL}/mcp`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			Authorization: `Bearer ${key}`,
		},
		body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
	})
	const text = await res.text()
	return { status: res.status, json: text ? JSON.parse(text) : null }
}

async function generateAgentKey(page) {
	await page.getByRole("button", { name: /Set up with your AI agent/ }).click()
	await page.getByRole("button", { name: "Generate key" }).click()
	const keyText = page.getByText(/^elk_\w+/)
	await keyText.waitFor({ timeout: 10_000 })
	return (await keyText.textContent()).match(/elk_\w+/)[0]
}

const JOURNEYS = {
	// features/signup.md
	async signup(page, evidence) {
		const user = await signUp(page)
		evidence.user = user.email
		const token = await page.evaluate(() => {
			for (const store of [localStorage, sessionStorage]) {
				for (let i = 0; i < store.length; i++) {
					const key = store.key(i)
					if (/token/i.test(key)) return store.getItem(key)
				}
			}
			return null
		})
		evidence.tokenStored = Boolean(token)
		if (token) {
			const res = await fetch(`${API_URL}/api/v1/settings`, { headers: { Authorization: `Bearer ${token}` } })
			evidence.settingsWithToken = res.status
		}
		return evidence.tokenStored && evidence.settingsWithToken === 200
	},

	// features/agent-onboarding.md
	async "agent-onboarding"(page, evidence) {
		await signUp(page)
		const key = await generateAgentKey(page)
		evidence.keyIssued = key.startsWith("elk_")
		const init = await mcp(key, "initialize", {
			protocolVersion: "2025-06-18",
			capabilities: {},
			clientInfo: { name: "verify-skill", version: "1.0.0" },
		})
		evidence.mcpInitialize = init.status
		const tools = await mcp(key, "tools/list")
		evidence.tools = (tools.json?.result?.tools || []).map((t) => t.name)
		if (process.env.VERIFY_DUMP_TOOLS) console.log(JSON.stringify(tools.json?.result?.tools, null, 2))

		// The agent does the work; the human only checks in on the app.
		const business = `Verify Studio ${Date.now() % 10000}`
		const created = await mcp(key, "tools/call", { name: "create_business", arguments: { name: business } })
		evidence.createBusiness = created.json?.result?.isError ? created.json.result.content?.[0]?.text : "ok"
		const stepped = await mcp(key, "tools/call", { name: "complete_onboarding_step", arguments: { stepId: "add_business" } })
		evidence.completeStep = stepped.json?.result?.isError ? stepped.json.result.content?.[0]?.text : "ok"

		// What the human sees: the new business on Home, and the step ticked.
		await page.reload()
		await page.getByRole("button", { name: new RegExp(business) }).waitFor({ timeout: 15_000 })
		evidence.businessOnHome = true
		// The tick and the label are separate elements, so match the rendered text of the page.
		evidence.stepTickedOnHome = /✓\s*Add Business/.test(await page.locator("main").innerText())

		// No key, no access: /mcp must refuse anonymous calls.
		const anon = await fetch(`${API_URL}/mcp`, {
			method: "POST",
			headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		})
		evidence.mcpWithoutKey = anon.status
		return (
			init.status === 200 &&
			evidence.createBusiness === "ok" &&
			evidence.completeStep === "ok" &&
			evidence.stepTickedOnHome &&
			anon.status === 401
		)
	},
}

const [journey, ...flags] = process.argv.slice(2)
if (!JOURNEYS[journey]) {
	console.error(`usage: drive.mjs <${Object.keys(JOURNEYS).join("|")}> [--snapshot]`)
	process.exit(2)
}

const outDir = join(RUN_DIR, "evidence", `${stamp}-${journey}`)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const consoleErrors = []
page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(msg.text()))
const evidence = { journey, mobileUrl: MOBILE_URL, apiUrl: API_URL }
let passed = false
try {
	passed = await JOURNEYS[journey](page, evidence)
} catch (error) {
	evidence.error = String(error?.message || error).split("\n")[0]
} finally {
	evidence.passed = passed
	evidence.finalUrl = page.url()
	evidence.consoleErrors = consoleErrors
	// Agent keys are live credentials: mask any on screen before the screenshot and snapshot.
	await page
		.evaluate(() => {
			const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
			for (let n = walker.nextNode(); n; n = walker.nextNode()) n.nodeValue = n.nodeValue.replace(/elk_\w+/g, "elk_<redacted>")
		})
		.catch(() => {})
	await page.screenshot({ path: join(outDir, "final.png"), fullPage: true }).catch(() => {})
	if (flags.includes("--snapshot")) console.log(await page.locator("body").ariaSnapshot().catch((e) => String(e)))
	writeFileSync(join(outDir, "evidence.json"), JSON.stringify(evidence, null, 2))
	await browser.close()
}
console.log(JSON.stringify(evidence, null, 2))
console.log(`${passed ? "PASS" : "FAIL"} ${journey} -> ${outDir}`)
process.exit(passed ? 0 : 1)
