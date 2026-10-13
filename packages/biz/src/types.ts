export type EntityType = "personal" | "business";

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "semi-annual" | "yearly";

export interface EntityAccount {
	id: string;
	name: string;
	type: EntityType;
	cashReserve: number;
	salary?: number;
	paydayDayOfMonth?: number;
	targetSafetyBuffer?: number;
	currency: "THB";
	createdAt?: string;
	active?: boolean;
	notes?: string;
	imageUrl?: string;
	careerTitle?: string;
	careerCompany?: string;
	careerImageUrl?: string;
}

export interface CapitalTransfer {
	id: string;
	fromEntityId: string;
	toEntityId: string;
	amount: number;
	date: string; // YYYY-MM-DD
	note: string;
}

export interface RecurringSubscription {
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

export interface HardwareAsset {
	id: string;
	entityId: string;
	name: string;
	cost: number;
	lifespanMonths: number;
	purchaseDate: string; // YYYY-MM-DD or YYYY-MM
	salvageValue?: number;
	category: string;
	imageUrl?: string;
}

export interface RevenueStream {
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

export interface LiabilityStream {
	id: string;
	entityId: string;
	name: string;
	amount: number;
	category: "business_loan" | "equipment_loan" | "credit_line" | "lease" | "other";
	active: boolean;
	notes?: string;
	imageUrl?: string;
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
