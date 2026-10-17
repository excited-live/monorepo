import { calculateAssetDepreciation, calculateMonthlyEquivalent, calculateRunway, getYearMonthRange, isCashAsset, round2, shiftYearMonth } from "./math";
import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LedgerActionItem,
	LiabilityStream,
	MonthlySummary,
	RecurringSubscription,
	RevenueStream,
} from "./types";

/**
 * Calculates net operational flow for an entity in a given month:
 *   income = active revenues (+ career salary if personal without active career revenues)
 *   expense = active subscriptions + active liabilities
 *   net = income - expense
 */
export function calculateEntityMonthlyOperatingCash(params: {
	account: EntityAccount;
	revenues: RevenueStream[];
	subscriptions: RecurringSubscription[];
	liabilities?: LiabilityStream[];
	yearMonth?: string;
}): {
	totalIncome: number;
	totalExpense: number;
	netOperatingCash: number;
} {
	const {
		account,
		revenues,
		subscriptions,
		liabilities = [],
		yearMonth,
	} = params;

	// Inflows from revenue streams
	const activeRevenues = revenues.filter((r) => {
		if (r.entityId !== account.id || !r.active) return false;
		if (yearMonth) {
			if (r.frequency === "one_time") return r.startMonth === yearMonth;
			if (r.startMonth && yearMonth < r.startMonth) return false;
			if (r.endMonth && yearMonth > r.endMonth) return false;
		}
		return true;
	});

	const hasConfiguredSalary = revenues.some(
		(r) => r.entityId === account.id && (r.source === "salary" || r.id === "rev_career_prame" || r.id.startsWith("rev_career")),
	);
	const hasAnyRevenuesForEntity = revenues.some((r) => r.entityId === account.id);
	const salaryInflow = account.salary && !hasConfiguredSalary && !hasAnyRevenuesForEntity ? account.salary : 0;

	const totalIncome = round2(
		activeRevenues.reduce(
			(acc, r) => acc + (r.frequency === "yearly" ? round2(r.amount / 12) : r.amount),
			salaryInflow,
		),
	);

	// Outflows from subscriptions
	const activeSubs = subscriptions.filter((s) => {
		if (s.entityId !== account.id || !s.active) return false;
		if (yearMonth && s.cycle === "one_time") {
			return s.nextRenewalDate.startsWith(yearMonth);
		}
		return true;
	});
	const monthlySubscriptions = activeSubs.reduce(
		(acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle),
		0,
	);

	// Outflows from liabilities
	const activeLiab = liabilities.filter((l) => l.entityId === account.id && l.active);
	const monthlyLiabilities = activeLiab.reduce((acc, l) => acc + l.amount, 0);

	const totalExpense = round2(monthlySubscriptions + monthlyLiabilities);
	const netOperatingCash = round2(totalIncome - totalExpense);

	return {
		totalIncome,
		totalExpense,
		netOperatingCash,
	};
}

/**
 * Resolves the effective balance of a cash asset / wallet:
 *   - Base cost
 *   - Plus targeted capital transfers (or untargeted transfers if this is the default wallet)
 *   - Plus net operating cash (income - expense) if this is the default wallet (deducted if negative)
 */
export function calculateCashAssetBalance(params: {
	asset: HardwareAsset;
	hardware: HardwareAsset[];
	transfers: CapitalTransfer[];
	account?: EntityAccount;
	subscriptions?: RecurringSubscription[];
	revenues?: RevenueStream[];
	liabilities?: LiabilityStream[];
	yearMonth?: string;
}): {
	baseCost: number;
	assetInjections: number;
	netOperatingCash: number;
	effectiveBalance: number;
	isDefault: boolean;
} {
	const {
		asset,
		hardware,
		transfers,
		account,
		subscriptions = [],
		revenues = [],
		liabilities = [],
		yearMonth,
	} = params;

	const isCash = isCashAsset(asset);
	if (!isCash) {
		const dep = calculateAssetDepreciation(asset, yearMonth);
		return {
			baseCost: asset.cost,
			assetInjections: 0,
			netOperatingCash: 0,
			effectiveBalance: dep.remainingBookValue,
			isDefault: false,
		};
	}

	// Determine if this is the designated default wallet for the entity
	const entityCashAssets = hardware.filter((h) => h.entityId === asset.entityId && isCashAsset(h));
	const isDefaultWallet = Boolean(
		asset.isDefault ||
		(!entityCashAssets.some((h) => h.isDefault) && entityCashAssets[0]?.id === asset.id),
	);

	// Capital transfers: targeted specifically to this asset, plus untargeted transfers if default wallet
	const targetedIncoming = transfers
		.filter((t) => t.toEntityId === asset.entityId && t.targetAssetId === asset.id)
		.reduce((sum, t) => sum + t.amount, 0);

	const untargetedIncoming = isDefaultWallet
		? transfers
				.filter((t) => t.toEntityId === asset.entityId && !t.targetAssetId)
				.reduce((sum, t) => sum + t.amount, 0)
		: 0;

	const outgoing = isDefaultWallet
		? transfers
				.filter((t) => t.fromEntityId === asset.entityId)
				.reduce((sum, t) => sum + t.amount, 0)
		: 0;

	const assetInjections = round2(targetedIncoming + untargetedIncoming - outgoing);

	// Operating cash: income minus expenses accumulated from baseline month up to yearMonth
	let netOperatingCash = 0;
	if (isDefaultWallet && (revenues.length > 0 || subscriptions.length > 0 || liabilities.length > 0 || account?.salary)) {
		const entityAccount: EntityAccount = account ?? {
			id: asset.entityId,
			name: asset.name,
			type: "business",
			cashReserve: 0,
			currency: "THB",
		};
		const startYm = asset.purchaseDate ? asset.purchaseDate.slice(0, 7) : "2026-10";
		const effectiveYm = yearMonth ?? startYm;
		if (effectiveYm >= startYm) {
			const monthsToAccumulate = getYearMonthRange(startYm, effectiveYm);
			for (const ym of monthsToAccumulate) {
				const operating = calculateEntityMonthlyOperatingCash({
					account: entityAccount,
					revenues,
					subscriptions,
					liabilities,
					yearMonth: ym,
				});
				netOperatingCash = round2(netOperatingCash + operating.netOperatingCash);
			}
		} else {
			const monthsPrior = getYearMonthRange(effectiveYm, shiftYearMonth(startYm, -1));
			for (const ym of monthsPrior) {
				const operating = calculateEntityMonthlyOperatingCash({
					account: entityAccount,
					revenues,
					subscriptions,
					liabilities,
					yearMonth: ym,
				});
				netOperatingCash = round2(netOperatingCash - operating.netOperatingCash);
			}
		}
	}

	const effectiveBalance = round2(asset.cost + assetInjections + netOperatingCash);

	return {
		baseCost: asset.cost,
		assetInjections,
		netOperatingCash,
		effectiveBalance,
		isDefault: isDefaultWallet,
	};
}

/**
 * Cash on hand today: cash assets plus net capital transfers and operational cashflow.
 */
export function calculateCurrentTreasury(params: {
	account: EntityAccount;
	hardware: HardwareAsset[];
	transfers: CapitalTransfer[];
	subscriptions?: RecurringSubscription[];
	revenues?: RevenueStream[];
	liabilities?: LiabilityStream[];
	yearMonth?: string;
}): number {
	const {
		account,
		hardware,
		transfers,
		subscriptions = [],
		revenues = [],
		liabilities = [],
		yearMonth,
	} = params;

	const cashAssets = hardware.filter((h) => h.entityId === account.id && isCashAsset(h));

	if (subscriptions.length > 0 || revenues.length > 0 || liabilities.length > 0) {
		const totalEffective = cashAssets.reduce((sum, h) => {
			const b = calculateCashAssetBalance({
				asset: h,
				hardware,
				transfers,
				account,
				subscriptions,
				revenues,
				liabilities,
				yearMonth,
			});
			return sum + b.effectiveBalance;
		}, 0);
		return round2(totalEffective);
	}

	const rawCashAssets = cashAssets.reduce((acc, h) => acc + h.cost, 0);
	const capitalIn = transfers
		.filter((t) => t.toEntityId === account.id)
		.reduce((acc, t) => acc + t.amount, 0);
	const capitalOut = transfers
		.filter((t) => t.fromEntityId === account.id)
		.reduce((acc, t) => acc + t.amount, 0);

	return round2(rawCashAssets + capitalIn - capitalOut);
}

/**
 * End-of-month treasury = current treasury + income − expenses:
 *
 *   treasury = cash assets + net capital transfers + income − expenses
 *
 * where cash assets are the `category: "cash"` entries recorded in the Assets
 * tab, income is the active monthly run-rate (yearly revenues amortised,
 * one-time streams counted in their starting month) and expenses are active
 * monthly subscriptions plus active debt service. Pure and deterministic.
 */
export function calculateDerivedTreasury(params: {
	account: EntityAccount;
	subscriptions: RecurringSubscription[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	hardware: HardwareAsset[];
	liabilities?: LiabilityStream[];
	yearMonth?: string;
}): number {
	const {
		account,
		subscriptions,
		revenues,
		transfers,
		hardware,
		liabilities = [],
		yearMonth,
	} = params;

	// Calculate base treasury without operational flows
	const current = calculateCurrentTreasury({ account, hardware, transfers });

	const operating = calculateEntityMonthlyOperatingCash({
		account,
		revenues,
		subscriptions,
		liabilities,
		yearMonth,
	});

	return round2(current + operating.netOperatingCash);
}

/**
 * Pure ledger derivation engine for a specific entity and month.
 */
export function generateMonthlyLedger(params: {
	account: EntityAccount;
	yearMonth: string;
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	liabilities?: LiabilityStream[];
}): {
	summary: MonthlySummary;
	actions: LedgerActionItem[];
} {
	const {
		account,
		yearMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
		liabilities = [],
	} = params;

	const actions: LedgerActionItem[] = [];

	// 1. Inflows (Capital & Revenues)
	let totalInflow = 0;

	// Inflows from capital transfers (one_time or monthly recurring)
	const incomingTransfers = transfers.filter((t) => {
		if (t.toEntityId !== account.id) return false;
		if (t.frequency === "monthly") {
			return t.date.slice(0, 7) <= yearMonth;
		}
		return t.date.startsWith(yearMonth);
	});
	for (const t of incomingTransfers) {
		totalInflow += t.amount;
		const isRecurring = t.frequency === "monthly";
		actions.push({
			id: `action_in_${t.id}_${yearMonth}`,
			entityId: account.id,
			date: isRecurring ? `${yearMonth}-01` : t.date,
			title: isRecurring ? `Recurring Capital Injected: ${t.note}` : `Capital Injected: ${t.note}`,
			type: "inflow",
			category: "capital_transfer",
			reference: t.id,
			amount: t.amount,
		});
	}

	// Inflows from revenue streams (respects start/end month window and one-time specificity)
	const activeRevenues = revenues.filter(
		(r) =>
			r.entityId === account.id &&
			r.active &&
			(!r.startMonth || (r.frequency === "one_time" ? yearMonth === r.startMonth : yearMonth >= r.startMonth)) &&
			(!r.endMonth || yearMonth <= r.endMonth),
	);
	for (const r of activeRevenues) {
		const monthlyAmount =
			r.frequency === "yearly" ? round2(r.amount / 12) : r.amount;
		totalInflow += monthlyAmount;
		actions.push({
			id: `action_rev_${r.id}`,
			entityId: account.id,
			date: `${yearMonth}-15`,
			title: `Revenue: ${r.name} (${r.source.toUpperCase()})`,
			type: "inflow",
			category: "revenue",
			reference: r.id,
			amount: monthlyAmount,
		});
	}

	// Inflows from career salary (personal or business payroll)
	// If already configured as a revenue stream with source 'salary', the revenue stream's schedule governs strictly.
	// Never fall back to legacy account.salary if ANY salary revenue exists or if revenues are configured for this account.
	const hasConfiguredSalary = revenues.some(
		(r) => r.entityId === account.id && (r.source === "salary" || r.id === "rev_career_prame" || r.id.startsWith("rev_career")),
	);
	const hasAnyRevenuesForEntity = revenues.some((r) => r.entityId === account.id);
	if (account.salary && !hasConfiguredSalary && !hasAnyRevenuesForEntity) {
		const payday = account.paydayDayOfMonth ?? 28;
		const dateStr = `${yearMonth}-${String(payday).padStart(2, "0")}`;
		totalInflow += account.salary;
		actions.push({
			id: `action_salary_${account.id}`,
			entityId: account.id,
			date: dateStr,
			title: `Monthly Base Salary (${account.name})`,
			type: "inflow",
			category: "salary",
			reference: "SALARY-PAYDAY",
			amount: account.salary,
		});
	}

	// 2. Outflows (Cash & Subscriptions)
	let totalCashOutflow = 0;

	// Outflows to capital transfers (one_time or monthly recurring)
	const outgoingTransfers = transfers.filter((t) => {
		if (t.fromEntityId !== account.id) return false;
		if (t.frequency === "monthly") {
			return t.date.slice(0, 7) <= yearMonth;
		}
		return t.date.startsWith(yearMonth);
	});
	for (const t of outgoingTransfers) {
		totalCashOutflow += t.amount;
		const isRecurring = t.frequency === "monthly";
		actions.push({
			id: `action_out_${t.id}_${yearMonth}`,
			entityId: account.id,
			date: isRecurring ? `${yearMonth}-01` : t.date,
			title: isRecurring ? `Recurring Capital Deployed: ${t.note}` : `Capital Deployed: ${t.note}`,
			type: "outflow",
			category: "capital_transfer",
			reference: t.id,
			amount: -t.amount,
		});
	}

	// Outflows from subscriptions
	const entitySubs = subscriptions.filter((s) => {
		if (s.entityId !== account.id || !s.active) return false;
		if (s.cycle === "one_time") {
			return s.nextRenewalDate.startsWith(yearMonth);
		}
		return true;
	});
	for (const s of entitySubs) {
		const monthlyCost = calculateMonthlyEquivalent(s.amount, s.cycle);
		totalCashOutflow += monthlyCost;
		actions.push({
			id: `action_sub_${s.id}`,
			entityId: account.id,
			date: s.nextRenewalDate.startsWith(yearMonth) ? s.nextRenewalDate : `${yearMonth}-20`,
			title: `${s.name} (${s.cycle})`,
			type: "outflow",
			category: s.category,
			reference: s.id,
			amount: -monthlyCost,
		});
	}

	// Outflows from liabilities & debt service
	const entityLiab = liabilities.filter((l) => l.entityId === account.id && l.active);
	for (const l of entityLiab) {
		totalCashOutflow += l.amount;
		actions.push({
			id: `action_liab_${l.id}`,
			entityId: account.id,
			date: `${yearMonth}-10`,
			title: `Debt Service: ${l.name}`,
			type: "outflow",
			category: "liability",
			reference: l.id,
			amount: -l.amount,
		});
	}

	// 3. Depreciation (Non-Cash Burn)
	let totalDepreciation = 0;
	const entityHw = hardware.filter((h) => h.entityId === account.id);
	for (const h of entityHw) {
		const dep = calculateAssetDepreciation(h, yearMonth);
		if (dep.monthlyRate > 0) {
			totalDepreciation += dep.monthlyRate;
			actions.push({
				id: `action_hw_${h.id}`,
				entityId: account.id,
				date: `${yearMonth}-28`,
				title: `Depreciation: ${h.name}`,
				type: "depreciation",
				category: h.category,
				reference: h.id,
				amount: -dep.monthlyRate,
			});
		}
	}

	// Sort actions by date ascending
	actions.sort((a, b) => a.date.localeCompare(b.date));

	function calcMonthCashFlow(ym: string): { inflow: number; outflow: number; net: number } {
		let inflow = 0;
		const incoming = transfers.filter((t) => {
			if (t.toEntityId !== account.id) return false;
			if (t.frequency === "monthly") return t.date.slice(0, 7) <= ym;
			return t.date.startsWith(ym);
		});
		for (const t of incoming) inflow += t.amount;

		const activeRevs = revenues.filter(
			(r) =>
				r.entityId === account.id &&
				r.active &&
				(!r.startMonth || (r.frequency === "one_time" ? ym === r.startMonth : ym >= r.startMonth)) &&
				(!r.endMonth || ym <= r.endMonth),
		);
		for (const r of activeRevs) {
			inflow += r.frequency === "yearly" ? round2(r.amount / 12) : r.amount;
		}

		if (account.salary && !hasConfiguredSalary && !hasAnyRevenuesForEntity) {
			inflow += account.salary;
		}

		let outflow = 0;
		const outgoing = transfers.filter((t) => {
			if (t.fromEntityId !== account.id) return false;
			if (t.frequency === "monthly") return t.date.slice(0, 7) <= ym;
			return t.date.startsWith(ym);
		});
		for (const t of outgoing) outflow += t.amount;

		const entitySubs = subscriptions.filter((s) => {
			if (s.entityId !== account.id || !s.active) return false;
			if (s.cycle === "one_time") return s.nextRenewalDate.startsWith(ym);
			return true;
		});
		for (const s of entitySubs) {
			outflow += calculateMonthlyEquivalent(s.amount, s.cycle);
		}

		const entityLiab = liabilities.filter((l) => l.entityId === account.id && l.active);
		for (const l of entityLiab) outflow += l.amount;

		return { inflow: round2(inflow), outflow: round2(outflow), net: round2(inflow - outflow) };
	}

	const baselineMonth = "2026-10";
	const baseTreasury = calculateCurrentTreasury({ account, hardware, transfers });

	let startingTreasury = baseTreasury;
	if (yearMonth > baselineMonth) {
		const priorMonths = getYearMonthRange(baselineMonth, shiftYearMonth(yearMonth, -1));
		for (const m of priorMonths) {
			startingTreasury = round2(startingTreasury + calcMonthCashFlow(m).net);
		}
	} else if (yearMonth < baselineMonth) {
		const pastMonths = getYearMonthRange(yearMonth, shiftYearMonth(baselineMonth, -1));
		for (const m of pastMonths) {
			startingTreasury = round2(startingTreasury - calcMonthCashFlow(m).net);
		}
	}

	const netCashFlow = round2(totalInflow - totalCashOutflow);
	const endingTreasury = round2(startingTreasury + netCashFlow);

	// Total monthly burn rate includes subscriptions + liabilities (depreciation is non-cash)
	const monthlyBurn = totalCashOutflow;
	const netBurn = Math.max(0, monthlyBurn - totalInflow);
	const runwayMonths = calculateRunway(startingTreasury, netBurn);
	const isDefaultAlive = totalInflow > 0 && totalInflow >= monthlyBurn;

	return {
		summary: {
			entityId: account.id,
			yearMonth,
			startingTreasury: round2(startingTreasury),
			endingTreasury: round2(endingTreasury),
			totalInflow: round2(totalInflow),
			totalCashOutflow: round2(totalCashOutflow),
			totalDepreciation: round2(totalDepreciation),
			netCashFlow,
			runwayMonths,
			isDefaultAlive,
		},
		actions,
	};
}
