import type {
	BalanceSheet,
	CashFlowItem,
	LoanScheduleEntry,
	RevolvingScheduleEntry,
} from "@excited-live/accounting";
import { z } from "zod";
import {
	AssetSchema,
	EntitySchema,
	ErrorSchema,
	ExpenseSchema,
	IncomeSchema,
	LiabilitySchema,
	MonthlyLedgerSchema,
	OkSchema,
	TransferSchema,
} from "../../../openapi/schemas";

/**
 * Request bodies, queries and computed-response schemas for /api/v1/accounting.
 * Record schemas (the wire shape of stored rows) live in openapi/schemas.ts.
 *
 * POST bodies are validated whole. PATCH bodies are partial and carry an optional
 * `version`; the service merges them onto the stored record and re-validates the
 * merged record against the POST schema, so a PATCH can never produce a record a
 * POST would reject. Id, kind and entityId are not patchable (they are not in the
 * PATCH schemas, so they are stripped).
 */

const uuid = z.uuid("id must be a UUID");
const month = z.string().regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM");
const monthOrDate = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "Expected YYYY-MM or YYYY-MM-DD");
const cycle = z.enum(["weekly", "monthly", "quarterly", "semi-annual", "yearly", "one_time"]);
const dayOfMonth = z.number().int().min(1).max(31);
const version = z.number().int().min(1).optional().describe("Stored version the caller last read; a mismatch returns 409.");
const details = z.record(z.string(), z.unknown());
const asOf = monthOrDate.optional().describe("Client's current month or day. Default month for startMonth; otherwise the UTC month.");
/** PATCH fields: every field optional; fields that are optional on create also accept null, which clears them. */
type Patchable<T extends z.ZodRawShape> = {
	[K in keyof T]: T[K] extends z.ZodOptional<z.ZodType> ? z.ZodOptional<z.ZodNullable<T[K]>> : z.ZodOptional<T[K]>;
};
const partial = <T extends z.ZodRawShape>(shape: T): Patchable<T> =>
	Object.fromEntries(
		Object.entries(shape).map(([key, field]) => {
			const zod = field as z.ZodType;
			return [key, zod instanceof z.ZodOptional ? zod.nullable().optional() : zod.optional()];
		}),
	) as Patchable<T>;

// ENTITIES ----------------------------------------------------------------

const entityType = z.enum(["personal", "business"]);
const entityFields = {
	name: z.string().min(1, "Name is required"),
	currency: z.string().min(1).optional(),
	targetSafetyBuffer: z.number().min(0).optional(),
	active: z.boolean().optional(),
	notes: z.string().optional(),
	imageUrl: z.string().optional(),
};

export const CreateEntityBody = z.object({
	id: uuid.optional(),
	type: entityType.optional().describe("Only `business` can be created; the personal entity is created on first use."),
	asOf,
	...entityFields,
});

export const UpdateEntityBody = z.object({
	version,
	type: entityType.optional().describe("Must match the stored type; entity type cannot change."),
	...partial(entityFields),
});

// ASSETS ------------------------------------------------------------------

const assetIdentity = { id: uuid.optional(), entityId: z.string().min(1, "entityId is required") };
const assetCommon = {
	name: z.string().min(1, "Name is required"),
	category: z.string().min(1, "Category is required"),
	active: z.boolean().optional(),
	notes: z.string().optional(),
	imageUrl: z.string().optional(),
	details: details.optional(),
};
const cashFields = {
	balance: z.number().optional().describe("Defaults to 0."),
	balanceAsOf: monthOrDate.optional().describe("Defaults to the UTC month."),
	currency: z.string().min(1).optional(),
	isDefault: z.boolean().optional(),
};
const fixedFields = {
	cost: z.number().min(0),
	acquiredOn: monthOrDate,
	depreciationMethod: z.enum(["straight_line", "none"]).optional(),
	usefulLifeMonths: z.number().int().positive().optional(),
	salvageValue: z.number().min(0).optional(),
};
const investmentFields = {
	instrument: z.string().min(1, "Instrument is required"),
	symbol: z.string().optional(),
	units: z.number().optional(),
	costBasis: z.number().min(0).optional(),
	marketValue: z.number().min(0).optional(),
	valuedAsOf: month.optional(),
	expectedAnnualReturn: z.number().optional(),
	currency: z.string().min(1).optional(),
};

/** Buys the asset with cash: creates a transfer from `assetId` (or the entity's default cash) in the same write. */
const paidFromSchema = z.object({
	assetId: z.string().min(1).optional().describe("Cash asset to pay from. Takes precedence over entityId."),
	entityId: z.string().min(1).optional().describe("Entity whose default cash asset pays. Defaults to the asset's entity."),
	date: monthOrDate.optional().describe("Defaults to acquiredOn (fixed) or valuedAsOf (investment)."),
	amount: z
		.number()
		.min(0)
		.optional()
		.describe(
			"Defaults to marketValue (investment) or cost (fixed). A financed fixed asset pays cost minus financing.principal (the down payment).",
		),
});

/** Finances a fixed asset: creates a loan liability in the same write. */
const financingSchema = z.object({
	principal: z.number().min(0),
	annualRate: z.number().min(0),
	termMonths: z.number().int().positive(),
	originatedOn: monthOrDate.optional().describe("Defaults to acquiredOn."),
	amount: z
		.number()
		.min(0)
		.optional()
		.describe("Monthly payment. Defaults to the level payment: calculateLoanPayment(principal, annualRate, termMonths)."),
	name: z.string().min(1).optional(),
	category: z.string().min(1).optional(),
});

export const CreateAssetBody = z.discriminatedUnion("kind", [
	z.object({ ...assetIdentity, ...assetCommon, kind: z.literal("cash"), ...cashFields }),
	z.object({
		...assetIdentity,
		...assetCommon,
		kind: z.literal("fixed"),
		...fixedFields,
		paidFrom: paidFromSchema.optional(),
		financing: financingSchema.optional(),
	}),
	z.object({ ...assetIdentity, ...assetCommon, kind: z.literal("investment"), ...investmentFields, paidFrom: paidFromSchema.optional() }),
]);

export const UpdateAssetBody = z.object({
	version,
	...partial(assetCommon),
	...partial(cashFields),
	...partial(fixedFields),
	...partial(investmentFields),
});

// INCOMES -----------------------------------------------------------------

const taxCategory = z.enum(["40_1", "40_2", "40_3", "40_4", "40_5", "40_6", "40_7", "40_8"]);
const incomeFields = {
	name: z.string().min(1, "Name is required"),
	category: z.string().min(1, "Category is required"),
	amount: z.number().min(0),
	cycle: cycle.optional(),
	dayOfMonth: dayOfMonth.optional(),
	startMonth: month.optional(),
	endMonth: month.optional(),
	taxCategory: taxCategory.optional(),
	depositAssetId: z.string().min(1).optional(),
	active: z.boolean().optional(),
	notes: z.string().optional(),
	imageUrl: z.string().optional(),
	details: details.optional(),
};
const employmentFields = z.object({ employer: z.string().optional(), title: z.string().optional() });
const incomeIdentity = { id: uuid.optional(), entityId: z.string().min(1, "entityId is required"), asOf };

export const CreateIncomeBody = z.discriminatedUnion("kind", [
	z.object({
		...incomeIdentity,
		...incomeFields,
		kind: z.literal("employment"),
		employment: employmentFields.optional(),
		sourceAssetId: z.undefined("sourceAssetId is only allowed for investment income").optional(),
	}),
	z.object({
		...incomeIdentity,
		...incomeFields,
		kind: z.literal("business"),
		employment: z.undefined("employment is only allowed for employment income").optional(),
		sourceAssetId: z.undefined("sourceAssetId is only allowed for investment income").optional(),
	}),
	z.object({
		...incomeIdentity,
		...incomeFields,
		kind: z.literal("investment"),
		employment: z.undefined("employment is only allowed for employment income").optional(),
		sourceAssetId: z.string().min(1).optional().describe("Asset that generates the income (dividends, rent, interest)."),
	}),
	z.object({
		...incomeIdentity,
		...incomeFields,
		kind: z.literal("other"),
		employment: z.undefined("employment is only allowed for employment income").optional(),
		sourceAssetId: z.undefined("sourceAssetId is only allowed for investment income").optional(),
	}),
]);

export const UpdateIncomeBody = z.object({
	version,
	...partial(incomeFields),
	employment: employmentFields.optional(),
	sourceAssetId: z.string().min(1).optional(),
});

/** POST /incomes/career: sets the entity's primary salary. */
export const SetCareerIncomeBody = z.object({
	entityId: z.string().min(1, "entityId is required"),
	salary: z.number().min(0),
	paydayDayOfMonth: dayOfMonth.optional(),
	title: z.string().optional(),
	company: z.string().optional(),
	imageUrl: z.string().optional(),
	startMonth: z.union([month, z.literal("")]).optional().describe("`YYYY-MM`. Empty string keeps the existing start month."),
	endMonth: z.union([month, z.literal("")]).optional().describe("`YYYY-MM`. Empty string clears the end month."),
	asOf,
});

// EXPENSES ----------------------------------------------------------------

const expenseFields = {
	name: z.string().min(1, "Name is required"),
	category: z.string().min(1, "Category is required"),
	amount: z.number().min(0),
	cycle: cycle.optional(),
	dayOfMonth: dayOfMonth.optional(),
	startMonth: month.optional(),
	endMonth: month.optional(),
	paidFromAssetId: z.string().min(1).optional(),
	paidFromLiabilityId: z.string().min(1).optional(),
	assetId: z.string().min(1).optional(),
	incomeId: z.string().min(1).optional(),
	active: z.boolean().optional(),
	notes: z.string().optional(),
	imageUrl: z.string().optional(),
	details: details.optional(),
};

export const CreateExpenseBody = z.object({
	id: uuid.optional(),
	entityId: z.string().min(1, "entityId is required"),
	asOf,
	...expenseFields,
});

export const UpdateExpenseBody = z.object({ version, ...partial(expenseFields) });

// LIABILITIES -------------------------------------------------------------

const loanDetails = z.object({
	principal: z.number().min(0),
	annualRate: z.number().min(0).optional().describe("Defaults to 0 (0% installment plan)."),
	termMonths: z.number().int().positive(),
	originatedOn: monthOrDate,
	financedAssetId: z.string().min(1).optional(),
	proceedsAssetId: z.string().min(1).optional(),
});
const revolvingDetails = z.object({
	creditLimit: z.number().min(0).optional(),
	balance: z.number().optional().describe("Defaults to 0."),
	balanceAsOf: monthOrDate.optional().describe("Defaults to the start month."),
	annualRate: z.number().min(0).optional(),
});
const liabilityFields = {
	name: z.string().min(1, "Name is required"),
	category: z.string().min(1, "Category is required"),
	cycle: cycle.optional(),
	dayOfMonth: dayOfMonth.optional(),
	startMonth: month.optional(),
	endMonth: month.optional(),
	paidFromAssetId: z.string().min(1).optional(),
	active: z.boolean().optional(),
	notes: z.string().optional(),
	imageUrl: z.string().optional(),
	details: details.optional(),
};
const liabilityIdentity = { id: uuid.optional(), entityId: z.string().min(1, "entityId is required"), asOf };

export const CreateLiabilityBody = z.discriminatedUnion("kind", [
	z.object({
		...liabilityIdentity,
		...liabilityFields,
		kind: z.literal("loan"),
		amount: z
			.number()
			.min(0)
			.optional()
			.describe("Monthly payment. Defaults to the level payment: calculateLoanPayment(principal, annualRate, termMonths)."),
		loan: loanDetails,
		revolving: z.undefined("revolving is only allowed for revolving liabilities").optional(),
	}),
	z.object({
		...liabilityIdentity,
		...liabilityFields,
		kind: z.literal("revolving"),
		amount: z.number().min(0).describe("Monthly payment."),
		revolving: revolvingDetails,
		loan: z.undefined("loan is only allowed for loan liabilities").optional(),
	}),
	z.object({
		...liabilityIdentity,
		...liabilityFields,
		kind: z.literal("other"),
		amount: z.number().min(0),
		loan: z.undefined("loan is only allowed for loan liabilities").optional(),
		revolving: z.undefined("revolving is only allowed for revolving liabilities").optional(),
	}),
]);

export const UpdateLiabilityBody = z.object({
	version,
	...partial(liabilityFields),
	amount: z.number().min(0).optional(),
	loan: loanDetails.partial().optional().describe("Merged shallowly onto the stored loan details."),
	revolving: revolvingDetails.partial().optional().describe("Merged shallowly onto the stored revolving details."),
});

// TRANSFERS ---------------------------------------------------------------

const transferEndpoints = {
	fromAssetId: z.string().min(1).optional(),
	fromEntityId: z.string().min(1).optional().describe("Resolves to the entity's default cash asset."),
	toAssetId: z.string().min(1).optional(),
	toEntityId: z.string().min(1).optional().describe("Resolves to the entity's default cash asset."),
	toLiabilityId: z.string().min(1).optional(),
};

export const CreateTransferBody = z.object({
	id: uuid.optional(),
	amount: z.number().min(0),
	date: monthOrDate,
	cycle: z.enum(["one_time", "monthly"]).optional(),
	note: z.string().optional(),
	...transferEndpoints,
});

export const UpdateTransferBody = z.object({
	version,
	amount: z.number().min(0).optional(),
	date: monthOrDate.optional(),
	cycle: z.enum(["one_time", "monthly"]).optional(),
	note: z.string().optional(),
	...transferEndpoints,
});

// QUERIES -----------------------------------------------------------------

export const AssetListQuery = z.object({
	entityId: z.string().optional(),
	kind: z.enum(["cash", "fixed", "investment"]).optional(),
});

export const IncomeListQuery = z.object({
	entityId: z.string().optional(),
	kind: z.enum(["employment", "business", "investment", "other"]).optional(),
});

export const ExpenseListQuery = z.object({ entityId: z.string().optional() });

export const LiabilityListQuery = z.object({
	entityId: z.string().optional(),
	kind: z.enum(["loan", "revolving", "other"]).optional(),
});

export const SummaryQuery = z.object({
	month: month.describe("`YYYY-MM`."),
	asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD").optional().describe("Today (`YYYY-MM-DD`); current values are as of this day when inside `month`."),
});

export const CashFlowsQuery = z.object({
	month: month.describe("`YYYY-MM`."),
	entityId: z.string().min(1).optional().describe("Defaults to the personal entity."),
	direction: z.enum(["in", "out"]).optional().describe("Filters `items` only; `totals` always cover every item."),
	includeDepreciation: z.enum(["true", "false"]).optional().describe("Adds non-cash depreciation items. Defaults to `false`."),
});

export const LiabilityScheduleQuery = z.object({
	through: month
		.optional()
		.describe(
			"Last month `YYYY-MM`. Loans default to the payoff month or the end of the term, whichever comes first (capped at 600 months). Revolving balances default to the current UTC month.",
		),
});

export const GetLedgerQuerySchema = z.object({
	entityId: z.string().optional(),
});

export const ProjectionQuery = z.object({
	entityId: z.string().optional().describe("Defaults to the personal entity."),
	month: month.optional().describe("Centre month `YYYY-MM`. Defaults to the UTC month."),
	pastMonths: z.coerce.number().int().min(0).max(120).optional(),
	futureMonths: z.coerce.number().int().min(0).max(120).optional(),
	asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD").optional(),
});

// RESPONSES ---------------------------------------------------------------

export const BalanceSheetSchema = z
	.object({
		cash: z.number().describe("End-of-month treasury of the cash wallets."),
		fixedAssets: z.number().describe("Remaining book value of fixed (non-cash, non-investment) assets."),
		investments: z.number().describe("Value of investment assets."),
		totalAssets: z.number().describe("cash + fixedAssets + investments."),
		debt: z.number().describe("Loan and revolving balances owed."),
		netWorth: z.number().describe("totalAssets - debt."),
	})
	.meta({ id: "BalanceSheet", description: "Position at the end of one month." }) satisfies z.ZodType<BalanceSheet>;

export const CashFlowItemSchema = z
	.object({
		id: z.string().describe("Unique within the month's feed."),
		sourceType: z.enum(["income", "expense", "liability", "transfer", "asset", "account"]),
		sourceId: z.string().describe("The record to open when tapped."),
		flowType: z.enum([
			"income",
			"expense",
			"debt_payment",
			"asset_purchase",
			"investment",
			"transfer",
			"loan_proceeds",
			"depreciation",
		]),
		direction: z.enum(["in", "out"]),
		date: z.string().describe("`YYYY-MM-DD`."),
		name: z.string(),
		amount: z.number(),
		isCash: z.boolean().describe("False for card charges and depreciation: they move no cash."),
		spendingAmount: z.number().describe("The part of the amount that counts as spending."),
		cashAssetId: z.string().optional(),
		chargedToLiabilityId: z.string().optional().describe("Revolving liability a card charge lands on."),
		interest: z.number().optional().describe("Loan payments only."),
		principal: z.number().optional().describe("Loan payments only."),
	})
	.meta({ id: "CashFlowItem", description: "One dated money movement in the cash-flow feed." }) satisfies z.ZodType<CashFlowItem>;

export const CashFlowsResponseSchema = z
	.object({
		yearMonth: z.string(),
		entityId: z.string(),
		items: z.array(CashFlowItemSchema),
		totals: z.object({
			moneyIn: z.number().describe("Cash in, from cash items only."),
			moneyOut: z.number().describe("Cash out, from cash items only."),
			spending: z.number().describe("Sum of spendingAmount over every item."),
		}),
	})
	.meta({ id: "CashFlowsResponse", description: "Cash-flow feed of one entity for one month, with totals over all items." });

export const LoanScheduleEntrySchema = z
	.object({
		yearMonth: z.string(),
		opening: z.number(),
		interest: z.number(),
		payment: z.number().describe("Scheduled payment actually made, capped at what is owed."),
		extra: z.number().describe("Extra payments applied, capped at what is owed after `payment`."),
		principal: z.number().describe("Principal repaid; negative when the balance grows."),
		closing: z.number(),
	})
	.meta({ id: "LoanScheduleEntry", description: "One month of a loan." }) satisfies z.ZodType<LoanScheduleEntry>;

export const RevolvingScheduleEntrySchema = z
	.object({
		yearMonth: z.string(),
		opening: z.number(),
		interest: z.number(),
		charges: z.number().describe("Monthly-equivalent card charges that month."),
		payment: z.number().describe("Scheduled payment made, capped at what is owed."),
		extra: z.number().describe("Transfers into the card applied that month, capped at what is still owed."),
		payments: z.number().describe("payment + extra."),
		closing: z.number(),
	})
	.meta({ id: "RevolvingScheduleEntry", description: "One month of a revolving balance." }) satisfies z.ZodType<RevolvingScheduleEntry>;

export const LoanScheduleSchema = z
	.object({
		liabilityId: z.string(),
		kind: z.literal("loan"),
		entries: z.array(LoanScheduleEntrySchema),
	})
	.meta({ id: "LoanSchedule", description: "Month-by-month loan schedule." });

export const RevolvingScheduleSchema = z
	.object({
		liabilityId: z.string(),
		kind: z.literal("revolving"),
		entries: z.array(RevolvingScheduleEntrySchema),
	})
	.meta({ id: "RevolvingSchedule", description: "Month-by-month revolving balance." });

export const LiabilityScheduleSchema = z.discriminatedUnion("kind", [LoanScheduleSchema, RevolvingScheduleSchema]);

const entityWealthMetrics = z.object({
	cashAssetsValue: z.number(),
	gearAssetsValue: z.number(),
	totalAssetsValue: z.number(),
	currentLiquid: z.number(),
	eomLiquid: z.number(),
	currentWealth: z.number(),
	eomWealth: z.number(),
	liquidPct: z.number(),
	gearPct: z.number(),
	totalIncome: z.number(),
	totalExpense: z.number(),
	liabilityMonthly: z.number(),
	liabPct: z.number(),
	runwayMonths: z.number().nullable(),
	isDefaultAlive: z.boolean(),
});

export const SummarySchema = z
	.object({
		yearMonth: z.string(),
		asOf: z.string().optional(),
		entities: z.array(z.object({ entityId: z.string(), metrics: entityWealthMetrics, balanceSheet: BalanceSheetSchema })),
		consolidated: z.object({
			totalTreasury: z.number(),
			totalEomTreasury: z.number(),
			personalCash: z.number(),
			businessCash: z.number(),
			balanceSheet: BalanceSheetSchema,
		}),
	})
	.meta({ id: "Summary", description: "Wealth metrics per entity and consolidated, for one month." });

export const ProjectionSchema = z
	.object({
		points: z.array(z.object({ offset: z.number().int(), yearMonth: z.string(), balance: z.number() })),
		totalIncome: z.number(),
		totalExpense: z.number(),
		liabilityMonthly: z.number(),
		projectedNet: z.number(),
	})
	.meta({ id: "Projection", description: "Treasury balance per month around a centre month." });

export const CareerIncomeResultSchema = z.object({ income: IncomeSchema.nullable() });

export {
	AssetSchema,
	EntitySchema,
	ErrorSchema,
	ExpenseSchema,
	IncomeSchema,
	LiabilitySchema,
	MonthlyLedgerSchema,
	OkSchema,
	TransferSchema,
};
