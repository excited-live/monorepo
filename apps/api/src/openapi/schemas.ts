import type {
	BookAsset,
	BookCashAsset,
	BookEntity,
	BookExpense,
	BookFixedAsset,
	BookIncome,
	BookInvestmentAsset,
	BookLiability,
	BookLoanDetails,
	BookRevolvingDetails,
	BookTransfer,
	CatalogItem,
	MonthlyLedger,
	Stored,
} from "@excited-live/accounting"
import { z } from "zod"

/**
 * Wire schemas for the OpenAPI document.
 *
 * These describe the API for docs and generated clients. The accounting record
 * schemas below are response shapes only: every stored record goes over the wire
 * as `Stored<Book…>` (the record plus `version`, `createdAt`, `updatedAt`).
 * Request bodies are validated by each module's own `*.schemas.ts`, not here.
 * Each record schema is checked against its `@excited-live/accounting` type with
 * `satisfies`, so renaming a field in the engine breaks the typecheck here instead
 * of silently drifting from the published spec. The data model is described in
 * docs/accounting-data-model.md.
 */

const billingCycle = z.enum(["weekly", "monthly", "quarterly", "semi-annual", "yearly", "one_time"])
const details = z.record(z.string(), z.unknown()).describe("Display-only extras the engine never reads.")
const dayOfMonth = z.number().int().min(1).max(31)

const storedMeta = z.object({
	version: z.number().int().describe("Starts at 1; every update bumps it. PATCH may send it back to detect conflicts."),
	createdAt: z.string().describe("ISO timestamp."),
	updatedAt: z.string().describe("ISO timestamp."),
})

/** A personal or business ledger. Every user has exactly one personal entity. */
export const EntitySchema = z
	.object({
		id: z.string(),
		name: z.string(),
		type: z.enum(["personal", "business"]),
		currency: z.string().describe("ISO currency code, typically `THB` or `USD`."),
		targetSafetyBuffer: z.number().optional(),
		active: z.boolean(),
		notes: z.string().optional(),
		imageUrl: z.string().optional(),
	})
	.extend(storedMeta.shape)
	.meta({ id: "Entity", description: "A personal or business entity that owns money flows." }) satisfies z.ZodType<Stored<BookEntity>>

const assetBase = {
	id: z.string(),
	entityId: z.string().describe("Owning `Entity.id`."),
	name: z.string(),
	category: z.string().describe("Free-form sub-type: bank, e_wallet, laptop, vehicle, property, stock…"),
	active: z.boolean(),
	notes: z.string().optional(),
	imageUrl: z.string().optional(),
	details,
}

export const CashAssetSchema = z
	.object({
		...assetBase,
		kind: z.literal("cash"),
		balance: z.number().describe("Balance at the start of `balanceAsOf`."),
		balanceAsOf: z.string().describe("`YYYY-MM`, or `YYYY-MM-DD` for a balance recorded mid-month."),
		currency: z.string(),
		isDefault: z.boolean().describe("Where unlinked money of the entity lands. One per entity."),
	})
	.extend(storedMeta.shape)
	.meta({ id: "CashAsset", description: "Cash and cash equivalents: bank accounts, e-wallets, cash on hand." }) satisfies z.ZodType<Stored<BookCashAsset>>

export const FixedAssetSchema = z
	.object({
		...assetBase,
		kind: z.literal("fixed"),
		cost: z.number(),
		acquiredOn: z.string().describe("`YYYY-MM` or `YYYY-MM-DD`."),
		depreciationMethod: z.enum(["straight_line", "none"]),
		usefulLifeMonths: z.number().int().optional().describe("Required unless depreciationMethod is `none`."),
		salvageValue: z.number(),
	})
	.extend(storedMeta.shape)
	.meta({ id: "FixedAsset", description: "PP&E bought once and depreciated over its useful life." }) satisfies z.ZodType<Stored<BookFixedAsset>>

export const InvestmentAssetSchema = z
	.object({
		...assetBase,
		kind: z.literal("investment"),
		instrument: z.string(),
		symbol: z.string().optional(),
		units: z.number().optional(),
		costBasis: z.number(),
		marketValue: z.number(),
		valuedAsOf: z.string().describe("`YYYY-MM`."),
		expectedAnnualReturn: z.number().optional().describe("Yearly return as a fraction (0.07 = 7%)."),
		currency: z.string(),
	})
	.extend(storedMeta.shape)
	.meta({ id: "InvestmentAsset", description: "Valued at market, grown by an expected return, never depreciated." }) satisfies z.ZodType<Stored<BookInvestmentAsset>>

export const AssetSchema = z
	.discriminatedUnion("kind", [CashAssetSchema, FixedAssetSchema, InvestmentAssetSchema])
	.meta({ id: "Asset", description: "An asset, discriminated by `kind`." }) satisfies z.ZodType<Stored<BookAsset>>

const scheduleFields = {
	amount: z.number(),
	cycle: billingCycle,
	dayOfMonth: dayOfMonth.optional().describe("Day the money moves; absent = the flow type's default day."),
	startMonth: z.string().describe("`YYYY-MM`. First month the flow happens."),
	endMonth: z.string().optional().describe("`YYYY-MM`. Last month; absent = open-ended."),
}

export const IncomeSchema = z
	.object({
		id: z.string(),
		entityId: z.string(),
		kind: z.enum(["employment", "business", "investment", "other"]),
		category: z.string().describe("salary, bonus, freelance, sales, dividend, interest, rent…"),
		name: z.string(),
		...scheduleFields,
		taxCategory: z.enum(["40_1", "40_2", "40_3", "40_4", "40_5", "40_6", "40_7", "40_8"]).optional(),
		depositAssetId: z.string().optional().describe("Cash asset the income lands in; absent = the default cash asset."),
		sourceAssetId: z.string().optional().describe("Asset that generates it. Investment income only."),
		employment: z
			.object({ employer: z.string().optional(), title: z.string().optional() })
			.optional()
			.describe("Present only when kind is `employment`."),
		active: z.boolean(),
		notes: z.string().optional(),
		imageUrl: z.string().optional(),
		details,
	})
	.extend(storedMeta.shape)
	.meta({ id: "Income", description: "An income stream." }) satisfies z.ZodType<Stored<BookIncome>>

export const ExpenseSchema = z
	.object({
		id: z.string(),
		entityId: z.string(),
		name: z.string(),
		category: z.string(),
		...scheduleFields,
		paidFromAssetId: z.string().optional(),
		paidFromLiabilityId: z.string().optional().describe("Revolving liability (credit card) it is charged to."),
		assetId: z.string().optional().describe("Asset this is a cost of owning."),
		incomeId: z.string().optional().describe("Income this is a cost of earning."),
		active: z.boolean(),
		notes: z.string().optional(),
		imageUrl: z.string().optional(),
		details,
	})
	.extend(storedMeta.shape)
	.meta({ id: "Expense", description: "A recurring or one-time cost." }) satisfies z.ZodType<Stored<BookExpense>>

export const LoanDetailsSchema = z
	.object({
		principal: z.number(),
		annualRate: z.number().describe("Yearly interest rate as a fraction (0.065 = 6.5%)."),
		termMonths: z.number().int(),
		originatedOn: z.string().describe("`YYYY-MM` or `YYYY-MM-DD`."),
		financedAssetId: z.string().optional(),
		proceedsAssetId: z.string().optional(),
	})
	.meta({ id: "LoanDetails", description: "Amortizing loan terms." }) satisfies z.ZodType<BookLoanDetails>

export const RevolvingDetailsSchema = z
	.object({
		creditLimit: z.number().optional(),
		balance: z.number(),
		balanceAsOf: z.string().describe("`YYYY-MM`."),
		annualRate: z.number().optional(),
	})
	.meta({ id: "RevolvingDetails", description: "Revolving credit: a card or credit line." }) satisfies z.ZodType<BookRevolvingDetails>

export const LiabilitySchema = z
	.object({
		id: z.string(),
		entityId: z.string(),
		kind: z.enum(["loan", "revolving", "other"]),
		name: z.string(),
		category: z.string(),
		...scheduleFields,
		paidFromAssetId: z.string().optional(),
		loan: LoanDetailsSchema.optional().describe("Present only when kind is `loan`."),
		revolving: RevolvingDetailsSchema.optional().describe("Present only when kind is `revolving`."),
		active: z.boolean(),
		notes: z.string().optional(),
		imageUrl: z.string().optional(),
		details,
	})
	.extend(storedMeta.shape)
	.meta({ id: "Liability", description: "A debt. The schedule is the planned payment." }) satisfies z.ZodType<Stored<BookLiability>>

export const TransferSchema = z
	.object({
		id: z.string(),
		amount: z.number(),
		date: z.string().describe("`YYYY-MM-DD` or `YYYY-MM`."),
		cycle: z.enum(["one_time", "monthly"]),
		note: z.string(),
		fromAssetId: z.string(),
		toAssetId: z.string().optional(),
		toLiabilityId: z.string().optional(),
	})
	.extend(storedMeta.shape)
	.meta({ id: "Transfer", description: "Money moved from an asset to an asset, or onto a liability." }) satisfies z.ZodType<Stored<BookTransfer>>

export const MonthlyLedgerSchema = z
	.object({
		yearMonth: z.string(),
		summary: z.object({
			entityId: z.string().optional(),
			yearMonth: z.string().optional(),
			startingTreasury: z.number(),
			endingTreasury: z.number(),
			totalInflow: z.number(),
			totalCashOutflow: z.number(),
			totalDepreciation: z.number(),
			netCashFlow: z.number(),
			runwayMonths: z.number().nullable().optional(),
			isDefaultAlive: z.boolean().optional(),
		}),
		actionItems: z.array(
			z.object({
				id: z.string(),
				entityId: z.string().optional(),
				yearMonth: z.string().optional(),
				title: z.string(),
				date: z.string(),
				amount: z.number(),
				type: z.enum([
					"subscription",
					"depreciation",
					"revenue",
					"capital_in",
					"capital_out",
					"inflow",
					"outflow",
				]),
				category: z.string().optional(),
				reference: z.string().optional(),
			}),
		),
	})
	.meta({ id: "MonthlyLedger", description: "Computed cash ledger for one entity and month." }) satisfies z.ZodType<MonthlyLedger>

export const CatalogItemSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		aliases: z.array(z.string()),
		type: z.enum(["subscription", "hardware", "career", "revenue", "liability"]),
		category: z.string(),
		defaultAmounts: z.record(z.string(), z.number().optional()).describe("Default amount per currency code."),
		cycle: z.enum(["monthly", "yearly"]).optional(),
		domain: z.string().optional(),
		imageUrl: z.string(),
		coverImageUrl: z.string().optional(),
		notes: z.string().optional(),
	})
	.meta({ id: "CatalogItem", description: "A preset from the built-in subscription, hardware, revenue and liability catalog." }) satisfies z.ZodType<CatalogItem>

// Plan documents are owned by @excited-live/sim and change independently of the
// API; describing them as an open object keeps the spec honest.
export const PlanInputSchema = z
	.record(z.string(), z.unknown())
	.meta({ id: "PlanInput", description: "Plan document defined by `@excited-live/sim` (`PlanInput`). Stored and returned verbatim." })

export const UserSettingsSchema = z
	.object({
		profileName: z.string(),
		birthday: z.string().optional().describe("`YYYY-MM-DD`; absent (not null) when unset."),
		gender: z.string(),
	})
	.meta({ id: "UserSettings", description: "Per-user profile settings." })

export const OkSchema = z.object({ ok: z.literal(true) }).meta({ id: "Ok" })

export const ErrorSchema = z.object({ error: z.string() }).meta({ id: "Error" })

export const UserOnboardingSchema = z
	.object({
		userId: z.string(),
		appId: z.string(),
		isCompleted: z.boolean(),
		completedAt: z.string().nullable().optional(),
		done: z.array(z.string()),
		skipped: z.array(z.string()),
		method: z.enum(["agent", "manual"]).nullable().describe("How the user chose to onboard; null when not chosen yet."),
		updatedAt: z.string(),
	})
	.meta({ id: "UserOnboarding", description: "Per-user onboarding progress and completion status per app." })

export const UpdateUserOnboardingSchema = z
	.object({
		appId: z.string().optional(),
		isCompleted: z.boolean().optional(),
		done: z.array(z.string()).optional(),
		skipped: z.array(z.string()).optional(),
		method: z.enum(["agent", "manual"]).nullable().optional().describe("Pass `null` to clear the stored method."),
	})
	.meta({ id: "UpdateUserOnboarding", description: "Payload to update user onboarding progress." })
