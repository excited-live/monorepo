import type { BillingCycle, EntityType } from "../types";

/**
 * The normalized accounting model: one record type per database table, and the
 * shape the API sends over the wire. See docs/accounting-data-model.md.
 *
 * The calculation engine still runs on the `AccountingSnapshot` aggregate;
 * `bookToSnapshot` (./adapter) builds one from these records. Dates are
 * `YYYY-MM` months or `YYYY-MM-DD` days; money is in the record's currency.
 */

/** Recurring cash flow shared by incomes, expenses and liability payments. */
export interface BookSchedule {
	amount: number;
	cycle: BillingCycle;
	/** Day of month the money moves; absent = the flow type's default day. */
	dayOfMonth?: number;
	/** First month (YYYY-MM) the flow happens; one-time flows happen only then. */
	startMonth: string;
	/** Last month (YYYY-MM); absent = open-ended. */
	endMonth?: string;
}

/** A personal or business ledger. Every user has exactly one personal entity. */
export interface BookEntity {
	id: string;
	name: string;
	type: EntityType;
	currency: string;
	targetSafetyBuffer?: number;
	active: boolean;
	notes?: string;
	imageUrl?: string;
}

// ASSETS ------------------------------------------------------------------

export type BookAssetKind = "cash" | "fixed" | "investment";

interface BookAssetBase {
	id: string;
	entityId: string;
	kind: BookAssetKind;
	name: string;
	/** Free-form sub-type: bank, e_wallet, laptop, vehicle, property, stock… */
	category: string;
	active: boolean;
	notes?: string;
	imageUrl?: string;
	/** Display-only extras the engine never reads. */
	details?: Record<string, unknown>;
}

/** Cash and cash equivalents: bank accounts, e-wallets, cash on hand. */
export interface BookCashAsset extends BookAssetBase {
	kind: "cash";
	/** Balance at the start of `balanceAsOf`. */
	balance: number;
	/** YYYY-MM, or YYYY-MM-DD for a balance recorded mid-month. */
	balanceAsOf: string;
	currency: string;
	/** Where unlinked money of the entity lands. One per entity. */
	isDefault: boolean;
}

export type DepreciationMethod = "straight_line" | "none";

/** Fixed assets (PP&E): bought once (CapEx), depreciated over their useful life. */
export interface BookFixedAsset extends BookAssetBase {
	kind: "fixed";
	cost: number;
	/** YYYY-MM or YYYY-MM-DD. */
	acquiredOn: string;
	depreciationMethod: DepreciationMethod;
	/** Required unless depreciationMethod is "none" (e.g. land). */
	usefulLifeMonths?: number;
	salvageValue: number;
}

export type InvestmentInstrument =
	| "stock"
	| "etf"
	| "mutual_fund"
	| "bond"
	| "crypto"
	| "gold"
	| "pvd"
	| "ssf"
	| "rmf"
	| "thai_esg"
	| "fixed_deposit"
	| "other"
	| (string & {});

/** Investments: valued at market, grown by an expected return, never depreciated. */
export interface BookInvestmentAsset extends BookAssetBase {
	kind: "investment";
	instrument: InvestmentInstrument;
	symbol?: string;
	units?: number;
	/** Total paid in as of `valuedAsOf`. */
	costBasis: number;
	/** Market value at the start of `valuedAsOf`. */
	marketValue: number;
	/** YYYY-MM. */
	valuedAsOf: string;
	/** Expected yearly return as a fraction (0.07 = 7%), for projections. */
	expectedAnnualReturn?: number;
	currency: string;
}

export type BookAsset = BookCashAsset | BookFixedAsset | BookInvestmentAsset;

// INCOMES -----------------------------------------------------------------

export type BookIncomeKind = "employment" | "business" | "investment" | "other";

/** Thai personal income tax categories, Revenue Code section 40(1)–40(8). */
export type ThaiTaxCategory = "40_1" | "40_2" | "40_3" | "40_4" | "40_5" | "40_6" | "40_7" | "40_8";

export interface BookEmploymentDetails {
	employer?: string;
	title?: string;
}

export interface BookIncome extends BookSchedule {
	id: string;
	entityId: string;
	kind: BookIncomeKind;
	/** salary, bonus, freelance, sales, dividend, interest, rent, capital_gain, pension, gift… */
	category: string;
	name: string;
	taxCategory?: ThaiTaxCategory;
	/** Cash asset the income lands in; absent = the entity's default cash asset. */
	depositAssetId?: string;
	/** Asset that generates it (dividends, rent, interest). Investment income only. */
	sourceAssetId?: string;
	/** Present only when kind is "employment". */
	employment?: BookEmploymentDetails;
	active: boolean;
	notes?: string;
	imageUrl?: string;
	details?: Record<string, unknown>;
}

// EXPENSES ----------------------------------------------------------------

export interface BookExpense extends BookSchedule {
	id: string;
	entityId: string;
	name: string;
	/** subscription, utilities, food, insurance, tax, donation, payroll… */
	category: string;
	/** Cash asset it is paid from; absent = the entity's default cash asset. */
	paidFromAssetId?: string;
	/** Revolving liability (credit card) it is charged to. Excludes paidFromAssetId. */
	paidFromLiabilityId?: string;
	/** Asset this is a cost of owning (fuel, maintenance, insurance). */
	assetId?: string;
	/** Income this is a cost of earning (commute, tools). */
	incomeId?: string;
	active: boolean;
	notes?: string;
	imageUrl?: string;
	details?: Record<string, unknown>;
}

// LIABILITIES -------------------------------------------------------------

export type BookLiabilityKind = "loan" | "revolving" | "other";

/** Amortizing loan: each payment is interest (an expense) plus principal (reduces the debt). */
export interface BookLoanDetails {
	principal: number;
	/** Yearly interest rate as a fraction (0.065 = 6.5%); 0 for 0% installment plans. */
	annualRate: number;
	termMonths: number;
	/** YYYY-MM or YYYY-MM-DD the loan started; the balance is `principal` then. */
	originatedOn: string;
	/** The asset the loan bought (house, car, phone). */
	financedAssetId?: string;
	/** Cash asset the borrowed money landed in, for cash loans. */
	proceedsAssetId?: string;
}

/** Revolving credit: credit cards and credit lines. */
export interface BookRevolvingDetails {
	creditLimit?: number;
	/** Amount owed at the start of `balanceAsOf`. */
	balance: number;
	/** YYYY-MM. */
	balanceAsOf: string;
	annualRate?: number;
}

/** A debt. The schedule is the planned payment. */
export interface BookLiability extends BookSchedule {
	id: string;
	entityId: string;
	kind: BookLiabilityKind;
	name: string;
	/** mortgage, car_loan, student_loan, personal_loan, installment, credit_card, lease, tax_owed… */
	category: string;
	/** Cash asset the payments come from; absent = the entity's default cash asset. */
	paidFromAssetId?: string;
	/** Present only when kind is "loan". */
	loan?: BookLoanDetails;
	/** Present only when kind is "revolving". */
	revolving?: BookRevolvingDetails;
	active: boolean;
	notes?: string;
	imageUrl?: string;
	details?: Record<string, unknown>;
}

// TRANSFERS ---------------------------------------------------------------

/**
 * Money moving from an asset to another asset (cash → cash, cash → stock,
 * cash → laptop) or onto a liability (extra loan payment, card payoff).
 * Exactly one of toAssetId / toLiabilityId is set.
 */
export interface BookTransfer {
	id: string;
	amount: number;
	/** YYYY-MM-DD or YYYY-MM. Monthly transfers recur from this month on. */
	date: string;
	cycle: "one_time" | "monthly";
	note: string;
	fromAssetId: string;
	toAssetId?: string;
	toLiabilityId?: string;
}

/** Every record one user owns. */
export interface AccountingBook {
	entities: BookEntity[];
	assets: BookAsset[];
	incomes: BookIncome[];
	expenses: BookExpense[];
	liabilities: BookLiability[];
	transfers: BookTransfer[];
}

/** Bookkeeping fields every stored record carries on the wire. */
export interface StoredMeta {
	version: number;
	createdAt: string;
	updatedAt: string;
}

export type Stored<T> = T & StoredMeta;
