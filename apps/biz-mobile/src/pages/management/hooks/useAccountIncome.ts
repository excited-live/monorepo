import { useMemo } from "react";
import { round2, type EntityAccount, type RevenueStream } from "@excited-live/biz";
import { useFinances } from "../../../state";

export interface AccountIncomeSlice {
	entityRev: RevenueStream[];
	hasConfiguredSalary: boolean;
	totalIncome: number;
}

export function useAccountIncome(
	activeAccount: EntityAccount,
	selectedMonth: string,
): AccountIncomeSlice {
	const { revenues } = useFinances();

	return useMemo(() => {
		if (!activeAccount) {
			return {
				entityRev: [],
				hasConfiguredSalary: false,
				totalIncome: 0,
			};
		}

		const entityRev = revenues.filter((r) => {
			if (r.entityId !== activeAccount.id || !r.active) return false;
			if (selectedMonth) {
				if (r.frequency === "one_time") return r.startMonth === selectedMonth;
				if (r.startMonth && selectedMonth < r.startMonth) return false;
				if (r.endMonth && selectedMonth > r.endMonth) return false;
			}
			return true;
		});

		const hasConfiguredSalary = revenues.some(
			(r) => r.entityId === activeAccount.id && r.source === "salary",
		);
		const legacySalary = !hasConfiguredSalary && activeAccount.type === "personal" ? (activeAccount.salary ?? 0) : 0;
		const totalIncome = round2(
			legacySalary +
				entityRev.reduce(
					(acc, r) => acc + (r.frequency === "yearly" ? round2(r.amount / 12) : r.frequency === "monthly" ? r.amount : 0),
					0,
				),
		);

		return {
			entityRev,
			hasConfiguredSalary,
			totalIncome,
		};
	}, [activeAccount, selectedMonth, revenues]);
}
