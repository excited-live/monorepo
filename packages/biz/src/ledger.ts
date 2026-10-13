import { calculateAssetDepreciation, calculateMonthlyEquivalent, calculateRunway, isCashAsset, round2 } from "./math";
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
 * Cash on hand today: cash assets plus net capital transfers. No monthly flows
 * are applied, so this is the number you can check against a bank balance
 * mid-month (before this month's income/expenses have happened).
 */
export function calculateCurrentTreasury(params: {
	account: EntityAccount;
	hardware: HardwareAsset[];
	transfers: CapitalTransfer[];
}): number {
	const { account, hardware, transfers } = params;

	const cashAssets = hardware
		.filter((h) => h.entityId === account.id && isCashAsset(h))
		.reduce((acc, h) => acc + h.cost, 0);
	const capitalIn = transfers
		.filter((t) => t.toEntityId === account.id)
		.reduce((acc, t) => acc + t.amount, 0);
	const capitalOut = transfers
		.filter((t) => t.fromEntityId === account.id)
		.reduce((acc, t) => acc + t.amount, 0);

	return round2(cashAssets + capitalIn - capitalOut);
}

/**
 * End-of-month treasury = current treasury + income − expenses:
 *
 *   treasury = cash assets + net capital transfers + income − expenses
 *
 * where cash assets are the `category: "cash"` entries recorded in the Assets
 * tab, income is the active monthly run-rate (yearly revenues amortised,
 * one-time streams excluded) and expenses are active monthly subscriptions
 * plus active debt service. Pure and deterministic: no clock, no locale.
 */
export function calculateDerivedTreasury(params: {
	account: EntityAccount;
	subscriptions: RecurringSubscription[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	hardware: HardwareAsset[];
	liabilities?: LiabilityStream[];
}): number {
	const { account, subscriptions, revenues, transfers, hardware, liabilities = [] } = params;

	const current = calculateCurrentTreasury({ account, hardware, transfers });

	const activeRevenues = revenues.filter((r) => r.entityId === account.id && r.active);
	const hasSalaryStream = activeRevenues.some((r) => r.source === "salary");
	const legacySalary = hasSalaryStream ? 0 : (account.salary ?? 0);
	const income = activeRevenues.reduce(
		(acc, r) =>
			acc +
			(r.frequency === "monthly" ? r.amount : r.frequency === "yearly" ? round2(r.amount / 12) : 0),
		legacySalary,
	);

	const expenses =
		subscriptions
			.filter((s) => s.entityId === account.id && s.active)
			.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0) +
		liabilities
			.filter((l) => l.entityId === account.id && l.active)
			.reduce((acc, l) => acc + l.amount, 0);

	return round2(current + income - expenses);
}

export function generateMonthlyLedger(params: {
	account: EntityAccount;
	yearMonth: string; // "YYYY-MM"
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	liabilities?: LiabilityStream[];
}): { summary: MonthlySummary; actions: LedgerActionItem[] } {
	const { account, yearMonth, subscriptions, hardware, revenues, transfers, liabilities = [] } = params;

	const actions: LedgerActionItem[] = [];

	// 1. Inflows
	let totalInflow = 0;

	// Inflows from capital transfers
	const incomingTransfers = transfers.filter(
		(t) => t.toEntityId === account.id && t.date.startsWith(yearMonth),
	);
	for (const t of incomingTransfers) {
		totalInflow += t.amount;
		actions.push({
			id: `action_${t.id}`,
			entityId: account.id,
			date: t.date,
			title: `Capital Inflow: ${t.note}`,
			type: "inflow",
			category: "capital_transfer",
			reference: t.id,
			amount: t.amount,
		});
	}

	// Inflows from revenue streams (respects start/end month window)
	const activeRevenues = revenues.filter(
		(r) =>
			r.entityId === account.id &&
			r.active &&
			(!r.startMonth || yearMonth >= r.startMonth) &&
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
	// If already tracked as a revenue stream with source 'salary', avoid double-counting
	const hasSalaryInRevenues = activeRevenues.some((r) => r.source === "salary");
	if (account.salary && !hasSalaryInRevenues) {
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

	// Outflows to capital transfers
	const outgoingTransfers = transfers.filter(
		(t) => t.fromEntityId === account.id && t.date.startsWith(yearMonth),
	);
	for (const t of outgoingTransfers) {
		totalCashOutflow += t.amount;
		actions.push({
			id: `action_out_${t.id}`,
			entityId: account.id,
			date: t.date,
			title: `Capital Deployed: ${t.note}`,
			type: "outflow",
			category: "capital_transfer",
			reference: t.id,
			amount: -t.amount,
		});
	}

	// Outflows from subscriptions
	const entitySubs = subscriptions.filter((s) => s.entityId === account.id && s.active);
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
				id: `action_dep_${h.id}`,
				entityId: account.id,
				date: `${yearMonth}-28`,
				title: `${h.name} Straight-Line Depreciation (${dep.elapsedMonths}/${h.lifespanMonths} mos)`,
				type: "depreciation",
				category: "asset_depreciation",
				reference: h.id,
				amount: -dep.monthlyRate,
			});
		}
	}

	totalInflow = round2(totalInflow);
	totalCashOutflow = round2(totalCashOutflow);
	totalDepreciation = round2(totalDepreciation);
	const netCashFlow = round2(totalInflow - totalCashOutflow);
	const netBurn = round2(totalCashOutflow + totalDepreciation - totalInflow);

	// Sort actions by date
	actions.sort((a, b) => a.date.localeCompare(b.date));

	const startingTreasury = account.cashReserve;
	const endingTreasury = round2(startingTreasury + netCashFlow);
	const runwayMonths = calculateRunway(endingTreasury, netBurn);
	const isDefaultAlive = netBurn <= 0;

	const summary: MonthlySummary = {
		entityId: account.id,
		yearMonth,
		startingTreasury,
		totalInflow,
		totalCashOutflow,
		totalDepreciation,
		netCashFlow,
		endingTreasury,
		runwayMonths,
		isDefaultAlive,
	};

	return { summary, actions };
}
