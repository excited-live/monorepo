import { describe, expect, it } from "vitest"
import { formatResetClock, keyState } from "./budget"

const NOW = Date.parse("2026-10-26T06:30:00.000Z") // 13:30 ICT
const IN_AN_HOUR = Math.floor(NOW / 1000) + 60 * 60

describe("keyState", () => {
	it("shows an active budget with the API's count and reset instant", () => {
		expect(keyState({ rateLimit: { limit: 10, remaining: 7, reset: IN_AN_HOUR } }, NOW)).toEqual({
			kind: "active",
			limit: 10,
			remaining: 7,
			resetAt: IN_AN_HOUR,
		})
	})

	it("reads the limit from the API instead of assuming ten", () => {
		const state = keyState({ rateLimit: { limit: 200, remaining: 194, reset: IN_AN_HOUR } }, NOW)
		expect(state).toMatchObject({ kind: "active", limit: 200, remaining: 194 })
	})

	it("pauses a spent key until the server's reset instant", () => {
		expect(keyState({ rateLimit: { limit: 10, remaining: 0, reset: IN_AN_HOUR } }, NOW)).toEqual({
			kind: "paused",
			limit: 10,
			resetAt: IN_AN_HOUR,
		})
	})

	it("treats a spent window that has already ended as refilled, not paused", () => {
		expect(keyState({ rateLimit: { limit: 10, remaining: 0, reset: IN_AN_HOUR - 7200 } }, NOW)).toEqual({
			kind: "active",
			limit: 10,
			remaining: 10,
			resetAt: null,
		})
	})

	it("marks an expired key dead even with budget left", () => {
		expect(
			keyState(
				{
					expiresAt: new Date(NOW - 1000).toISOString(),
					rateLimit: { limit: 10, remaining: 10, reset: null },
				},
				NOW,
			),
		).toEqual({ kind: "dead" })
	})

	it("renders nothing when the API reports no budget", () => {
		expect(keyState({ rateLimit: null }, NOW)).toEqual({ kind: "unknown" })
		expect(keyState({}, NOW)).toEqual({ kind: "unknown" })
	})

	it("omits the reset clause before a key's first call", () => {
		expect(keyState({ rateLimit: { limit: 10, remaining: 10, reset: null } }, NOW)).toEqual({
			kind: "active",
			limit: 10,
			remaining: 10,
			resetAt: null,
		})
	})
})

describe("formatResetClock", () => {
	it("renders the reset instant as a local HH:MM clock time", () => {
		const reset = Date.parse("2026-10-26T07:05:00.000Z") / 1000
		const clock = formatResetClock(reset, "en")
		expect(clock).toMatch(/^\d{2}:\d{2}$/)
		expect(clock).toBe(
			new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
				new Date(reset * 1000),
			),
		)
	})
})
