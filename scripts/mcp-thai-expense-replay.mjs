#!/usr/bin/env node
/* global URL */
/**
 * Thai expense replay gate for #172 / #173 / #174 (owner: Rigel, QA).
 *
 * The launch transcript a Thai agent runs — "เดือนนี้ฉันจ่ายค่าอาหารไปเท่าไหร่
 * ช่วยบันทึกให้ด้วย 250 บาท ร้านอาหารตามสั่ง" — is replayed over the real MCP
 * endpoint with a minted `elk_` agent key, on a throwaway account, and every
 * acceptance criterion from Ada's 15:40 breakdown on #172 is asserted from the
 * responses. Nothing is read from CI logs or from another bot's report.
 *
 * Criteria (one row each in the table this prints):
 *   AC1 day      add_expense {asOf:"<today ICT>", cycle:"one_time"} -> the
 *                get_cash_flows item for that month is dated <today>, not the 1st
 *   AC2 year     add_expense {asOf:"2569-10-26"} -> typed error, nothing written
 *                (month totals and item count unchanged; no row in 2569-10)
 *   AC3 category "อาหาร" writes and reads back as a known slug; every expense
 *                item in get_cash_flows carries `category`; `spendingByCategory`
 *                equals the month's expense total
 *   AC4 treasury the same first write on a zero-balance wallet -> 200, not a
 *                refusal, with both codes from one `warnings` envelope:
 *                `cash_negative` (the month ends below ฿0) and
 *                `funding_wallet_zero_balance` (the wallet was never funded).
 *                Both fire on a fresh account, and neither substitutes for the
 *                other (#174, Ada 15:43). Every entry carries `month` and a
 *                numeric `treasuryAfter`; `assetId` appears only on the
 *                zero-balance code. The reported treasuryAfter equals
 *                get_financial_summary's ending treasury for that month.
 *   AC5 monthly  a monthly expense still charges on its dayOfMonth
 *
 * Plus one supplement from #173's own AC:
 *   X1 category  an unknown category string is a typed refusal that lists the
 *                allowed values, and writes nothing
 *
 * Not observable from outside (reported as unverified, never as a pass): the
 * 00:30 ICT clock rule from #172 — every "today"/"this month" helper must use
 * Asia/Bangkok, so a 1 Nov 00:30 ICT write must land in November, not October.
 * That needs a clock override on the server; the replay proves only the
 * date round-trip on the day it runs.
 *
 * Usage:
 *   node scripts/mcp-thai-expense-replay.mjs --env prelive --create-user
 *   node scripts/mcp-thai-expense-replay.mjs --email qa@… --password '…' --no-create-user
 *   node scripts/mcp-thai-expense-replay.mjs --env prelive --create-user --json out.json
 *
 * The account must be fresh for AC4 (a zero-balance wallet), so `--create-user`
 * is the normal mode: one throwaway prelive account per run, like the #93 gate.
 *
 * Exit codes: 0 every criterion PASS · 1 any FAIL or SKIP · 2 usage.
 */

import { randomUUID } from "node:crypto"
import { PRELIVE_API_ORIGIN, PRELIVE_ISSUER, PRELIVE_WORKER_ORIGIN } from "./prelive-hosts.mjs"

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
	if (message) console.error(`mcp-thai-expense-replay: ${message}`)
	console.error(
		"usage: node scripts/mcp-thai-expense-replay.mjs --env prelive [--create-user] [--email E --password P] [--mcp URL] [--api URL] [--as URL] [--today YYYY-MM-DD] [--head SHA] [--json FILE] [--dump]",
	)
	process.exit(2)
}

const PRESETS = {
	prelive: {
		mcp: `${PRELIVE_API_ORIGIN}/mcp`,
		api: PRELIVE_WORKER_ORIGIN,
		as: new URL(PRELIVE_ISSUER).origin,
	},
	prod: {
		mcp: "https://api.excited.live/mcp",
		api: "https://api.excited.live",
		as: "https://auth.excited.live",
	},
}

const ENVIRONMENT = args.get("env") ?? "prelive"
if (!(ENVIRONMENT in PRESETS) && !args.has("mcp")) usage(`--env must be prelive or prod, got ${JSON.stringify(ENVIRONMENT)}`)
const preset = PRESETS[ENVIRONMENT] ?? PRESETS.prelive

const MCP_URL = args.get("mcp") ?? preset.mcp
const API_URL = (args.get("api") ?? preset.api).replace(/\/+$/, "")
const AS_URL = (args.get("as") ?? preset.as).replace(/\/+$/, "")
const CREATE_USER = args.has("create-user") ? true : args.has("no-create-user") ? false : ENVIRONMENT === "prelive"
const NAME = args.get("name") ?? "QA Rigel Thai replay"
const JSON_OUT = args.get("json")
const DUMP = args.has("dump")
const TIMEOUT = Number(args.get("timeout") ?? 20000)
const HEAD = args.get("head") ?? "unknown"

/** `--today` pins the ICT date (a replay of a filed transcript); default is now. */
const TODAY = args.get("today") ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date())
if (!/^\d{4}-\d{2}-\d{2}$/.test(TODAY)) usage(`--today must be YYYY-MM-DD, got ${JSON.stringify(TODAY)}`)
const MONTH = TODAY.slice(0, 7)
const DAY = Number(TODAY.slice(8, 10))
/** A day of the month that is never the 1st and is valid in MONTH (AC5). */
const RECURRING_DAY = DAY === 15 ? 16 : 15
if (DAY === 1) usage("AC1 cannot distinguish today from the 1st on the 1st of the month; pass --today with a day > 1")

const EMAIL = args.get("email") ?? `qa-thai-replay-${randomUUID().slice(0, 8)}@agents.excited.live`
const PASSWORD = args.get("password") ?? `Rigel-${randomUUID().slice(0, 12)}`

const BUDDHIST_ASOF = `${Number(MONTH.slice(0, 4)) + 543}${MONTH.slice(4)}-${TODAY.slice(8, 10)}`

// ---------------------------------------------------------------------------
// tiny helpers
// ---------------------------------------------------------------------------
const startedAt = new Date().toISOString()
const rows = []
const transcript = []

function note(text) {
	transcript.push(text)
	if (DUMP) console.log(`   · ${text}`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const safeJson = (text) => {
	try {
		return JSON.parse(text)
	} catch {
		return null
	}
}
const snippet = (text, limit = 400) => String(text ?? "").replace(/\s+/g, " ").slice(0, limit)

async function request(url, { method = "GET", headers, body } = {}) {
	const init = { method, headers: { ...headers }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT) }
	if (body !== undefined) {
		init.headers["content-type"] = "application/json"
		init.body = JSON.stringify(body)
	}
	const response = await fetch(url, init)
	const text = await response.text()
	return { status: response.status, headers: response.headers, text, json: safeJson(text) }
}

function record(id, title, ok, detail) {
	rows.push({ id, title, status: ok ? "PASS" : "FAIL", detail })
	if (DUMP) console.log(`${ok ? "PASS" : "FAIL"}  ${id}. ${title} — ${detail}`)
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC over HTTP with an agent key
// ---------------------------------------------------------------------------
let rpcId = 0

function parseRpc(text) {
	const trimmed = String(text ?? "").trim()
	if (trimmed.startsWith("{")) return safeJson(trimmed)
	// Streamable HTTP may answer as SSE: concatenate data: lines.
	const data = trimmed
		.split("\n")
		.filter((line) => line.startsWith("data:"))
		.map((line) => line.slice(5).trim())
		.join("")
	return data ? safeJson(data) : null
}

async function rpc(key, method, params) {
	const body = { jsonrpc: "2.0", id: ++rpcId, method, ...(params ? { params } : {}) }
	const response = await request(MCP_URL, {
		method: "POST",
		headers: {
			authorization: `Bearer ${key}`,
			accept: "application/json, text/event-stream",
			"mcp-protocol-version": "2025-06-18",
		},
		body,
	})
	const envelope = parseRpc(response.text)
	if (DUMP) console.log(`   · ${method} -> HTTP ${response.status} · ${snippet(response.text, 160)}`)
	return { status: response.status, headers: response.headers, envelope, raw: response.text }
}

/**
 * Call a tool. Returns { ok, payload, error } where `payload` is the decoded
 * tool result body and `error` is a typed error object when the server refused.
 */
async function tool(key, name, toolArgs) {
	const { status, envelope, raw } = await rpc(key, "tools/call", { name, arguments: toolArgs })
	if (DUMP) console.log(`   · tools/call ${name} -> HTTP ${status} · ${snippet(raw, 500)}`)
	const rpcError = envelope?.error ?? null
	const result = envelope?.result ?? null
	const text = result?.content?.find?.((part) => part.type === "text")?.text
	let payload = result?.structuredContent ?? null
	if (payload == null && typeof text === "string") payload = safeJson(text) ?? text
	if (rpcError) return { status, ok: false, error: { kind: "jsonrpc", ...rpcError }, payload }
	if (result?.isError) return { status, ok: false, error: { kind: "tool", body: payload }, payload }
	return { status, ok: true, payload, error: null }
}

/** Pull the first JSON object that carries an error code out of a refusal. */
function errorCode(error) {
	if (!error) return null
	if (error.kind === "jsonrpc") return error.data?.code ?? error.code ?? null
	const body = error.body
	if (body && typeof body === "object") return body.code ?? body.error?.code ?? body.type ?? null
	return null
}

function errorText(error) {
	if (!error) return ""
	if (error.kind === "jsonrpc") return `${error.message ?? ""} ${JSON.stringify(error.data ?? {})}`
	return typeof error.body === "string" ? error.body : JSON.stringify(error.body ?? {})
}

/** True when a refusal is typed rather than an unstructured 500 / HTML page. */
function isTyped(error) {
	if (!error) return false
	const code = errorCode(error)
	const text = errorText(error)
	return Boolean(code) || /\b(validation|invalid|BAD_REQUEST|VALIDATION_ERROR|INVALID_ASOF)\b/i.test(text)
}

// ---------------------------------------------------------------------------
// reads used by the criteria
// ---------------------------------------------------------------------------
async function cashFlows(key, month) {
	const call = await tool(key, "get_cash_flows", { month })
	if (!call.ok) return { ok: false, call, items: [], totals: null }
	const body = call.payload ?? {}
	const node = body.cashFlows && !Array.isArray(body.cashFlows) ? body.cashFlows : body
	const items = Array.isArray(node.items) ? node.items : Array.isArray(body.items) ? body.items : []
	return {
		ok: true,
		call,
		body,
		items,
		totals: node.totals ?? body.totals ?? null,
		spendingByCategory: body.spendingByCategory ?? body.categoryTotals ?? node.spendingByCategory ?? null,
	}
}

async function financialSummary(key, month) {
	const call = await tool(key, "get_financial_summary", { month })
	return call.ok ? { ok: true, body: call.payload ?? {} } : { ok: false, call }
}

/** The month's expense total, derived from the cash-flow items themselves. */
function expenseTotal(items) {
	return items
		.filter((item) => item.direction !== "in" && (item.flowType === "expense" || item.sourceType === "expense"))
		.reduce((sum, item) => sum + Math.abs(Number(item.spendingAmount ?? item.amount ?? 0)), 0)
}

function findMonthItem(items, name) {
	return items.find((item) => item.name === name) ?? null
}

/** The treasury number a summary reports, with the field it came from. */
function endingTreasury(summary) {
	const body = summary ?? {}
	const entity = body.summary?.entities?.[0] ?? null
	const candidates = [
		["endingTreasury", body.endingTreasury],
		["summary.endingTreasury", body.summary?.endingTreasury],
		["metrics.endingTreasury", body.metrics?.endingTreasury],
		["summary.consolidated.totalEomTreasury", body.summary?.consolidated?.totalEomTreasury],
		["consolidated.totalEomTreasury", body.consolidated?.totalEomTreasury],
		["summary.entities[0].metrics.eomLiquid", entity?.metrics?.eomLiquid],
		["summary.entities[0].balanceSheet.cash", entity?.balanceSheet?.cash],
		["metrics.eomLiquid", body.metrics?.eomLiquid],
		["balanceSheet.cash", body.balanceSheet?.cash],
	]
	for (const [field, value] of candidates) {
		if (typeof value === "number" && Number.isFinite(value)) return { value, field }
	}
	return { value: null, field: null }
}

const KNOWN_CATEGORY_SLUGS = new Set([
	"housing",
	"food",
	"groceries",
	"transit",
	"healthcare",
	"entertainment",
	"connectivity",
	"family",
	"dev_tool",
	"capital_deploy",
	"ai",
	"infra",
	"office",
	"marketing",
	"other",
])

// ---------------------------------------------------------------------------
// setup: throwaway account -> session -> one minted agent key
// ---------------------------------------------------------------------------
console.log(`mcp-thai-expense-replay · ${ENVIRONMENT} · ${MCP_URL}`)
console.log(`account ${EMAIL} · today (ICT) ${TODAY} · month ${MONTH} · head ${HEAD}`)

/**
 * The Worker exposes no build sha, so the head in the report is whatever the
 * caller passed. What the server itself can prove is its own clock at the
 * moment of the run: recorded so a table can be tied to a deploy window
 * instead of to a sha somebody remembered.
 */
async function workerClock() {
	try {
		const response = await request(`${API_URL}/health`, {})
		const stamp = response.json?.timestamp ?? null
		if (stamp) note(`worker /health timestamp ${stamp} (${API_URL})`)
		return stamp
	} catch (error) {
		note(`worker /health unreachable: ${error.message}`)
		return null
	}
}

async function signIn() {
	const authBase = new URL("/api/auth", AS_URL)
	// Sign-up and sign-in happen on the API's auth mount so `set-auth-token` is
	// exposed; the AS origin is only used as a trusted Origin header.
	const apiAuth = `${API_URL}/api/v1/auth`
	if (CREATE_USER) {
		const signUp = await request(`${apiAuth}/sign-up/email`, {
			method: "POST",
			headers: { origin: AS_URL },
			body: { email: EMAIL, password: PASSWORD, name: NAME },
		})
		note(`sign-up ${apiAuth}/sign-up/email -> HTTP ${signUp.status}${signUp.json?.code ? ` · ${signUp.json.code}` : ""}`)
		if (signUp.status >= 500) throw new Error(`sign-up failed: HTTP ${signUp.status} ${snippet(signUp.text, 200)}`)
	}
	let last = null
	for (let attempt = 0; attempt < 5; attempt++) {
		last = await request(`${apiAuth}/sign-in/email`, {
			method: "POST",
			headers: { origin: AS_URL },
			body: { email: EMAIL, password: PASSWORD },
		})
		const token = last.headers.get("set-auth-token")
		note(`sign-in ${apiAuth}/sign-in/email -> HTTP ${last.status} · token ${token ? `${token.length} chars` : "(absent)"}`)
		if (last.status === 200 && token) return { token, user: last.json?.user ?? null }
		if (last.status === 403 && /INVALID_ORIGIN/i.test(last.text)) {
			throw new Error(`sign-in refused INVALID_ORIGIN for Origin ${AS_URL} — the API's trusted-origin list is wrong, not the account`)
		}
		await sleep(300)
	}
	throw new Error(`sign-in failed: HTTP ${last?.status} ${snippet(last?.text, 200)} (auth base ${authBase.origin})`)
}

async function mintKey(token) {
	const minted = await request(`${API_URL}/api/v1/agent-keys`, {
		method: "POST",
		headers: { authorization: `Bearer ${token}`, origin: AS_URL },
		body: {
			agentId: "qa-rigel-thai-replay",
			name: `Thai replay ${TODAY}`,
			scopes: ["onboarding", "accounting:read", "accounting:write"],
		},
	})
	note(`POST /api/v1/agent-keys -> HTTP ${minted.status} · id ${minted.json?.id ?? "(none)"} · key ${minted.json?.key ? "returned" : "MISSING"}`)
	if (minted.status !== 201 || !minted.json?.key) {
		throw new Error(`key mint failed: HTTP ${minted.status} ${snippet(minted.text, 200)}`)
	}
	return { id: minted.json.id, key: minted.json.key, rateLimit: minted.json.rateLimit ?? null }
}

async function revokeKey(token, id) {
	const revoked = await request(`${API_URL}/api/v1/agent-keys/${encodeURIComponent(id)}`, {
		method: "DELETE",
		headers: { authorization: `Bearer ${token}`, origin: AS_URL },
	})
	note(`DELETE /api/v1/agent-keys/${id} -> HTTP ${revoked.status}`)
}

// ---------------------------------------------------------------------------
// the replay
// ---------------------------------------------------------------------------
const EXPENSE_NAME = "ร้านอาหารตามสั่ง"
const CATEGORY_TH = "อาหาร"
const RECURRING_NAME = "ค่าเช่าทดสอบ"
const YEAR_NAME = "ค่ากาแฟ พ.ศ."

let key = args.get("key") ?? null
let session = null
let minted = null
let setupError = null

try {
	if (key) {
		// A pre-minted key (replaying against a host whose account already exists).
		note("using --key; no sign-in or mint")
	} else {
		session = await signIn()
		minted = await mintKey(session.token)
		key = minted.key
	}
} catch (error) {
	setupError = error
	note(`setup failed: ${error.message}`)
}

const workerStamp = await workerClock()

if (key) {
	const tools = await rpc(key, "tools/list", {})
	const toolNames = (tools.envelope?.result?.tools ?? []).map((entry) => entry.name)
	note(`tools/list -> HTTP ${tools.status} · ${toolNames.length} tools`)
	if (DUMP) console.log(`   · tools: ${toolNames.join(", ")}`)

	// AC4 needs the wallet to be empty; record what the account looked like.
	const before = await financialSummary(key, MONTH)
	const beforeTreasury = endingTreasury(before.body)

	// --- the write the human asked for -------------------------------------
	const writeArgs = { name: EXPENSE_NAME, category: CATEGORY_TH, amount: 250, cycle: "one_time", asOf: TODAY }
	const write = await tool(key, "add_expense", writeArgs)
	note(`add_expense ${JSON.stringify(writeArgs)} -> ${write.ok ? "accepted" : `refused (${errorCode(write.error)})`}`)
	if (!write.ok) note(`  refusal body: ${snippet(errorText(write.error), 500)}`)

	const flows = await cashFlows(key, MONTH)
	const item = findMonthItem(flows.items, EXPENSE_NAME)

	// --- AC1: the day survives ----------------------------------------------
	if (!write.ok) {
		record("AC1", "one_time asOf day read back", false, `the write itself was refused: ${snippet(errorText(write.error), 240)}`)
	} else if (!item) {
		record("AC1", "one_time asOf day read back", false, `no get_cash_flows item named ${EXPENSE_NAME} in ${MONTH}`)
	} else {
		const ok = item.date === TODAY
		record(
			"AC1",
			"one_time asOf day read back",
			ok,
			ok
				? `get_cash_flows date ${item.date} == asOf ${TODAY}`
				: `get_cash_flows date ${item.date} != asOf ${TODAY} (day dropped)`,
		)
	}

	// --- AC4: zero-balance write is 200 + both warnings ---------------------
	{
		const payload = write.payload ?? {}
		const warnings = Array.isArray(payload.warnings)
			? payload.warnings
			: Array.isArray(payload.expense?.warnings)
				? payload.expense.warnings
				: []
		// A codes[] list, not warnings[0]: a payload whose warnings is a list of
		// bare strings reported [undefined], which nobody can diagnose.
		const codes = warnings.map((entry) => entry?.code)
		const hasWarning = (code) => warnings.some((entry) => entry?.code === code)
		const treasuryAfter =
			typeof payload.treasuryAfter === "number"
				? payload.treasuryAfter
				: typeof payload.expense?.treasuryAfter === "number"
					? payload.expense.treasuryAfter
					: null
		const after = await financialSummary(key, MONTH)
		const summaryTreasury = endingTreasury(after.body)
		const isDefaultAlive = after.body?.summary?.entities?.[0]?.metrics?.isDefaultAlive ?? after.body?.metrics?.isDefaultAlive ?? null
		const parts = [
			summaryTreasury.value === null
				? "summary reports no treasury"
				: `summary ending treasury ${summaryTreasury.value} (${summaryTreasury.field})`,
			isDefaultAlive === null ? null : `isDefaultAlive ${isDefaultAlive}`,
		].filter(Boolean)
		let ok = true
		if (!write.ok) {
			ok = false
			parts.push(`write refused: ${snippet(errorText(write.error), 240)}`)
		}
		// Both codes fire here: the wallet held ฿0 before the write AND the month
		// ends at -฿250. They are different scopes, never deduped, so each is
		// required on its own (#174, Ada 15:43).
		for (const code of ["cash_negative", "funding_wallet_zero_balance"]) {
			if (hasWarning(code)) continue
			ok = false
			parts.push(`warnings[].code has no ${code} -> [${codes.join(", ")}]`)
		}
		if (warnings.length) parts.push(`warnings codes [${codes.join(", ")}]`)
		// Shape: every entry names its month and a numeric treasuryAfter, and only
		// the zero-balance entry names the wallet it is about.
		const shapeProblems = []
		warnings.forEach((entry, index) => {
			const problems = []
			if (typeof entry?.month !== "string" || !/^\d{4}-\d{2}$/.test(entry.month)) {
				problems.push(`month ${JSON.stringify(entry?.month ?? null)}`)
			}
			if (typeof entry?.treasuryAfter !== "number") {
				problems.push(`treasuryAfter ${JSON.stringify(entry?.treasuryAfter ?? null)}`)
			}
			if (entry?.code === "funding_wallet_zero_balance") {
				if (typeof entry?.assetId !== "string" || !entry.assetId) problems.push("assetId missing")
			} else if (entry?.assetId !== undefined && entry?.assetId !== null) {
				problems.push(`assetId unexpected on ${entry?.code}`)
			}
			if (problems.length) shapeProblems.push(`warnings[${index}] ${entry?.code ?? "no-code"}: ${problems.join(", ")}`)
		})
		if (shapeProblems.length) {
			ok = false
			parts.push(...shapeProblems)
		} else if (warnings.length) {
			parts.push("every entry: month, numeric treasuryAfter, assetId only on the zero-balance code")
		}
		// The number must be the month's ending treasury, not an estimate: the
		// response-level treasuryAfter and every warning's copy are compared with
		// get_financial_summary for that month.
		if (treasuryAfter === null) {
			ok = false
			parts.push("no treasuryAfter in the response")
		} else if (summaryTreasury.value === null) {
			ok = false
			parts.push(`treasuryAfter ${treasuryAfter} unverifiable: summary has no treasury field`)
		} else if (summaryTreasury.value !== treasuryAfter) {
			ok = false
			parts.push(`treasuryAfter ${treasuryAfter} != ${summaryTreasury.field} ${summaryTreasury.value}`)
		} else {
			parts.push(`treasuryAfter ${treasuryAfter} == ${summaryTreasury.field}`)
		}
		const warningMismatch = warnings
			.map((entry, index) =>
				typeof entry?.treasuryAfter === "number" && summaryTreasury.value !== null && entry.treasuryAfter !== summaryTreasury.value
					? `warnings[${index}].treasuryAfter ${entry.treasuryAfter}`
					: null,
			)
			.filter(Boolean)
		if (warningMismatch.length) {
			ok = false
			parts.push(`${warningMismatch.join(", ")} != ${summaryTreasury.field} ${summaryTreasury.value}`)
		}
		if (beforeTreasury.value !== null && beforeTreasury.value !== 0) {
			ok = false
			parts.push(`NOT a zero-balance wallet: started at ${beforeTreasury.value} (${beforeTreasury.field})`)
		}
		record("AC4", "zero-balance write -> cash_negative + funding_wallet_zero_balance + treasuryAfter", ok, parts.join(" · "))
	}

	// --- AC2: Buddhist-era year is refused and writes nothing ---------------
	{
		const pre = await cashFlows(key, MONTH)
		const preNames = pre.items.map((entry) => entry.id ?? entry.name).sort()
		const preTotal = expenseTotal(pre.items)
		const bad = await tool(key, "add_expense", {
			name: YEAR_NAME,
			category: CATEGORY_TH,
			amount: 65,
			cycle: "one_time",
			asOf: BUDDHIST_ASOF,
		})
		note(`add_expense asOf ${BUDDHIST_ASOF} -> ${bad.ok ? "ACCEPTED (defect)" : `refused ${errorCode(bad.error) ?? ""}`}`)
		await sleep(250)
		const post = await cashFlows(key, MONTH)
		const postNames = post.items.map((entry) => entry.id ?? entry.name).sort()
		const added = postNames.filter((entry) => !preNames.includes(entry))
		const monthSame = added.length === 0 && expenseTotal(post.items) === preTotal
		const buddhistMonth = `${BUDDHIST_ASOF.slice(0, 7)}`
		const stray = await cashFlows(key, buddhistMonth)
		const strayItems = stray.ok ? stray.items.length : 0
		const typed = !bad.ok && isTyped(bad.error)
		const ok = typed && monthSame && strayItems === 0
		const parts = [
			bad.ok ? `HTTP 200, accepted asOf ${BUDDHIST_ASOF}` : `typed error ${errorCode(bad.error) ?? "(no code)"}`,
			monthSame ? `${MONTH} unchanged (${post.items.length} items, ${expenseTotal(post.items)} THB)` : `${MONTH} changed: +${added.length} items`,
			stray.ok ? `${buddhistMonth} has ${strayItems} item(s)` : `${buddhistMonth} unreadable`,
		]
		if (!bad.ok && !isTyped(bad.error)) parts.push(`untyped refusal: ${snippet(errorText(bad.error), 160)}`)
		record("AC2", "พ.ศ. asOf -> typed error, nothing written", ok, parts.join(" · "))
	}

	// --- AC3: category vocabulary + read path -------------------------------
	{
		const flowsNow = await cashFlows(key, MONTH)
		const thisItem = findMonthItem(flowsNow.items, EXPENSE_NAME)
		const responseCategory = write.payload?.expense?.category ?? write.payload?.category ?? null
		const readCategory = thisItem?.category ?? null
		const slugsSeen = [responseCategory, readCategory].filter((value) => typeof value === "string")
		const known = slugsSeen.filter((value) => KNOWN_CATEGORY_SLUGS.has(value))
		const expenseItems = flowsNow.items.filter(
			(entry) => entry.direction !== "in" && (entry.flowType === "expense" || entry.sourceType === "expense"),
		)
		const missingCategory = expenseItems.filter((entry) => typeof entry.category !== "string" || !entry.category)
		const byCategory = flowsNow.spendingByCategory
		const total = expenseTotal(flowsNow.items)
		const byCategoryTotal = (() => {
			if (!byCategory) return null
			const entries = Array.isArray(byCategory)
				? byCategory.map((entry) => [entry.category ?? entry.slug, entry.amount ?? entry.total])
				: Object.entries(byCategory)
			return entries.reduce((sum, [, value]) => sum + Math.abs(Number(value ?? 0)), 0)
		})()
		const parts = [
			`write echoed ${JSON.stringify(responseCategory)}`,
			`read item category ${JSON.stringify(readCategory)}`,
			`read item keys [${thisItem ? Object.keys(thisItem).join(",") : "none"}]`,
			known.length ? `known slug ${known.join("/")}` : "no known slug",
			missingCategory.length ? `${missingCategory.length} expense item(s) lack category` : "every expense item carries category",
			byCategory ? `spendingByCategory total ${byCategoryTotal} vs month expense total ${total}` : "no spendingByCategory",
		]
		const ok =
			known.length > 0 &&
			typeof readCategory === "string" &&
			KNOWN_CATEGORY_SLUGS.has(readCategory) &&
			missingCategory.length === 0 &&
			byCategory !== null &&
			byCategoryTotal === total
		record("AC3", "อาหาร round-trips as a slug; category on read; spendingByCategory", ok, parts.join(" · "))
	}

	// --- X1 (supplement, #173 AC): unknown category is a typed refusal ------
	{
		const pre = await cashFlows(key, MONTH)
		const preCount = pre.items.length
		const unknown = "zzz-not-a-category"
		const bad = await tool(key, "add_expense", {
			name: "ทดสอบหมวดหมู่ผิด",
			category: unknown,
			amount: 1,
			cycle: "one_time",
			asOf: TODAY,
		})
		await sleep(250)
		const post = await cashFlows(key, MONTH)
		const text = errorText(bad.error)
		const thaiLabels = ["อาหาร", "ที่พัก", "เดินทาง", "สุขภาพ", "บันเทิง", "ครอบครัว", "ช้อปปิ้ง", "ของใช้", "การศึกษา", "อื่นๆ", "อื่น ๆ"]
		const slugsHit = [...KNOWN_CATEGORY_SLUGS].filter((slug) => text.includes(slug)).length
		const thaiHit = thaiLabels.filter((label) => text.includes(label)).length
		const listed = slugsHit >= 2 || thaiHit >= 2
		const ok = !bad.ok && isTyped(bad.error) && listed && post.items.length === preCount
		const parts = [
			bad.ok ? `HTTP 200, stored category ${JSON.stringify(unknown)}` : `refused ${errorCode(bad.error) ?? "(code absent)"}`,
			listed ? "refusal lists the allowed values" : "refusal does not list allowed values",
			post.items.length === preCount ? `${MONTH} unchanged (${preCount} items)` : `${MONTH} gained ${post.items.length - preCount} item(s)`,
		]
		record("X1", "unknown category -> typed refusal listing allowed values", ok, parts.join(" · "))
	}

	// --- AC5: monthly regression -------------------------------------------
	{
		const added = await tool(key, "add_expense", {
			name: RECURRING_NAME,
			category: CATEGORY_TH,
			amount: 99,
			cycle: "monthly",
			dayOfMonth: RECURRING_DAY,
			asOf: MONTH,
		})
		note(`add_expense monthly dayOfMonth ${RECURRING_DAY} -> ${added.ok ? "accepted" : `refused ${errorCode(added.error) ?? ""}`}`)
		await sleep(250)
		const flowsNow = await cashFlows(key, MONTH)
		const recurring = findMonthItem(flowsNow.items, RECURRING_NAME)
		const expected = `${MONTH}-${String(RECURRING_DAY).padStart(2, "0")}`
		const ok = added.ok && Boolean(recurring) && recurring.date === expected
		record(
			"AC5",
			`monthly expense charges on dayOfMonth ${RECURRING_DAY}`,
			ok,
			!added.ok
				? `write refused: ${snippet(errorText(added.error), 200)}`
				: recurring
					? `get_cash_flows date ${recurring.date} (expected ${expected})`
					: `no item named ${RECURRING_NAME} in ${MONTH}`,
		)
	}
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const ORDER = ["AC1", "AC2", "AC3", "AC4", "AC5", "X1"]
rows.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))
const ok = rows.length >= 5 && rows.every((row) => row.status === "PASS")

console.log("")
console.log(`| AC | criterion | result | evidence |`)
console.log(`|---|---|---|---|`)
for (const row of rows) console.log(`| ${row.id} | ${row.title} | **${row.status}** | ${row.detail.replace(/\|/g, "\\|")} |`)
if (setupError) console.log(`| setup | throwaway account + minted key | **FAIL** | ${snippet(setupError.message, 300).replace(/\|/g, "\\|")} |`)
console.log("")
console.log(`RESULT: ${ok ? "PASS" : "FAIL"} — ${rows.filter((row) => row.status === "PASS").length}/${rows.length} criteria on ${ENVIRONMENT} @ ${HEAD}`)

const report = {
	environment: ENVIRONMENT,
	mcpUrl: MCP_URL,
	head: HEAD,
	workerTimestamp: workerStamp,
	today: TODAY,
	month: MONTH,
	account: EMAIL,
	keyId: minted?.id ?? null,
	keyRateLimit: minted?.rateLimit ?? null,
	startedAt,
	finishedAt: new Date().toISOString(),
	result: ok ? "PASS" : "FAIL",
	rows,
	notes: transcript,
}
if (JSON_OUT) {
	const { writeFileSync } = await import("node:fs")
	writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`)
	console.log(`json: ${JSON_OUT}`)
}

// Clean up the key; the throwaway account and its rows stay for inspection.
if (key && session && minted && !args.has("keep-key")) {
	await revokeKey(session.token, minted.id)
}

process.exit(ok ? 0 : 1)
