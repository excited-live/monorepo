import { describe, expect, it } from "vitest"
import { CANONICAL_WEBAPP_ORIGIN, canonicalHostRedirect } from "./canonical-host"

const request = (url: string, init?: RequestInit) => new Request(url, init)

describe("canonicalHostRedirect", () => {
	it("sends the alias root to the canonical origin with a 308", () => {
		const response = canonicalHostRedirect(request("https://app.excited.live/"))
		expect(response?.status).toBe(308)
		expect(response?.headers.get("location")).toBe(`${CANONICAL_WEBAPP_ORIGIN}/`)
	})

	it("preserves the path and the query string", () => {
		const response = canonicalHostRedirect(
			request("https://app.excited.live/sign-in?returnPathname=%2Fconsent%3Fclient_id%3Dabc&x=1"),
		)
		expect(response?.headers.get("location")).toBe(
			`${CANONICAL_WEBAPP_ORIGIN}/sign-in?returnPathname=%2Fconsent%3Fclient_id%3Dabc&x=1`,
		)
	})

	it("uses 308 so a POST keeps its method and body", () => {
		const response = canonicalHostRedirect(
			request("https://app.excited.live/api/auth/sign-in/email", {
				method: "POST",
				body: JSON.stringify({ email: "a@b.co" }),
				headers: { "content-type": "application/json" },
			}),
		)
		// 307/308 are the only redirects a client repeats with the same method
		// and body; 301/302 would turn the POST into a GET and drop the body.
		expect(response?.status).toBe(308)
	})

	it("keeps the OAuth callback path and its code/state query intact", () => {
		const response = canonicalHostRedirect(
			request("https://app.excited.live/api/auth/callback/google?code=abc&state=xyz"),
		)
		expect(response?.headers.get("location")).toBe(
			`${CANONICAL_WEBAPP_ORIGIN}/api/auth/callback/google?code=abc&state=xyz`,
		)
	})

	it("does not touch the canonical origin", () => {
		expect(canonicalHostRedirect(request("https://auth.excited.live/sign-in"))).toBeNull()
	})

	it("does not touch the pages.dev deployment origin", () => {
		expect(canonicalHostRedirect(request("https://excited-live-web.pages.dev/api/auth/get-session"))).toBeNull()
	})

	it("does not touch another host", () => {
		expect(canonicalHostRedirect(request("https://excited.live/"))).toBeNull()
	})

	it("is not confused by a path that looks like a host", () => {
		const response = canonicalHostRedirect(request("https://app.excited.live//evil.example/x"))
		expect(response?.headers.get("location")).toBe("https://auth.excited.live//evil.example/x")
	})

	it("accepts an explicit canonical origin without a trailing slash", () => {
		const response = canonicalHostRedirect(request("https://app.excited.live/a?b=c"), {
			canonicalOrigin: "https://auth.example.com/",
		})
		expect(response?.headers.get("location")).toBe("https://auth.example.com/a?b=c")
	})
})
