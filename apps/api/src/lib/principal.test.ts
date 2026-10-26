import { AGENT_KEY_RATE_LIMIT, defaultKeyHasher } from "@excited-live/auth";
import { describe, expect, it } from "vitest";
import { createTestDriver } from "../db/testing";
import type { SqlDriver } from "../db/types";
import { refusalLimit } from "./principal";

/**
 * #178 — a 429 advertises the key's own budget, not the product default.
 *
 * `verifyApiKey` returns no row on `RATE_LIMITED`, so `refusalLimit` reads the
 * `apikey` row back by the hash the plugin wrote at mint time. These cases pin
 * the lookup and, just as important, the fallback: the header must exist even
 * when there is no row to read.
 */

const RAW_KEY = "elk_unit-test-refusal-key";
const WINDOW = 24 * 60 * 60 * 1000;
const NOW = "2026-10-26T10:00:00.000Z";

/**
 * A real migrated SQLite database holding one key row, written the way the
 * plugin writes it: `key` is the plugin's hash of the raw key, never the raw
 * key itself. That is what makes the lookup test meaningful — a reimplemented
 * hash would not find this row.
 */
async function driverWithKey(rateLimitMax: number | null): Promise<SqlDriver> {
	const db = await createTestDriver();
	await db.run(
		`INSERT INTO apikey (id, "configId", "referenceId", "key", "rateLimitEnabled", "rateLimitMax", "rateLimitTimeWindow", "requestCount", "createdAt", "updatedAt")
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		["key_1", "default", "user_1", await defaultKeyHasher(RAW_KEY), 1, rateLimitMax, WINDOW, 2, NOW, NOW],
	);
	return db;
}

describe("refusalLimit — a 429 advertises the key's own budget (#178)", () => {
	it("finds the row by the plugin's hash and returns its rateLimitMax", async () => {
		const db = await driverWithKey(2);

		// The stored value is a hash, not the presented key: this read only
		// works because `defaultKeyHasher` is the plugin's own function.
		const stored = await db.first<{ key: string }>('SELECT "key" FROM apikey WHERE id = ?', ["key_1"]);
		expect(stored?.key).toBe(await defaultKeyHasher(RAW_KEY));
		expect(stored?.key).not.toBe(RAW_KEY);

		expect(await refusalLimit(db, RAW_KEY, { code: "RATE_LIMITED" })).toBe(2);
	});

	it("falls back to the pinned default when no row matches the key", async () => {
		const db = await driverWithKey(2);

		// A different key never minted here: the header still has to carry a
		// number, and the pre-#178 value is the only honest one.
		expect(await refusalLimit(db, "elk_never-minted", { code: "RATE_LIMITED" })).toBe(
			AGENT_KEY_RATE_LIMIT.maxRequests,
		);

		const empty = await createTestDriver();
		expect(await refusalLimit(empty, RAW_KEY, { code: "RATE_LIMITED" })).toBe(AGENT_KEY_RATE_LIMIT.maxRequests);
	});

	it("falls back when the row has no stored rateLimitMax", async () => {
		const db = await driverWithKey(null);
		expect(await refusalLimit(db, RAW_KEY, { code: "RATE_LIMITED" })).toBe(AGENT_KEY_RATE_LIMIT.maxRequests);
	});

	it("falls back when there is no database handle at all", async () => {
		expect(await refusalLimit(undefined, RAW_KEY, { code: "RATE_LIMITED" })).toBe(AGENT_KEY_RATE_LIMIT.maxRequests);
	});

	it("falls back instead of throwing when the read fails", async () => {
		const broken = {
			first: async () => {
				throw new Error("database unavailable");
			},
		} as unknown as SqlDriver;

		expect(await refusalLimit(broken, RAW_KEY, { code: "RATE_LIMITED" })).toBe(AGENT_KEY_RATE_LIMIT.maxRequests);
	});

	it("leaves USAGE_EXCEEDED on the pinned default for now (follow-up, out of #178 scope)", async () => {
		const db = await driverWithKey(2);

		// A lifetime quota is a different refusal; widening the lookup to it is
		// deliberately not bundled into #178.
		expect(await refusalLimit(db, RAW_KEY, { code: "USAGE_EXCEEDED" })).toBe(AGENT_KEY_RATE_LIMIT.maxRequests);
	});
});
