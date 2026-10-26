import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { createTranslator } from "@excited-live/i18n"
import { AuthErrorNotice } from "./AuthErrorNotice"
import { strings } from "../lib/dictionaries"

/**
 * The sign-in page shows a failed attempt through this one component, so this
 * is the assertion that the deadline error is actually visible: an alert with
 * retry copy in both locales, and nothing at all when there is no error.
 */
function render(message: string | null): string {
	return renderToStaticMarkup(createElement(AuthErrorNotice, { message }))
}

describe("AuthErrorNotice", () => {
	it("renders nothing when there is no error", () => {
		expect(render(null)).toBe("")
	})

	it("renders the deadline expiry as an alert with retry copy (EN)", () => {
		const markup = render(createTranslator({ en: strings }, "en").t("auth.error.timeout"))

		expect(markup).toContain('role="alert"')
		expect(markup).toContain("did not respond in time")
		expect(markup).toContain("try again")
	})

	it("renders the same state in Thai", () => {
		const markup = render(createTranslator({ en: strings }, "th").t("auth.error.timeout"))

		expect(markup).toContain('role="alert"')
		expect(markup).toContain("ตรวจสอบการเชื่อมต่อ")
	})
})
