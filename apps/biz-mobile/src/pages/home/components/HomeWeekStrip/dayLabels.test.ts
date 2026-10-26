import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { MobileLocale } from "../../../../domain/types";
import { WEEK_DAY_KEYS, weekDayLabels } from "./dayLabels";

/**
 * #168: Thai day initials repeat (อ = Tue + Sun, พ = Wed + Thu) and the strip
 * used one space-separated string, so a translator's spacing decided the layout.
 * These tests pin the contract the component now relies on: seven slots, one key
 * per day, unambiguous names for assistive tech.
 */

const LOCALES: MobileLocale[] = ["en", "th"];

describe("weekDayLabels", () => {
	it.each(LOCALES)("returns exactly seven slots in %s, Monday first", (locale) => {
		expect(weekDayLabels(locale)).toHaveLength(7);
		expect(WEEK_DAY_KEYS).toHaveLength(7);
	});

	it.each(LOCALES)("gives every slot a non-empty short glyph and full name in %s", (locale) => {
		for (const label of weekDayLabels(locale)) {
			expect(label.short.trim()).not.toBe("");
			expect(label.full.trim()).not.toBe("");
			// A missing dictionary key falls back to the key itself; that is not a label.
			expect(label.short).not.toContain("week.strip.");
			expect(label.full).not.toContain("week.strip.");
		}
	});

	it.each(LOCALES)("keeps the full day name unique within the row in %s", (locale) => {
		const names = weekDayLabels(locale).map((label) => label.full);
		expect(new Set(names).size).toBe(7);
	});

	it.each(LOCALES)("keeps the spoken '{day}: {state}' label unique within the row in %s", (locale) => {
		const spoken = weekDayLabels(locale).map((label) => `${label.full}: today`);
		expect(new Set(spoken).size).toBe(7);
	});

	it("uses the abbreviated Thai initials that do not collide", () => {
		expect(weekDayLabels("th").map((label) => label.short)).toEqual([
			"จ.",
			"อ.",
			"พ.",
			"พฤ.",
			"ศ.",
			"ส.",
			"อา.",
		]);
		expect(new Set(weekDayLabels("th").map((label) => label.short)).size).toBe(7);
	});

	it("keeps the English initials as the familiar M T W T F S S", () => {
		expect(weekDayLabels("en").map((label) => label.short)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
	});
});

describe("HomeWeekStrip source", () => {
	it("never splits a translated string to find the seven slots", () => {
		const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "HomeWeekStrip.tsx"), "utf8");
		expect(source).not.toContain("week.strip.days");
		expect(source).not.toMatch(/split\(\s*["'`]\s+["'`]\s*\)/);
	});
});
