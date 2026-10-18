import type {
	AccountingSnapshot,
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/accounting";
import type { UserSession } from "../domain/types";

/**
 * Marketing-grade demo data for the landing-page screenshots
 * (`pnpm capture:landing`). Healthy runway on every entity, no avatar URL
 * (the capture runs offline), identical across desktop and mobile.
 */

// Soft cream-to-orange wash instead of a stock portrait: the app paints the
// avatar behind the wealth card, and a stranger's face does not belong on a
// marketing page. Inline SVG, so the capture stays offline-safe.
const LANDING_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(
	"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f3c9a8'/><stop offset='1' stop-color='#cf4500'/></linearGradient></defs><rect width='400' height='400' fill='url(#g)'/></svg>",
)}`;

export const LANDING_USER_SESSION: UserSession = {
	id: "usr_landing_001",
	email: "mint@excited.live",
	name: "Mint",
	orgName: "Mint Studio",
	isAuthenticated: true,
	avatarUrl: LANDING_AVATAR,
};

export const LANDING_ACCOUNTS: EntityAccount[] = [
	{
		id: "acc_personal",
		name: "Mint Living",
		type: "personal",
		cashReserve: 420000,
		currency: "THB",
		salary: 85000,
		paydayDayOfMonth: 28,
		careerTitle: "Product Designer",
		careerCompany: "Studio Lumen",
		imageUrl: LANDING_AVATAR,
	},
	{
		id: "acc_biz_coffee",
		name: "Bean Coffee",
		type: "business",
		cashReserve: 150000,
		currency: "THB",
	},
	{
		id: "acc_biz_studio",
		name: "Mint Studio",
		type: "business",
		cashReserve: 140000,
		currency: "THB",
	},
];

export const LANDING_SUBSCRIPTIONS: RecurringSubscription[] = [
	{
		id: "sub_bts",
		entityId: "acc_personal",
		name: "BTS SkyTrain Pass",
		amount: 1400,
		cycle: "monthly",
		category: "transport",
		nextRenewalDate: "2026-10-25",
		active: true,
	},
	{
		id: "sub_fibre",
		entityId: "acc_personal",
		name: "AIS Fibre",
		amount: 540,
		cycle: "monthly",
		category: "utilities",
		nextRenewalDate: "2026-10-22",
		active: true,
	},
	{
		id: "sub_domain",
		entityId: "acc_biz_studio",
		name: "Domain Names",
		amount: 360,
		cycle: "yearly",
		category: "hosting",
		nextRenewalDate: "2027-03-02",
		active: true,
	},
	{
		id: "sub_pos",
		entityId: "acc_biz_coffee",
		name: "POS Software",
		amount: 990,
		cycle: "monthly",
		category: "software",
		nextRenewalDate: "2026-10-28",
		active: true,
	},
];

export const LANDING_HARDWARE: HardwareAsset[] = [
	{
		id: "hw_cash_0",
		entityId: "acc_personal",
		name: "Savings & Cash",
		cost: 420000,
		purchaseDate: "2026-01-01",
		lifespanMonths: 0,
		category: "cash",
	},
	{
		id: "hw_cash_1",
		entityId: "acc_biz_coffee",
		name: "Cafe Cash Reserve",
		cost: 150000,
		purchaseDate: "2026-01-01",
		lifespanMonths: 0,
		category: "cash",
	},
	{
		id: "hw_cash_2",
		entityId: "acc_biz_studio",
		name: "Studio Cash Reserve",
		cost: 140000,
		purchaseDate: "2026-01-01",
		lifespanMonths: 0,
		category: "cash",
	},
	{
		id: "hw_mbp",
		entityId: "acc_personal",
		name: "MacBook Pro 14",
		cost: 62900,
		purchaseDate: "2025-03-10",
		lifespanMonths: 48,
		category: "computer",
	},
	{
		id: "hw_espresso",
		entityId: "acc_biz_coffee",
		name: "Espresso Machine",
		cost: 148000,
		purchaseDate: "2025-08-01",
		lifespanMonths: 60,
		category: "equipment",
	},
	{
		id: "hw_camera",
		entityId: "acc_biz_studio",
		name: "Sony A7 IV",
		cost: 76900,
		purchaseDate: "2024-06-15",
		lifespanMonths: 36,
		category: "camera",
	},
];

export const LANDING_REVENUES: RevenueStream[] = [
	{
		id: "rev_salary",
		entityId: "acc_personal",
		name: "Product Designer Salary",
		amount: 85000,
		frequency: "monthly",
		source: "salary",
		active: true,
	},
	{
		id: "rev_coffee_sales",
		entityId: "acc_biz_coffee",
		name: "Daily Cafe Sales",
		amount: 58000,
		frequency: "monthly",
		source: "cash",
		active: true,
	},
	{
		id: "rev_studio_retainer",
		entityId: "acc_biz_studio",
		name: "Brand Retainer",
		amount: 38000,
		frequency: "monthly",
		source: "freelance",
		active: true,
	},
];

export const LANDING_LIABILITIES: LiabilityStream[] = [
	{
		id: "liab_condo",
		entityId: "acc_personal",
		name: "Condo Mortgage",
		amount: 18500,
		category: "business_loan",
		active: true,
	},
];

export const LANDING_TRANSFERS: CapitalTransfer[] = [
	{
		id: "tx_seed",
		fromEntityId: "acc_personal",
		toEntityId: "acc_biz_coffee",
		amount: 40000,
		date: "2026-10-01",
		note: "Cafe equipment top-up",
	},
];

export const LANDING_SNAPSHOT: AccountingSnapshot = {
	accounts: LANDING_ACCOUNTS,
	subscriptions: LANDING_SUBSCRIPTIONS,
	hardware: LANDING_HARDWARE,
	revenues: LANDING_REVENUES,
	liabilities: LANDING_LIABILITIES,
	transfers: LANDING_TRANSFERS,
};

