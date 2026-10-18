import {
	calculateAssetDepreciation,
	calculateMonthlyEquivalent,
	daysInMonth,
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

/** Baseline for wallets without a dated opening balance (e.g. "Historical"). */
export const DEFAULT_BASELINE_MONTH = "2026-10";

/** How far ahead runway looks before declaring an entity Default Alive. */
export const RUNWAY_HORIZON_MONTHS = 120;

/**
 * A wallet's balance is true as of its purchaseDate: `YYYY-MM` means the start
 * of that month, `YYYY-MM-DD` the start of that day.
 */
export function walletBaselineMonth(purchaseDate?: string): string {
	return purchaseDate && /^\d{4}-\d{2}/.test(purchaseDate) ? purchaseDate.slice(0, 7) : DEFAULT_BASELINE_MONTH;
}

/** The as-of day of a wallet balance recorded mid-month, if any. */
function walletBaselineDay(purchaseDate?: string): string | undefined {
	return purchaseDate && /^\d{4}-\d{2}-\d{2}/.test(purchaseDate) ? purchaseDate.slice(0, 10) : undefined;
}

/** One-time transfers hit their own month; monthly ones recur from their start month. */
export function isTransferInMonth(transfer: CapitalTransfer, yearMonth: string): boolean {
	if (transfer.frequency === "monthly") return transfer.date.slice(0, 7) <= yearMonth;
	return transfer.date.startsWith(yearMonth);
}

/** Inside the optional [startMonth, endMonth] window; missing bounds are open. */
function isWithinMonths(item: { startMonth?: string; endMonth?: string }, yearMonth: string): boolean {
	if (item.startMonth && yearMonth < item.startMonth) return false;
	if (item.endMonth && yearMonth > item.endMonth) return false;
	return true;
}

/** Active income counted in yearMonth: one-time income only in its start month. */
export function isRevenueInMonth(revenue: RevenueStream, yearMonth: string): boolean {
	if (!revenue.active) return false;
	if (revenue.frequency === "one_time") return revenue.startMonth === yearMonth;
	return isWithinMonths(revenue, yearMonth);
}

/** Active expense charged in yearMonth: one-time expenses only in their charge month. */
export function isSubscriptionInMonth(subscription: RecurringSubscription, yearMonth: string): boolean {
	if (!subscription.active) return false;
	if (subscription.cycle === "one_time") return subscription.nextRenewalDate.startsWith(yearMonth);
	return isWithinMonths(subscription, yearMonth);
}

/** Active debt payment due in yearMonth. */
export function isLiabilityInMonth(liability: LiabilityStream, yearMonth: string): boolean {
	return liability.active && isWithinMonths(liability, yearMonth);
}

/** Day-of-month part of a YYYY-MM-DD date, or fallback for YYYY-MM dates. */
function dayOfMonth(date: string, fallback: number): number {
	return /^\d{4}-\d{2}-\d{2}/.test(date) ? Number(date.slice(8, 10)) : fallback;
}

/** `YYYY-MM-DD` for a day in yearMonth, clamped to the month's length (31 → 28 in Feb). */
function dateInMonth(yearMonth: string, day: number): string {
	const clamped = Math.min(Math.max(1, day), daysInMonth(yearMonth));
	return `${yearMonth}-${String(clamped).padStart(2, "0")}`;
}

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
	const activeRevenues = revenues.filter(
		(r) => r.entityId === account.id && (yearMonth ? isRevenueInMonth(r, yearMonth) : r.active),
	);

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
	const activeSubs = subscriptions.filter(
		(s) => s.entityId === account.id && (yearMonth ? isSubscriptionInMonth(s, yearMonth) : s.active),
	);
	const monthlySubscriptions = activeSubs.reduce(
		(acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle),
		0,
	);

	// Outflows from liabilities
	const activeLiab = liabilities.filter(
		(l) => l.entityId === account.id && (yearMonth ? isLiabilityInMonth(l, yearMonth) : l.active),
	);
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
	/**
	 * YYYY-MM-DD inside baselineMonth when the balance was recorded mid-month:
	 * it then already includes this wallet's movements dated before that day.
	 */
	baselineDay?: string;
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
		baselineMonth = DEFAULT_BASELINE_MONTH,
		baselineDay,
	} = params;

	// Determine if this is the designated default wallet for the entity
	const isDefaultWallet = Boolean(
		wallet.isDefault ||
		(!wallets.some((w) => w.isDefault) && wallets[0]?.id === wallet.id),
	);

	// Capital transfers land on their target wallet; untargeted ones (or ones whose
	// target no longer exists) land on the default wallet, which also funds outgoing ones.
	const walletIds = new Set(wallets.map((w) => w.id));
	const transferShare = (t: CapitalTransfer): number => {
		let delta = 0;
		if (t.toEntityId === wallet.entityId) {
			const isTargeted = Boolean(t.targetAssetId && walletIds.has(t.targetAssetId));
			if (isTargeted ? t.targetAssetId === wallet.id : isDefaultWallet) delta += t.amount;
		}
		if (t.fromEntityId === wallet.entityId && isDefaultWallet) delta -= t.amount;
		return delta;
	};
	const transferDelta = (ym: string): number =>
		transfers.reduce((sum, t) => (isTransferInMonth(t, ym) ? sum + transferShare(t) : sum), 0);

	const entityAccount: EntityAccount = account ?? {
		id: wallet.entityId,
		name: wallet.name,
		type: "business",
		cashReserve: 0,
		currency: "THB",
	};
	const operatingDelta = (ym: string): number =>
		isDefaultWallet
			? calculateEntityMonthlyOperatingCash({
					account: entityAccount,
					revenues,
					subscriptions,
					liabilities,
					yearMonth: ym,
				}).netOperatingCash
			: 0;

	// wallet.balance is the balance at the start of baselineMonth. Flows are
	// accumulated through the end of yearMonth: forwards from the baseline, or
	// backwards (un-applying months) when yearMonth precedes it.
	const startYm = baselineMonth;
	const effectiveYm = yearMonth ?? startYm;
	const forwards = effectiveYm >= startYm;
	const months = forwards
		? getYearMonthRange(startYm, effectiveYm)
		: getYearMonthRange(shiftYearMonth(effectiveYm, 1), shiftYearMonth(startYm, -1));
	const sign = forwards ? 1 : -1;

	let assetInjections = 0;
	let netOperatingCash = 0;
	for (const ym of months) {
		assetInjections = round2(assetInjections + sign * transferDelta(ym));
		netOperatingCash = round2(netOperatingCash + sign * operatingDelta(ym));
	}

	// A balance recorded mid-month already reflects this wallet's movements dated
	// before that day; take them out so they are not applied twice.
	if (baselineDay && baselineDay.startsWith(startYm) && baselineDay.slice(0, 10) > `${startYm}-01`) {
		const transfersById = new Map(transfers.map((t) => [t.id, t]));
		const { actions } = buildMonthlyActions({
			account: entityAccount,
			yearMonth: startYm,
			subscriptions,
			hardware: [],
			revenues,
			transfers,
			liabilities,
		});
		for (const action of actions) {
			if (action.date >= baselineDay.slice(0, 10)) continue;
			if (action.category === "transfer") {
				const tx = transfersById.get(action.id);
				if (tx) assetInjections = round2(assetInjections - transferShare(tx));
			} else if (isDefaultWallet) {
				const signed = action.direction === "inflow" ? action.amount : -action.amount;
				netOperatingCash = round2(netOperatingCash - signed);
			}
		}
	}

	const currentCashOnHand = round2(wallet.balance + assetInjections);
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

	const result = calculateWalletBalance({
		wallet,
		wallets: cashWallets,
		transfers,
		account,
		subscriptions,
		revenues,
		liabilities,
		yearMonth,
		baselineMonth: walletBaselineMonth(asset.purchaseDate),
		baselineDay: walletBaselineDay(asset.purchaseDate),
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

interface EntityFlowParams {
	account: EntityAccount;
	hardware: HardwareAsset[];
	transfers: CapitalTransfer[];
	subscriptions?: RecurringSubscription[];
	revenues?: RevenueStream[];
	liabilities?: LiabilityStream[];
}

/**
 * Treasury at the end of yearMonth: the sum of the entity's cash wallets. An
 * entity without any cash wallet gets a virtual default wallet (seeded from the
 * legacy account.cashReserve) so its flows still accumulate. Without yearMonth each wallet is read at its own
 * baseline month.
 */
function calculateTreasuryAtEndOfMonth(params: EntityFlowParams & { yearMonth?: string }): number {
	const { account, hardware, transfers, subscriptions = [], revenues = [], liabilities = [], yearMonth } = params;

	const cashAssets = hardware.filter((h) => h.entityId === account.id && isCashAsset(h));
	if (cashAssets.length === 0) {
		const virtualWallet: CashWallet = {
			id: `virtual_${account.id}`,
			entityId: account.id,
			name: account.name,
			balance: account.cashReserve,
			isDefault: true,
		};
		return calculateWalletBalance({
			wallet: virtualWallet,
			transfers,
			account,
			subscriptions,
			revenues,
			liabilities,
			yearMonth,
			baselineMonth: DEFAULT_BASELINE_MONTH,
		}).effectiveBalance;
	}

	return round2(
		cashAssets.reduce(
			(sum, h) =>
				sum +
				calculateCashAssetBalance({
					asset: h,
					hardware,
					transfers,
					account,
					subscriptions,
					revenues,
					liabilities,
					yearMonth,
				}).effectiveBalance,
			0,
		),
	);
}

/**
 * Treasury at the start of yearMonth (= end of the previous month). This is the
 * single source of truth for "cash now" used by the ledger, hero cards,
 * projection chart and runway.
 */
export function calculateOpeningTreasury(params: EntityFlowParams & { yearMonth: string }): number {
	return calculateTreasuryAtEndOfMonth({ ...params, yearMonth: shiftYearMonth(params.yearMonth, -1) });
}

/**
 * Cash flow of an entity in one month: operating income/expenses plus capital
 * transfers in and out. Matches the ledger's inflow/outflow totals.
 */
export function calculateEntityMonthlyCashFlow(params: {
	account: EntityAccount;
	transfers: CapitalTransfer[];
	subscriptions?: RecurringSubscription[];
	revenues?: RevenueStream[];
	liabilities?: LiabilityStream[];
	yearMonth: string;
}): { inflow: number; outflow: number; net: number } {
	const { account, transfers, subscriptions = [], revenues = [], liabilities = [], yearMonth } = params;

	const operating = calculateEntityMonthlyOperatingCash({
		account,
		revenues,
		subscriptions,
		liabilities,
		yearMonth,
	});
	const monthTransfers = transfers.filter((t) => isTransferInMonth(t, yearMonth));
	const transferIn = monthTransfers
		.filter((t) => t.toEntityId === account.id)
		.reduce((acc, t) => acc + t.amount, 0);
	const transferOut = monthTransfers
		.filter((t) => t.fromEntityId === account.id)
		.reduce((acc, t) => acc + t.amount, 0);

	const inflow = round2(operating.totalIncome + transferIn);
	const outflow = round2(operating.totalExpense + transferOut);
	return { inflow, outflow, net: round2(inflow - outflow) };
}

/**
 * Runway = months until cash runs out, found by walking the month-by-month cash
 * flow forward from the opening treasury of yearMonth. Fractional months are
 * interpolated within the month the balance crosses zero. One-off items and
 * streams that start/end later are all accounted for; a burn that outlasts the
 * horizon is extrapolated at the horizon's steady-state rate. An entity that is
 * overdrawn and stays below zero after this month's flow has 0 months; a dip
 * that recovers within the month does not count. Returns null runway when cash never runs out;
 * that counts as Default Alive only if the entity has any inflow (an empty
 * account is neither alive nor dead).
 */
export function calculateRunwayProjection(
	params: EntityFlowParams & {
		yearMonth: string;
		openingTreasury?: number;
		horizonMonths?: number;
	},
): { runwayMonths: number | null; isDefaultAlive: boolean } {
	const { yearMonth, horizonMonths = RUNWAY_HORIZON_MONTHS } = params;
	const flowAt = (i: number) => calculateEntityMonthlyCashFlow({ ...params, yearMonth: shiftYearMonth(yearMonth, i) });

	let balance = params.openingTreasury ?? calculateOpeningTreasury(params);

	let hasInflow = false;
	for (let i = 0; i < horizonMonths; i++) {
		const flow = flowAt(i);
		if (flow.inflow > 0) hasInflow = true;
		const next = balance + flow.net;
		if (next < 0) {
			// Runs out inside this month (interpolated), or was already overdrawn and
			// this month's flow does not bring it back above zero.
			const runwayMonths = balance > 0 && flow.net < 0 ? round2(i + balance / -flow.net) : i;
			return { runwayMonths, isDefaultAlive: false };
		}
		balance = round2(next);
	}

	const steadyState = flowAt(horizonMonths);
	if (steadyState.net < 0) {
		return { runwayMonths: round2(horizonMonths + balance / -steadyState.net), isDefaultAlive: false };
	}
	return { runwayMonths: null, isDefaultAlive: hasInflow };
}

/** Signed cash movements of one month (depreciation excluded), in date order. */
function monthlyCashMovements(params: EntityFlowParams & { yearMonth: string }): Array<{ date: string; delta: number }> {
	const { subscriptions = [], revenues = [], liabilities = [] } = params;
	return buildMonthlyActions({ ...params, subscriptions, revenues, liabilities })
		.actions.filter((a) => a.category !== "asset_depreciation")
		.map((a) => ({ date: a.date, delta: a.direction === "inflow" ? a.amount : -a.amount }));
}

/**
 * Treasury at the end of a given day (YYYY-MM-DD): the month's opening
 * treasury plus every cash movement dated on or before that day (salary on
 * payday, expenses on their charge day, transfers on their date). This is the
 * hero card's "NOW" for the current month.
 */
export function calculateTreasuryAsOf(params: EntityFlowParams & { asOfDate: string }): number {
	const day = params.asOfDate.slice(0, 10);
	const yearMonth = day.slice(0, 7);
	const moved = monthlyCashMovements({ ...params, yearMonth })
		.filter((m) => m.date <= day)
		.reduce((acc, m) => acc + m.delta, 0);
	return round2(calculateOpeningTreasury({ ...params, yearMonth }) + moved);
}

/**
 * Cash an entity can spend on asOfDate without going negative later in the
 * month: the lowest running balance from that day to month end, so neither
 * income that has not landed yet nor a dip before payday counts as available.
 */
export function calculateAvailableCash(params: EntityFlowParams & { asOfDate: string }): number {
	const day = params.asOfDate.slice(0, 10);
	const yearMonth = day.slice(0, 7);
	let balance = calculateOpeningTreasury({ ...params, yearMonth });
	let lowest = Number.POSITIVE_INFINITY;
	for (const m of monthlyCashMovements({ ...params, yearMonth })) {
		if (m.date > day && balance < lowest) lowest = balance;
		balance = round2(balance + m.delta);
	}
	return round2(Math.min(lowest, balance));
}

/**
 * Treasury at the end of yearMonth: cash wallets + dated capital transfers +
 * income − expenses accumulated from each wallet's baseline month.
 */
export function calculateCurrentTreasury(params: EntityFlowParams & { yearMonth?: string }): number {
	return calculateTreasuryAtEndOfMonth(params);
}

/**
 * End-of-month treasury = opening treasury + income − expenses ± transfers:
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
	return calculateTreasuryAtEndOfMonth({ ...params, yearMonth: params.yearMonth ?? DEFAULT_BASELINE_MONTH });
}

export interface LedgerAction {
	id: string;
	date: string;
	description: string;
	amount: number;
	direction: "inflow" | "outflow";
	category: string;
	counterparty?: string;
}

interface LedgerParams {
	account: EntityAccount;
	yearMonth: string;
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	liabilities?: LiabilityStream[];
}

/**
 * Every dated movement of one entity in one month (cash plus non-cash
 * depreciation), sorted by date, with the month's cash totals. Pure: no
 * treasury or runway, so it is cheap to call per month.
 */
export function buildMonthlyActions(params: LedgerParams): {
	actions: LedgerAction[];
	totalInflow: number;
	totalCashOutflow: number;
	totalDepreciation: number;
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

	const actions: LedgerAction[] = [];

	let totalInflow = 0;
	let totalCashOutflow = 0;

	// Inflows: Revenues
	const activeRevenues = revenues.filter((r) => r.entityId === account.id && isRevenueInMonth(r, yearMonth));

	for (const rev of activeRevenues) {
		const amt = rev.frequency === "yearly" ? round2(rev.amount / 12) : rev.amount;
		totalInflow += amt;
		// Salary lands on payday; other income on the 1st
		const day = rev.source === "salary" ? account.paydayDayOfMonth || 28 : 1;
		actions.push({
			id: rev.id,
			date: dateInMonth(yearMonth, day),
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
		actions.push({
			id: "action_salary",
			date: dateInMonth(yearMonth, account.paydayDayOfMonth || 28),
			description: "Career Salary",
			amount: account.salary,
			direction: "inflow",
			category: "salary",
		});
	}

	// Inflows: Incoming Transfers
	const incomingTransfers = transfers.filter(
		(t) => t.toEntityId === account.id && isTransferInMonth(t, yearMonth),
	);

	for (const tx of incomingTransfers) {
		totalInflow += tx.amount;
		actions.push({
			id: tx.id,
			date: dateInMonth(yearMonth, dayOfMonth(tx.date, 1)),
			description: tx.note || "Capital Transfer In",
			amount: tx.amount,
			direction: "inflow",
			category: "transfer",
			counterparty: tx.fromEntityId,
		});
	}

	// Outflows: Subscriptions
	const activeSubs = subscriptions.filter((s) => s.entityId === account.id && isSubscriptionInMonth(s, yearMonth));

	for (const sub of activeSubs) {
		const amt = calculateMonthlyEquivalent(sub.amount, sub.cycle);
		totalCashOutflow += amt;
		actions.push({
			id: sub.id,
			date: sub.nextRenewalDate.startsWith(yearMonth)
				? sub.nextRenewalDate
				: dateInMonth(yearMonth, sub.billingDay || dayOfMonth(sub.nextRenewalDate, 1)),
			description: sub.name,
			amount: amt,
			direction: "outflow",
			category: sub.category,
		});
	}

	// Outflows: Outgoing Transfers
	const outgoingTransfers = transfers.filter(
		(t) => t.fromEntityId === account.id && isTransferInMonth(t, yearMonth),
	);

	for (const tx of outgoingTransfers) {
		totalCashOutflow += tx.amount;
		actions.push({
			id: tx.id,
			date: dateInMonth(yearMonth, dayOfMonth(tx.date, 1)),
			description: tx.note || "Capital Transfer Out",
			amount: tx.amount,
			direction: "outflow",
			category: "transfer",
			counterparty: tx.toEntityId,
		});
	}

	// Outflows: Liabilities
	const activeLiab = liabilities.filter((l) => l.entityId === account.id && isLiabilityInMonth(l, yearMonth));
	for (const liab of activeLiab) {
		totalCashOutflow += liab.amount;
		actions.push({
			id: liab.id,
			date: dateInMonth(yearMonth, 15),
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
				date: dateInMonth(yearMonth, 28),
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

	return {
		actions,
		totalInflow: round2(totalInflow),
		totalCashOutflow: round2(totalCashOutflow),
		totalDepreciation,
	};
}

/**
 * Pure ledger derivation engine for a specific entity and month: the month's
 * dated actions plus opening/ending treasury and forward-looking runway.
 */
export function generateMonthlyLedger(params: LedgerParams): {
	actions: LedgerAction[];
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
	const { account, yearMonth } = params;
	const { actions, totalInflow, totalCashOutflow, totalDepreciation } = buildMonthlyActions(params);

	const startingTreasury = calculateOpeningTreasury(params);
	const netCashFlow = round2(totalInflow - totalCashOutflow);
	const endingTreasury = round2(startingTreasury + netCashFlow);

	const { runwayMonths, isDefaultAlive } = calculateRunwayProjection({
		...params,
		openingTreasury: startingTreasury,
	});
	const status = isDefaultAlive ? "DEFAULT ALIVE" : "DEFAULT DEAD";

	return {
		actions,
		summary: {
			entityId: account.id,
			yearMonth,
			startingTreasury: round2(startingTreasury),
			totalInflow,
			totalCashOutflow,
			totalDepreciation,
			netCashFlow,
			endingTreasury,
			runwayMonths,
			isDefaultAlive,
			status,
		},
	};
}
