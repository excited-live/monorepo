import { describe, expect, it } from "vitest"
import { createApp } from "../app"

const ENV = { BETTER_AUTH_TRUSTED_ORIGINS: "https://auth.excited.live,https://excited.live/" }

function call(init: RequestInit, opts: { prod?: boolean } = {}) {
	const app = createApp({ requireAuthConfig: opts.prod ?? true })
	return app.request("/health", init, ENV)
}

describe("api CORS allowlist (#81)", () => {
	it("echoes an allowed origin with credentials", async () => {
		const res = await call({ headers: { origin: "https://auth.excited.live" } })
		expect(res.headers.get("access-control-allow-origin")).toBe("https://auth.excited.live")
		expect(res.headers.get("access-control-allow-credentials")).toBe("true")
	})

	it("sends no CORS headers to an evil origin", async () => {
		const res = await call({ headers: { origin: "https://evil.example" } })
		expect(res.headers.get("access-control-allow-origin")).toBeNull()
		expect(res.headers.get("access-control-allow-credentials")).toBeNull()
	})

	it("never allows the null origin", async () => {
		const res = await call({ headers: { origin: "null" } })
		expect(res.headers.get("access-control-allow-origin")).toBeNull()
	})

	it("does not allow null even if configured", async () => {
		const app = createApp({ requireAuthConfig: true })
		const res = await app.request("/health", { headers: { origin: "null" } }, { BETTER_AUTH_TRUSTED_ORIGINS: "null,*" })
		expect(res.headers.get("access-control-allow-origin")).toBeNull()
	})

	it("answers requests without an Origin (MCP/server clients) normally", async () => {
		const res = await call({})
		expect(res.status).toBe(200)
		expect(res.headers.get("access-control-allow-origin")).toBeNull()
	})

	it("preflight: allowed origin gets headers, evil origin does not", async () => {
		const headers = { "access-control-request-method": "POST", "access-control-request-headers": "authorization" }
		const ok = await call({ method: "OPTIONS", headers: { ...headers, origin: "https://excited.live" } })
		expect(ok.headers.get("access-control-allow-origin")).toBe("https://excited.live")
		expect(ok.headers.get("access-control-allow-methods")).toContain("POST")
		const bad = await call({ method: "OPTIONS", headers: { ...headers, origin: "https://evil.example" } })
		expect(bad.headers.get("access-control-allow-origin")).toBeNull()
	})

	it("allows localhost only outside the deployed Worker", async () => {
		const dev = await call({ headers: { origin: "http://localhost:3000" } }, { prod: false })
		expect(dev.headers.get("access-control-allow-origin")).toBe("http://localhost:3000")
		const prod = await call({ headers: { origin: "http://localhost:3000" } })
		expect(prod.headers.get("access-control-allow-origin")).toBeNull()
	})
})

describe("api CORS allowlist: iam.excited.live (#89)", () => {
	// The exact production value from apps/api/wrangler.toml. iam is a no-BFF
	// SPA: if this list drops it, every iam call is CORS-blocked in the browser.
	const PROD_ENV = {
		BETTER_AUTH_TRUSTED_ORIGINS:
			"https://auth.excited.live,https://excited-live-web.pages.dev,https://excited.live,https://iam.excited.live",
	}
	const app = () => createApp({ requireAuthConfig: true })

	it("echoes the iam origin with credentials and exposes set-auth-token", async () => {
		const res = await app().request("/health", { headers: { origin: "https://iam.excited.live" } }, PROD_ENV)
		expect(res.headers.get("access-control-allow-origin")).toBe("https://iam.excited.live")
		expect(res.headers.get("access-control-allow-credentials")).toBe("true")
		expect(res.headers.get("access-control-expose-headers")).toContain("set-auth-token")
	})

	it("exposes the rate-limit budget and edge request id (#140, #144)", async () => {
		const res = await app().request("/health", { headers: { origin: "https://iam.excited.live" } }, PROD_ENV)
		const exposed = res.headers.get("access-control-expose-headers")?.toLowerCase() ?? ""
		for (const header of ["retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "cf-ray"]) {
			expect(exposed).toContain(header)
		}
	})

	it("answers the real preflight with that exact origin, never *", async () => {
		const res = await app().request(
			"/api/v1/settings",
			{
				method: "OPTIONS",
				headers: {
					origin: "https://iam.excited.live",
					"access-control-request-method": "GET",
					"access-control-request-headers": "authorization,content-type",
				},
			},
			PROD_ENV,
		)
		expect(res.status).toBe(204)
		expect(res.headers.get("access-control-allow-origin")).toBe("https://iam.excited.live")
		expect(res.headers.get("access-control-allow-credentials")).toBe("true")
		expect(res.headers.get("access-control-allow-methods")).toContain("GET")
		expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("authorization")
	})

	it("still refuses an evil origin and null", async () => {
		for (const origin of ["https://evil.example", "null"]) {
			const res = await app().request("/health", { headers: { origin } }, PROD_ENV)
			expect(res.headers.get("access-control-allow-origin")).toBeNull()
			expect(res.headers.get("access-control-allow-credentials")).toBeNull()
		}
	})

	it("refused preflight carries no CORS headers at all, not even allow-credentials", async () => {
		const res = await app().request(
			"/api/v1/settings",
			{ method: "OPTIONS", headers: { origin: "https://evil.example", "access-control-request-method": "GET" } },
			PROD_ENV,
		)
		expect(res.headers.get("access-control-allow-origin")).toBeNull()
		expect(res.headers.get("access-control-allow-credentials")).toBeNull()
	})
})
