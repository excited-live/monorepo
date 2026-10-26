import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { DOCS_ORIGIN, docsOriginFor } from "./env"
import { DOCS_URL, GITHUB_URL, MCP_GUIDE_URL } from "./hosts"

/**
 * #127 — iam's sign-up must mint iam's own session, and no surface may hardcode
 * a production origin that a prelive build then sends visitors into.
 *
 * The docs host follows the hostname the app is served from, so prelive iam and
 * production iam each link the landing build of their own environment.
 */
describe("docsOriginFor", () => {
	it("sends production iam to the production landing", () => {
		expect(docsOriginFor("iam.excited.live")).toBe("https://excited.live")
	})

	it("keeps production pages.dev on the production landing", () => {
		expect(docsOriginFor("excited-live-iam.pages.dev")).toBe("https://excited.live")
		expect(docsOriginFor("abc123.excited-live-iam.pages.dev")).toBe("https://excited.live")
	})

	it("sends the prelive build to the prelive landing", () => {
		expect(docsOriginFor("excited-live-iam-prelive.pages.dev")).toBe(
			"https://excited-live-landing-prelive.pages.dev",
		)
		expect(docsOriginFor("prelive.excited.live")).toBe(
			"https://excited-live-landing-prelive.pages.dev",
		)
	})

	it("derives every docs link from that origin", () => {
		expect(DOCS_URL).toBe(`${DOCS_ORIGIN}/docs`)
		expect(MCP_GUIDE_URL).toBe(`${DOCS_ORIGIN}/docs/mcp`)
		expect(GITHUB_URL).toBe("https://github.com/fromsukong/excited.live")
	})
})

const home = readFileSync(new URL("../routes/home.tsx", import.meta.url), "utf8")

describe("home page links (#127)", () => {
	it("signs up through the hub, not the webapp auth host", () => {
		expect(home).toMatch(/to="\/sign-in"\s+search=\{\{ mode: "signup" \}\}/)
		expect(home).not.toContain("auth.excited.live")
	})

	it("carries no hardcoded absolute URL", () => {
		// Every external host belongs to lib/hosts.ts, which resolves per
		// environment. A literal here is how prelive got prod docs links.
		expect(home).not.toMatch(/https?:\/\//)
	})
})
