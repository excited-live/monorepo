import { AGENT_KEY_RATE_LIMIT } from "@excited-live/auth";

/**
 * One key's request budget, as `/api/v1/agent-keys` reports it (#156).
 *
 * The numbers are the same ones `/mcp` publishes on a call
 * (`X-RateLimit-Limit/Remaining/Reset`, body `rateLimit` on a 429): the row
 * fields are the plugin's own counters, not a second bookkeeping system.
 * There are two deliberate differences from the after-the-fact snapshot in
 * `modules/mcp/mcp.auth.ts` (`snapshotFromKey`):
 *
 *   - a list request is not a call, so `requestCount` defaults to 0 and this
 *     request is never counted;
 *   - a never-used key has no window yet, so its `reset` is `null` rather than
 *     "24 h from now" — the window starts at the key's first call.
 *
 * `remaining` is clamped at 0 so a concurrent write cannot advertise a
 * negative count, and a window that has already lapsed reports a full budget
 * again: the plugin resets `requestCount` on the next verification.
 */
export interface AgentKeyBudget {
	limit: number;
	remaining: number;
	/** Unix epoch seconds when the current window ends; null before the first call. */
	reset: number | null;
}

export interface AgentKeyBudgetRow {
	rateLimitEnabled?: boolean | null;
	rateLimitMax?: number | null;
	rateLimitTimeWindow?: number | null;
	requestCount?: number | null;
	lastRequest?: Date | string | null;
}

function toMillis(value: Date | string | null | undefined): number | undefined {
	if (!value) return undefined;
	const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
	return Number.isFinite(ms) ? ms : undefined;
}

export function agentKeyBudget(row: AgentKeyBudgetRow, now = Date.now()): AgentKeyBudget | null {
	if (row.rateLimitEnabled === false) return null;

	const limit = row.rateLimitMax ?? AGENT_KEY_RATE_LIMIT.maxRequests;
	const windowMs = row.rateLimitTimeWindow ?? AGENT_KEY_RATE_LIMIT.timeWindowMs;
	const lastRequest = toMillis(row.lastRequest);

	// No call yet: the budget is whole and the window has not started.
	if (lastRequest === undefined) return { limit, remaining: limit, reset: null };

	const windowEnd = lastRequest + windowMs;
	if (now >= windowEnd) return { limit, remaining: limit, reset: null };

	const used = Math.max(0, row.requestCount ?? 0);
	return {
		limit,
		remaining: Math.max(0, limit - used),
		reset: Math.ceil(windowEnd / 1000),
	};
}
