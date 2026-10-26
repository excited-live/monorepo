import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { apiKeyApi } from "@excited-live/auth";
import { createApp } from "../app";
import { DB_FILE_ENV, resetDbCache } from "../db";
import { getTokensAuth, resetTokensAuthCache } from "../lib/auth";
import type { ApiEnv } from "../lib/env";

/**
 * /api/v1/agent-keys: server-side key minting with fixed scopes, listing
 * without secrets, revocation, and ownership isolation between users.
 */

const SECRET = "test-secret-for-agent-key-tests";
const BASE_URL = "http://localhost:8787";
const A_EMAIL = "agent-a@excited.live";
const B_EMAIL = "agent-b@excited.live";
const PASSWORD = "correct-horse-battery";

const tempDirs: string[] = [];

function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-agent-keys-"));
	tempDirs.push(dir);
	return join(dir, "api-agent-keys.sqlite");
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

async function signIn(app: Hono<ApiEnv>, email: string): Promise<{ token: string; userId: string }> {
	await app.request("/api/v1/auth/sign-up/email", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ name: "Agent Test", email, password: PASSWORD }),
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

const authHeaders = (token: string) => ({ "content-type": "application/json", Authorization: `Bearer ${token}` });

/** The stored rows behind the list endpoint, so a test can assert the grant itself. */
async function storedKeys(token: string) {
	const auth = await getTokensAuth(`${BASE_URL}/api/v1/agent-keys`);
	expect(auth).toBeTruthy();
	const { apiKeys } = await apiKeyApi(auth!).listApiKeys({
		headers: new Headers({ Authorization: `Bearer ${token}` }),
	});
	return apiKeys;
}

describe("api/v1/agent-keys", () => {
	it("mints a key, lists it without the secret, and revokes it", async () => {
		const app = configuredApp();
		const { token } = await signIn(app, A_EMAIL);

		const created = await app.request("/api/v1/agent-keys", {
			method: "POST",
			headers: authHeaders(token),
			body: JSON.stringify({ agentId: "claude-code" }),
		});
		expect(created.status).toBe(201);
		const key = (await created.json()) as {
			id: string;
			key: string;
			name: string | null;
			start: string | null;
			expiresAt: string | null;
			scopes: string[];
		};
		expect(key.key.startsWith("elk_")).toBe(true);
		expect(key.start).toBeTruthy();
		expect(key.expiresAt).toBeTruthy();
		// No scope requested: the full grant every pre-#161 key has, in the PRM's words.
		expect(key.scopes).toEqual(["onboarding", "accounting:read", "accounting:write"]);

		const list = await app.request("/api/v1/agent-keys", { headers: authHeaders(token) });
		expect(list.status).toBe(200);
		const listed = (await list.json()) as {
			keys: Array<{
				id: string;
				agentId: string | null;
				createdAt: string;
				lastRequest: string | null;
				scopes: string[];
			}>;
		};
		expect(listed.keys).toHaveLength(1);
		expect(listed.keys[0]?.id).toBe(key.id);
		expect(listed.keys[0]?.agentId).toBe("claude-code");
		expect(listed.keys[0]?.createdAt).toBeTruthy();
		expect(listed.keys[0]?.scopes).toEqual(["onboarding", "accounting:read", "accounting:write"]);
		expect(JSON.stringify(listed)).not.toContain(key.key);

		const revoked = await app.request(`/api/v1/agent-keys/${key.id}`, {
			method: "DELETE",
			headers: authHeaders(token),
		});
		expect(revoked.status).toBe(200);

		const after = await app.request("/api/v1/agent-keys", { headers: authHeaders(token) });
		const afterData = (await after.json()) as { keys: unknown[] };
		expect(afterData.keys).toHaveLength(0);
	});

	it("honours a requested grant exactly, with no implication between tokens", async () => {
		const app = configuredApp();
		const { token } = await signIn(app, A_EMAIL);

		const mint = (agentId: string, scopes: string[]) =>
			app.request("/api/v1/agent-keys", {
				method: "POST",
				headers: authHeaders(token),
				body: JSON.stringify({ agentId, scopes }),
			});

		const readOnly = await mint("read-only", ["accounting:read"]);
		expect(readOnly.status).toBe(201);
		expect(((await readOnly.json()) as { scopes: string[] }).scopes).toEqual(["accounting:read"]);

		// The umbrella covers onboarding only; it does not leak into accounting.
		const onboarding = await mint("onboarding", ["onboarding"]);
		expect(onboarding.status).toBe(201);
		expect(((await onboarding.json()) as { scopes: string[] }).scopes).toEqual(["onboarding"]);

		// A write token does not silently imply its read half.
		const writeOnly = await mint("write-only", ["accounting:write"]);
		expect(writeOnly.status).toBe(201);
		expect(((await writeOnly.json()) as { scopes: string[] }).scopes).toEqual(["accounting:write"]);

		// Order comes from the policy, not the request, and the list is the
		// grant the tools enforce.
		const listed = await app.request("/api/v1/agent-keys", { headers: authHeaders(token) });
		const listedScopes = Object.fromEntries(
			((await listed.json()) as { keys: Array<{ agentId: string | null; scopes: string[] }> }).keys.map((key) => [
				key.agentId,
				key.scopes,
			]),
		);
		expect(listedScopes).toEqual({
			onboarding: ["onboarding"],
			"read-only": ["accounting:read"],
			"write-only": ["accounting:write"],
		});
	});

	it("rejects an unknown scope with invalid_scope and the supported list", async () => {
		const app = configuredApp();
		const { token } = await signIn(app, A_EMAIL);

		const res = await app.request("/api/v1/agent-keys", {
			method: "POST",
			headers: authHeaders(token),
			body: JSON.stringify({ agentId: "typo", scopes: ["accounting:read", "bogus"] }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string; code: string; supported: string[] };
		expect(body.code).toBe("invalid_scope");
		expect(body.supported).toEqual(["onboarding", "accounting:read", "accounting:write"]);
		expect(body.error).toContain('"bogus"');

		// Nothing was minted.
		const list = await app.request("/api/v1/agent-keys", { headers: authHeaders(token) });
		expect(((await list.json()) as { keys: unknown[] }).keys).toHaveLength(0);
	});

	it("rejects the plugin-shaped permissions field instead of aliasing it", async () => {
		const app = configuredApp();
		const { token } = await signIn(app, A_EMAIL);

		const res = await app.request("/api/v1/agent-keys", {
			method: "POST",
			headers: authHeaders(token),
			body: JSON.stringify({ agentId: "plugin-shape", permissions: { accounting: ["read"] } }),
		});
		expect(res.status).toBe(400);
		expect(((await res.json()) as { error: string }).error).toContain('"permissions"');
	});

	it("stores today's permissions when scopes are omitted", async () => {
		const app = configuredApp();
		const { token } = await signIn(app, A_EMAIL);

		const created = await app.request("/api/v1/agent-keys", {
			method: "POST",
			headers: authHeaders(token),
			body: JSON.stringify({ agentId: "default-grant" }),
		});
		expect(created.status).toBe(201);

		// Assert the stored row, not only the receipt: #58/#31 onboarding agents
		// depend on the write half of an omitted request.
		const keys = await storedKeys(token);
		expect(keys).toHaveLength(1);
		expect(keys[0]?.permissions).toEqual({
			onboarding: ["read", "write"],
			accounting: ["read", "write"],
		});
	});

	it("reports the full grant for a key minted before this change", async () => {
		const app = configuredApp();
		const { token, userId } = await signIn(app, A_EMAIL);

		// A pre-#161 key: created straight through the plugin with the fixed set.
		const auth = await getTokensAuth(`${BASE_URL}/api/v1/agent-keys`);
		expect(auth).toBeTruthy();
		await apiKeyApi(auth!).createApiKey({
			body: {
				userId,
				name: "legacy key",
				expiresIn: 86_400,
				permissions: { onboarding: ["read", "write"], accounting: ["read", "write"] },
			},
		});

		const listed = await app.request("/api/v1/agent-keys", { headers: authHeaders(token) });
		const keys = (await listed.json()) as { keys: Array<{ name: string | null; scopes: string[] }> };
		const legacy = keys.keys.find((key) => key.name === "legacy key");
		expect(legacy?.scopes).toEqual(["onboarding", "accounting:read", "accounting:write"]);
	});

	it("rejects a body field it does not understand", async () => {
		const app = configuredApp();
		const { token } = await signIn(app, A_EMAIL);

		const res = await app.request("/api/v1/agent-keys", {
			method: "POST",
			headers: authHeaders(token),
			body: JSON.stringify({ agentId: "singular", scope: "accounting:read" }),
		});
		expect(res.status).toBe(400);
		expect(((await res.json()) as { error: string }).error).toContain('"scope"');
	});

	it("keeps keys isolated between users and 404s a foreign revoke", async () => {
		const app = configuredApp();
		const a = await signIn(app, A_EMAIL);
		const b = await signIn(app, B_EMAIL);

		const created = await app.request("/api/v1/agent-keys", {
			method: "POST",
			headers: authHeaders(a.token),
			body: JSON.stringify({ agentId: "codex", name: "Codex" }),
		});
		const key = (await created.json()) as { id: string };

		const listB = await app.request("/api/v1/agent-keys", { headers: authHeaders(b.token) });
		const listBData = (await listB.json()) as { keys: unknown[] };
		expect(listBData.keys).toHaveLength(0);

		const foreignRevoke = await app.request(`/api/v1/agent-keys/${key.id}`, {
			method: "DELETE",
			headers: authHeaders(b.token),
		});
		expect(foreignRevoke.status).toBe(404);

		const listA = await app.request("/api/v1/agent-keys", { headers: authHeaders(a.token) });
		const listAData = (await listA.json()) as { keys: unknown[] };
		expect(listAData.keys).toHaveLength(1);
	});

	it("answers 503 when auth is not configured", async () => {
		const app = createApp();
		const res = await app.request("/api/v1/agent-keys");
		expect(res.status).toBe(503);
	});

	it("rejects a malformed body", async () => {
		const app = configuredApp();
		const { token } = await signIn(app, A_EMAIL);
		const res = await app.request("/api/v1/agent-keys", {
			method: "POST",
			headers: authHeaders(token),
			body: JSON.stringify({ name: "missing agentId" }),
		});
		expect(res.status).toBe(400);
	});
});
