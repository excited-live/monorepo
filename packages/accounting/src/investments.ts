import { isTransferInMonth } from "./ledger";
import { getYearMonthRange, round2 } from "./math";
import type { Asset, CapitalTransfer } from "./types";

/**
 * Value of an investment asset at the end of yearMonth. The market value at
 * valuedAsOf grows monthly at the expected annual return; contributions (transfers
 * into the asset) and withdrawals (transfers out of it) land in their month.
 * Assets without investment details are carried at their cost.
 *
 * Per month, in order: the value grows at the monthly rate, contributions are added
 * to both value and costBasis, then withdrawals reduce them. A withdrawal takes its
 * share of the cost basis pro rata to the value it sells:
 * `basisOut = withdrawals > 0 ? (valueBeforeWithdrawal > 0 ? costBasis * min(1, withdrawals / valueBeforeWithdrawal) : costBasis) : 0`,
 * so the basis left behind keeps the same ratio to the value. Value never goes below 0.
 */
export function calculateInvestmentValue(params: {
	asset: Asset;
	transfers?: CapitalTransfer[];
	yearMonth: string;
}): { value: number; costBasis: number; unrealizedGain: number } {
	const { asset, transfers = [], yearMonth } = params;
	const investment = asset.investment;
	if (!investment) {
		return { value: round2(asset.cost), costBasis: round2(asset.cost), unrealizedGain: 0 };
	}

	let value = round2(investment.marketValue);
	let costBasis = round2(investment.costBasis);
	if (yearMonth < investment.valuedAsOf) {
		return { value, costBasis, unrealizedGain: round2(value - costBasis) };
	}

	const monthlyRate = (1 + (investment.expectedAnnualReturn ?? 0)) ** (1 / 12) - 1;
	const months = getYearMonthRange(investment.valuedAsOf, yearMonth);
	for (const ym of months) {
		const contributions = sumTransfers(transfers, (t) => t.targetAssetId === asset.id, ym);
		const withdrawals = sumTransfers(transfers, (t) => t.fromAssetId === asset.id, ym);
		const valueBeforeWithdrawal = round2(value * (1 + monthlyRate) + contributions);
		costBasis = round2(costBasis + contributions);
		// No withdrawal, no basis out (a worthless holding keeps its basis as an unrealized loss).
		let basisOut = 0;
		if (withdrawals > 0) {
			basisOut =
				valueBeforeWithdrawal > 0
					? round2(costBasis * Math.min(1, withdrawals / valueBeforeWithdrawal))
					: costBasis;
		}
		costBasis = round2(costBasis - basisOut);
		value = Math.max(0, round2(valueBeforeWithdrawal - withdrawals));
	}

	return { value, costBasis, unrealizedGain: round2(value - costBasis) };
}

function sumTransfers(transfers: CapitalTransfer[], match: (t: CapitalTransfer) => boolean, yearMonth: string): number {
	return transfers.reduce((acc, t) => (match(t) && isTransferInMonth(t, yearMonth) ? acc + t.amount : acc), 0);
}
