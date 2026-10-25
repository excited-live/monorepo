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
