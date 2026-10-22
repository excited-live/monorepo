import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../app";
import { DB_FILE_ENV, resetDbCache } from "../db";
import { resetTokensAuthCache } from "../lib/auth";
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
		};
		expect(key.key.startsWith("elk_")).toBe(true);
		expect(key.start).toBeTruthy();
		expect(key.expiresAt).toBeTruthy();

		const list = await app.request("/api/v1/agent-keys", { headers: authHeaders(token) });
		expect(list.status).toBe(200);
		const listed = (await list.json()) as {
			keys: Array<{ id: string; agentId: string | null; createdAt: string; lastRequest: string | null }>;
		};
		expect(listed.keys).toHaveLength(1);
		expect(listed.keys[0]?.id).toBe(key.id);
		expect(listed.keys[0]?.agentId).toBe("claude-code");
		expect(listed.keys[0]?.createdAt).toBeTruthy();
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
