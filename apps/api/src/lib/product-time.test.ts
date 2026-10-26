import { describe, expect, it } from "vitest";
import { productDate, productMonth } from "./product-time";

describe("product-time", () => {
	it("uses Bangkok's calendar, not UTC", () => {
		// 2026-10-31T17:30Z is 2026-11-01 00:30 in Bangkok: a receipt entered
		// after midnight must not book into October (#172).
		const afterMidnightInBangkok = new Date("2026-10-31T17:30:00.000Z");
		expect(afterMidnightInBangkok.toISOString().slice(0, 10)).toBe("2026-10-31");
		expect(productDate(afterMidnightInBangkok)).toBe("2026-11-01");
		expect(productMonth(afterMidnightInBangkok)).toBe("2026-11");
	});

	it("keeps the same month for a UTC evening that is already tomorrow in Bangkok", () => {
		const eveningInBangkok = new Date("2026-10-26T10:00:00.000Z");
		expect(productDate(eveningInBangkok)).toBe("2026-10-26");
		expect(productMonth(eveningInBangkok)).toBe("2026-10");
	});
});
