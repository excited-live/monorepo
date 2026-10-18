import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { DB_FILE_ENV, resetDbCache } from "../db";
import { resetTokensAuthCache } from "../lib/auth";
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
