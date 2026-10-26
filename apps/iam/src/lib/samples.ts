/**
 * Sample responses for the signed-out Data tab.
 *
 * These exist so a visitor (or Product in a demo) can see what a rendered
 * component looks like before creating an account. They are labelled "sample"
 * in the UI and never presented as live data: the same views render real
 * responses once a session exists. Shapes mirror apps/api's Summary,
 * MonthlyLedger and Projection schemas.
 */
export const SAMPLES: Record<string, unknown> = {
	"get-api-v1-accounting-summary": {
		yearMonth: "2026-10",
		asOf: "2026-10-24",
		entities: [
			{
				entityId: "fromsukong",
				metrics: {
					cashAssetsValue: 412000,
					gearAssetsValue: 268000,
					totalAssetsValue: 680000,
					currentLiquid: 412000,
					eomLiquid: 389500,
					currentWealth: 641000,
					eomWealth: 618500,
					liquidPct: 0.606,
					gearPct: 0.394,
					totalIncome: 152000,
					totalExpense: 98200,
					liabilityMonthly: 21400,
					liabPct: 0.031,
					runwayMonths: 8.4,
					isDefaultAlive: true,
				},
			},
			{
				entityId: "excited-live",
				metrics: {
					cashAssetsValue: 96000,
					gearAssetsValue: 42000,
					totalAssetsValue: 138000,
					currentLiquid: 96000,
					eomLiquid: 101000,
					currentWealth: 126000,
					eomWealth: 131000,
					liquidPct: 0.696,
					gearPct: 0.304,
					totalIncome: 48000,
					totalExpense: 61500,
					liabilityMonthly: 0,
					liabPct: 0,
					runwayMonths: 3.1,
					isDefaultAlive: true,
				},
			},
		],
	},
	"get-api-v1-accounting-cash-flows": {
		yearMonth: "2026-10",
		entityId: "fromsukong",
		items: [
			{ id: "cf1", sourceType: "income", sourceId: "inc-salary", flowType: "income", direction: "in", date: "2026-10-25", name: "Agoda salary", amount: 152000, isCash: true, spendingAmount: 0 },
			{ id: "cf2", sourceType: "liability", sourceId: "lia-mortgage", flowType: "debt_payment", direction: "out", date: "2026-10-05", name: "Condo mortgage", amount: 21400, isCash: true, spendingAmount: 6800, interest: 6800, principal: 14600 },
			{ id: "cf3", sourceType: "expense", sourceId: "exp-ai", flowType: "expense", direction: "out", date: "2026-10-08", name: "AI subscriptions", amount: 3100, isCash: true, spendingAmount: 3100 },
			{ id: "cf4", sourceType: "asset", sourceId: "ast-camera", flowType: "depreciation", direction: "out", date: "2026-10-31", name: "Camera depreciation", amount: 4200, isCash: false, spendingAmount: 0 },
		],
		totals: { moneyIn: 152000, moneyOut: 31300, spending: 9900 },
	},
	"get-api-v1-accounting-ledger-yearMonth": {
		yearMonth: "2026-10",
		summary: {
			entityId: "fromsukong",
			yearMonth: "2026-10",
			startingTreasury: 389500,
			endingTreasury: 412000,
			totalInflow: 152000,
			totalCashOutflow: 129500,
			totalDepreciation: 4200,
			netCashFlow: 22500,
			runwayMonths: 8.4,
			isDefaultAlive: true,
		},
		actionItems: [
			{ id: "a1", entityId: "fromsukong", yearMonth: "2026-10", title: "Agoda salary", date: "2026-10-25", amount: 152000, type: "inflow" },
			{ id: "a2", entityId: "fromsukong", yearMonth: "2026-10", title: "Condo mortgage", date: "2026-10-05", amount: 21400, type: "outflow" },
			{ id: "a3", entityId: "fromsukong", yearMonth: "2026-10", title: "AI subscriptions", date: "2026-10-08", amount: 3100, type: "subscription" },
			{ id: "a4", entityId: "fromsukong", yearMonth: "2026-10", title: "Camera depreciation", date: "2026-10-31", amount: 4200, type: "depreciation" },
			{ id: "a5", entityId: "fromsukong", yearMonth: "2026-10", title: "Transfer to excited.live", date: "2026-10-12", amount: 20000, type: "capital_out" },
		],
	},
	"get-api-v1-accounting-projection": {
		points: [
			{ offset: -3, yearMonth: "2026-07", balance: 318000 },
			{ offset: -2, yearMonth: "2026-08", balance: 335500 },
			{ offset: -1, yearMonth: "2026-09", balance: 361000 },
			{ offset: 0, yearMonth: "2026-10", balance: 389500 },
			{ offset: 1, yearMonth: "2026-11", balance: 401200 },
			{ offset: 2, yearMonth: "2026-12", balance: 428900 },
			{ offset: 3, yearMonth: "2027-01", balance: 421500 },
			{ offset: 4, yearMonth: "2027-02", balance: 439800 },
			{ offset: 5, yearMonth: "2027-03", balance: 452400 },
			{ offset: 6, yearMonth: "2027-04", balance: 470100 },
		],
		totalIncome: 1824000,
		totalExpense: 1178400,
		liabilityMonthly: 21400,
		projectedNet: 645600,
	},
	"get-api-v1-onboarding": {
		userId: "sample",
		appId: "excited-live",
		isCompleted: false,
		completedAt: null,
		done: ["create-business", "add-income"],
		skipped: ["connect-bank"],
		method: "agent",
		updatedAt: "2026-10-24T12:00:00.000Z",
	},
}
