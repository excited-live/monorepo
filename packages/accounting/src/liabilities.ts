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

/**
 * Month-by-month loan schedule from the origination month through throughYearMonth.
 * Empty when the liability has no loan details or the month is before origination.
 */
export function buildLoanSchedule(params: {
	liability: LiabilityStream;
	transfers?: CapitalTransfer[];
	throughYearMonth: string;
}): LoanScheduleEntry[] {
	const { liability, transfers = [], throughYearMonth } = params;
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

/** Owed on a loan at the end of yearMonth: 0 before origination, else the schedule's closing balance. */
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

/** One month of a revolving balance (credit card, credit line). */
export interface RevolvingScheduleEntry {
	yearMonth: string;
	opening: number;
	interest: number;
	/** Monthly-equivalent amounts of expenses charged to the liability this month. */
	charges: number;
	/** Scheduled payment plus transfers into the liability. */
	payments: number;
	closing: number;
}

/**
 * Month-by-month revolving balance from the balance-as-of month through yearMonth.
 * Empty when yearMonth precedes balanceAsOf.
 */
export function buildRevolvingSchedule(params: {
	liability: LiabilityStream;
	subscriptions?: RecurringSubscription[];
	transfers?: CapitalTransfer[];
	yearMonth: string;
}): RevolvingScheduleEntry[] {
	const { liability, subscriptions = [], transfers = [], yearMonth } = params;
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
		const payments = round2(
			liabilityBasePaymentInMonth(liability, month) +
				transfers
					.filter((t) => t.toLiabilityId === liability.id && isTransferInMonth(t, month))
					.reduce((acc, t) => acc + t.amount, 0),
		);
		const closing = round2(opening + interest + charges - payments);

		entries.push({ yearMonth: month, opening, interest, charges, payments, closing });
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
 * a revolving balance, or null for kinds with no known balance.
 */
export function calculateLiabilityBalance(
	liability: LiabilityStream,
	yearMonth: string,
	context: { subscriptions?: RecurringSubscription[]; transfers?: CapitalTransfer[] } = {},
): number | null {
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
