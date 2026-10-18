export type EntityType = "personal" | "business";

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "semi-annual" | "yearly" | "one_time";

// The optional fields below marked "book" carry the normalized model (./book)
// into the engine. Every one is optional and absent in legacy data, where the
// engine behaves exactly as before.

export interface Account {
	id: string;
	name: string;
	type: EntityType;
	cashReserve: number;
	salary?: number;
	paydayDayOfMonth?: number;
	targetSafetyBuffer?: number;
	currency: "THB" | "USD" | (string & {});
	createdAt?: string;
	active?: boolean;
	notes?: string;
	imageUrl?: string;
	careerTitle?: string;
	careerCompany?: string;
	careerImageUrl?: string;
}
export type EntityAccount = Account;

export interface Transfer {
	id: string;
	fromEntityId: string;
	toEntityId: string;
	amount: number;
	date: string; // YYYY-MM-DD or YYYY-MM
	note: string;
	targetAssetId?: string;
	frequency?: "one_time" | "monthly";
	/** book: cash asset the money leaves; absent = the from-entity's default wallet. A non-cash source (selling an investment) moves no cash out. */
	fromAssetId?: string;
	/** book: liability the payment goes to (extra loan payment, card payoff); no cash lands anywhere. */
	toLiabilityId?: string;
}
export type CapitalTransfer = Transfer;

export interface Expense {
	id: string;
	entityId: string;
	name: string;
	amount: number;
	cycle: BillingCycle;
	category: string;
	nextRenewalDate: string; // YYYY-MM-DD
	billingDay?: number;
	active: boolean;
	/** First month (YYYY-MM) the expense is charged. */
	startMonth?: string;
	/** Last month (YYYY-MM) it is charged; absent = open-ended. */
	endMonth?: string;
	notes?: string;
	imageUrl?: string;
	/** book: cash asset it is paid from; absent = the entity's default wallet. */
	paidFromAssetId?: string;
	/** book: revolving liability it is charged to; then it moves no cash itself. */
	paidFromLiabilityId?: string;
	/** book: asset this is a cost of owning. */
	assetId?: string;
	/** book: income this is a cost of earning. */
	incomeId?: string;
}
export type RecurringSubscription = Expense;

export type AssetCategory =
	| "laptop"
	| "phone"
	| "tablet"
	| "workstation"
	| "display"
	| "audio"
	| "wearable"
	| "furniture"
	| "vehicle"
	| "cash"
	| "other"
	| (string & {});
export type HardwareCategory = AssetCategory;

export interface Asset {
	id: string;
	entityId: string;
	name: string;
	cost: number;
	lifespanMonths: number;
	purchaseDate: string; // YYYY-MM-DD or YYYY-MM
	salvageValue?: number;
	category: AssetCategory;
	imageUrl?: string;
	isDefault?: boolean;
	/** book: when present it decides cash vs non-cash instead of category/lifespan. */
	kind?: AssetKind;
	/** book: "none" for fixed assets that never depreciate (land). */
	depreciationMethod?: "straight_line" | "none";
	/** book: present when kind is "investment". */
	investment?: InvestmentDetails;
	currency?: string;
	notes?: string;
}
export type HardwareAsset = Asset;

export type AssetKind = "cash" | "fixed" | "investment";

export interface InvestmentDetails {
	instrument: string;
	symbol?: string;
	units?: number;
	/** Total paid in as of valuedAsOf. */
	costBasis: number;
	/** Market value at the start of valuedAsOf. */
	marketValue: number;
	/** YYYY-MM. */
	valuedAsOf: string;
	/** Expected yearly return as a fraction (0.07 = 7%). */
	expectedAnnualReturn?: number;
}

export interface CashWallet {
	id: string;
	entityId: string;
	name: string;
	balance: number; // Opening or recorded liquid cash balance
	currency?: "THB" | "USD" | (string & {});
	isDefault?: boolean;
	updatedAt?: string;
	imageUrl?: string;
}

export interface Income {
	id: string;
	entityId: string;
	name: string;
	amount: number;
	frequency: "monthly" | "yearly" | "one_time" | "weekly" | "quarterly" | "semi-annual";
	source: "stripe" | "bank_transfer" | "cash" | "freelance" | "salary" | "other";
	active: boolean;
	startMonth?: string;
	endMonth?: string;
	notes?: string;
	imageUrl?: string;
	/** book: day of month it lands; absent = payday for salary, the 1st otherwise. */
	dayOfMonth?: number;
	/** book: cash asset it lands in; absent = the entity's default wallet. */
	depositAssetId?: string;
	/** book: asset that generates it (dividends, rent, interest). */
	sourceAssetId?: string;
	kind?: "employment" | "business" | "investment" | "other";
	category?: string;
	taxCategory?: string;
	employment?: { employer?: string; title?: string };
}
export type RevenueStream = Income;

export type LiabilityCategory =
	| "mortgage"
	| "car_loan"
	| "student_loan"
	| "credit_card"
	| "business_loan"
	| "equipment_loan"
	| "credit_line"
	| "lease"
	| "other"
	| (string & {});

export interface Liability {
	id: string;
	entityId: string;
	name: string;
	amount: number;
	category: LiabilityCategory;
	active: boolean;
	/** First month (YYYY-MM) the payment is due. */
	startMonth?: string;
	/** Last month (YYYY-MM) it is due; absent = open-ended. */
	endMonth?: string;
	notes?: string;
	imageUrl?: string;
	kind?: "loan" | "revolving" | "other";
	/** book: payment cycle; absent = monthly. */
	cycle?: BillingCycle;
	/** book: day of month the payment is due; absent = the 15th. */
	dayOfMonth?: number;
	/** book: cash asset the payments come from; absent = the entity's default wallet. */
	paidFromAssetId?: string;
	loan?: LoanDetails;
	revolving?: RevolvingDetails;
}
export type LiabilityStream = Liability;

export interface LoanDetails {
	principal: number;
	/** Yearly rate as a fraction (0.065 = 6.5%). */
	annualRate: number;
	termMonths: number;
	/** YYYY-MM or YYYY-MM-DD; the balance is `principal` at the start of that month. */
	originatedOn: string;
	financedAssetId?: string;
	/** Cash asset the borrowed money landed in (cash loans): an inflow in the origination month. */
	proceedsAssetId?: string;
}

export interface RevolvingDetails {
	creditLimit?: number;
	/** Owed at the start of balanceAsOf. */
	balance: number;
	/** YYYY-MM. */
	balanceAsOf: string;
	annualRate?: number;
}

export interface DepreciationCalculation {
	monthlyRate: number;
	elapsedMonths: number;
	remainingMonths: number;
	monthsRemaining: number;
	remainingBookValue: number;
	isFullyDepreciated: boolean;
	completionDate: string;
}

export interface MonthlySummary {
	entityId?: string;
	yearMonth?: string;
	startingTreasury: number;
	endingTreasury: number;
	totalInflow: number;
	totalCashOutflow: number;
	totalDepreciation: number;
	netCashFlow: number;
	runwayMonths?: number | null;
	isDefaultAlive?: boolean;
}

export interface LedgerActionItem {
	id: string;
	entityId?: string;
	yearMonth?: string;
	title: string;
	date: string;
	amount: number;
	type: "subscription" | "depreciation" | "revenue" | "capital_in" | "capital_out" | "inflow" | "outflow";
	category?: string;
	reference?: string;
}

export interface MonthlyLedger {
	yearMonth: string;
	summary: MonthlySummary;
	actionItems: LedgerActionItem[];
}

export interface AccountingSnapshot {
	accounts: Account[];
	subscriptions: Expense[];
	hardware: Asset[];
	revenues: Income[];
	transfers: Transfer[];
	liabilities?: Liability[];
	wallets?: CashWallet[];
	updatedAt?: string;
	isDefault?: boolean;
}
export type BizSnapshot = AccountingSnapshot;

export interface EntityWealthMetrics {
	cashAssetsValue: number;
	gearAssetsValue: number;
	totalAssetsValue: number;
	currentLiquid: number;
	eomLiquid: number;
	currentWealth: number;
	eomWealth: number;
	liquidPct: number;
	gearPct: number;
	totalIncome: number;
	totalExpense: number;
	liabilityMonthly: number;
	liabPct: number;
	runwayMonths: number | null;
	isDefaultAlive: boolean;
}

export interface ConsolidatedWealthMetrics {
	totalTreasury: number;
	totalEomTreasury: number;
	personalCash: number;
	businessCash: number;
}

export interface ProjectionBalances {
	offsets: number[];
	balances: Map<number, number>;
	totalIncome: number;
	totalExpense: number;
	liabilityMonthly: number;
	projectedNet: number;
}

