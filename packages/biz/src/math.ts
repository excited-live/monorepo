import type { BillingCycle, DepreciationCalculation, HardwareAsset } from "./types";

export function round2(num: number): number {
	return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function parseYearMonth(ym: string): { year: number; month: number } {
	const [y, m] = ym.split("-").map(Number);
	return { year: y || 2026, month: m || 1 };
}

export function calculateElapsedMonths(startDate: string, asOfDate: string): number {
	const start = parseYearMonth(startDate);
	const asOf = parseYearMonth(asOfDate);
	const diffYears = asOf.year - start.year;
	const diffMonths = asOf.month - start.month;
	return Math.max(0, diffYears * 12 + diffMonths);
}

export function calculateMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
	switch (cycle) {
		case "weekly":
			return round2((amount * 52) / 12);
		case "monthly":
			return round2(amount);
		case "quarterly":
			return round2(amount / 3);
		case "semi-annual":
			return round2(amount / 6);
		case "yearly":
			return round2(amount / 12);
	}
}

/**
 * Cash & equivalents (`category: "cash"`) are assets that never depreciate:
 * they hold their full value. A zero/absent lifespan is treated the same way.
 */
export function isCashAsset(asset: HardwareAsset): boolean {
	return asset.category === "cash" || asset.lifespanMonths <= 0;
}

export function calculateAssetDepreciation(
	asset: HardwareAsset,
	asOfYearMonth: string = "2026-10",
): DepreciationCalculation {
	if (isCashAsset(asset)) {
		return {
			monthlyRate: 0,
			elapsedMonths: 0,
			remainingMonths: 0,
			monthsRemaining: 0,
			remainingBookValue: round2(asset.cost),
			isFullyDepreciated: false,
			completionDate: "N/A",
		};
	}

	const salvage = asset.salvageValue ?? 0;
	const depreciableAmount = Math.max(0, asset.cost - salvage);
	const baseMonthlyRate = depreciableAmount / asset.lifespanMonths;

	if (asset.purchaseDate === "Historical") {
		return {
			monthlyRate: 0,
			elapsedMonths: asset.lifespanMonths,
			remainingMonths: 0,
			monthsRemaining: 0,
			remainingBookValue: salvage,
			isFullyDepreciated: true,
			completionDate: "Historical",
		};
	}

	const elapsed = calculateElapsedMonths(asset.purchaseDate, asOfYearMonth);
	const clampedElapsed = Math.min(elapsed, asset.lifespanMonths);
	const isFullyDepreciated = clampedElapsed >= asset.lifespanMonths;
	const monthlyRate = isFullyDepreciated ? 0 : round2(baseMonthlyRate);
	const remainingMonths = Math.max(0, asset.lifespanMonths - clampedElapsed);
	const remainingBookValue = isFullyDepreciated
		? salvage
		: round2(asset.cost - clampedElapsed * baseMonthlyRate);

	// Compute completion date
	const p = parseYearMonth(asset.purchaseDate);
	const totalMonths = p.year * 12 + (p.month - 1) + asset.lifespanMonths;
	const endYear = Math.floor(totalMonths / 12);
	const endMonth = (totalMonths % 12) + 1;
	const completionDate = `${endYear}-${String(endMonth).padStart(2, "0")}`;

	return {
		monthlyRate,
		elapsedMonths: clampedElapsed,
		remainingMonths,
		monthsRemaining: remainingMonths,
		remainingBookValue,
		isFullyDepreciated,
		completionDate,
	};
}

export function calculateRunway(cashReserve: number, netMonthlyBurn: number): number | null {
	if (netMonthlyBurn <= 0) {
		return null; // Default Alive / Infinite runway
	}
	if (cashReserve <= 0) {
		return 0;
	}
	return round2(cashReserve / netMonthlyBurn);
}

export function simulateCapitalTransfer(
	fromCash: number,
	fromBurn: number,
	toCash: number,
	toBurn: number,
	amount: number,
): {
	fromNewCash: number;
	toNewCash: number;
	fromNewRunway: number | null;
	toNewRunway: number | null;
} {
	const fromNewCash = Math.max(0, round2(fromCash - amount));
	const toNewCash = round2(toCash + amount);
	const fromNewRunway = calculateRunway(fromNewCash, fromBurn);
	const toNewRunway = calculateRunway(toNewCash, toBurn);
	return {
		fromNewCash,
		toNewCash,
		fromNewRunway,
		toNewRunway,
	};
}

export function calculateDaysUntil(targetDate: string, fromDate?: string): number {
	const now = fromDate ? new Date(fromDate) : new Date();
	const target = new Date(targetDate);
	// Clear hours for day boundary comparison
	const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const d2 = new Date(target.getFullYear(), target.getMonth(), target.getDate());
	const diffTime = d2.getTime() - d1.getTime();
	return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}
