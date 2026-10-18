import type { Locale } from "@excited-live/i18n";

import type {
	CapitalTransfer,
	CashWallet,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/accounting";

export type {
	CapitalTransfer,
	CashWallet,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
};

export const DEFAULT_PROFILE_AVATAR =
	"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80";

export interface UserSession {
	id: string;
	email: string;
	name: string;
	orgName: string;
	isAuthenticated: boolean;
	avatarUrl?: string;
	token?: string;
}

export type MobileTab = "home" | "capital" | "settings";
export type CapitalSubTab = "capital" | "income" | "expense" | "assets" | "liability" | "ledger";
export type MobileLocale = Locale;

export interface CashWalletViewModel {
	id: string;
	name: string;
	openingBalance: number;
	transfers: number;
	currentBalance: number; // Stock: verified money in hand today
	monthlyNetFlow: number; // Flow: operational cashflow for evaluated month
	projectedEomBalance: number; // Forecast: projected end-of-month balance
	isDefault: boolean;
	imageUrl?: string;
	raw: HardwareAsset;
}

export interface GearAssetViewModel {
	id: string;
	name: string;
	category: string;
	cost: number;
	purchaseDate: string;
	lifespanMonths: number;
	remainingBookValue: number;
	monthlyDepreciation: number;
	isFullyDepreciated: boolean;
	completionDate: string;
	imageUrl?: string;
	raw: HardwareAsset;
}

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
