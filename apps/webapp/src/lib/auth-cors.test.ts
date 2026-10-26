import { describe, expect, it } from "vitest"
import {
	DEFAULT_AUTH_CORS_ORIGINS,
	authCorsHeaders,
	authCorsPreflight,
	isAllowedOrigin,
	parseAuthCorsOrigins,
	withAuthCors,
} from "./auth-cors"

describe("parseAuthCorsOrigins", () => {
	it("falls back to the first-party defaults when unset", () => {
		expect(parseAuthCorsOrigins(undefined)).toEqual(DEFAULT_AUTH_CORS_ORIGINS)
		expect(parseAuthCorsOrigins("")).toEqual(DEFAULT_AUTH_CORS_ORIGINS)
		expect(parseAuthCorsOrigins(" , ")).toEqual(DEFAULT_AUTH_CORS_ORIGINS)
	})

	it("splits, trims and strips trailing slashes", () => {
		expect(parseAuthCorsOrigins("https://iam.excited.live/, http://localhost:5175")).toEqual([
			"https://iam.excited.live",
			"http://localhost:5175",
		])
	})

	it("keeps the prelive iam origin when it is the configured value (#89)", () => {
		const prelive = "https://excited-live-iam-prelive.pages.dev,http://localhost:5175,http://127.0.0.1:5175"
		const parsed = parseAuthCorsOrigins(prelive)
		expect(parsed).toContain("https://excited-live-iam-prelive.pages.dev")
		expect(parsed).not.toContain("https://iam.excited.live")
	})
})

describe("isAllowedOrigin", () => {
	const allowed = ["https://iam.excited.live"]

	it("matches exactly, ignoring case and a trailing slash", () => {
		expect(isAllowedOrigin("https://iam.excited.live", allowed)).toBe(true)
		expect(isAllowedOrigin("HTTPS://IAM.EXCITED.LIVE/", allowed)).toBe(true)
	})

	it("rejects a lookalike origin and a missing origin", () => {
		expect(isAllowedOrigin("https://iam.excited.live.evil.com", allowed)).toBe(false)
		expect(isAllowedOrigin("https://evil.com/https://iam.excited.live", allowed)).toBe(false)
		expect(isAllowedOrigin(null, allowed)).toBe(false)
	})
})

describe("authCorsHeaders", () => {
	it("echoes an allowed origin and allows credentials", () => {
		const headers = authCorsHeaders("https://iam.excited.live", ["https://iam.excited.live"])
		expect(headers["access-control-allow-origin"]).toBe("https://iam.excited.live")
		expect(headers["access-control-allow-credentials"]).toBe("true")
		expect(headers.vary).toBe("Origin")
	})

	it("never emits a wildcard origin", () => {
		const headers = authCorsHeaders("https://other.example", ["https://iam.excited.live"])
		expect(headers).toEqual({})
	})
})

describe("authCorsPreflight", () => {
	it("answers 204 with the allowed methods and headers", () => {
		const response = authCorsPreflight("https://iam.excited.live", ["https://iam.excited.live"])
		expect(response.status).toBe(204)
		expect(response.headers.get("access-control-allow-origin")).toBe("https://iam.excited.live")
		expect(response.headers.get("access-control-allow-methods")).toBe("GET, POST, OPTIONS")
		expect(response.headers.get("access-control-allow-headers")).toContain("content-type")
		expect(response.headers.get("access-control-allow-credentials")).toBe("true")
	})

	it("refuses an origin that is not on the list", () => {
		expect(authCorsPreflight("https://evil.example", ["https://iam.excited.live"]).status).toBe(403)
	})
})

describe("withAuthCors", () => {
	const allowed = ["https://iam.excited.live"]

	it("keeps the status and body and adds the headers", async () => {
		const upstream = new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})
		const request = new Request("https://api.excited.live/api/auth/get-session", {
			headers: { origin: "https://iam.excited.live" },
		})
		const response = withAuthCors(upstream, request, allowed)
		expect(response.status).toBe(200)
		expect(response.headers.get("access-control-allow-origin")).toBe("https://iam.excited.live")
		expect(response.headers.get("access-control-allow-credentials")).toBe("true")
		expect(response.headers.get("content-type")).toBe("application/json")
		expect(await response.json()).toEqual({ ok: true })
	})

	it("leaves a same-origin response untouched", () => {
		const upstream = new Response("pong", { status: 200 })
		const request = new Request("https://app.excited.live/api/auth/get-session")
		const response = withAuthCors(upstream, request, allowed)
		expect(response.headers.get("access-control-allow-origin")).toBeNull()
		expect(response.status).toBe(200)
	})
})
