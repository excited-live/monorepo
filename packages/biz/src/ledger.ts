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
 * amortised here \u2014 those belong in end-of-month treasury.
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

	const current = calculateCurrentTreasury({ account, hardware, transfers });

	const activeRevenues = revenues.filter((r) => {
		if (r.entityId !== account.id || !r.active) return false;
		if (yearMonth) {
			if (r.frequency === "one_time") return r.startMonth === yearMonth;
			if (r.startMonth && yearMonth < r.startMonth) return false;
			if (r.endMonth && yearMonth > r.endMonth) return false;
		}
		return true;
	});

	// Inflows from career salary (personal or business payroll)
	// If already configured as a revenue stream with source 'salary', the revenue stream's schedule governs strictly.
	// Never fall back to legacy account.salary if ANY salary revenue exists or if revenues are configured for this account.
	const hasConfiguredSalary = revenues.some(
		(r) => r.entityId === account.id && (r.source === "salary" || r.id === "rev_career_prame" || r.id.startsWith("rev_career")),
	);
	const hasAnyRevenuesForEntity = revenues.some((r) => r.entityId === account.id);
	const salaryInflow = account.salary && !hasConfiguredSalary && !hasAnyRevenuesForEntity ? account.salary : 0;

	const monthlyIncome = activeRevenues.reduce(
		(acc, r) => acc + (r.frequency === "yearly" ? round2(r.amount / 12) : r.amount),
		salaryInflow,
	);

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

	const activeLiab = liabilities.filter((l) => l.entityId === account.id && l.active);
	const monthlyLiabilities = activeLiab.reduce((acc, l) => acc + l.amount, 0);

	return round2(current + monthlyIncome - monthlySubscriptions - monthlyLiabilities);
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

	const startingTreasury = calculateCurrentTreasury({ account, hardware, transfers });
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
