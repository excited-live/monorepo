import {
	calculateAssetDepreciation,
	calculateMonthlyEquivalent,
	calculateRunway,
	getYearMonthRange,
	hardwareToWallet,
	isCashAsset,
	round2,
	shiftYearMonth,
} from "./math";
import type {
	CapitalTransfer,
	CashWallet,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
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

export interface WalletBalanceBreakdown {
	openingBalance: number;
	assetInjections: number;
	currentCashOnHand: number;
	netOperatingCash: number;
	projectedEomBalance: number;
	effectiveBalance: number;
	isDefault: boolean;
}

/**
 * Pure wallet balance derivation (Stock vs Flow):
 *   - openingBalance: current recorded base cash
 *   - currentCashOnHand: openingBalance + net capital transfers (Stock: money in hand today)
 *   - netOperatingCash: operational cashflow (Flow: monthly income - expense)
 *   - projectedEomBalance: currentCashOnHand + netOperatingCash (Forecast: end of month)
 */
export function calculateWalletBalance(params: {
	wallet: CashWallet;
	wallets?: CashWallet[];
	transfers: CapitalTransfer[];
	account?: EntityAccount;
	subscriptions?: RecurringSubscription[];
	revenues?: RevenueStream[];
	liabilities?: LiabilityStream[];
	yearMonth?: string;
	baselineMonth?: string;
}): WalletBalanceBreakdown {
	const {
		wallet,
		wallets = [wallet],
		transfers,
		account,
		subscriptions = [],
		revenues = [],
		liabilities = [],
		yearMonth,
		baselineMonth = "2026-10",
	} = params;

	// Determine if this is the designated default wallet for the entity
	const isDefaultWallet = Boolean(
		wallet.isDefault ||
		(!wallets.some((w) => w.isDefault) && wallets[0]?.id === wallet.id),
	);

	// Capital transfers: targeted specifically to this wallet, plus untargeted transfers if default wallet
	const targetedIncoming = transfers
		.filter((t) => t.toEntityId === wallet.entityId && t.targetAssetId === wallet.id)
		.reduce((sum, t) => sum + t.amount, 0);

	const untargetedIncoming = isDefaultWallet
		? transfers
				.filter((t) => t.toEntityId === wallet.entityId && !t.targetAssetId)
				.reduce((sum, t) => sum + t.amount, 0)
		: 0;

	const outgoing = isDefaultWallet
		? transfers
				.filter((t) => t.fromEntityId === wallet.entityId)
				.reduce((sum, t) => sum + t.amount, 0)
		: 0;

	const assetInjections = round2(targetedIncoming + untargetedIncoming - outgoing);
	const currentCashOnHand = round2(wallet.balance + assetInjections);

	// Operating cash: income minus expenses accumulated from baseline month up to yearMonth
	let netOperatingCash = 0;
	if (isDefaultWallet && (revenues.length > 0 || subscriptions.length > 0 || liabilities.length > 0 || account?.salary)) {
		const entityAccount: EntityAccount = account ?? {
			id: wallet.entityId,
			name: wallet.name,
			type: "business",
			cashReserve: 0,
			currency: "THB",
		};
		const startYm = baselineMonth;
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

	const projectedEomBalance = round2(currentCashOnHand + netOperatingCash);

	return {
		openingBalance: wallet.balance,
		assetInjections,
		currentCashOnHand,
		netOperatingCash,
		projectedEomBalance,
		effectiveBalance: projectedEomBalance,
		isDefault: isDefaultWallet,
	};
}

/**
 * Resolves the effective balance of a cash asset / wallet:
 *   - Base cost
 *   - Plus targeted capital transfers (or untargeted transfers if this is the default wallet)
 *   - Plus net operating cash (income - expense) accumulated from baseline month up to yearMonth
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
	currentCashOnHand: number;
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
			currentCashOnHand: dep.remainingBookValue,
			netOperatingCash: 0,
			effectiveBalance: dep.remainingBookValue,
			isDefault: false,
		};
	}

	const wallet = hardwareToWallet(asset);
	const cashWallets = hardware
		.filter((h) => h.entityId === asset.entityId && isCashAsset(h))
		.map(hardwareToWallet);

	const baselineMonth = asset.purchaseDate ? asset.purchaseDate.slice(0, 7) : "2026-10";

	const result = calculateWalletBalance({
		wallet,
		wallets: cashWallets,
		transfers,
		account,
		subscriptions,
		revenues,
		liabilities,
		yearMonth,
		baselineMonth,
	});

	return {
		baseCost: result.openingBalance,
		assetInjections: result.assetInjections,
		currentCashOnHand: result.currentCashOnHand,
		netOperatingCash: result.netOperatingCash,
		effectiveBalance: result.effectiveBalance,
		isDefault: result.isDefault,
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
	actions: Array<{
		id: string;
		date: string;
		description: string;
		amount: number;
		direction: "inflow" | "outflow";
		category: string;
		counterparty?: string;
	}>;
	summary: {
		entityId?: string;
		yearMonth?: string;
		startingTreasury: number;
		totalInflow: number;
		totalCashOutflow: number;
		totalDepreciation: number;
		netCashFlow: number;
		endingTreasury: number;
		runwayMonths?: number | null;
		isDefaultAlive?: boolean;
		status: "DEFAULT ALIVE" | "DEFAULT DEAD";
	};
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

	const actions: Array<{
		id: string;
		date: string;
		description: string;
		amount: number;
		direction: "inflow" | "outflow";
		category: string;
		counterparty?: string;
	}> = [];

	let totalInflow = 0;
	let totalCashOutflow = 0;

	// Inflows: Revenues
	const activeRevenues = revenues.filter((r) => {
		if (r.entityId !== account.id || !r.active) return false;
		if (r.frequency === "one_time") return r.startMonth === yearMonth;
		if (r.startMonth && yearMonth < r.startMonth) return false;
		if (r.endMonth && yearMonth > r.endMonth) return false;
		return true;
	});

	for (const rev of activeRevenues) {
		const amt = rev.frequency === "yearly" ? round2(rev.amount / 12) : rev.amount;
		totalInflow += amt;
		actions.push({
			id: rev.id,
			date: `${yearMonth}-01`,
			description: rev.name,
			amount: amt,
			direction: "inflow",
			category: "revenue",
		});
	}

	// Inflows: Legacy Salary if no salary revenue streams
	const hasConfiguredSalary = revenues.some(
		(r) => r.entityId === account.id && (r.source === "salary" || r.id === "rev_career_prame" || r.id.startsWith("rev_career")),
	);
	const hasAnyRevenuesForEntity = revenues.some((r) => r.entityId === account.id);
	if (account.salary && !hasConfiguredSalary && !hasAnyRevenuesForEntity) {
		totalInflow += account.salary;
		const payday = String(account.paydayDayOfMonth || 28).padStart(2, "0");
		actions.push({
			id: "action_salary",
			date: `${yearMonth}-${payday}`,
			description: "Career Salary",
			amount: account.salary,
			direction: "inflow",
			category: "salary",
		});
	}

	// Inflows: Incoming Transfers
	const incomingTransfers = transfers.filter((t) => {
		if (t.toEntityId !== account.id) return false;
		if (t.frequency === "monthly") return t.date.slice(0, 7) <= yearMonth;
		return t.date.startsWith(yearMonth);
	});

	for (const tx of incomingTransfers) {
		totalInflow += tx.amount;
		actions.push({
			id: tx.id,
			date: tx.date,
			description: tx.note || "Capital Transfer In",
			amount: tx.amount,
			direction: "inflow",
			category: "transfer",
			counterparty: tx.fromEntityId,
		});
	}

	// Outflows: Subscriptions
	const activeSubs = subscriptions.filter((s) => {
		if (s.entityId !== account.id || !s.active) return false;
		if (s.cycle === "one_time") return s.nextRenewalDate.startsWith(yearMonth);
		return true;
	});

	for (const sub of activeSubs) {
		const amt = calculateMonthlyEquivalent(sub.amount, sub.cycle);
		totalCashOutflow += amt;
		actions.push({
			id: sub.id,
			date: sub.nextRenewalDate.startsWith(yearMonth) ? sub.nextRenewalDate : `${yearMonth}-${String(sub.billingDay || 1).padStart(2, "0")}`,
			description: sub.name,
			amount: amt,
			direction: "outflow",
			category: sub.category,
		});
	}

	// Outflows: Outgoing Transfers
	const outgoingTransfers = transfers.filter((t) => {
		if (t.fromEntityId !== account.id) return false;
		if (t.frequency === "monthly") return t.date.slice(0, 7) <= yearMonth;
		return t.date.startsWith(yearMonth);
	});

	for (const tx of outgoingTransfers) {
		totalCashOutflow += tx.amount;
		actions.push({
			id: tx.id,
			date: tx.date,
			description: tx.note || "Capital Transfer Out",
			amount: tx.amount,
			direction: "outflow",
			category: "transfer",
			counterparty: tx.toEntityId,
		});
	}

	// Outflows: Liabilities
	const activeLiab = liabilities.filter((l) => l.entityId === account.id && l.active);
	for (const liab of activeLiab) {
		totalCashOutflow += liab.amount;
		actions.push({
			id: liab.id,
			date: `${yearMonth}-15`,
			description: liab.name,
			amount: liab.amount,
			direction: "outflow",
			category: "liability",
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
				date: `${yearMonth}-28`,
				description: `Depreciation: ${h.name}`,
				amount: dep.monthlyRate,
				direction: "outflow",
				category: "asset_depreciation",
			});
		}
	}
	totalDepreciation = round2(totalDepreciation);

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

	const netMonthlyBurn = Math.max(0, totalCashOutflow - totalInflow);
	const runwayMonths = calculateRunway(startingTreasury, netMonthlyBurn);
	const isDefaultAlive = totalInflow >= totalCashOutflow;
	const status = isDefaultAlive ? "DEFAULT ALIVE" : "DEFAULT DEAD";

	return {
		actions,
		summary: {
			entityId: account.id,
			yearMonth,
			startingTreasury: round2(startingTreasury),
			totalInflow: round2(totalInflow),
			totalCashOutflow: round2(totalCashOutflow),
			totalDepreciation,
			netCashFlow,
			endingTreasury: round2(endingTreasury),
			runwayMonths,
			isDefaultAlive,
			status,
		},
	};
}
