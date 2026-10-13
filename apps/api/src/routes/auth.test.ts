import { describe, expect, it } from "vitest";
import { createApp } from "../app";

describe("api/v1/auth", () => {
	it("returns hosted sign-in URL or dev mock when unconfigured", async () => {
		const app = createApp();
		const res = await app.request("/api/v1/auth/sign-in-url");
		expect(res.status).toBe(200);
		const data = (await res.json()) as any;
		expect(data.url).toBeDefined();
		expect(typeof data.configured).toBe("boolean");
	});

	it("handles callback and returns token & user", async () => {
		const app = createApp();
		const res = await app.request("/api/v1/auth/callback?code=mock_code_dev&redirect_uri=https://excited.live");
		expect(res.status).toBe(200);
		const data = (await res.json()) as any;
		expect(data.success).toBe(true);
		expect(data.token).toMatch(/^biz_tok_/);
		expect(data.user.email).toBeDefined();
	});

	it("redirects mobile custom schemes on callback", async () => {
		const app = createApp();
		const res = await app.request("/api/v1/auth/callback?code=mock_code_dev&redirect_uri=excitedbiz://auth/callback");
		expect(res.status).toBe(302);
		const location = res.headers.get("location");
		expect(location).toContain("excitedbiz://auth/callback");
		expect(location).toContain("token=biz_tok_");
	});

	it("validates /me with bearer token", async () => {
		const app = createApp();
		const cbRes = await app.request("/api/v1/auth/callback?code=mock_code_dev&redirect_uri=https://excited.live");
		const { token } = (await cbRes.json()) as any;

		const meRes = await app.request("/api/v1/auth/me", {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(meRes.status).toBe(200);
		const meData = (await meRes.json()) as any;
		expect(meData.authenticated).toBe(true);
		expect(meData.user.email).toBeDefined();
	});
});
