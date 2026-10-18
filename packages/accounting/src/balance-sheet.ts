import { calculateCurrentTreasury } from "./ledger";
import { calculateAssetDepreciation, isCashAsset, round2 } from "./math";
import { calculateInvestmentValue } from "./investments";
import { calculateLiabilityBalance } from "./liabilities";
import type {
	Account,
	Asset,
	CapitalTransfer,
	Expense,
	Income,
	Liability,
} from "./types";

/** Position at the end of a month. Money is in the entity's currency. */
export interface BalanceSheet {
	/** End-of-month treasury (cash wallets). */
	cash: number;
	/** Remaining book value of fixed (non-cash, non-investment) assets. */
	fixedAssets: number;
	/** Value of investment assets. */
	investments: number;
	totalAssets: number;
	/** Loan and revolving balances owed. */
	debt: number;
	netWorth: number;
}

/**
 * Balance sheet of one entity at the end of yearMonth:
 * netWorth = cash + fixed assets + investments - debt.
 */
export function calculateEntityBalanceSheet(params: {
	account: Account;
	hardware: Asset[];
	subscriptions: Expense[];
	revenues: Income[];
	liabilities: Liability[];
	transfers: CapitalTransfer[];
	yearMonth: string;
}): BalanceSheet {
	const { account, hardware, subscriptions, revenues, liabilities, transfers, yearMonth } = params;
	const entityAssets = hardware.filter((h) => h.entityId === account.id);

	const cash = calculateCurrentTreasury({ account, hardware, transfers, subscriptions, revenues, liabilities, yearMonth });

	const fixedAssets = round2(
		entityAssets
			.filter((h) => !isCashAsset(h) && h.kind !== "investment")
			.reduce((acc, h) => acc + calculateAssetDepreciation(h, yearMonth).remainingBookValue, 0),
	);

	const investments = round2(
		entityAssets
			.filter((h) => h.kind === "investment")
			.reduce((acc, h) => acc + calculateInvestmentValue({ asset: h, transfers, yearMonth }).value, 0),
	);

	const totalAssets = round2(cash + fixedAssets + investments);

	const debt = round2(
		liabilities
			.filter((l) => l.entityId === account.id)
			.reduce(
				(acc, l) => acc + (calculateLiabilityBalance(l, yearMonth, { subscriptions, transfers }) ?? 0),
				0,
			),
	);

	return {
		cash: round2(cash),
		fixedAssets,
		investments,
		totalAssets,
		debt,
		netWorth: round2(totalAssets - debt),
	};
}

/** Balance sheet summed over all accounts (personal + businesses). */
export function calculateConsolidatedBalanceSheet(params: {
	accounts: Account[];
	hardware: Asset[];
	subscriptions: Expense[];
	revenues: Income[];
	liabilities: Liability[];
	transfers: CapitalTransfer[];
	yearMonth: string;
}): BalanceSheet {
	const sheets = params.accounts.map((account) => calculateEntityBalanceSheet({ ...params, account }));
	const sum = (pick: (s: BalanceSheet) => number) => round2(sheets.reduce((acc, s) => acc + pick(s), 0));
	const totalAssets = sum((s) => s.totalAssets);
	const debt = sum((s) => s.debt);
	return {
		cash: sum((s) => s.cash),
		fixedAssets: sum((s) => s.fixedAssets),
		investments: sum((s) => s.investments),
		totalAssets,
		debt,
		netWorth: round2(totalAssets - debt),
	};
}
