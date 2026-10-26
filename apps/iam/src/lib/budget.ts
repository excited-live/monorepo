/**
 * What a key's row should say about its budget (#156).
 *
 * The numbers come from `GET /api/v1/agent-keys` → `key.rateLimit`, which the
 * API derives from the same plugin counters it publishes on `/mcp`. The page
 * never counts calls itself: a key used from two editors would otherwise show
 * two different remaining values, and the wall would appear after the API had
 * already refused the agent.
 *
 * The paused state is the server's snapshot with `remaining: 0` — not a local
 * threshold — so the rendered reset instant is the one the key will actually
 * accept again.
 */

export interface AgentKeyRateLimit {
	limit: number
	remaining: number
	/** Unix epoch seconds; null before the key's first call. */
	reset: number | null
}

export type KeyState =
	| { kind: "active"; limit: number; remaining: number; resetAt: number | null }
	| { kind: "paused"; limit: number; resetAt: number }
	| { kind: "dead" }
	| { kind: "unknown" }

interface KeyStateInput {
	expiresAt?: string | null
	rateLimit?: AgentKeyRateLimit | null
}

/**
 * `nowMs` is injectable so the state is testable without freezing the clock.
 * Expiry is checked first: an expired key is refused with a 401 before any
 * budget matters, so it is "dead" even if its counters look healthy.
 */
export function keyState(key: KeyStateInput, nowMs = Date.now()): KeyState {
	const expiresAt = key.expiresAt ? Date.parse(key.expiresAt) : Number.NaN
	if (Number.isFinite(expiresAt) && expiresAt <= nowMs) return { kind: "dead" }

	const budget = key.rateLimit
	if (!budget) return { kind: "unknown" }
	if (!Number.isFinite(budget.limit) || budget.limit <= 0) return { kind: "unknown" }
	if (!Number.isFinite(budget.remaining) || budget.remaining < 0) return { kind: "unknown" }

	const resetMs = budget.reset === null ? Number.NaN : budget.reset * 1000
	const resetLive = Number.isFinite(resetMs) && resetMs > nowMs

	if (budget.remaining <= 0) {
		// A spent window that has already ended refills on the next call; the
		// API reports that as a whole budget, but stay tolerant of a stale row.
		if (!resetLive) return { kind: "active", limit: budget.limit, remaining: budget.limit, resetAt: null }
		return { kind: "paused", limit: budget.limit, resetAt: budget.reset as number }
	}

	return {
		kind: "active",
		limit: budget.limit,
		remaining: budget.remaining,
		resetAt: resetLive ? (budget.reset as number) : null,
	}
}

/**
 * The reset instant in the reader's own clock, never UTC and never a ticking
 * countdown. A `th` reader gets Thai digits when the locale does; the time
 * itself is still their local time zone.
 */
export function formatResetClock(epochSeconds: number, locale: "en" | "th" = "en"): string {
	return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(new Date(epochSeconds * 1000))
}
