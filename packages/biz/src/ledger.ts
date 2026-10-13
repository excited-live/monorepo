import { calculateAssetDepreciation, calculateMonthlyEquivalent, calculateRunway, round2 } from "./math";
import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LedgerActionItem,
	MonthlySummary,
	RecurringSubscription,
	RevenueStream,
} from "./types";

export function generateMonthlyLedger(params: {
	account: EntityAccount;
	yearMonth: string; // "YYYY-MM"
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
}): { summary: MonthlySummary; actions: LedgerActionItem[] } {
	const { account, yearMonth, subscriptions, hardware, revenues, transfers } = params;

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

	// Inflows from revenue streams
	const activeRevenues = revenues.filter((r) => r.entityId === account.id && r.active);
	for (const r of activeRevenues) {
		totalInflow += r.amount;
		actions.push({
			id: `action_rev_${r.id}`,
			entityId: account.id,
			date: `${yearMonth}-15`,
			title: `Revenue: ${r.name} (${r.source.toUpperCase()})`,
			type: "inflow",
			category: "revenue",
			reference: r.id,
			amount: r.amount,
		});
	}

	// Inflows from fulltime job salary
	if (account.type === "fulltime_job" && account.salary) {
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
	const runwayMonths = account.type === "fulltime_job" ? null : calculateRunway(endingTreasury, netBurn);
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
