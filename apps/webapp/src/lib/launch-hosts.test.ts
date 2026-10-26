import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { LocaleProvider } from "./locale-context"
import { LaunchHome } from "../pages/launch-home/launch-home"

/**
 * #65 guard: the launch home explains the OAuth path (Ada's Option A), and it
 * must never point at a host that is not a production launch surface.
 *
 * The dead end this ticket describes was "connect your agent" with no key. The
 * wrong fix is to link the prelive iam build (`iam.excited.live`) or an
 * `agent-keys` route that only exists post-launch. Keys belong in iam's Scoped
 * Keys tab once iam is a production build (#75); `/docs/mcp` documents OAuth.
 */

const srcRoot = fileURLToPath(new URL("..", import.meta.url))
const repoFile = (relativePath: string) => join(srcRoot, relativePath)

const read = (relativePath: string) => readFileSync(repoFile(relativePath), "utf8")

const renderHome = (locale: "en" | "th") =>
	renderToStaticMarkup(
		createElement(LocaleProvider, {
			initialLocale: locale,
			children: createElement(LaunchHome, { mcpUrl: "https://api.excited.live/mcp" }),
		}),
	)

describe("launch home explains the OAuth path in EN and TH", () => {
	it("EN: says the agent signs in with the same account and there is no key to copy", () => {
		const html = renderHome("en")

		expect(html).toContain("Your agent signs in with the same excited.live account you just created.")
		expect(html).toContain("There is no key to copy.")
	})

	it("TH: carries the same sentence in Thai", () => {
		const html = renderHome("th")

		expect(html).toContain("เอเจนต์ของคุณเข้าสู่ระบบด้วยบัญชี excited.live เดียวกับที่คุณเพิ่งสร้าง")
		expect(html).toContain("ไม่มีคีย์ให้คัดลอก")
	})

	it("links to the documented help page, not a prelive or post-launch surface", () => {
		const html = renderHome("en")

		expect(html).toContain('href="https://excited.live/docs/help"')
		expect(html).toContain('href="/settings"')
	})
})

/** `.test.ts`/`.spec.tsx` are excluded: this file names the forbidden strings on purpose. */
const isTestFile = (file: string) => /\.(test|spec)\.(ts|tsx)$/.test(file)

const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name)
		if (entry.isDirectory()) return walk(full)
		if (!/\.(ts|tsx)$/.test(entry.name) || isTestFile(entry.name)) return []
		return [full]
	})

describe("the webapp never links a prelive iam build or a post-launch key flow", () => {
	/**
	 * `auth-cors.ts` and the auth BFF mount legitimately name `iam.excited.live`:
	 * they allow the iam SPA origin to call sign-in cross-origin (#89). That is a
	 * server-side allowlist, not a user-facing link, so it is the only exemption.
	 */
	const allowlist = new Set(["lib/auth-cors.ts", "routes/api/auth/$.tsx"])

	it("no source file points at iam.excited.live outside the CORS allowlist", () => {
		const offenders = walk(srcRoot)
			.filter((file) => !allowlist.has(relative(srcRoot, file)))
			.filter((file) => readFileSync(file, "utf8").includes("iam.excited.live"))
			.map((file) => relative(srcRoot, file))

		expect(offenders).toEqual([])
	})

	it("no source file mentions agent keys, sample keys or a workers.dev host", () => {
		const forbidden = ["agent-keys", "ex_live_", "workers.dev"]
		const offenders = walk(srcRoot).filter((file) => {
			const source = readFileSync(file, "utf8")
			return forbidden.some((needle) => source.includes(needle))
		})

		expect(offenders.map((file) => relative(srcRoot, file))).toEqual([])
	})

	it("the launch copy dictionary has no iam link and no key wording", () => {
		const dictionaries = read("lib/dictionaries.ts")
		const launchBlock = dictionaries.slice(
			dictionaries.indexOf('"launchHome.eyebrow"'),
			dictionaries.indexOf("// Empty states and resilient error loading"),
		)

		expect(launchBlock).not.toMatch(/iam\.excited\.live|agent-keys|ex_live_|workers\.dev/)
		expect(launchBlock).toMatch(/"launchHome\.authNote"/)
	})

	it("the help link stays on the documented page while /docs/mcp is not on prod", () => {
		// Ada's gate: switch to https://excited.live/docs/mcp only once it serves
		// the "Connect your agent over MCP" page on production, not the home page.
		const page = read("pages/launch-home/launch-home.tsx")

		expect(page).toMatch(/https:\/\/excited\.live\/docs\/help/)
	})
})
