import { describe, expect, it } from "vitest";
import {
	EXPENSE_CATEGORIES,
	EXPENSE_CATEGORY_SLUGS,
	isExpenseCategory,
	normalizeCategory,
} from "../src/categories";

describe("expense category vocabulary (#173)", () => {
	it("is the 16 keys the app already stores, each with Thai and English labels", () => {
		expect(EXPENSE_CATEGORY_SLUGS).toHaveLength(16);
		expect(new Set(EXPENSE_CATEGORY_SLUGS).size).toBe(16);
		expect(EXPENSE_CATEGORY_SLUGS).toContain("food");
		expect(EXPENSE_CATEGORY_SLUGS).toContain("infrastructure");
		expect(EXPENSE_CATEGORY_SLUGS).toContain("other");
		for (const entry of EXPENSE_CATEGORIES) {
			expect(entry.en.length).toBeGreaterThan(0);
			expect(entry.th.length).toBeGreaterThan(0);
		}
	});

	it("accepts a slug, a Thai label or an English label, case-insensitively", () => {
		expect(normalizeCategory("food")).toBe("food");
		expect(normalizeCategory("อาหาร")).toBe("food");
		expect(normalizeCategory("อาหาร ".trim())).toBe("food");
		expect(normalizeCategory("Food & Dining")).toBe("food");
		expect(normalizeCategory("FOOD")).toBe("food");
		expect(normalizeCategory("ของชำและของใช้ในบ้าน")).toBe("groceries");
	});

	it("maps legacy client spellings onto their key instead of splitting a total", () => {
		expect(normalizeCategory("subscription")).toBe("entertainment");
		expect(normalizeCategory("utilities")).toBe("connectivity");
		expect(normalizeCategory("Other Personal Outflow")).toBe("other");
	});

	it("sends unknown free text to other, never an error", () => {
		expect(normalizeCategory("tools")).toBe("other");
		expect(normalizeCategory("")).toBe("other");
		expect(normalizeCategory(undefined)).toBe("other");
	});

	it("isExpenseCategory is strict about the stored key", () => {
		expect(isExpenseCategory("food")).toBe(true);
		expect(isExpenseCategory("Food")).toBe(false);
		expect(isExpenseCategory("อาหาร")).toBe(false);
	});
});
