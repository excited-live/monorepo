import { useMemo } from "react";
import { round2, type EntityAccount, type LiabilityStream } from "@excited-live/accounting";
import { useFinances } from "../../../state";

export interface AccountLiabilitiesSlice {
	entityLiab: LiabilityStream[];
	totalMonthlyLiabilities: number;
}

export function useAccountLiabilities(activeAccount: EntityAccount): AccountLiabilitiesSlice {
	const { liabilities } = useFinances();

	return useMemo(() => {
		if (!activeAccount) {
			return {
				entityLiab: [],
				totalMonthlyLiabilities: 0,
			};
		}

		const entityLiab = liabilities.filter((l) => l.entityId === activeAccount.id && l.active);
		const totalMonthlyLiabilities = round2(
			entityLiab.reduce((acc, l) => acc + l.amount, 0),
		);

		return {
			entityLiab,
			totalMonthlyLiabilities,
		};
	}, [activeAccount, liabilities]);
}
