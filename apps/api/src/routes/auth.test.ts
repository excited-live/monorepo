import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AGENT_KEY_RATE_LIMIT, apiKeyApi } from "@excited-live/auth";
import { createApp } from "../app";
import { DB_FILE_ENV, resetDbCache } from "../db";
import { getTokensAuth, resetTokensAuthCache } from "../lib/auth";
import type { Hono } from "hono";
import type { ApiEnv } from "../lib/env";

/**
 * Golden tests for the Better Auth tokens mount.
 *
 * Unconfigured path (no BETTER_AUTH_SECRET): the auth surface answers 503 and
 * the identity middleware keeps the x-user-id passthrough (dev/prelive).
 *
 * Configured path: sign-up → sign-in with an `Authorization: Bearer` header →
 * the session token comes back in `set-auth-token` (bearer() plugin); /me and
 * the data routes resolve identity ONLY from that token — a forged x-user-id
 * is ignored and tokenless data calls get 401.
 */

const SECRET = "test-secret-for-tokens-mount-golden-tests";
const BASE_URL = "http://localhost:8787";
const EMAIL = "prame@excited.live";
const PASSWORD = "correct-horse-battery";

const tempDirs: string[] = [];

function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-auth-"));
	tempDirs.push(dir);
	return join(dir, "api-auth.sqlite");
}

afterEach(() => {
	delete process.env.BETTER_AUTH_SECRET;
	delete process.env.BETTER_AUTH_URL;
	delete process.env[DB_FILE_ENV];
	resetTokensAuthCache();
	// The db module caches its resolved handle per process; without this reset
	// the next test's temp file never receives its migrations.
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

async function signInToken(app: Hono<ApiEnv>): Promise<string> {
	// sign-up first (fresh database per test), then sign in
	await app.request("/api/v1/auth/sign-up/email", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ name: "Prame", email: EMAIL, password: PASSWORD }),
	});
	const res = await app.request("/api/v1/auth/sign-in/email", {
		method: "POST",
		headers: { "content-type": "application/json", Authorization: "Bearer" },
		body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
	});
	expect(res.status).toBe(200);
	const token = res.headers.get("set-auth-token");
	expect(token).toBeTruthy();
	return token as string;
}

const SETTINGS_BODY = { profileName: "Alex Designer", gender: "female" };

describe("api/v1/auth (unconfigured)", () => {
	it("answers 503 on /me and keeps x-user-id passthrough on data routes", async () => {
		const app = createApp();

		const me = await app.request("/api/v1/auth/me");
		expect(me.status).toBe(503);

		const put = await app.request("/api/v1/settings", {
			method: "PUT",
			headers: { "content-type": "application/json", "x-user-id": "user-a" },
			body: JSON.stringify(SETTINGS_BODY),
		});
		expect(put.status).toBe(200);

		const get = await app.request("/api/v1/settings", { headers: { "x-user-id": "user-a" } });
		expect(get.status).toBe(200);
		const data = (await get.json()) as { profileName: string };
		expect(data.profileName).toBe("Alex Designer");
	});
});

describe("api/v1/auth (configured)", () => {
	it("signs in and returns the bearer token in set-auth-token", async () => {
		const app = configuredApp();
		await signInToken(app);
	});

	it("validates /me with the bearer token and rejects tokenless calls", async () => {
		const app = configuredApp();
		const token = await signInToken(app);

		const me = await app.request("/api/v1/auth/me", {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(me.status).toBe(200);
		const meData = (await me.json()) as { authenticated: boolean; user: { email: string } };
		expect(meData.authenticated).toBe(true);
		expect(meData.user.email).toBe(EMAIL);

		const anonymous = await app.request("/api/v1/auth/me");
		expect(anonymous.status).toBe(401);
	});

	it("pins identity from the bearer token and ignores a forged x-user-id", async () => {
		const app = configuredApp();
		const token = await signInToken(app);

		const put = await app.request("/api/v1/settings", {
			method: "PUT",
			headers: {
				"content-type": "application/json",
				Authorization: `Bearer ${token}`,
				"x-user-id": "attacker",
			},
			body: JSON.stringify(SETTINGS_BODY),
		});
		expect(put.status).toBe(200);

		// The write landed in the session user's bucket (token wins over header).
		const own = await app.request("/api/v1/settings", {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(own.status).toBe(200);
		const ownData = (await own.json()) as { profileName: string };
		expect(ownData.profileName).toBe("Alex Designer");

		// Tokenless calls are rejected while auth is configured — the
		// x-user-id trust hole is gone.
		const anonymous = await app.request("/api/v1/settings", {
			headers: { "x-user-id": "attacker" },
		});
		expect(anonymous.status).toBe(401);
	});
});

const FULL_SCOPES = ["onboarding", "accounting:read", "accounting:write"];

/** Session token plus the user id it belongs to (read back through /me). */
async function signIn(app: Hono<ApiEnv>): Promise<{ token: string; userId: string }> {
	const token = await signInToken(app);
	const me = await app.request("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } });
	expect(me.status).toBe(200);
	const body = (await me.json()) as { user: { id: string } };
	return { token, userId: body.user.id };
}

/** Mint a key owned by the signed-in user, in the PRM vocabulary a mint accepts. */
async function mintKey(
	app: Hono<ApiEnv>,
	token: string,
	scopes: string[] = FULL_SCOPES,
): Promise<{ id: string; key: string }> {
	const res = await app.request("/api/v1/agent-keys", {
		method: "POST",
		headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify({ agentId: "vitest", scopes }),
	});
	expect(res.status).toBe(201);
	return (await res.json()) as { id: string; key: string };
}

/**
 * A key with an explicit small budget. Minted through the plugin directly
 * because the REST mint surface does not expose `rateLimitMax`; a 200-call
 * budget would make the 429 case slow for no extra proof.
 */
async function budgetKey(app: Hono<ApiEnv>, userId: string, rateLimitMax = 2): Promise<string> {
	const auth = await getTokensAuth(`${BASE_URL}/mcp`);
	const minted = await apiKeyApi(auth!).createApiKey({
		body: {
			userId,
			expiresIn: 24 * 60 * 60,
			permissions: { onboarding: ["read", "write"], accounting: ["read", "write"] },
			rateLimitMax,
			rateLimitTimeWindow: 24 * 60 * 60 * 1000,
		},
	});
	return minted.key;
}

type ErrorBody = { error: string; code?: string; message?: string; hint?: string; requiredScope?: string };

/**
 * #193 — one principal resolver for `/mcp` and `/api/v1/*`.
 *
 * An `elk_` key worked on `/mcp` and got 401 on every REST route while
 * `openapi.json` advertised both. Accepting keys on REST is only safe with the
 * scope gate below: without it an onboarding-only key could write accounting.
 */
describe("api/v1 identity — API keys and the scope gate (#193)", () => {
	it("accepts x-api-key on a data route and advertises the key's budget", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const { key } = await mintKey(app, token);

		const res = await app.request("/api/v1/accounting/summary?month=2026-10", { headers: { "x-api-key": key } });
		expect(res.status).toBe(200);
		expect(res.headers.get("x-ratelimit-limit")).toBe(String(AGENT_KEY_RATE_LIMIT.maxRequests));
		expect(res.headers.get("x-ratelimit-remaining")).toBe(String(AGENT_KEY_RATE_LIMIT.maxRequests - 1));
		expect(Number(res.headers.get("x-ratelimit-reset"))).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	it("accepts the same key as a Bearer elk_ token", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const { key } = await mintKey(app, token);

		const res = await app.request("/api/v1/accounting/summary?month=2026-10", {
			headers: { Authorization: `Bearer ${key}` },
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("x-ratelimit-limit")).toBe(String(AGENT_KEY_RATE_LIMIT.maxRequests));
	});

	it("refuses a scope the key does not hold with 403, never 401", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const { key } = await mintKey(app, token, ["onboarding"]);

		const denied = await app.request("/api/v1/accounting/summary?month=2026-10", { headers: { "x-api-key": key } });
		expect(denied.status).toBe(403);
		const body = (await denied.json()) as ErrorBody;
		expect(body.code).toBe("insufficient_scope");
		expect(body.requiredScope).toBe("accounting:read");

		// The scope it does hold still works: the gate is per route, not blanket.
		const allowed = await app.request("/api/v1/onboarding", { headers: { "x-api-key": key } });
		expect(allowed.status).toBe(200);
	});

	it("refuses a write scope the key does not hold, and a read key cannot write", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const { key } = await mintKey(app, token, ["accounting:read"]);

		const read = await app.request("/api/v1/accounting/summary?month=2026-10", { headers: { "x-api-key": key } });
		expect(read.status).toBe(200);

		const write = await app.request("/api/v1/accounting/entities", {
			method: "POST",
			headers: { "content-type": "application/json", "x-api-key": key },
			body: JSON.stringify({ name: "Test entity", country: "TH" }),
		});
		expect(write.status).toBe(403);
		expect(((await write.json()) as ErrorBody).code).toBe("insufficient_scope");
	});

	it("answers 401 UNAUTHORIZED for a revoked key", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const minted = await mintKey(app, token);

		const before = await app.request("/api/v1/accounting/summary?month=2026-10", { headers: { "x-api-key": minted.key } });
		expect(before.status).toBe(200);

		const revoke = await app.request(`/api/v1/agent-keys/${minted.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(revoke.status).toBe(200);

		const after = await app.request("/api/v1/accounting/summary?month=2026-10", { headers: { "x-api-key": minted.key } });
		expect(after.status).toBe(401);
		const body = (await after.json()) as ErrorBody;
		expect(body.code).toBe("UNAUTHORIZED");
		// REST's own capitalisation, not MCP's lowercase `unauthorized`.
		expect(body.error).toBe("Unauthorized");
	});

	it("answers a spent key with the MCP 429 body, not a 401", async () => {
		const app = configuredApp();
		const { userId } = await signIn(app);
		const key = await budgetKey(app, userId);

		for (let call = 0; call < 2; call += 1) {
			const ok = await app.request("/api/v1/accounting/summary?month=2026-10", { headers: { "x-api-key": key } });
			expect(ok.status).toBe(200);
		}

		const limited = await app.request("/api/v1/accounting/summary?month=2026-10", { headers: { "x-api-key": key } });
		expect(limited.status).toBe(429);
		expect(limited.headers.get("retry-after")).toBeTruthy();
		expect(limited.headers.get("x-ratelimit-remaining")).toBe("0");

		const body = (await limited.json()) as {
			error: string;
			code: string;
			message: string;
			hint: string;
			retryAfter: number;
			rateLimit: { limit: number; remaining: number; reset: number };
		};
		// The /mcp vocabulary verbatim: same key, same budget, same advice.
		expect(body.error).toBe("rate_limited");
		expect(body.code).toBe("RATE_LIMITED");
		expect(body.message).toBe("This API key is over its request budget.");
		expect(body.hint).toContain("do not rotate it");
		expect(body.rateLimit.remaining).toBe(0);
		// #178: the key's own budget of 2, not the product default — the same
		// number the two 200s above advertised.
		expect(body.rateLimit.limit).toBe(2);
		expect(limited.headers.get("x-ratelimit-limit")).toBe("2");
	});

	it("refuses key minting from a key with 403 session_required", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const { key } = await mintKey(app, token);

		for (const method of ["GET", "POST"] as const) {
			const res = await app.request("/api/v1/agent-keys", {
				method,
				headers: { "content-type": "application/json", "x-api-key": key },
				...(method === "POST" ? { body: JSON.stringify({ agentId: "self-replicating" }) } : {}),
			});
			expect(res.status).toBe(403);
			expect(((await res.json()) as ErrorBody).code).toBe("session_required");
		}

		// Settings is the human's account, outside every advertised scope.
		const settings = await app.request("/api/v1/settings", { headers: { "x-api-key": key } });
		expect(settings.status).toBe(403);
		expect(((await settings.json()) as ErrorBody).code).toBe("session_required");
	});

	it("names the credential on /me, which is the issue's exact repro", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const { key } = await mintKey(app, token);

		const viaKey = await app.request("/api/v1/auth/me", { headers: { "x-api-key": key } });
		expect(viaKey.status).toBe(200);
		const body = (await viaKey.json()) as { authenticated: boolean; via: string; user: { email: string } };
		expect(body.authenticated).toBe(true);
		expect(body.via).toBe("apiKey");
		expect(body.user.email).toBe(EMAIL);

		const viaSession = await app.request("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } });
		expect(((await viaSession.json()) as { via: string }).via).toBe("session");
	});

	it("keeps session behaviour unchanged and adds no budget headers", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);

		const res = await app.request("/api/v1/accounting/summary?month=2026-10", {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("x-ratelimit-limit")).toBeNull();
		expect(res.headers.get("x-ratelimit-remaining")).toBeNull();
		expect(res.headers.get("x-ratelimit-reset")).toBeNull();
	});

	it("keeps `Authorization: ApiKey …` a 401 — a third spelling is not accepted", async () => {
		const app = configuredApp();
		const { token } = await signIn(app);
		const { key } = await mintKey(app, token);

		const res = await app.request("/api/v1/accounting/summary?month=2026-10", {
			headers: { Authorization: `ApiKey ${key}` },
		});
		expect(res.status).toBe(401);
		expect(((await res.json()) as ErrorBody).code).toBe("UNAUTHORIZED");
	});
});
