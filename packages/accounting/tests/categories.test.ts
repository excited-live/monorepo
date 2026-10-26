import { describe, expect, it } from "vitest";
import {
	canonicalCategory,
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

	it("keeps the ratified entertainment label and the pre-fix spelling as an alias", () => {
		const entertainment = EXPENSE_CATEGORIES.find((entry) => entry.slug === "entertainment");
		expect(entertainment?.th).toBe("ค่าสมาชิกและค่าใช้จ่ายในชีวิต");
		// Writes accept the label, and a legacy PATCH still sending the label
		// from before the fix must land in `entertainment`, not `other`.
		expect(normalizeCategory("ค่าสมาชิกและค่าใช้จ่ายในชีวิต")).toBe("entertainment");
		expect(normalizeCategory("สมาชิกและค่าใช้จ่ายในชีวิต")).toBe("entertainment");
		expect(canonicalCategory("ค่าสมาชิกและค่าใช้จ่ายในชีวิต")).toBe("entertainment");
		expect(canonicalCategory("สมาชิกและค่าใช้จ่ายในชีวิต")).toBe("entertainment");
		// The short ค่า- alias that predates both spellings is untouched.
		expect(canonicalCategory("ค่าสมาชิก")).toBe("entertainment");
		// An unrecognised label is still passed through unchanged so the strict
		// enum refuses it, rather than being swallowed into `other`.
		expect(canonicalCategory("ค่าสมาชิกพรีเมียม")).toBe("ค่าสมาชิกพรีเมียม");
	});

	it("canonicalises the app's own catalog slugs and common ค่า- labels", () => {
		// packages/accounting/src/catalog.ts and the client autofill write these.
		expect(normalizeCategory("infra")).toBe("infrastructure");
		expect(normalizeCategory("automation")).toBe("saas");
		expect(normalizeCategory("general")).toBe("other");
		expect(normalizeCategory("ค่าอาหาร")).toBe("food");
		expect(normalizeCategory("ค่าเดินทาง")).toBe("transit");
		expect(normalizeCategory("ค่าอินเทอร์เน็ต")).toBe("connectivity");
		expect(normalizeCategory("ค่าสมาชิก")).toBe("entertainment");
		// The write edge uses the same map, so the app never sends a non-key.
		expect(canonicalCategory("infra")).toBe("infrastructure");
		expect(canonicalCategory("automation")).toBe("saas");
		expect(canonicalCategory("อาหาร")).toBe("food");
		expect(canonicalCategory("nonsense")).toBe("nonsense");
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
