import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apiKeyApi } from "@excited-live/auth";
import { afterEach, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../../app";
import { DB_FILE_ENV, resetDbCache } from "../../db";
import { getTokensAuth, resetTokensAuthCache } from "../../lib/auth";
import type { ApiEnv } from "../../lib/env";

/**
 * /mcp round-trips. The transport is stateless and JSON-only, so each POST is
 * independent: initialize, tools/list and tools/call are separate requests.
 */

const SECRET = "test-secret-for-mcp-tests";
const BASE_URL = "http://localhost:8787";
const EMAIL = "mcp@excited.live";
const PASSWORD = "correct-horse-battery";

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

async function mintKey(app: Hono<ApiEnv>, token: string, agentId = "claude-code"): Promise<string> {
	const res = await app.request("/api/v1/agent-keys", {
		method: "POST",
		headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify({ agentId }),
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
	it("answers 401 with the protected-resource challenge when no key is sent", async () => {
		const app = configuredApp();
		const res = await rpc(app, initialize());
		expect(res.status).toBe(401);
		expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
		expect(res.headers.get("www-authenticate")).toContain("/.well-known/oauth-protected-resource");
	});

	it("initializes, lists tools and calls get_onboarding_status with a minted key", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const key = await mintKey(app, token);

		const init = await rpc(app, initialize(), key);
		expect(init.status).toBe(200);
		const initResult = init.json?.result as { serverInfo: { name: string }; instructions?: string };
		expect(initResult.serverInfo.name).toBe("excited-live");
		expect(initResult.instructions).toContain("excited.live");

		const list = await rpc(app, { jsonrpc: "2.0", id: 2, method: "tools/list" }, key);
		expect(list.status).toBe(200);
		const tools = (list.json?.result as { tools: Array<{ name: string }> }).tools.map((tool) => tool.name);
		expect(tools).toEqual(
			expect.arrayContaining([
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
					arguments: { name: "Netflix", category: "subscription", amount: 420, cycle: "monthly" },
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
				params: { name: "add_expense", arguments: { name: "Spotify", category: "subscription", amount: 150 } },
			},
			limited.key,
		);
		const deniedResult = denied.json?.result as ToolResult;
		expect(deniedResult.isError).toBe(true);
		expect(deniedResult.content[0]?.text).toContain("accounting:write");
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
});
