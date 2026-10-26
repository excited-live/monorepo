import { describe, expect, it } from "vitest"
import { RequestTimeoutError } from "@excited-live/http"
import {
	MIN_PASSWORD_LENGTH,
	authFailureMessageKey,
	oauthResumeUrl,
	parseAuthMode,
	postAuthDestination,
	sanitizeReturnPath,
	signUpErrorKind,
} from "./auth-flow"

/**
 * The web /sign-in page serves both sign-in and create-account modes. Both
 * must resume the same flows, so these tests assert the destinations a
 * just-signed-up user gets — not just the signed-in one.
 */

describe("post-auth destination for a new (signed-up) account", () => {
	it("resumes the signed OAuth authorization request", () => {
		const search =
			"?client_id=mcp-client&sig=signed-value&response_type=code&code_challenge=abc" +
			"&returnPathname=%2Fconsent&mode=signup"
		expect(postAuthDestination(search, "/consent")).toBe(
			"/api/auth/oauth2/authorize?client_id=mcp-client&sig=signed-value&response_type=code&code_challenge=abc",
		)
	})

	it("resumes the device flow return path with its user code", () => {
		const returnPathname = "/device?user_code=ABCD-1234"
		const search = `?mode=signup&returnPathname=${encodeURIComponent(returnPathname)}`
		expect(postAuthDestination(search, returnPathname)).toBe(returnPathname)
	})

	it("falls back to the sanitized return path when no OAuth query is present", () => {
		expect(postAuthDestination("?mode=signup", "/settings")).toBe("/settings")
		expect(postAuthDestination("?mode=signup", undefined)).toBe("/")
	})

	it("produces the same destination for sign-in and sign-up", () => {
		const oauth = "?client_id=agent&sig=sig-value&state=xyz"
		expect(postAuthDestination(`?mode=signup&${oauth.slice(1)}`, "/")).toBe(
			postAuthDestination(oauth, "/"),
		)
		expect(postAuthDestination("?mode=signup&returnPathname=%2Fdevice", "/device")).toBe(
			postAuthDestination("?returnPathname=%2Fdevice", "/device"),
		)
	})

	it("does not forward page-only params to the authorize endpoint", () => {
		expect(oauthResumeUrl("?client_id=agent&sig=sig-value&returnPathname=%2Fdevice&mode=signup")).toBe(
			"/api/auth/oauth2/authorize?client_id=agent&sig=sig-value",
		)
	})
})

describe("oauthResumeUrl", () => {
	it("requires both client_id and sig", () => {
		expect(oauthResumeUrl("?client_id=agent")).toBeNull()
		expect(oauthResumeUrl("?sig=sig-value")).toBeNull()
		expect(oauthResumeUrl("")).toBeNull()
	})

	it("preserves repeated signed params", () => {
		const url = oauthResumeUrl("?client_id=agent&sig=sig-value&ba_param=one&ba_param=two")
		expect(url).toBe(
			"/api/auth/oauth2/authorize?client_id=agent&sig=sig-value&ba_param=one&ba_param=two",
		)
	})
})

describe("sanitizeReturnPath", () => {
	it("accepts same-origin paths", () => {
		expect(sanitizeReturnPath("/device?user_code=ABCD")).toBe("/device?user_code=ABCD")
	})

	it("rejects cross-origin and protocol-relative targets", () => {
		expect(sanitizeReturnPath("https://evil.example/steal")).toBe("/")
		expect(sanitizeReturnPath("//evil.example/steal")).toBe("/")
		expect(sanitizeReturnPath("/\\evil.example/steal")).toBe("/")
		expect(sanitizeReturnPath(undefined)).toBe("/")
	})
})

describe("parseAuthMode", () => {
	it("defaults to sign-in and only accepts the explicit sign-up value", () => {
		expect(parseAuthMode("signup")).toBe("signup")
		expect(parseAuthMode("signin")).toBe("signin")
		expect(parseAuthMode(undefined)).toBe("signin")
		expect(parseAuthMode("admin")).toBe("signin")
	})
})

describe("signUpErrorKind", () => {
	it("maps a duplicate account from the endpoint error code", () => {
		expect(signUpErrorKind({ status: 422, code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" })).toBe(
			"duplicate",
		)
	})

	it("maps duplicates by status and message when the code is absent", () => {
		expect(signUpErrorKind({ status: 422 })).toBe("duplicate")
		expect(signUpErrorKind({ status: 400, message: "User already exists" })).toBe("duplicate")
	})

	it("maps an invalid email and a weak password", () => {
		expect(signUpErrorKind({ status: 400, code: "INVALID_EMAIL" })).toBe("invalidEmail")
		expect(signUpErrorKind({ status: 400, code: "PASSWORD_TOO_SHORT" })).toBe("weakPassword")
	})

	it("falls back to generic", () => {
		expect(signUpErrorKind({ status: 500 })).toBe("generic")
		expect(signUpErrorKind(null)).toBe("generic")
	})

	it("keeps the minimum password length in sync with Better Auth's default", () => {
		expect(MIN_PASSWORD_LENGTH).toBe(8)
	})
})

describe("auth failure copy", () => {
	it("gives a deadline expiry its own retry copy", () => {
		expect(authFailureMessageKey(new RequestTimeoutError(6_000))).toBe("auth.error.timeout")
	})

	it("recognises a timeout that crossed a package boundary by name", () => {
		const crossed = new Error("Request timed out after 6000 ms")
		crossed.name = "TimeoutError"
		expect(authFailureMessageKey(crossed)).toBe("auth.error.timeout")
	})

	it("keeps the generic copy for anything else", () => {
		expect(authFailureMessageKey(new Error("boom"))).toBe("auth.error.generic")
		expect(authFailureMessageKey(null)).toBe("auth.error.generic")
		expect(authFailureMessageKey(undefined)).toBe("auth.error.generic")
	})
})
