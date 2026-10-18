import {
	buildMonthlyActions,
	isCardCharged,
	isSubscriptionInMonth,
	subscriptionChargeDate,
} from "./ledger";
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
	cashAssetId?: string;
	chargedToLiabilityId?: string;
	interest?: number;
	principal?: number;
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
