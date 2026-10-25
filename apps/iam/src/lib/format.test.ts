import { describe, expect, it } from "vitest"
import {
	formatCompact,
	formatMonth,
	formatPercent,
	formatRelative,
	formatThb,
	formatThbPrecise,
} from "./format"

describe("formatThb", () => {
	it("renders whole-baht amounts with the THB currency", () => {
		const formatted = formatThb(1234)
		expect(formatted.startsWith("THB")).toBe(true)
		expect(formatted.endsWith("1,234")).toBe(true)
	})

	it("rounds away sub-baht precision", () => {
		expect(formatThb(1234.6).endsWith("1,235")).toBe(true)
	})

	it("renders an em dash for missing or non-finite values", () => {
		expect(formatThb(null)).toBe("—")
		expect(formatThb(undefined)).toBe("—")
		expect(formatThb(Number.NaN)).toBe("—")
		expect(formatThb(Number.POSITIVE_INFINITY)).toBe("—")
	})
})

describe("formatThbPrecise", () => {
	it("keeps two decimals", () => {
		const formatted = formatThbPrecise(1234.5)
		expect(formatted.startsWith("THB")).toBe(true)
		expect(formatted.endsWith("1,234.50")).toBe(true)
	})

	it("renders an em dash for missing values", () => {
		expect(formatThbPrecise(null)).toBe("—")
	})
})

describe("formatCompact", () => {
	it("abbreviates thousands", () => {
		expect(formatCompact(12500)).toBe("12.5K")
	})

	it("renders an em dash for missing values", () => {
		expect(formatCompact(undefined)).toBe("—")
	})
})

describe("formatPercent", () => {
	it("converts a ratio to a percentage", () => {
		expect(formatPercent(0.123)).toBe("12.3%")
	})

	it("honours the digits argument", () => {
		expect(formatPercent(0.12345, 2)).toBe("12.35%")
		expect(formatPercent(0.5, 0)).toBe("50%")
	})

	it("renders an em dash for missing values", () => {
		expect(formatPercent(null)).toBe("—")
		expect(formatPercent(Number.NaN)).toBe("—")
	})
})

describe("formatMonth", () => {
	it("renders a year-month key as a short month and year", () => {
		expect(formatMonth("2026-10")).toBe("Oct 2026")
		expect(formatMonth("2026-01")).toBe("Jan 2026")
	})

	it("passes through shapes it does not recognise", () => {
		expect(formatMonth("2026-1")).toBe("2026-1")
		expect(formatMonth("October")).toBe("October")
	})

	it("renders an em dash for an empty value", () => {
		expect(formatMonth(null)).toBe("—")
		expect(formatMonth("")).toBe("—")
	})
})

describe("formatRelative", () => {
	const ago = (ms: number) => new Date(Date.now() - ms)

	it("renders 'never' when there is no value", () => {
		expect(formatRelative(null)).toBe("never")
		expect(formatRelative(undefined)).toBe("never")
		expect(formatRelative("")).toBe("never")
	})

	it("renders 'never' for an unparseable date", () => {
		expect(formatRelative("not-a-date")).toBe("never")
	})

	it("renders sub-minute gaps as 'just now'", () => {
		expect(formatRelative(ago(20_000))).toBe("just now")
	})

	it("renders minutes, hours and days", () => {
		expect(formatRelative(ago(5 * 60_000))).toBe("5m ago")
		expect(formatRelative(ago(3 * 60 * 60_000))).toBe("3h ago")
		expect(formatRelative(ago(4 * 24 * 60 * 60_000))).toBe("4d ago")
	})

	it("accepts ISO strings and epoch milliseconds", () => {
		const iso = new Date(Date.now() - 10 * 60_000).toISOString()
		expect(formatRelative(iso)).toBe("10m ago")
		expect(formatRelative(Date.now() - 10 * 60_000)).toBe("10m ago")
	})
})
