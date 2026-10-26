import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
	DOOR_DOCS_URL,
	DOOR_FALLBACK_ID,
	DOOR_HANDOFF,
	DOOR_MINT_URL,
	DOOR_SCOPES,
	renderDoorFallback,
	renderDoorMarkdown,
} from "./door-facts"

/**
 * #223 — the key door must be readable without JavaScript.
 *
 * The runtime proof is a curl matrix against a deployed build (Rigel owns the
 * prelive run). These tests guard the one thing a deployment cannot: that the
 * HTML, both markdown mirrors and the 404 all carry the same four facts, and
 * that none of them invents a scope list the API does not promise.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const markdown = renderDoorMarkdown()
const fallback = renderDoorFallback()

/** Visible text of the fallback, so tag markup cannot pad the 400-char floor. */
const fallbackText = fallback
	.replace(/<[^>]+>/g, " ")
	.replace(/&lt;/g, "<")
	.replace(/&gt;/g, ">")
	.replace(/&amp;/g, "&")
	.replace(/\s+/g, " ")
	.trim()

const FACTS = [DOOR_HANDOFF, DOOR_MINT_URL, DOOR_DOCS_URL, DOOR_SCOPES]

/** The API's real permission set today; the door must not enumerate it. */
const SCOPE_NAMES = ["onboarding", "accounting:read", "accounting:write"]

describe("the four door facts", () => {
	it("appears once in the module the whole door is built from", () => {
		for (const fact of FACTS) {
			expect(markdown).toContain(fact)
			expect(fallback).toContain(fact)
		}
	})

	it("names no scope and no key prefix", () => {
		for (const text of [markdown, fallback]) {
			expect(text).not.toContain("elk_")
			for (const scope of SCOPE_NAMES) expect(text).not.toContain(scope)
		}
	})
})

describe("/tokens.md and /keys.md", () => {
	it("are the rendered markdown, byte for byte", () => {
		expect(read("../../public/tokens.md")).toBe(markdown)
		expect(read("../../public/keys.md")).toBe(markdown)
	})

	it("fit the 600–900 byte window design set", () => {
		const bytes = Buffer.byteLength(markdown, "utf8")
		expect(bytes).toBeGreaterThanOrEqual(600)
		expect(bytes).toBeLessThanOrEqual(900)
	})
})

describe("the server-rendered fallback", () => {
	it("is a <main> outside #root with its own id", () => {
		expect(fallback.startsWith(`<main id="${DOOR_FALLBACK_ID}">`)).toBe(true)
		expect(fallback.endsWith("</main>")).toBe(true)
		expect(fallback).not.toContain('id="root"')
	})

	it("carries at least 400 characters of visible text", () => {
		expect(fallbackText.length).toBeGreaterThanOrEqual(400)
	})

	it("links the docs and Scoped Keys without inventing a card", () => {
		expect(fallback).toContain(`href="${DOOR_DOCS_URL}"`)
		expect(fallback).toContain('href="/tokens"')
		expect(fallback).not.toContain("<button")
		expect(fallback).not.toContain("disabled")
	})
})

describe("routing (public/_redirects)", () => {
	const redirects = read("../../public/_redirects")
	/** Rule lines only, as [source, destination, code]: comments are prose. */
	const rules = redirects
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"))
		.map((line) => line.split(/\s+/))

	it("no longer rewrites every path to the app shell", () => {
		expect(rules.some((rule) => (rule[0] ?? "").startsWith("/*"))).toBe(false)
	})

	it("serves the SPA routes from the shell and keeps the door as files", () => {
		expect(rules).toContainEqual(["/mcp", "/", "200"])
		expect(rules).toContainEqual(["/data", "/", "200"])
		// `/tokens`, `/keys` and `/sign-in` are `dist/<route>.html`, which Pages
		// serves at the clean URL itself. A `/<route>/index.html` destination is
		// normalised back to `/<route>/` and answers 308, never the 200 rule.
		expect(rules.some((rule) => (rule[1] ?? "").includes("/index.html"))).toBe(false)
		expect(rules.some((rule) => rule[0] === "/keys" || rule[0] === "/tokens")).toBe(false)
	})

	it("retires the two URLs that were never iam pages", () => {
		expect(rules).toContainEqual(["/overview", "/mcp", "301"])
		expect(rules).toContainEqual(["/auth/sign-in", "/sign-in", "301"])
	})
})

describe("the markdown response type (public/_headers)", () => {
	const headers = read("../../public/_headers")

	it("pins text/markdown on both mirrors", () => {
		for (const path of ["/tokens.md", "/keys.md"]) {
			const rule = new RegExp(`^${path.replace(".", "\\.")}\\n\\tContent-Type: text/markdown; charset=utf-8$`, "m")
			expect(headers).toMatch(rule)
		}
	})
})

describe("404.html", () => {
	const notFound = read("../../public/404.html")

	it("carries the handoff sentence and one exit to the docs", () => {
		expect(notFound).toContain(DOOR_HANDOFF)
		expect(notFound.match(/<a\s/g)?.length).toBe(1)
		expect(notFound).toContain(`href="${DOOR_DOCS_URL}"`)
	})

	it("names no key value", () => {
		expect(notFound).not.toContain("elk_")
	})
})
