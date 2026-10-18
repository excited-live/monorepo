import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/accounting";
import type { UserSession } from "../domain/types";

export const FIXTURE_USER_SESSION: UserSession = {
	id: "usr_fixture_001",
	email: "alex@excited.live",
	name: "Alex Designer",
	orgName: "Alex Creative Studio",
	isAuthenticated: true,
	avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
};

export const FIXTURE_ACCOUNTS: EntityAccount[] = [
	{
		id: "acc_personal",
		name: "Alex Living",
		type: "personal",
		cashReserve: 250000,
		currency: "THB",
		salary: 120000,
		paydayDayOfMonth: 28,
		careerTitle: "Principal Product Engineer",
		careerCompany: "Studio Excited",
	},
	{
		id: "acc_business_1",
		name: "FromSukong Media",
		type: "business",
		cashReserve: 480000,
		currency: "THB",
	},
];

export const FIXTURE_SUBSCRIPTIONS: RecurringSubscription[] = [
	{
		id: "sub_1",
		entityId: "acc_personal",
		name: "BTS SkyTrain Pass",
		amount: 1400,
		cycle: "monthly",
		category: "transport",
		nextRenewalDate: "2026-10-25",
		active: true,
	},
	{
		id: "sub_2",
		entityId: "acc_business_1",
		name: "Cloud Server Hosting",
		amount: 1200,
		cycle: "monthly",
		category: "hosting",
		nextRenewalDate: "2026-10-28",
		active: true,
	},
];

export const FIXTURE_HARDWARE: HardwareAsset[] = [
	{
		id: "hw_1",
		entityId: "acc_personal",
		name: "MacBook Pro 16",
		cost: 89000,
		purchaseDate: "2025-01-15",
		lifespanMonths: 36,
		category: "computer",
	},
	{
		id: "hw_2",
		entityId: "acc_business_1",
		name: "Emergency Reserve Cash",
		cost: 200000,
		purchaseDate: "2026-01-01",
		lifespanMonths: 0,
		category: "cash",
	},
];

export const FIXTURE_REVENUES: RevenueStream[] = [
	{
		id: "rev_career_prame",
		entityId: "acc_personal",
		name: "Principal Product Engineer Salary",
		amount: 120000,
		frequency: "monthly",
		source: "salary",
		active: true,
	},
	{
		id: "rev_sponsor",
		entityId: "acc_business_1",
		name: "Monthly Brand Retainer",
		amount: 85000,
		frequency: "monthly",
		source: "freelance",
		active: true,
	},
];

export const FIXTURE_LIABILITIES: LiabilityStream[] = [
	{
		id: "liab_1",
		entityId: "acc_personal",
		name: "Condo Mortgage",
		amount: 22000,
		category: "business_loan",
		active: true,
	},
];

export const FIXTURE_TRANSFERS: CapitalTransfer[] = [
	{
		id: "tx_1",
		fromEntityId: "acc_personal",
		toEntityId: "acc_business_1",
		amount: 50000,
		date: "2026-10-01",
		note: "Q4 Seed Capital Injection",
	},
];
