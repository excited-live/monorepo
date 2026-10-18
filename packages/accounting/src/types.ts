export type EntityType = "personal" | "business";

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "semi-annual" | "yearly" | "one_time";

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
	notes?: string;
	imageUrl?: string;
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
}
export type HardwareAsset = Asset;

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
	frequency: "monthly" | "yearly" | "one_time";
	source: "stripe" | "bank_transfer" | "cash" | "freelance" | "salary" | "other";
	active: boolean;
	startMonth?: string;
	endMonth?: string;
	notes?: string;
	imageUrl?: string;
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
	notes?: string;
	imageUrl?: string;
}
export type LiabilityStream = Liability;

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
