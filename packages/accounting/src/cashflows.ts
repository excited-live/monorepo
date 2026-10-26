import {
	buildMonthlyActions,
	isCardCharged,
	isSubscriptionInMonth,
	subscriptionChargeDate,
} from "./ledger";
import { normalizeCategory, UNCATEGORISED } from "./categories";
import type { LedgerAction } from "./ledger";
import { calculateMonthlyEquivalent, round2 } from "./math";
import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "./types";

export type CashFlowType =
	| "income"
	| "expense"
	| "debt_payment"
	| "asset_purchase"
	| "investment"
	| "transfer"
	| "loan_proceeds"
	| "depreciation";

/** One dated movement of a month, as shown in the money-in / money-out feed. */
export interface CashFlowItem {
	/** Unique within the month's feed. */
	id: string;
	sourceType: "income" | "expense" | "liability" | "transfer" | "asset" | "account";
	/** The record to open when tapped. */
	sourceId: string;
	flowType: CashFlowType;
	direction: "in" | "out";
	/** YYYY-MM-DD. */
	date: string;
	name: string;
	amount: number;
	/** False for card charges and depreciation: they move no cash. */
	isCash: boolean;
	/** The part of the amount that counts as spending. */
	spendingAmount: number;
	/**
	 * On an expense item this is the canonical expense category (#173). On other
	 * items it is the ledger's flow class (`revenue`, `salary`, `transfer`, …),
	 * matching `get_monthly_ledger`'s actionItems — which is why a total must
	 * come from `spendingByCategory`, never from grouping items.
	 */
	category?: string;
	cashAssetId?: string;
	chargedToLiabilityId?: string;
	interest?: number;
	principal?: number;
}

/** One bucket of the month's spending. `uncategorised` is always present. */
export interface SpendingByCategoryBucket {
	category: string;
	spending: number;
	count: number;
	/** `spending / totals.spending`, 4 dp; 0 when the month spent nothing. */
	share: number;
}

export interface CashFlowSummary {
	moneyIn: number;
	moneyOut: number;
	spending: number;
}

const ACTION_PREFIXES = ["action_dep_", "loan_proceeds_"];

/** The record id behind a ledger action (strips the prefix of generated ids). */
function sourceIdOf(action: LedgerAction, account: EntityAccount): string {
	if (action.sourceType === "account") return account.id;
	const prefix = ACTION_PREFIXES.find((p) => action.id.startsWith(p));
	return prefix ? action.id.slice(prefix.length) : action.id;
}

/**
 * Cash-flow feed of one entity for one month, sorted by date: every ledger action
 * (cash in and out, the same movements as buildMonthlyActions), one non-cash item per
 * card-charged expense, and depreciation when includeDepreciation is set.
 */
export function buildCashFlows(params: {
	account: EntityAccount;
	yearMonth: string;
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	liabilities?: LiabilityStream[];
	includeDepreciation?: boolean;
}): CashFlowItem[] {
	const {
		account,
		yearMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
		liabilities = [],
		includeDepreciation = false,
	} = params;

	const { actions } = buildMonthlyActions({
		account,
		yearMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
		liabilities,
	});
	const liabilityById = new Map(liabilities.map((l) => [l.id, l]));

	const items: CashFlowItem[] = [];
	for (const action of actions) {
		const isDepreciation = action.flowType === "depreciation";
		if (isDepreciation && !includeDepreciation) continue;

		const flowType: CashFlowType = action.flowType ?? "transfer";
		const sourceType = action.sourceType ?? "account";
		const sourceId = sourceIdOf(action, account);
		const direction = action.direction === "inflow" ? "in" : "out";

		let spendingAmount = 0;
		let interest: number | undefined;
		let principal: number | undefined;
		if (flowType === "expense" || isDepreciation) {
			spendingAmount = action.amount;
		} else if (flowType === "debt_payment" && sourceType === "liability") {
			const liability = liabilityById.get(sourceId);
			if (liability?.loan) {
				interest = action.split?.interest ?? 0;
				principal = action.split?.principal ?? action.amount;
				spendingAmount = interest;
			} else if (liability?.revolving) {
				// A card's payment settles charges already counted as spending.
				spendingAmount = 0;
			} else {
				spendingAmount = action.amount;
			}
		}

		items.push({
			id: `${direction}:${action.id}`,
			sourceType,
			sourceId,
			flowType,
			direction,
			date: action.date,
			name: action.description,
			amount: action.amount,
			isCash: !isDepreciation,
			spendingAmount: round2(spendingAmount),
			category: flowType === "expense" ? normalizeCategory(action.category) : action.category,
			cashAssetId: action.cashAssetId,
			interest,
			principal,
		});
	}

	for (const sub of subscriptions) {
		if (sub.entityId !== account.id || !isSubscriptionInMonth(sub, yearMonth)) continue;
		if (!isCardCharged(sub, liabilities)) continue;
		const amount = calculateMonthlyEquivalent(sub.amount, sub.cycle);
		items.push({
			id: `card:${sub.id}`,
			sourceType: "expense",
			sourceId: sub.id,
			flowType: "expense",
			direction: "out",
			date: subscriptionChargeDate(sub, yearMonth),
			name: sub.name,
			amount,
			isCash: false,
			spendingAmount: amount,
			category: normalizeCategory(sub.category),
			chargedToLiabilityId: sub.paidFromLiabilityId,
		});
	}

	return items.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Totals of a feed: moneyIn / moneyOut sum the cash items per direction (they match
 * the ledger's totalInflow / totalCashOutflow); spending sums every item's spendingAmount.
 */
export function summarizeCashFlows(items: CashFlowItem[]): CashFlowSummary {
	let moneyIn = 0;
	let moneyOut = 0;
	let spending = 0;
	for (const item of items) {
		if (item.isCash) {
			if (item.direction === "in") moneyIn += item.amount;
			else moneyOut += item.amount;
		}
		spending += item.spendingAmount;
	}
	return { moneyIn: round2(moneyIn), moneyOut: round2(moneyOut), spending: round2(spending) };
}

/**
 * Spending grouped by expense category (#173). Invariant: the buckets sum to
 * `summarizeCashFlows(items).spending`, so an agent can prove a total is
 * complete instead of guessing whether it filtered out a row.
 *
 * Only `spendingAmount > 0` is bucketed, over the unfiltered feed: expenses and
 * card charges by their category; loan interest, fees and depreciation have no
 * user category and land in `uncategorised`, which is always present. Runs on
 * the whole month rather than the direction-filtered feed, exactly like
 * `totals`.
 */
export function summarizeSpendingByCategory(items: CashFlowItem[]): SpendingByCategoryBucket[] {
	const buckets = new Map<string, { spending: number; count: number }>([[UNCATEGORISED, { spending: 0, count: 0 }]]);
	for (const item of items) {
		if (item.spendingAmount <= 0) continue;
		const key = item.flowType === "expense" ? normalizeCategory(item.category) : UNCATEGORISED;
		const bucket = buckets.get(key) ?? { spending: 0, count: 0 };
		bucket.spending += item.spendingAmount;
		bucket.count += 1;
		buckets.set(key, bucket);
	}
	const total = items.reduce((sum, item) => sum + item.spendingAmount, 0);
	return [...buckets.entries()]
		.map(([category, bucket]) => ({
			category,
			spending: round2(bucket.spending),
			count: bucket.count,
			share: total === 0 ? 0 : Math.round((bucket.spending / total) * 10_000) / 10_000,
		}))
		.sort((a, b) => b.spending - a.spending || a.category.localeCompare(b.category));
}
