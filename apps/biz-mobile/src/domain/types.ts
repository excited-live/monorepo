import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/biz";

export type {
	CapitalTransfer,
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
export type CapitalSubTab = "capital" | "income" | "expense" | "assets" | "liability";
export type MobileLocale = "en" | "th";

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
}

export interface ConsolidatedWealthMetrics {
	totalTreasury: number;
	totalEomTreasury: number;
	personalCash: number;
	businessCash: number;
}
