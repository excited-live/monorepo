import { describe, expect, it } from "vitest";
import { AGENT_KEY_RATE_LIMIT } from "@excited-live/auth";
import { agentKeyBudget } from "./agent-key-budget";

const NOW = Date.parse("2026-10-26T06:30:00.000Z");
const WINDOW = AGENT_KEY_RATE_LIMIT.timeWindowMs;

describe("agentKeyBudget", () => {
	it("reports the plugin default limit and a whole budget before the first call", () => {
		expect(agentKeyBudget({}, NOW)).toEqual({
			limit: AGENT_KEY_RATE_LIMIT.maxRequests,
			remaining: AGENT_KEY_RATE_LIMIT.maxRequests,
			reset: null,
		});
	});

	it("reports the key's own limit when the row disagrees with the default", () => {
		const budget = agentKeyBudget(
			{ rateLimitMax: 200, rateLimitTimeWindow: 60 * 60 * 1000, requestCount: 3, lastRequest: new Date(NOW - 1000) },
			NOW,
		);
		expect(budget?.limit).toBe(200);
		expect(budget?.remaining).toBe(197);
	});

	it("counts down inside the window and reports the reset instant", () => {
		const lastRequest = new Date(NOW - 60 * 60 * 1000);
		const budget = agentKeyBudget({ requestCount: 3, lastRequest }, NOW);
		expect(budget).toEqual({
			limit: AGENT_KEY_RATE_LIMIT.maxRequests,
			remaining: AGENT_KEY_RATE_LIMIT.maxRequests - 3,
			reset: Math.ceil((lastRequest.getTime() + WINDOW) / 1000),
		});
	});

	it("clamps spent budgets at zero instead of going negative", () => {
		// A legacy key that still carries the old explicit 10-call budget, spent
		// past its limit: the remaining count floors at 0, never a negative.
		const budget = agentKeyBudget(
			{ rateLimitMax: 10, requestCount: 14, lastRequest: new Date(NOW - 1000) },
			NOW,
		);
		expect(budget?.remaining).toBe(0);
	});

	it("refills after the window lapses and forgets the old reset", () => {
		const budget = agentKeyBudget(
			{ requestCount: AGENT_KEY_RATE_LIMIT.maxRequests, lastRequest: new Date(NOW - WINDOW - 1000) },
			NOW,
		);
		expect(budget).toEqual({
			limit: AGENT_KEY_RATE_LIMIT.maxRequests,
			remaining: AGENT_KEY_RATE_LIMIT.maxRequests,
			reset: null,
		});
	});

	it("returns null when the key has rate limiting turned off", () => {
		expect(agentKeyBudget({ rateLimitEnabled: false, requestCount: 2 }, NOW)).toBeNull();
	});
});
