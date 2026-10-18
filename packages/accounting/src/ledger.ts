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

/** Debt payment falls due in yearMonth: one-time payments only in their start month. */
function isLiabilityDue(liability: LiabilityStream, yearMonth: string): boolean {
	if (!isLiabilityInMonth(liability, yearMonth)) return false;
	return liability.cycle !== "one_time" || yearMonth === liability.startMonth;
}

/**
 * Monthly amount of an income stream: yearly amortised over 12, weekly/quarterly/
 * semi-annual converted to a monthly equivalent, monthly and one-time as entered.
 */
export function revenueMonthlyAmount(revenue: RevenueStream): number {
	switch (revenue.frequency) {
		case "yearly":
			return round2(revenue.amount / 12);
		case "weekly":
		case "quarterly":
		case "semi-annual":
			return calculateMonthlyEquivalent(revenue.amount, revenue.frequency);
		default:
			return revenue.amount;
	}
}

/**
 * Cash a debt payment costs in yearMonth (0 when not due). Monthly or absent
 * cycles pay `amount`; other cycles pay their monthly equivalent.
 * `_transfers` is the seam for loan schedules (not used yet).
 */
export function liabilityPaymentInMonth(
	liability: LiabilityStream,
	yearMonth: string,
	_transfers?: CapitalTransfer[],
): number {
	if (!isLiabilityDue(liability, yearMonth)) return 0;
	if (!liability.cycle || liability.cycle === "monthly") return liability.amount;
	return calculateMonthlyEquivalent(liability.amount, liability.cycle);
}

/**
 * Legacy career salary: applies when the entity has no revenue stream at all and
 * no salary stream configured.
 */
function legacySalaryApplies(account: EntityAccount, revenues: RevenueStream[]): boolean {
	const hasConfiguredSalary = revenues.some(
		(r) => r.entityId === account.id && (r.source === "salary" || r.id === "rev_career_prame" || r.id.startsWith("rev_career")),
	);
	const hasAnyRevenuesForEntity = revenues.some((r) => r.entityId === account.id);
	return !hasConfiguredSalary && !hasAnyRevenuesForEntity;
}

/** A subscription charged to a card (a liability in the list) moves no cash itself. */
function isCardCharged(subscription: RecurringSubscription, liabilities: LiabilityStream[]): boolean {
	return Boolean(
		subscription.paidFromLiabilityId && liabilities.some((l) => l.id === subscription.paidFromLiabilityId),
	);
}

/** The asset with this id, if it is in the list. */
function findAsset(assetId: string | undefined, hardware: HardwareAsset[]): HardwareAsset | undefined {
	return assetId ? hardware.find((h) => h.id === assetId) : undefined;
}

/** Absent or unknown asset ids count as cash (the legacy rule). */
function isCashOrUnknown(assetId: string | undefined, hardware: HardwareAsset[]): boolean {
	const asset = findAsset(assetId, hardware);
	return !asset || isCashAsset(asset);
}

/**
 * Cash a capital transfer brings into entityId. Nothing when the transfer goes to
 * a liability; a fixed or investment target brings no cash.
 */
export function transferCashIn(t: CapitalTransfer, entityId: string, hardware: HardwareAsset[] = []): number {
	if (t.toEntityId !== entityId || t.toLiabilityId) return 0;
	return isCashOrUnknown(t.targetAssetId, hardware) ? t.amount : 0;
}

/**
 * Cash a capital transfer takes out of entityId. Selling an investment (a
 * non-cash source) takes no cash out.
 */
export function transferCashOut(t: CapitalTransfer, entityId: string, hardware: HardwareAsset[] = []): number {
	if (t.fromEntityId !== entityId) return 0;
	return isCashOrUnknown(t.fromAssetId, hardware) ? t.amount : 0;
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
	transfers?: CapitalTransfer[];
	/** Overrides the legacy career-salary rule (used to split a flow across wallets). */
	legacySalary?: boolean;
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
		transfers = [],
		legacySalary,
	} = params;

	// Inflows from revenue streams
	const activeRevenues = revenues.filter(
		(r) => r.entityId === account.id && (yearMonth ? isRevenueInMonth(r, yearMonth) : r.active),
	);

	const salaryApplies = legacySalary ?? legacySalaryApplies(account, revenues);
	const salaryInflow = salaryApplies && account.salary ? account.salary : 0;

	const totalIncome = round2(
		activeRevenues.reduce((acc, r) => acc + revenueMonthlyAmount(r), salaryInflow),
	);

	// Outflows from subscriptions (card-charged ones are not cash here)
	const activeSubs = subscriptions.filter(
		(s) =>
			s.entityId === account.id &&
			(yearMonth ? isSubscriptionInMonth(s, yearMonth) : s.active) &&
			!isCardCharged(s, liabilities),
	);
	const monthlySubscriptions = activeSubs.reduce(
		(acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle),
		0,
	);

	// Outflows from liabilities
	const activeLiab = liabilities.filter(
		(l) => l.entityId === account.id && (yearMonth ? isLiabilityInMonth(l, yearMonth) : l.active),
	);
	const monthlyLiabilities = activeLiab.reduce((acc, l) => {
		if (yearMonth) return acc + liabilityPaymentInMonth(l, yearMonth, transfers);
		return acc + (l.cycle && l.cycle !== "monthly" ? calculateMonthlyEquivalent(l.amount, l.cycle) : l.amount);
	}, 0);

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
	/** book: the entity's assets, to tell cash targets/sources from fixed and investment ones. */
	hardware?: HardwareAsset[];
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
		hardware = [],
	} = params;

	// Determine if this is the designated default wallet for the entity
	const isDefaultWallet = Boolean(
		wallet.isDefault ||
		(!wallets.some((w) => w.isDefault) && wallets[0]?.id === wallet.id),
	);

	// A flow's link resolves to this wallet when it names one of the entity's
	// wallets that is this one; otherwise (absent, or not a wallet) to the default wallet.
	const walletIds = new Set(wallets.filter((w) => w.entityId === wallet.entityId).map((w) => w.id));
	const resolvesHere = (link: string | undefined): boolean =>
		link && walletIds.has(link) ? link === wallet.id : isDefaultWallet;

	// Capital transfers land on their target wallet; untargeted ones (or ones whose
	// target no longer exists) land on the default wallet, which also funds outgoing ones.
	const transferShare = (t: CapitalTransfer): number => {
		let delta = 0;
		const cashIn = transferCashIn(t, wallet.entityId, hardware);
		if (cashIn > 0 && resolvesHere(t.targetAssetId)) delta += cashIn;
		const cashOut = transferCashOut(t, wallet.entityId, hardware);
		if (cashOut > 0 && resolvesHere(t.fromAssetId)) delta -= cashOut;
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

	// Operating flows: when none is linked to another wallet of this entity, the
	// default wallet carries the whole net (unchanged). Otherwise each wallet takes
	// the flows that resolve to it; the legacy salary goes to the default wallet.
	const defaultWalletId = wallets.find((w) => w.isDefault)?.id ?? wallets[0]?.id;
	const hasLinkedElsewhere = [
		...revenues.map((r) => r.depositAssetId),
		...subscriptions.map((s) => s.paidFromAssetId),
		...liabilities.map((l) => l.paidFromAssetId),
	].some((link) => Boolean(link && walletIds.has(link) && link !== defaultWalletId));
	const legacySalaryOnFull = legacySalaryApplies(entityAccount, revenues);
	const operatingDelta = (ym: string): number => {
		if (!hasLinkedElsewhere) {
			return isDefaultWallet
				? calculateEntityMonthlyOperatingCash({
						account: entityAccount,
						revenues,
						subscriptions,
						liabilities,
						yearMonth: ym,
						transfers,
					}).netOperatingCash
				: 0;
		}
		return calculateEntityMonthlyOperatingCash({
			account: entityAccount,
			revenues: revenues.filter((r) => r.entityId === entityAccount.id && resolvesHere(r.depositAssetId)),
			// Card-charged subscriptions are excluded before the split: they are not cash at all.
			subscriptions: subscriptions.filter(
				(s) =>
					s.entityId === entityAccount.id &&
					!isCardCharged(s, liabilities) &&
					resolvesHere(s.paidFromAssetId),
			),
			liabilities: liabilities.filter((l) => l.entityId === entityAccount.id && resolvesHere(l.paidFromAssetId)),
			yearMonth: ym,
			transfers,
			legacySalary: legacySalaryOnFull && isDefaultWallet,
		}).netOperatingCash;
	};

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
		// A transfer between two wallets of this entity has an in and an out action;
		// its share already nets both sides, so take it out once.
		const undoneTransfers = new Set<string>();
		for (const action of actions) {
			if (action.date >= baselineDay.slice(0, 10)) continue;
			if (action.category === "transfer") {
				const tx = transfersById.get(action.id);
				if (tx && !undoneTransfers.has(tx.id)) {
					undoneTransfers.add(tx.id);
					assetInjections = round2(assetInjections - transferShare(tx));
				}
			} else if (resolvesHere(action.cashAssetId)) {
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
		hardware,
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
			hardware,
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
	/** book: the entity's assets; a missing list treats every transfer endpoint as cash. */
	hardware?: HardwareAsset[];
	yearMonth: string;
}): { inflow: number; outflow: number; net: number } {
	const { account, transfers, subscriptions = [], revenues = [], liabilities = [], hardware = [], yearMonth } = params;

	const operating = calculateEntityMonthlyOperatingCash({
		account,
		revenues,
		subscriptions,
		liabilities,
		yearMonth,
		transfers,
	});
	const monthTransfers = transfers.filter((t) => isTransferInMonth(t, yearMonth));
	const transferIn = monthTransfers.reduce((acc, t) => acc + transferCashIn(t, account.id, hardware), 0);
	const transferOut = monthTransfers.reduce((acc, t) => acc + transferCashOut(t, account.id, hardware), 0);

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
 * Cash in hand (as of yearMonth) for one entity: the sum of its cash wallets'
 * current balances — capital transfers dated through `yearMonth` are already
 * applied, future months and future days are not. Operational income/expenses
 * stay out of this number; they show up in the end-of-month treasury.
 *
 * Use this for "today's balance" surfaces (Home, entity switcher): a capital
 * transfer recorded this month moves this number immediately, while next
 * month's scheduled items never touch it.
 */
export function calculateEntityCashOnHand(params: EntityFlowParams & { yearMonth?: string }): number {
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
	if (cashAssets.length === 0) return 0;

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
				}).currentCashOnHand,
			0,
		),
	);
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
	/** book: what the movement is for. */
	flowType?: "income" | "expense" | "debt_payment" | "asset_purchase" | "investment" | "transfer" | "loan_proceeds" | "depreciation";
	/** book: the record that produced the movement. */
	sourceType?: "income" | "expense" | "liability" | "transfer" | "asset" | "account";
	/** book: cash asset the movement lands in or leaves; absent = the default wallet. */
	cashAssetId?: string;
	/** book: a loan payment's split between interest and principal. */
	split?: { interest: number; principal: number };
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
		const amt = revenueMonthlyAmount(rev);
		totalInflow += amt;
		// Explicit day, else salary lands on payday and other income on the 1st
		const day = rev.dayOfMonth ?? (rev.source === "salary" ? account.paydayDayOfMonth || 28 : 1);
		actions.push({
			id: rev.id,
			date: dateInMonth(yearMonth, day),
			description: rev.name,
			amount: amt,
			direction: "inflow",
			category: "revenue",
			flowType: "income",
			sourceType: "income",
			cashAssetId: rev.depositAssetId,
		});
	}

	// Inflows: Legacy Salary if no salary revenue streams
	if (account.salary && legacySalaryApplies(account, revenues)) {
		totalInflow += account.salary;
		actions.push({
			id: "action_salary",
			date: dateInMonth(yearMonth, account.paydayDayOfMonth || 28),
			description: "Career Salary",
			amount: account.salary,
			direction: "inflow",
			category: "salary",
			flowType: "income",
			sourceType: "account",
		});
	}

	// Inflows: Incoming Transfers (only the ones that bring cash into this entity)
	const incomingTransfers = transfers.filter(
		(t) => t.toEntityId === account.id && isTransferInMonth(t, yearMonth) && transferCashIn(t, account.id, hardware) > 0,
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
			flowType: findAsset(tx.fromAssetId, hardware)?.kind === "investment" ? "investment" : "transfer",
			sourceType: "transfer",
			cashAssetId: tx.targetAssetId,
		});
	}

	// Outflows: Subscriptions (card-charged ones move no cash here)
	const activeSubs = subscriptions.filter(
		(s) => s.entityId === account.id && isSubscriptionInMonth(s, yearMonth) && !isCardCharged(s, liabilities),
	);

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
			flowType: "expense",
			sourceType: "expense",
			cashAssetId: sub.paidFromAssetId,
		});
	}

	// Outflows: Outgoing Transfers (only the ones that take cash out of this entity)
	const outgoingTransfers = transfers.filter(
		(t) => t.fromEntityId === account.id && isTransferInMonth(t, yearMonth) && transferCashOut(t, account.id, hardware) > 0,
	);

	for (const tx of outgoingTransfers) {
		totalCashOutflow += tx.amount;
		const target = findAsset(tx.targetAssetId, hardware);
		let flowType: NonNullable<LedgerAction["flowType"]> = "transfer";
		if (tx.toLiabilityId) flowType = "debt_payment";
		else if (target?.kind === "investment") flowType = "investment";
		else if (target && !isCashAsset(target)) flowType = "asset_purchase";
		actions.push({
			id: tx.id,
			date: dateInMonth(yearMonth, dayOfMonth(tx.date, 1)),
			description: tx.note || "Capital Transfer Out",
			amount: tx.amount,
			direction: "outflow",
			category: "transfer",
			counterparty: tx.toEntityId,
			flowType,
			sourceType: "transfer",
			cashAssetId: tx.fromAssetId,
		});
	}

	// Outflows: Liabilities
	const activeLiab = liabilities.filter((l) => l.entityId === account.id && isLiabilityDue(l, yearMonth));
	for (const liab of activeLiab) {
		const amt = liabilityPaymentInMonth(liab, yearMonth, transfers);
		totalCashOutflow += amt;
		actions.push({
			id: liab.id,
			date: dateInMonth(yearMonth, liab.dayOfMonth ?? 15),
			description: liab.name,
			amount: amt,
			direction: "outflow",
			category: "liability",
			flowType: "debt_payment",
			sourceType: "liability",
			cashAssetId: liab.paidFromAssetId,
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
				flowType: "depreciation",
				sourceType: "asset",
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
