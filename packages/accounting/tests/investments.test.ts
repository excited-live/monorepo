import { describe, expect, it } from "vitest";
import { calculateInvestmentValue } from "../src/investments";
import type { Asset, CapitalTransfer } from "../src/types";

const etf: Asset = {
	id: "inv_etf",
	entityId: "acc_p",
	name: "Index ETF",
	cost: 50000,
	lifespanMonths: 0,
	purchaseDate: "2026-10",
	category: "stock",
	kind: "investment",
	investment: {
		instrument: "ETF",
		costBasis: 50000,
		marketValue: 60000,
		valuedAsOf: "2026-10",
		expectedAnnualReturn: 0,
	},
};

function transfer(overrides: Partial<CapitalTransfer> & { id: string; amount: number }): CapitalTransfer {
	return {
		fromEntityId: "acc_p",
		toEntityId: "acc_p",
		date: "2026-10-05",
		note: "",
		...overrides,
	} as CapitalTransfer;
}

describe("calculateInvestmentValue", () => {
	it("0% return: value is market value plus contributions", () => {
		// Contribution 5000 in Oct, 3000 in Nov. Value Oct = 60000 + 5000 = 65000.
		const contributions = [
			transfer({ id: "tx_c1", amount: 5000, date: "2026-10-15", fromAssetId: "w_main", targetAssetId: "inv_etf" }),
			transfer({ id: "tx_c2", amount: 3000, date: "2026-11-03", fromAssetId: "w_main", targetAssetId: "inv_etf" }),
		];

		expect(calculateInvestmentValue({ asset: etf, transfers: contributions, yearMonth: "2026-10" })).toEqual({
			value: 65000,
			costBasis: 55000,
			unrealizedGain: 10000,
		});
		// Nov = 65000 + 3000 = 68000; cost basis 50000 + 5000 + 3000 = 58000.
		expect(calculateInvestmentValue({ asset: etf, transfers: contributions, yearMonth: "2026-11" })).toEqual({
			value: 68000,
			costBasis: 58000,
			unrealizedGain: 10000,
		});
	});

	it("a withdrawal reduces both value and cost basis", () => {
		// Oct +5000, Nov +3000 -> 68000 by Nov; Dec: 68000 - 4000 = 64000; cost basis 58000 - 4000 = 54000.
		const flows = [
			transfer({ id: "tx_c1", amount: 5000, date: "2026-10-15", fromAssetId: "w_main", targetAssetId: "inv_etf" }),
			transfer({ id: "tx_c2", amount: 3000, date: "2026-11-03", fromAssetId: "w_main", targetAssetId: "inv_etf" }),
			transfer({ id: "tx_w", amount: 4000, date: "2026-12-01", fromAssetId: "inv_etf", targetAssetId: "w_main" }),
		];
		expect(calculateInvestmentValue({ asset: etf, transfers: flows, yearMonth: "2026-12" })).toEqual({
			value: 64000,
			costBasis: 54000,
			unrealizedGain: 10000,
		});
	});

	it("with a return, a year of growth gives about marketValue * (1 + r)", () => {
		const growing: Asset = {
			...etf,
			cost: 100000,
			investment: { ...etf.investment!, costBasis: 100000, marketValue: 100000, expectedAnnualReturn: 0.12 },
		};
		// Oct 2026 through Sep 2027 is 12 monthly steps of (1.12)^(1/12) - 1.
		const value = calculateInvestmentValue({ asset: growing, yearMonth: "2027-09" }).value;
		expect(value).toBeCloseTo(112000, 0);

		// The exact round2 sequence, one step per month.
		const monthly = (1.12) ** (1 / 12) - 1;
		let expected = 100000;
		for (let i = 0; i < 12; i++) expected = Math.round((expected * (1 + monthly) + Number.EPSILON) * 100) / 100;
		expect(value).toBe(expected);
	});

	it("before valuedAsOf the market value is returned unchanged", () => {
		const result = calculateInvestmentValue({ asset: etf, yearMonth: "2026-09" });
		expect(result.value).toBe(60000);
		expect(result.costBasis).toBe(50000);
	});

	it("an asset without investment details is carried at cost", () => {
		const plain: Asset = { ...etf, investment: undefined, kind: undefined, cost: 500 };
		expect(calculateInvestmentValue({ asset: plain, yearMonth: "2026-10" })).toEqual({
			value: 500,
			costBasis: 500,
			unrealizedGain: 0,
		});
	});
});
