import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CATALOG_PRESETS, shiftYearMonth } from "@excited-live/accounting";
import {
	CreateAssetBody,
	CreateEntityBody,
	CreateExpenseBody,
	CreateIncomeBody,
	CreateLiabilityBody,
	CreateTransferBody,
} from "../accounting/route/accounting.schemas";
import { AGENT_KEY_RATE_LIMIT, apiKeyApi } from "@excited-live/auth";
import { afterEach, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../../app";
import { DB_FILE_ENV, resetDbCache } from "../../db";
import { getTokensAuth, resetTokensAuthCache } from "../../lib/auth";
import { productDate, productMonth } from "../../lib/product-time";
import type { ApiEnv } from "../../lib/env";
import { rateLimitedResponse } from "./mcp.auth";

/**
 * /mcp round-trips. The transport is stateless and JSON-only, so each POST is
 * independent: initialize, tools/list and tools/call are separate requests.
 */

const SECRET = "test-secret-for-mcp-tests";
const BASE_URL = "http://localhost:8787";
const EMAIL = "mcp@excited.live";
const PASSWORD = "correct-horse-battery";

const FIGMA = CATALOG_PRESETS.find((item) => item.id === "tool_figma")!;
const MACBOOK = CATALOG_PRESETS.find((item) => item.id === "gear_macbook_pro")!;
const CAR_LOAN = CATALOG_PRESETS.find((item) => item.id === "liab_car_loan")!;
const AGODA = CATALOG_PRESETS.find((item) => item.id === "company_agoda")!;

const tempDirs: string[] = [];

function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-mcp-"));
	tempDirs.push(dir);
	return join(dir, "api-mcp.sqlite");
}

afterEach(() => {
	delete process.env.BETTER_AUTH_SECRET;
	delete process.env.BETTER_AUTH_URL;
	delete process.env[DB_FILE_ENV];
	resetTokensAuthCache();
	resetDbCache();
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function configuredApp(): Hono<ApiEnv> {
	process.env.BETTER_AUTH_SECRET = SECRET;
	process.env.BETTER_AUTH_URL = BASE_URL;
	process.env[DB_FILE_ENV] = tempDbFile();
	resetDbCache();
	// The tokens-auth instance is cached per process and holds the driver it was
	// built with. A test that swaps databases mid-case (a second configuredApp())
	// must drop it too, or /me reads users out of the previous database.
	resetTokensAuthCache();
	return createApp();
}

async function signIn(app: Hono<ApiEnv>, email = EMAIL): Promise<{ token: string; userId: string }> {
	await app.request("/api/v1/auth/sign-up/email", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ name: "MCP Test", email, password: PASSWORD }),
	});
	const res = await app.request("/api/v1/auth/sign-in/email", {
		method: "POST",
		headers: { "content-type": "application/json", Authorization: "Bearer" },
		body: JSON.stringify({ email, password: PASSWORD }),
	});
	expect(res.status).toBe(200);
	const token = res.headers.get("set-auth-token");
	expect(token).toBeTruthy();
	const me = await app.request("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } });
	const meData = (await me.json()) as { user: { id: string } };
	return { token: token as string, userId: meData.user.id };
}

/** The tokens that grant every tool, in the PRM vocabulary a mint accepts. */
const FULL_SCOPES = ["onboarding", "accounting:read", "accounting:write"];

async function mintKey(
	app: Hono<ApiEnv>,
	token: string,
	agentId = "claude-code",
	scopes: string[] = FULL_SCOPES,
): Promise<string> {
	const res = await app.request("/api/v1/agent-keys", {
		method: "POST",
		headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify({ agentId, scopes }),
	});
	expect(res.status).toBe(201);
	const data = (await res.json()) as { key: string };
	return data.key;
}

type RpcBody = {
	jsonrpc: "2.0";
	id?: number;
	method: string;
	params?: Record<string, unknown>;
};

async function rpc(
	app: Hono<ApiEnv>,
	body: RpcBody,
	key?: string,
): Promise<{ status: number; headers: Headers; json: Record<string, unknown> | null }> {
	const headers: Record<string, string> = {
		"content-type": "application/json",
		accept: "application/json, text/event-stream",
	};
	if (key) headers.Authorization = `Bearer ${key}`;
	const res = await app.request("/mcp", { method: "POST", headers, body: JSON.stringify(body) });
	const text = await res.text();
	return { status: res.status, headers: res.headers, json: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

const initialize = (id = 1): RpcBody => ({
	jsonrpc: "2.0",
	id,
	method: "initialize",
	params: {
		protocolVersion: "2025-06-18",
		capabilities: {},
		clientInfo: { name: "vitest", version: "1.0.0" },
	},
});

type ToolResult = {
	content: Array<{ type: string; text: string }>;
	structuredContent?: Record<string, unknown>;
	isError?: boolean;
};

describe("/mcp", () => {
	it("answers GET and DELETE with a 405 before auth, never a stream (#142)", async () => {
		const app = configuredApp();

		for (const method of ["GET", "DELETE"] as const) {
			// No credential: the method gate must come before auth resolution,
			// so this is 405 rather than a 401 challenge.
			const res = await app.request("/mcp", { method });
			expect(res.status).toBe(405);
			expect(res.headers.get("allow")).toBe("POST");
			expect(res.headers.get("content-type") ?? "").not.toContain("text/event-stream");
			// Reading the body proves the response ends: an idle SSE stream would
			// hang here until the test timeout. The wall clock is deliberately not
			// asserted — this runner shares two cores with every other package, and
			// a 1 s bound flaked at 3.2 s under load (main, run 272).
			expect(await res.text()).toContain("POST only");
		}
	});

	it("answers 401 with the protected-resource challenge when no key is sent", async () => {
		const app = configuredApp();
		const res = await rpc(app, initialize());
		expect(res.status).toBe(401);
		expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
		expect(res.headers.get("www-authenticate")).toContain("/.well-known/oauth-protected-resource");
		// #123 A.1: the body must name the API-key alternative, not just the
		// OAuth challenge, or a client that stops here never finds `elk_` keys.
		const body = res.json as { error: string; hint: string };
		expect(body.error).toBe("unauthorized");
		expect(body.hint).toContain("elk_");
		expect(body.hint).toContain("x-api-key");
	});


	it("names both key transports in the 401 body, identical for no creds and a wrong key (#126)", async () => {
		const app = configuredApp();
		const post = (authorization?: string) =>
			app.request("/mcp", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
					...(authorization ? { Authorization: authorization } : {}),
				},
				body: JSON.stringify(initialize()),
			});

		const noCreds = await post();
		const wrongKey = await post("Bearer elk_not-a-real-key");
		expect(noCreds.status).toBe(401);
		expect(wrongKey.status).toBe(401);

		// Byte-equal: the body must not tell a caller whether the key existed.
		const body = await noCreds.text();
		expect(await wrongKey.text()).toBe(body);

		const payload = JSON.parse(body) as { error: string; hint: string };
		expect(payload.error).toBe("unauthorized");
		expect(payload.hint).toContain("Authorization: Bearer elk_");
		expect(payload.hint).toContain("x-api-key: elk_");
		// The metadata URL is spelled out for the host that was called, not just
		// pointed at through the WWW-Authenticate header.
		expect(payload.hint).toContain("http://localhost/.well-known/oauth-protected-resource");

		// The challenge is unchanged by the body, on both responses.
		const challenge = 'Bearer resource_metadata="http://localhost/.well-known/oauth-protected-resource"';
		expect(noCreds.headers.get("www-authenticate")).toBe(challenge);
		expect(wrongKey.headers.get("www-authenticate")).toBe(challenge);
		// Same header set for both: the body change adds no header.
		expect([...wrongKey.headers.keys()].sort()).toEqual([...noCreds.headers.keys()].sort());
	});

	it("advertises the key's remaining budget on a 200 (#140)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const first = await rpc(app, initialize(), key);
		expect(first.status).toBe(200);
		expect(first.headers.get("x-ratelimit-limit")).toBe(String(AGENT_KEY_RATE_LIMIT.maxRequests));
		expect(first.headers.get("x-ratelimit-remaining")).toBe(String(AGENT_KEY_RATE_LIMIT.maxRequests - 1));
		expect(Number(first.headers.get("x-ratelimit-reset"))).toBeGreaterThan(Math.floor(Date.now() / 1000));

		const second = await rpc(app, initialize(2), key);
		expect(second.status).toBe(200);
		expect(second.headers.get("x-ratelimit-remaining")).toBe(String(AGENT_KEY_RATE_LIMIT.maxRequests - 2));
	});

	it("answers 429 with Retry-After when the key's budget is spent, never 401 (#140)", async () => {
		const app = configuredApp();
		const { userId } = await signIn(app);
		// An explicit two-call budget, not the product default: spending 200
		// sequential RPCs at ~90ms each made this test time out at 20s. The
		// semantics under test are identical, and the small budget also proves
		// the per-key limit is what gets enforced, not the global one.
		const auth = await getTokensAuth(`${BASE_URL}/mcp`);
		const minted = await apiKeyApi(auth!).createApiKey({
			body: {
				userId,
				expiresIn: 24 * 60 * 60,
				permissions: { onboarding: ["read", "write"], accounting: ["read", "write"] },
				rateLimitMax: 2,
				rateLimitTimeWindow: 24 * 60 * 60 * 1000,
			},
		});
		const key = minted.key;

		const first = await rpc(app, initialize(1), key);
		expect(first.status).toBe(200);
		expect(first.headers.get("x-ratelimit-limit")).toBe("2");
		expect(first.headers.get("x-ratelimit-remaining")).toBe("1");

		const second = await rpc(app, initialize(2), key);
		expect(second.status).toBe(200);
		expect(second.headers.get("x-ratelimit-remaining")).toBe("0");

		const limited = await rpc(app, initialize(999), key);
		expect(limited.status).toBe(429);
		expect(limited.headers.get("www-authenticate")).toBeNull();
		const retryAfter = Number(limited.headers.get("retry-after"));
		expect(retryAfter).toBeGreaterThan(0);
		expect(retryAfter).toBeLessThanOrEqual(24 * 60 * 60);
		// #178: the refusal path reads this key's own row by the plugin's hash,
		// so the 429 advertises the same budget of 2 the 200s above did — not
		// the product default.
		expect(limited.headers.get("x-ratelimit-limit")).toBe("2");
		expect(limited.headers.get("x-ratelimit-remaining")).toBe("0");
		expect(Number(limited.headers.get("x-ratelimit-reset"))).toBeGreaterThan(Math.floor(Date.now() / 1000));

		const body = limited.json as {
			error: string;
			code: string;
			hint: string;
			message: string;
			retryAfter: number;
			rateLimit: { limit: number; remaining: number; reset: number };
		};
		expect(body.error).toBe("rate_limited");
		expect(body.code).toBe("RATE_LIMITED");
		expect(body.retryAfter).toBe(retryAfter);
		// #191: llms.txt and mcp.mdx promise the sentence names the reset
		// instant in UTC. Parse it out and prove it is the same second the
		// header clock carries, so the two can never disagree.
		expect(body.message).toMatch(/resets at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
		const namedInstant = body.message.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)?.[0];
		expect(namedInstant).toBe(new Date(body.rateLimit.reset * 1000).toISOString());
		// The body must say "wait", not "your key is wrong": this is the whole
		// distinction an unattended agent needs.
		expect(body.hint).toContain("do not rotate");
		expect(body.rateLimit).toEqual({
			// #178: this key's own budget, read back from its `apikey` row.
			limit: 2,
			remaining: 0,
			reset: Number(limited.headers.get("x-ratelimit-reset")),
		});
	});

	it("claims no reset instant on a lifetime-quota 429 (#191)", async () => {
		// `USAGE_EXCEEDED` has no `tryAgainIn`, so `principal.ts` hands the
		// builder no retry. Rendering a time such a key never gets is exactly
		// the false promise #191 exists to remove, so the bare sentence stays.
		const limited = rateLimitedResponse({ limit: 200, remaining: 0, reset: Math.floor(Date.now() / 1000) });
		expect(limited.status).toBe(429);
		expect(limited.headers.get("retry-after")).toBeNull();
		const body = (await limited.json()) as { message: string; retryAfter: number | null };
		expect(body.message).toBe("This API key is over its request budget.");
		expect(body.message).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
		expect(body.retryAfter).toBeNull();
	});

	it("initializes, lists tools and calls get_onboarding_status with a minted key", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const init = await rpc(app, initialize(), key);
		expect(init.status).toBe(200);
		expect(init.headers.get("www-authenticate")).toBeNull();
		const initResult = init.json?.result as { serverInfo: { name: string }; instructions?: string };
		expect(initResult.serverInfo.name).toBe("excited-live");
		expect(initResult.instructions).toContain("excited.live");
		expect(initResult.instructions).toContain("Images are picked automatically from the catalog.");
		expect(initResult.instructions).toContain("Guide version: 2.");

		const list = await rpc(app, { jsonrpc: "2.0", id: 2, method: "tools/list" }, key);
		expect(list.status).toBe(200);
		const tools = (list.json?.result as { tools: Array<{ name: string }> }).tools.map((tool) => tool.name);
		expect(tools).toHaveLength(17);
		expect(tools).toEqual(
			expect.arrayContaining([
				"whoami",
				"get_onboarding_status",
				"list_entities",
				"create_business",
				"add_asset",
				"add_liability",
				"add_income",
				"add_expense",
				"lookup_catalog",
				"complete_onboarding_step",
				"skip_onboarding_step",
				"get_financial_summary",
				"get_cash_flows",
				"create_transfer",
				"list_transfers",
				"get_monthly_ledger",
				"get_treasury_projection",
			]),
		);

		const call = await rpc(
			app,
			{ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_onboarding_status", arguments: {} } },
			key,
		);
		expect(call.status).toBe(200);
		const result = call.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect(result.structuredContent?.method).toBeNull();
		expect((result.structuredContent?.steps as Array<unknown>).length).toBe(6);
	});

	it("answers the cost question from initialize and onboard_me alone (#192)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const init = await rpc(app, initialize(), key);
		const instructions = (init.json?.result as { instructions?: string }).instructions ?? "";

		// #192: an agent that only speaks MCP must be able to answer "what does
		// this cost" without inventing a number. The canonical sentence lives in
		// apps/landingpage/public/pricing.md, verbatim; if the two diverge that is
		// a blocker, not a copy nit, so the whole line is pinned here.
		const costLine = instructions.split("\n").find((line) => line.startsWith("- Cost: "));
		expect(costLine).toBe(
			"- Cost: excited.live is free during launch. No card is required, and nothing is charged today. " +
				"There is no trial to expire: no trial end date, no automatic charge, and no plan, seat or usage fee applies today.",
		);

		for (const sentence of [
			"free during launch",
			"No card is required",
			"nothing is charged today",
			"There is no trial to expire",
		]) {
			expect(instructions).toContain(sentence);
		}

		// The #192 failure mode was a repo spec that said "$109/year" while the
		// product said free. No price, currency or placeholder may creep into the
		// cost answer. THB appears elsewhere in the guide as the default currency,
		// so this guard is scoped to the cost line and to price-shaped numbers.
		const costOnly = costLine ?? "";
		for (const banned of ["$", "฿", "THB", "USD", "/mo", "per month", "per year", "coming soon", "being finalised"]) {
			expect(costOnly).not.toContain(banned);
		}
		expect(costOnly).not.toMatch(/\d/);
		expect(instructions).not.toMatch(/\d+\s*(?:THB|USD|\$|฿)/);

		// Paid for on every session by every client: keep it inside the budget.
		expect(Buffer.byteLength(instructions, "utf8")).toBeLessThan(2600);

		// The same constant feeds the onboard_me prompt, so one edit covers both.
		const prompt = await rpc(
			app,
			{ jsonrpc: "2.0", id: 4, method: "prompts/get", params: { name: "onboard_me" } },
			key,
		);
		expect(prompt.status).toBe(200);
		const promptText = (prompt.json?.result as { messages: Array<{ content: { text: string } }> }).messages[0]
			?.content.text;
		expect(promptText).toContain("free during launch");
		expect(promptText).toContain("There is no trial to expire");
	});

	it("tells the agent budgets do not exist, in Design's words, right after the cost line (#203)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const init = await rpc(app, initialize(), key);
		const instructions = (init.json?.result as { instructions?: string }).instructions ?? "";

		// #203: Design's sentence (comments 3086/3128), verbatim. "do not derive"
		// is the half that stops an agent inventing a limit from income, last
		// month's spend or runway — the failure the scenario measures.
		const budget =
			'- Budgets are not a supported input yet: there is no budget field, and no tool reads or writes one. If asked "what\'s left in my X budget", say the spend is recorded and that no budget is set, and do not derive a limit from income, last month\'s spend or runway.';
		expect(instructions).toContain(budget);
		expect(instructions.toLowerCase()).toContain("budgets");
		expect(instructions).toContain("do not derive");

		// Directly after the #192 cost line: the two "what this does not do"
		// launch facts read together, and neither duplicates the other.
		const lines = instructions.split("\n");
		const costAt = lines.findIndex((line) => line.startsWith("- Cost: "));
		expect(costAt).toBeGreaterThan(-1);
		expect(lines[costAt + 1]).toBe(budget);

		// Design's AC greps the committed line itself for both words. Pinning the
		// slot and the full string is not enough on its own: a paraphrase in the
		// right place must fail here, where the AC would fail it too.
		const committed = lines[costAt + 1] ?? "";
		expect(committed).toMatch(/budget/i);
		expect(committed).toMatch(/do not derive/);

		// The read tool a choosing model sees carries the same fact.
		const list = await rpc(app, { jsonrpc: "2.0", id: 5, method: "tools/list" }, key);
		const tools = (list.json?.result as { tools: Array<{ name: string; description: string }> }).tools;
		const cashFlows = tools.find((tool) => tool.name === "get_cash_flows")?.description ?? "";
		expect(cashFlows).toContain("`spendingByCategory` is recorded spend, not a limit");
		expect(cashFlows).toContain('answer "what\'s left"');

		// The same constant feeds onboard_me, so one edit covers both.
		const prompt = await rpc(
			app,
			{ jsonrpc: "2.0", id: 6, method: "prompts/get", params: { name: "onboard_me" } },
			key,
		);
		const promptText = (prompt.json?.result as { messages: Array<{ content: { text: string } }> }).messages[0]?.content.text;
		expect(promptText).toContain("do not derive");

		// Paid for on every session by every client.
		expect(Buffer.byteLength(instructions, "utf8")).toBeLessThan(2600);
	});

	it("writes entries through the tools and completes a step", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const gate = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 10,
				method: "tools/call",
				params: { name: "complete_onboarding_step", arguments: { stepId: "add_expense" } },
			},
			key,
		);
		const gateResult = gate.json?.result as ToolResult;
		expect(gateResult.isError).toBe(true);
		expect(gateResult.content[0]?.text).toContain("at least one entry");
		expect(gateResult.content[0]?.text).toContain("cannot be skipped");
		expect(gateResult.content[0]?.text).not.toContain("skip_onboarding_step");

		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 11,
				method: "tools/call",
				params: {
					name: "add_expense",
					arguments: { name: "Netflix", category: "entertainment", amount: 420, cycle: "monthly" },
				},
			},
			key,
		);
		const addedResult = added.json?.result as ToolResult;
		expect(addedResult.isError).toBeUndefined();
		expect((addedResult.structuredContent?.expense as { entityId: string }).entityId).toBeTruthy();

		const completed = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 12,
				method: "tools/call",
				params: { name: "complete_onboarding_step", arguments: { stepId: "add_expense" } },
			},
			key,
		);
		const completedResult = completed.json?.result as ToolResult;
		expect(completedResult.isError).toBeUndefined();
		expect(completedResult.structuredContent?.method).toBe("agent");

		const status = await rpc(
			app,
			{ jsonrpc: "2.0", id: 13, method: "tools/call", params: { name: "get_onboarding_status", arguments: {} } },
			key,
		);
		const statusResult = status.json?.result as ToolResult;
		const expenseStep = (statusResult.structuredContent?.steps as Array<{ id: string; status: string }>).find(
			(step) => step.id === "add_expense",
		);
		expect(expenseStep?.status).toBe("done");
		expect(statusResult.structuredContent?.method).toBe("agent");
	});

	it("canonicalises the app's own catalog slugs and ค่า- labels on write (#173)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		// `packages/accounting/src/catalog.ts` stores infra/automation, and the
		// client's catalog autofill falls back to general: a bare enum would 400
		// the app's own saves. They must canonicalise, not reject.
		const cases: Array<[string, string]> = [
			["infra", "infrastructure"],
			["automation", "saas"],
			["general", "other"],
			["ค่าอาหาร", "food"],
			["ค่าเดินทาง", "transit"],
		];
		for (const [input, expected] of cases) {
			const added = await rpc(
				app,
				{
					jsonrpc: "2.0",
					id: 43,
					method: "tools/call",
					params: {
						name: "add_expense",
						arguments: { name: `Category ${input}`, category: input, amount: 1, startMonth: "2026-10" },
					},
				},
				key,
			);
			const result = added.json?.result as ToolResult;
			expect(result.isError).toBeUndefined();
			expect((result.structuredContent?.expense as { category: string }).category).toBe(expected);
		}
	});

	it("publishes the expense keys with Thai labels and totals by category (#173)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const list = await rpc(app, { jsonrpc: "2.0", id: 40, method: "tools/list" }, key);
		const tools = (list.json?.result as { tools: Array<{ name: string; description: string; inputSchema: { properties?: Record<string, { enum?: string[]; description?: string }> } }> }).tools;
		const addExpense = tools.find((tool) => tool.name === "add_expense");
		const category = addExpense?.inputSchema.properties?.category;
		expect(category?.enum).toHaveLength(16);
		expect(category?.enum).toContain("food");
		expect(category?.description ?? "").toContain("อาหาร");

		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 41,
				method: "tools/call",
				params: {
					name: "add_expense",
					arguments: { name: "ร้านอาหารตามสั่ง", category: "อาหาร", amount: 250, cycle: "one_time", startMonth: "2026-10" },
				},
			},
			key,
		);
		const addedResult = added.json?.result as ToolResult;
		expect(addedResult.isError).toBeUndefined();
		expect((addedResult.structuredContent?.expense as { category: string }).category).toBe("food");

		const flows = await rpc(
			app,
			{ jsonrpc: "2.0", id: 42, method: "tools/call", params: { name: "get_cash_flows", arguments: { month: "2026-10" } } },
			key,
		);
		const payload = (flows.json?.result as ToolResult).structuredContent as {
			items: Array<{ name: string; category?: string }>;
			totals: { spending: number };
			spendingByCategory: Array<{ category: string; spending: number; count: number; share: number }>;
		};
		expect(payload.items.find((item) => item.name === "ร้านอาหารตามสั่ง")?.category).toBe("food");
		expect(payload.spendingByCategory.find((bucket) => bucket.category === "food")).toMatchObject({
			spending: 250,
			count: 1,
			share: 1,
		});
		expect(payload.spendingByCategory.some((bucket) => bucket.category === "uncategorised")).toBe(true);
		expect(payload.spendingByCategory.reduce((sum, bucket) => sum + bucket.spending, 0)).toBe(
			payload.totals.spending,
		);
	});

/** A one-time receipt on the personal entity, through the MCP tool. */
	const addExpense = (key: string, app: Hono<ApiEnv>, args: Record<string, unknown>, id = 30) =>
		rpc(
			app,
			{ jsonrpc: "2.0", id, method: "tools/call", params: { name: "add_expense", arguments: args } },
			key,
		);

	const toolText = (result: ToolResult): string => result.content.map((part) => part.text).join(" ");

	it("books the three-field expense as a one-off on today, not the 1st (#202)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);
		const today = productDate();
		const thisMonth = productMonth();
		const nextMonth = shiftYearMonth(thisMonth, 1);

		// The exact call from #202: name, category and amount, nothing else.
		const added = await addExpense(key, app, { name: "Lunch", category: "food", amount: 250 }, 49);
		const addedResult = added.json?.result as ToolResult;
		expect(addedResult.isError).toBeUndefined();
		const expense = addedResult.structuredContent?.expense as {
			id: string;
			cycle: string;
			startMonth: string;
			dayOfMonth?: number;
		};
		expect(expense.cycle).toBe("one_time");
		expect(expense.startMonth).toBe(thisMonth);
		expect(expense.dayOfMonth).toBe(Number(today.slice(8, 10)));

		const flows = async (month: string) => {
			const read = await rpc(
				app,
				{ jsonrpc: "2.0", id: 50, method: "tools/call", params: { name: "get_cash_flows", arguments: { month } } },
				key,
			);
			return (read.json?.result as ToolResult).structuredContent as {
				items: Array<{ sourceId: string; date: string }>;
			};
		};

		// Dated today in this month's flows, and absent the next month: one
		// receipt, not a monthly charge the user never asked for.
		expect((await flows(thisMonth)).items.find((item) => item.sourceId === expense.id)?.date).toBe(today);
		expect((await flows(nextMonth)).items.some((item) => item.sourceId === expense.id)).toBe(false);
	});

	it("names the ฿0 bootstrap wallet and flags it as unfunded, without blocking the write (#174)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		// A fresh account's wallet is ฿0 (ensureBootstrap). This is the normal
		// first-week receipt: it must be written, and the unfunded wallet named.
		const added = await addExpense(key, app, {
			name: "ร้านอาหารตามสั่ง",
			category: "food",
			amount: 250,
			cycle: "one_time",
			asOf: "2026-10-26",
		});
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.expense as { amount: number }).amount).toBe(250);
		expect(result.structuredContent?.paidFrom).toEqual({
			assetId: expect.any(String),
			name: "Personal Main Wallet",
			isDefault: true,
		});
		// Both codes, never deduped: the ฿0 wallet was unfunded and the month ends
		// at −250. One envelope, different scopes (#174, Ada 15:43).
		expect(result.structuredContent?.warnings).toEqual([
			{ code: "cash_negative", month: "2026-10", treasuryAfter: -250 },
			{ code: "funding_wallet_zero_balance", month: "2026-10", assetId: expect.any(String), treasuryAfter: -250 },
		]);
		expect(result.structuredContent?.treasuryAfter).toBe(-250);

		// The model is unchanged: the ฿0 wallet really does carry the -250.
		const ledgerRes = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 31,
				method: "tools/call",
				params: { name: "get_monthly_ledger", arguments: { yearMonth: "2026-10" } },
			},
			key,
		);
		const ledger = (ledgerRes.json?.result as ToolResult).structuredContent?.ledger as {
			summary: { endingTreasury: number; startingTreasury: number; totalInflow: number };
		};
		expect(ledger.summary.endingTreasury).toBe(-250);
		// An unstated ฿0 opening is unknown, not dead (#174 deliverable 3).
		expect((ledgerRes.json?.result as ToolResult).structuredContent?.treasuryStatus).toBe("unknown");

		const summaryRes = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 32,
				method: "tools/call",
				params: { name: "get_financial_summary", arguments: { month: "2026-10" } },
			},
			key,
		);
		expect((summaryRes.json?.result as ToolResult).structuredContent?.treasuryStatus).toBe("unknown");
	});

	it("names a funded wallet, warns nothing and asserts no unknown treasury (#174)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const wallet = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 33,
				method: "tools/call",
				params: {
					name: "add_asset",
					arguments: {
						kind: "cash",
						name: "Funded Wallet",
						category: "cash",
						balance: 5000,
						balanceAsOf: "2026-10",
						isDefault: true,
					},
				},
			},
			key,
		);
		expect((wallet.json?.result as ToolResult).isError).toBeUndefined();

		const added = await addExpense(key, app, {
			name: "Coffee",
			category: "food",
			amount: 250,
			startMonth: "2026-10",
		});
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.paidFrom as { name: string }).name).toBe("Funded Wallet");
		expect(result.structuredContent?.warnings).toEqual([]);
		expect(result.structuredContent?.treasuryAfter).toBe(4750);
		expect(result.structuredContent?.treasuryStatus).toBeUndefined();

		const summaryRes = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 34,
				method: "tools/call",
				params: { name: "get_financial_summary", arguments: { month: "2026-10" } },
			},
			key,
		);
		expect((summaryRes.json?.result as ToolResult).structuredContent?.treasuryStatus).toBeUndefined();
	});

	it("rejects an unfunded expense when deleteAsset removed the only wallet (#174)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		// Bootstrap the personal entity and its wallet through the read route.
		const assetsRes = await app.request("/api/v1/accounting/assets", {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(assetsRes.status).toBe(200);
		const assets = (await assetsRes.json()) as Array<{ id: string; kind: string }>;
		const wallet = assets.find((asset) => asset.kind === "cash");
		expect(wallet).toBeDefined();
		const deleted = await app.request(`/api/v1/accounting/assets/${wallet?.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(deleted.status).toBe(200);

		const added = await addExpense(key, app, { name: "Lunch", category: "food", amount: 250, asOf: "2026-10-26" });
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBe(true);
		expect(toolText(result)).toContain("add_asset");
		expect(toolText(result)).toContain('kind: "cash"');

		// Nothing was written.
		const expensesRes = await app.request("/api/v1/accounting/expenses", {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(expensesRes.status).toBe(200);
		expect((await expensesRes.json()) as Array<unknown>).toHaveLength(0);
	});

	it("rejects a non-cash paidFromAssetId and accepts a card-paid expense without a warning (#174)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const fixed = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 35,
				method: "tools/call",
				params: {
					name: "add_asset",
					arguments: {
						kind: "fixed",
						name: "Camera",
						category: "gear",
						cost: 1000,
						acquiredOn: "2026-10-01",
						usefulLifeMonths: 24,
					},
				},
			},
			key,
		);
		const fixedId = ((fixed.json?.result as ToolResult).structuredContent?.asset as { id: string }).id;
		const refused = await addExpense(key, app, {
			name: "Lens",
			category: "food",
			amount: 100,
			paidFromAssetId: fixedId,
		});
		const refusedResult = refused.json?.result as ToolResult;
		expect(refusedResult.isError).toBe(true);
		expect(toolText(refusedResult)).toContain("must be a cash asset");

		const card = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 36,
				method: "tools/call",
				params: {
					name: "add_liability",
					arguments: {
						kind: "revolving",
						name: "Credit Card",
						category: "credit_card",
						amount: 0,
						revolving: { creditLimit: 10000, balance: 0, balanceAsOf: "2026-10" },
					},
				},
			},
			key,
		);
		const cardId = ((card.json?.result as ToolResult).structuredContent?.liability as { id: string }).id;
		const charged = await addExpense(key, app, {
			name: "Subscription",
			category: "saas",
			amount: 199,
			paidFromLiabilityId: cardId,
			startMonth: "2026-10",
		});
		const chargedResult = charged.json?.result as ToolResult;
		expect(chargedResult.isError).toBeUndefined();
		expect(chargedResult.structuredContent?.warnings).toEqual([]);
		expect(chargedResult.structuredContent?.paidFrom).toBeNull();
	});

	it("keeps the two warning scopes separate instead of deduping them (#174)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		// A ฿0 default wallet drawn to −50, with ฿1,000 in another wallet: the
		// month still ends positive, so only the wallet is unfunded.
		const spare = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 37,
				method: "tools/call",
				params: {
					name: "add_asset",
					arguments: { kind: "cash", name: "Spare Wallet", category: "cash", balance: 1000, balanceAsOf: "2026-10" },
				},
			},
			key,
		);
		expect((spare.json?.result as ToolResult).isError).toBeUndefined();

		const zeroOnly = await addExpense(key, app, { name: "Tram fare", category: "transit", amount: 50, startMonth: "2026-10" });
		const zeroOnlyResult = zeroOnly.json?.result as ToolResult;
		expect(zeroOnlyResult.isError).toBeUndefined();
		expect((zeroOnlyResult.structuredContent?.paidFrom as { name: string }).name).toBe("Personal Main Wallet");
		expect(zeroOnlyResult.structuredContent?.treasuryAfter).toBe(950);
		expect(zeroOnlyResult.structuredContent?.warnings).toEqual([
			{ code: "funding_wallet_zero_balance", month: "2026-10", assetId: expect.any(String), treasuryAfter: 950 },
		]);

		// A funded ฿100 wallet drawn to −50: the wallet was funded, so only the
		// month goes negative.
		const thinApp = configuredApp();
		const thinSession = await signIn(thinApp);
		const thinKey = await mintKey(thinApp, thinSession.token);
		const thin = await rpc(
			thinApp,
			{
				jsonrpc: "2.0",
				id: 38,
				method: "tools/call",
				params: {
					name: "add_asset",
					arguments: {
						kind: "cash",
						name: "Thin Wallet",
						category: "cash",
						balance: 100,
						balanceAsOf: "2026-10",
						isDefault: true,
					},
				},
			},
			thinKey,
		);
		expect((thin.json?.result as ToolResult).isError).toBeUndefined();

		const negativeOnly = await addExpense(
			thinKey,
			thinApp,
			{ name: "Dinner", category: "food", amount: 150, startMonth: "2026-10" },
			39,
		);
		const negativeOnlyResult = negativeOnly.json?.result as ToolResult;
		expect(negativeOnlyResult.isError).toBeUndefined();
		expect((negativeOnlyResult.structuredContent?.paidFrom as { name: string }).name).toBe("Thin Wallet");
		expect(negativeOnlyResult.structuredContent?.treasuryAfter).toBe(-50);
		expect(negativeOnlyResult.structuredContent?.warnings).toEqual([
			{ code: "cash_negative", month: "2026-10", treasuryAfter: -50 },
		]);
	});

	it("stores the catalog image on a created expense", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 30,
				method: "tools/call",
				params: {
					name: "add_expense",
					arguments: { name: "Figma Professional", category: "saas", amount: 450, cycle: "monthly" },
				},
			},
			key,
		);
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.expense as { imageUrl?: string }).imageUrl).toBe(FIGMA.imageUrl);
	});

	it("stores no image for an unmatched expense name", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 31,
				method: "tools/call",
				params: {
					name: "add_expense",
					arguments: { name: "My Corner Shop", category: "other", amount: 100 },
				},
			},
			key,
		);
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.expense as { imageUrl?: string }).imageUrl).toBeUndefined();
	});

	it("ignores an imageUrl sent by the agent", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const sent = "https://example.com/agent-picked.png";
		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 32,
				method: "tools/call",
				params: {
					name: "add_expense",
					arguments: { name: "Figma Professional", category: "saas", amount: 450, imageUrl: sent },
				},
			},
			key,
		);
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		const imageUrl = (result.structuredContent?.expense as { imageUrl?: string }).imageUrl;
		expect(imageUrl).toBe(FIGMA.imageUrl);
		expect(imageUrl).not.toBe(sent);
	});

	it("stores the career cover image on employment income", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 33,
				method: "tools/call",
				params: {
					name: "add_income",
					arguments: { kind: "employment", name: "Agoda", category: "career", amount: 120000 },
				},
			},
			key,
		);
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.income as { imageUrl?: string }).imageUrl).toBe(AGODA.coverImageUrl);
	});

	it("uses the employer for the career cover image on employment income", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 35,
				method: "tools/call",
				params: {
					name: "add_income",
					arguments: {
						kind: "employment",
						name: "Monthly Salary",
						category: "salary",
						amount: 120000,
						employment: { employer: AGODA.name },
					},
				},
			},
			key,
		);
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.income as { imageUrl?: string }).imageUrl).toBe(AGODA.coverImageUrl);
	});

	it("stores no image on a created business, even when the agent sends one", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const created = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 36,
				method: "tools/call",
				params: {
					name: "create_business",
					arguments: { name: "Corner Shop", imageUrl: "https://example.com/agent-picked.png" },
				},
			},
			key,
		);
		const result = created.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.entity as { imageUrl?: string }).imageUrl).toBeUndefined();
	});

	it("stores the catalog image on a created fixed asset", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 37,
				method: "tools/call",
				params: {
					name: "add_asset",
					arguments: {
						kind: "fixed",
						name: MACBOOK.name,
						category: "workstation",
						cost: 89900,
						acquiredOn: "2026-01-01",
						usefulLifeMonths: 36,
					},
				},
			},
			key,
		);
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.asset as { imageUrl?: string }).imageUrl).toBe(MACBOOK.imageUrl);
	});

	it("stores the catalog image on a created liability", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 38,
				method: "tools/call",
				params: {
					name: "add_liability",
					arguments: {
						kind: "loan",
						name: CAR_LOAN.name,
						category: "car_loan",
						loan: { principal: 500000, termMonths: 60, originatedOn: "2026-01-01" },
					},
				},
			},
			key,
		);
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.liability as { imageUrl?: string }).imageUrl).toBe(CAR_LOAN.imageUrl);
	});

	it("stores no image for an unmatched liability name", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const added = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 39,
				method: "tools/call",
				params: {
					name: "add_liability",
					arguments: {
						kind: "loan",
						name: "Personal loan from friend",
						category: "personal",
						loan: { principal: 10000, termMonths: 12, originatedOn: "2026-01-01" },
					},
				},
			},
			key,
		);
		const result = added.json?.result as ToolResult;
		expect(result.isError).toBeUndefined();
		expect((result.structuredContent?.liability as { imageUrl?: string }).imageUrl).toBeUndefined();
	});

	it("publishes a callable input schema for every tool that takes arguments (#201)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const list = await rpc(app, { jsonrpc: "2.0", id: 43, method: "tools/list" }, key);
		const tools = (
			list.json?.result as {
				tools: Array<{
					name: string;
					inputSchema: { properties?: Record<string, { enum?: string[] }>; required?: string[] };
				}>;
			}
		).tools;

		// A zero-argument tool is a deliberate, named exception. A new tool that
		// forgets its schema fails this list instead of publishing `properties: {}`.
		const noArguments = ["whoami", "get_onboarding_status", "list_entities", "list_transfers"];
		for (const tool of tools) {
			const properties = Object.keys(tool.inputSchema.properties ?? {});
			if (noArguments.includes(tool.name)) {
				expect(properties, tool.name).toEqual([]);
				continue;
			}
			expect(properties.length, `${tool.name} publishes no input fields`).toBeGreaterThan(0);
		}

		// The three union bodies are flattened from the REST schemas, so every
		// field a variant validates has to be visible to the client.
		const variants: Array<[string, readonly { shape: Record<string, unknown> }[]]> = [
			["add_asset", CreateAssetBody.options],
			["add_income", CreateIncomeBody.options],
			["add_liability", CreateLiabilityBody.options],
		];
		for (const [name, options] of variants) {
			const tool = tools.find((entry) => entry.name === name);
			expect(tool, name).toBeDefined();
			const published = Object.keys(tool!.inputSchema.properties ?? {});
			for (const option of options) {
				for (const field of Object.keys(option.shape)) {
					if (field === "imageUrl") continue;
					expect(published, `${name} hides ${field}`).toContain(field);
				}
			}
			expect(tool!.inputSchema.properties?.kind?.enum?.length, `${name} publishes the kind enum`).toBeGreaterThan(1);
			expect(tool!.inputSchema.required ?? [], `${name} publishes no required list`).toEqual(
				expect.arrayContaining(["kind", "name"]),
			);
		}
	});

	it("still rejects a wrong field type after the union is flattened (#201)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const wrong = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 44,
				method: "tools/call",
				params: {
					name: "add_asset",
					arguments: { kind: "cash", name: "Wrong type wallet", category: "cash", balance: "not-a-number" },
				},
			},
			key,
		);
		expect((wrong.json?.result as ToolResult).isError).toBe(true);

		// The published object is wider than the union; the handler's parseBody is
		// what still enforces the real branch, so a rejected call writes nothing.
		const stored = await app.request("/api/v1/accounting/assets", { headers: { Authorization: `Bearer ${token}` } });
		const assets = (await stored.json()) as Array<{ name: string }>;
		expect(assets.some((item) => item.name === "Wrong type wallet")).toBe(false);
	});

	it("hides imageUrl from the create tool inputs", async () => {		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const list = await rpc(app, { jsonrpc: "2.0", id: 34, method: "tools/list" }, key);
		const tools = (list.json?.result as { tools: Array<{ name: string; description: string; inputSchema: unknown }> })
			.tools;
		const createTools = tools.filter((tool) =>
			["create_business", "add_asset", "add_liability", "add_income", "add_expense"].includes(tool.name),
		);
		expect(createTools).toHaveLength(5);
		expect(JSON.stringify(createTools.map((tool) => tool.inputSchema))).not.toContain("imageUrl");
		expect(createTools.every((tool) => tool.description.includes("The image is picked automatically."))).toBe(true);
	});

	it("denies a tool whose scope the key lacks", async () => {
		const app = configuredApp();
		const { userId } = await signIn(app);

		const auth = await getTokensAuth(`${BASE_URL}/mcp`);
		const limited = await apiKeyApi(auth!).createApiKey({
			body: {
				userId,
				expiresIn: 24 * 60 * 60,
				permissions: { onboarding: ["read"] },
				metadata: { purpose: "agent", agentId: "limited" },
			},
		});

		const allowed = await rpc(
			app,
			{ jsonrpc: "2.0", id: 20, method: "tools/call", params: { name: "get_onboarding_status", arguments: {} } },
			limited.key,
		);
		expect((allowed.json?.result as ToolResult).isError).toBeUndefined();

		const denied = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 21,
				method: "tools/call",
				params: { name: "add_expense", arguments: { name: "Spotify", category: "entertainment", amount: 150 } },
			},
			limited.key,
		);
		const deniedResult = denied.json?.result as ToolResult;
		expect(deniedResult.isError).toBe(true);
		expect(deniedResult.content[0]?.text).toContain("accounting:write");
	});

	it("grants exactly the requested scope: a read-only key lists it and is refused a write (#161)", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);

		const minted = await app.request("/api/v1/agent-keys", {
			method: "POST",
			headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
			body: JSON.stringify({ agentId: "read-only-agent", scopes: ["accounting:read"] }),
		});
		expect(minted.status).toBe(201);
		const created = (await minted.json()) as { key: string; scopes: string[] };
		// The mint receipt states the grant instead of implying it.
		expect(created.scopes).toEqual(["accounting:read"]);

		const listed = await app.request("/api/v1/agent-keys", {
			headers: { Authorization: `Bearer ${token}` },
		});
		const keys = (await listed.json()) as { keys: Array<{ scopes: string[] }> };
		expect(keys.keys).toHaveLength(1);
		expect(keys.keys[0]?.scopes).toEqual(["accounting:read"]);

		// The read half is allowed...
		const read = await rpc(
			app,
			{ jsonrpc: "2.0", id: 40, method: "tools/call", params: { name: "get_cash_flows", arguments: {} } },
			created.key,
		);
		expect((read.json?.result as ToolResult).isError).toBeUndefined();

		// ...and the write half is refused by the stored grant, not by the request.
		const write = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 41,
				method: "tools/call",
				params: { name: "add_expense", arguments: { name: "Spotify", category: "entertainment", amount: 150 } },
			},
			created.key,
		);
		const writeResult = write.json?.result as ToolResult;
		expect(writeResult.isError).toBe(true);
		expect(writeResult.content[0]?.text).toContain("accounting:write");

		// The credential can be asked what it is before it writes: the tool
		// scopes, not the request vocabulary, because that is what gates a call.
		const who = await rpc(
			app,
			{ jsonrpc: "2.0", id: 42, method: "tools/call", params: { name: "whoami", arguments: {} } },
			created.key,
		);
		const whoResult = who.json?.result as ToolResult;
		expect(whoResult.isError).toBeUndefined();
		expect(whoResult.structuredContent).toMatchObject({
			via: "apiKey",
			scopes: ["accounting:read"],
		});
		expect(typeof (whoResult.structuredContent as { userId?: unknown }).userId).toBe("string");
	});

	it("rejects a revoked key", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);

		const created = await app.request("/api/v1/agent-keys", {
			method: "POST",
			headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
			body: JSON.stringify({ agentId: "cursor" }),
		});
		const key = (await created.json()) as { id: string; key: string };

		const before = await rpc(app, initialize(), key.key);
		expect(before.status).toBe(200);

		const revoked = await app.request(`/api/v1/agent-keys/${key.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(revoked.status).toBe(200);

		const after = await rpc(app, initialize(), key.key);
		expect(after.status).toBe(401);
	});

	it("round-trips the onboarding method through the REST store", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const headers = { "content-type": "application/json", Authorization: `Bearer ${token}` };

		const set = await app.request("/api/v1/onboarding", {
			method: "PUT",
			headers,
			body: JSON.stringify({ method: "manual" }),
		});
		expect(set.status).toBe(200);
		const setData = (await set.json()) as { data: { method: string | null } };
		expect(setData.data.method).toBe("manual");

		const read = await app.request("/api/v1/onboarding", { headers: { Authorization: `Bearer ${token}` } });
		const readData = (await read.json()) as { method: string | null };
		expect(readData.method).toBe("manual");

		const clear = await app.request("/api/v1/onboarding", {
			method: "PUT",
			headers,
			body: JSON.stringify({ method: null }),
		});
		const clearData = (await clear.json()) as { data: { method: string | null } };
		expect(clearData.data.method).toBeNull();
	});
	it("exercises accounting tools: cash flows, transfers, ledger and projection", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		// Add an income
		await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 40,
				method: "tools/call",
				params: {
					name: "add_income",
					arguments: { kind: "employment", name: "Agoda Salary", category: "salary", amount: 150000 },
				},
			},
			key,
		);

		// Add a liability to pay down
		const liab = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 41,
				method: "tools/call",
				params: {
					name: "add_liability",
					arguments: {
						kind: "loan",
						name: "Car Loan",
						category: "car_loan",
						loan: { principal: 400000, termMonths: 48, originatedOn: "2026-01-01" },
					},
				},
			},
			key,
		);
		const liabResult = liab.json?.result as ToolResult;
		const liabilityId = (liabResult.structuredContent?.liability as { id: string }).id;

		// 1. get_cash_flows
		const cf = await rpc(
			app,
			{ jsonrpc: "2.0", id: 42, method: "tools/call", params: { name: "get_cash_flows", arguments: {} } },
			key,
		);
		expect(cf.status).toBe(200);
		const cfRes = cf.json?.result as ToolResult;
		expect(cfRes.isError).toBeUndefined();
		expect(cfRes.structuredContent?.cashFlows).toBeDefined();

		// 2. create_transfer (debt paydown)
		const tr = await rpc(
			app,
			{
				jsonrpc: "2.0",
				id: 43,
				method: "tools/call",
				params: {
					name: "create_transfer",
					arguments: {
						amount: 12000,
						toLiabilityId: liabilityId,
						note: "October installment",
					},
				},
			},
			key,
		);
		expect(tr.status).toBe(200);
		const trRes = tr.json?.result as ToolResult;
		expect(trRes.isError).toBeUndefined();
		expect((trRes.structuredContent?.transfer as { amount: number }).amount).toBe(12000);

		// 3. list_transfers
		const lt = await rpc(
			app,
			{ jsonrpc: "2.0", id: 44, method: "tools/call", params: { name: "list_transfers", arguments: {} } },
			key,
		);
		expect(lt.status).toBe(200);
		const ltRes = lt.json?.result as ToolResult;
		expect(ltRes.isError).toBeUndefined();
		expect((ltRes.structuredContent?.transfers as Array<unknown>).length).toBe(1);

		// 4. get_monthly_ledger
		const ledger = await rpc(
			app,
			{ jsonrpc: "2.0", id: 45, method: "tools/call", params: { name: "get_monthly_ledger", arguments: {} } },
			key,
		);
		expect(ledger.status).toBe(200);
		const ledgerRes = ledger.json?.result as ToolResult;
		expect(ledgerRes.isError).toBeUndefined();
		expect(ledgerRes.structuredContent?.ledger).toBeDefined();

		// 5. get_treasury_projection
		const proj = await rpc(
			app,
			{ jsonrpc: "2.0", id: 46, method: "tools/call", params: { name: "get_treasury_projection", arguments: {} } },
			key,
		);
		expect(proj.status).toBe(200);
		const projRes = proj.json?.result as ToolResult;
		expect(projRes.isError).toBeUndefined();
		expect(projRes.structuredContent?.projection).toBeDefined();
	});

	it("describes the optional id as the retry key on every create body (#143)", () => {
		// All six creates accept the client id; the three discriminated unions
		// carry one copy per variant, so the count is 1 + 1 + 1 + 3 + 4 + 3.
		const bodies: Array<{ shape: Record<string, unknown> }> = [
			CreateEntityBody,
			CreateExpenseBody,
			CreateTransferBody,
		];
		for (const body of [CreateAssetBody, CreateIncomeBody, CreateLiabilityBody]) {
			bodies.push(...body.options);
		}
		expect(bodies).toHaveLength(13);
		for (const body of bodies) {
			const id = body.shape.id as { description?: string } | undefined;
			expect(id?.description).toContain("deduplicated: true");
		}
	});

	it("treats a retried create with the same id as a no-op on every write (#143)", async () => {
		const app = configuredApp();
		const { userId } = await signIn(app);
		// 1 + 6 x 2 + 1 requests: mint an explicit 500-call budget so this test
		// does not depend on the default AGENT_KEY_RATE_LIMIT, which #140 covers
		// separately.
		const auth = await getTokensAuth(`${BASE_URL}/mcp`);
		const minted = await apiKeyApi(auth!).createApiKey({
			body: {
				userId,
				expiresIn: 24 * 60 * 60,
				permissions: { onboarding: ["read", "write"], accounting: ["read", "write"] },
				rateLimitMax: 500,
				rateLimitTimeWindow: 60 * 60 * 1000,
			},
		});
		const key = minted.key;

		const call = async (name: string, args: Record<string, unknown>, id = 61) => {
			const res = await rpc(app, { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }, key);
			expect(res.status).toBe(200);
			return res.json?.result as ToolResult;
		};

		const entryCounts = async () => {
			const status = await call("get_onboarding_status", {}, 62);
			const steps = status.structuredContent?.steps as Array<{ id: string; entryCount: number }>;
			return Object.fromEntries(steps.map((step) => [step.id, step.entryCount]));
		};
		const before = await entryCounts();

		const replay = async (name: string, field: string, args: Record<string, unknown>): Promise<void> => {
			const first = await call(name, args);
			expect(first.isError).toBeUndefined();
			const firstRecord = first.structuredContent?.[field] as { id: string; version: number };
			expect(firstRecord.id).toBe(args.id);

			const second = await call(name, args);
			expect(second.isError).toBeUndefined();
			expect(second.structuredContent?.deduplicated).toBe(true);
			const secondRecord = second.structuredContent?.[field] as { id: string; version: number };
			expect(secondRecord.id).toBe(args.id);
			// The stored record, not a write: same version the first call created.
			expect(secondRecord.version).toBe(firstRecord.version);
		};

		const liabilityId = randomUUID();
		await replay("add_liability", "liability", {
			id: liabilityId,
			kind: "loan",
			name: "Car Loan",
			category: "car_loan",
			loan: { principal: 400000, termMonths: 48, originatedOn: "2026-01-01" },
		});
		await replay("add_expense", "expense", {
			id: randomUUID(),
			name: "Netflix",
			category: "entertainment",
			amount: 420,
			cycle: "monthly",
		});
		await replay("add_income", "income", {
			id: randomUUID(),
			kind: "employment",
			name: "Agoda Salary",
			category: "salary",
			amount: 150000,
		});
		await replay("add_asset", "asset", {
			id: randomUUID(),
			kind: "cash",
			name: "Travel Wallet",
			category: "cash",
			balance: 5000,
		});
		await replay("create_business", "entity", { id: randomUUID(), name: "Corner Shop" });
		await replay("create_transfer", "transfer", {
			id: randomUUID(),
			amount: 12000,
			toLiabilityId: liabilityId,
			note: "October installment",
		});

		// One record per write despite two calls: the retry created nothing.
		const after = await entryCounts();
		expect((after.add_liability ?? 0) - (before.add_liability ?? 0)).toBe(1);
		expect((after.add_expense ?? 0) - (before.add_expense ?? 0)).toBe(1);
		expect((after.add_income ?? 0) - (before.add_income ?? 0)).toBe(1);
		expect((after.assets_wallet ?? 0) - (before.assets_wallet ?? 0)).toBe(1);
		expect((after.add_business ?? 0) - (before.add_business ?? 0)).toBe(1);

		const transfers = await call("list_transfers", {}, 63);
		expect((transfers.structuredContent?.transfers as Array<unknown>).length).toBe(1);
	});
});
