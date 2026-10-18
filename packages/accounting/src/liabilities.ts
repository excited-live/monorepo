import { isSubscriptionInMonth, isTransferInMonth, liabilityBasePaymentInMonth } from "./ledger";
import { calculateMonthlyEquivalent, getYearMonthRange, round2 } from "./math";
import type { CapitalTransfer, LiabilityStream, RecurringSubscription } from "./types";

/**
 * Level monthly payment of a fully amortizing loan. A 0% loan is repaid in equal
 * parts; otherwise the standard annuity formula at the monthly rate annualRate / 12.
 */
export function calculateLoanPayment(principal: number, annualRate: number, termMonths: number): number {
	const r = annualRate / 12;
	if (r === 0) return round2(principal / termMonths);
	return round2((principal * r) / (1 - (1 + r) ** -termMonths));
}

/** One month of a loan: interest accrues on the opening balance, paid down by the scheduled payment and extra payments. */
export interface LoanScheduleEntry {
	yearMonth: string;
	opening: number;
	interest: number;
	/** Scheduled payment actually made (capped at what is still owed). */
	payment: number;
	/** Extra payments (transfers into the loan), capped at what is still owed after `payment`. */
	extra: number;
	/** Principal repaid this month; negative when the balance grows. */
	principal: number;
	closing: number;
}

/** One month of a revolving balance (credit card, credit line). */
export interface RevolvingScheduleEntry {
	yearMonth: string;
	opening: number;
	interest: number;
	/** Monthly-equivalent amounts of expenses charged to the liability this month. */
	charges: number;
	/** Scheduled payment (capped at what is owed) plus transfers into the liability, capped at what is still owed. */
	payments: number;
	/** Scheduled payment actually made (capped at what is owed, 0 once nothing is owed). */
	payment: number;
	/** Extra payments (transfers into the liability), capped at what is still owed after `payment`. */
	extra: number;
	closing: number;
}

/** A memoized schedule: `entries` cover the months from its start through `through`. */
interface CachedSchedule<T> {
	through: string;
	entries: T[];
}

/** Shared keys for omitted `transfers` / `subscriptions`, so they hit the same cache slot. */
const NO_TRANSFERS: CapitalTransfer[] = [];
const NO_SUBSCRIPTIONS: RecurringSubscription[] = [];

/**
 * Schedules are prefix-stable: the months before `through` do not depend on it.
 * Keyed by liability object, then by the transfers (and subscriptions) arrays.
 */
const loanScheduleCache = new WeakMap<LiabilityStream, WeakMap<CapitalTransfer[], CachedSchedule<LoanScheduleEntry>>>();
const revolvingScheduleCache = new WeakMap<
	LiabilityStream,
	WeakMap<CapitalTransfer[], WeakMap<RecurringSubscription[], CachedSchedule<RevolvingScheduleEntry>>>
>();

function getOrCreate<K extends object, V>(map: WeakMap<K, V>, key: K, create: () => V): V {
	let value = map.get(key);
	if (value === undefined) {
		value = create();
		map.set(key, value);
	}
	return value;
}

/** The cached entries up to throughYearMonth, or undefined when the cache does not reach that far. */
function cachedPrefix<T extends { yearMonth: string }>(
	cached: CachedSchedule<T> | undefined,
	throughYearMonth: string,
): T[] | undefined {
	if (!cached || cached.through < throughYearMonth) return undefined;
	return cached.entries.filter((e) => e.yearMonth <= throughYearMonth);
}

function computeLoanSchedule(
	liability: LiabilityStream,
	transfers: CapitalTransfer[],
	throughYearMonth: string,
): LoanScheduleEntry[] {
	const loan = liability.loan;
	if (!loan) return [];

	const months = getYearMonthRange(loan.originatedOn.slice(0, 7), throughYearMonth);
	const entries: LoanScheduleEntry[] = [];
	let balance = round2(loan.principal);

	for (const yearMonth of months) {
		const opening = balance;
		const interest = opening > 0 ? round2((opening * loan.annualRate) / 12) : 0;
		const due = round2(opening + interest);
		const scheduled = liabilityBasePaymentInMonth(liability, yearMonth);
		const payment = round2(Math.min(scheduled, due));
		const extraAvailable = transfers
			.filter((t) => t.toLiabilityId === liability.id && isTransferInMonth(t, yearMonth))
			.reduce((acc, t) => acc + t.amount, 0);
		const extra = round2(Math.min(extraAvailable, due - payment));
		const principal = round2(payment + extra - interest);
		const closing = round2(opening + interest - payment - extra);

		entries.push({ yearMonth, opening, interest, payment, extra, principal, closing });
		balance = closing;
	}

	return entries;
}

/**
 * Month-by-month loan schedule from the origination month through throughYearMonth.
 * Empty when the liability has no loan details or the month is before origination.
 * Results are memoized per (liability, transfers) and the returned entries are shared:
 * treat them as read-only.
 */
export function buildLoanSchedule(params: {
	liability: LiabilityStream;
	transfers?: CapitalTransfer[];
	throughYearMonth: string;
}): LoanScheduleEntry[] {
	const { liability, transfers = NO_TRANSFERS, throughYearMonth } = params;
	if (!liability.loan) return [];

	const byTransfers = getOrCreate(loanScheduleCache, liability, () => new WeakMap<CapitalTransfer[], CachedSchedule<LoanScheduleEntry>>());
	const cached = cachedPrefix(byTransfers.get(transfers), throughYearMonth);
	if (cached) return cached;

	const entries = computeLoanSchedule(liability, transfers, throughYearMonth);
	byTransfers.set(transfers, { through: throughYearMonth, entries });
	return entries.slice();
}

/**
 * Cash a transfer into a loan pays in yearMonth: its share of the extra payment the
 * schedule applies that month, so nothing once the loan is paid off. Before
 * origination there is no schedule and the transfer is taken as entered.
 */
export function loanTransferApplied(
	liability: LiabilityStream,
	transfer: CapitalTransfer,
	yearMonth: string,
	transfers: CapitalTransfer[],
): number {
	const entry = buildLoanSchedule({ liability, transfers, throughYearMonth: yearMonth }).find(
		(e) => e.yearMonth === yearMonth,
	);
	if (!entry) return transfer.amount;
	const offered = transfers
		.filter((t) => t.toLiabilityId === liability.id && isTransferInMonth(t, yearMonth))
		.reduce((acc, t) => acc + t.amount, 0);
	return offered > 0 ? round2((entry.extra * transfer.amount) / offered) : 0;
}

/**
 * Cash a transfer into a revolving liability pays in yearMonth: its share of the
 * extra payment the revolving schedule applies that month, so nothing once the
 * balance is cleared. Before balanceAsOf there is no schedule and the transfer is
 * taken as entered.
 */
export function revolvingTransferApplied(
	liability: LiabilityStream,
	transfer: CapitalTransfer,
	yearMonth: string,
	transfers: CapitalTransfer[],
	subscriptions?: RecurringSubscription[],
): number {
	const entry = buildRevolvingSchedule({ liability, subscriptions, transfers, yearMonth }).find(
		(e) => e.yearMonth === yearMonth,
	);
	if (!entry) return transfer.amount;
	const offered = transfers
		.filter((t) => t.toLiabilityId === liability.id && isTransferInMonth(t, yearMonth))
		.reduce((acc, t) => acc + t.amount, 0);
	return offered > 0 ? round2((entry.extra * transfer.amount) / offered) : 0;
}

/**
 * Owed on a loan at the end of yearMonth: 0 before origination, else the schedule's closing balance.
 * An inactive loan owes nothing (see calculateLiabilityBalance).
 */
export function calculateLoanBalance(
	liability: LiabilityStream,
	yearMonth: string,
	transfers: CapitalTransfer[] = [],
): number {
	if (!liability.loan || yearMonth < liability.loan.originatedOn.slice(0, 7)) return 0;
	const entry = buildLoanSchedule({ liability, transfers, throughYearMonth: yearMonth }).find(
		(e) => e.yearMonth === yearMonth,
	);
	return entry?.closing ?? 0;
}

/**
 * Month-by-month revolving balance from the balance-as-of month through yearMonth.
 * Empty when yearMonth precedes balanceAsOf. Memoized like buildLoanSchedule
 * (per liability, transfers and subscriptions); the entries are shared, read-only.
 *
 * Per month the card is charged its scheduled payment capped at what is owed, and
 * transfers into it are capped at what is still owed after that payment.
 */
export function buildRevolvingSchedule(params: {
	liability: LiabilityStream;
	subscriptions?: RecurringSubscription[];
	transfers?: CapitalTransfer[];
	yearMonth: string;
}): RevolvingScheduleEntry[] {
	const { liability, subscriptions = NO_SUBSCRIPTIONS, transfers = NO_TRANSFERS, yearMonth } = params;
	if (!liability.revolving) return [];

	const byTransfers = getOrCreate(
		revolvingScheduleCache,
		liability,
		() => new WeakMap<CapitalTransfer[], WeakMap<RecurringSubscription[], CachedSchedule<RevolvingScheduleEntry>>>(),
	);
	const bySubscriptions = getOrCreate(
		byTransfers,
		transfers,
		() => new WeakMap<RecurringSubscription[], CachedSchedule<RevolvingScheduleEntry>>(),
	);
	const cached = cachedPrefix(bySubscriptions.get(subscriptions), yearMonth);
	if (cached) return cached;

	const entries = computeRevolvingSchedule(liability, subscriptions, transfers, yearMonth);
	bySubscriptions.set(subscriptions, { through: yearMonth, entries });
	return entries.slice();
}

function computeRevolvingSchedule(
	liability: LiabilityStream,
	subscriptions: RecurringSubscription[],
	transfers: CapitalTransfer[],
	yearMonth: string,
): RevolvingScheduleEntry[] {
	const revolving = liability.revolving;
	if (!revolving) return [];

	const months = getYearMonthRange(revolving.balanceAsOf.slice(0, 7), yearMonth);
	const entries: RevolvingScheduleEntry[] = [];
	let balance = round2(revolving.balance);

	for (const month of months) {
		const opening = balance;
		const interest = round2((Math.max(0, opening) * (revolving.annualRate ?? 0)) / 12);
		const charges = round2(
			subscriptions
				.filter((s) => s.paidFromLiabilityId === liability.id && isSubscriptionInMonth(s, month))
				.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0),
		);
		const due = round2(Math.max(0, opening + interest + charges));
		const payment = round2(Math.min(liabilityBasePaymentInMonth(liability, month), due));
		const transferred = transfers
			.filter((t) => t.toLiabilityId === liability.id && isTransferInMonth(t, month))
			.reduce((acc, t) => acc + t.amount, 0);
		const extra = round2(Math.min(transferred, due - payment));
		const payments = round2(payment + extra);
		const closing = round2(opening + interest + charges - payments);

		entries.push({ yearMonth: month, opening, interest, charges, payments, payment, extra, closing });
		balance = closing;
	}

	return entries;
}

/**
 * Owed on a revolving balance at the end of yearMonth. Before balanceAsOf it is
 * the recorded balance; a negative result is a credit.
 */
export function calculateRevolvingBalance(params: {
	liability: LiabilityStream;
	subscriptions?: RecurringSubscription[];
	transfers?: CapitalTransfer[];
	yearMonth: string;
}): number {
	const revolving = params.liability.revolving;
	if (!revolving) return 0;
	const schedule = buildRevolvingSchedule(params);
	return schedule[schedule.length - 1]?.closing ?? revolving.balance;
}

/**
 * Balance owed on a liability at the end of yearMonth: a loan's schedule balance,
 * a revolving balance, or null for kinds with no known balance. An inactive loan or
 * revolving liability owes 0.
 */
export function calculateLiabilityBalance(
	liability: LiabilityStream,
	yearMonth: string,
	context: { subscriptions?: RecurringSubscription[]; transfers?: CapitalTransfer[] } = {},
): number | null {
	if ((liability.loan || liability.revolving) && !liability.active) return 0;
	if (liability.loan) return calculateLoanBalance(liability, yearMonth, context.transfers);
	if (liability.revolving) {
		return calculateRevolvingBalance({
			liability,
			subscriptions: context.subscriptions,
			transfers: context.transfers,
			yearMonth,
		});
	}
	return null;
}
