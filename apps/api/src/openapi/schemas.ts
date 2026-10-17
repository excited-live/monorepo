import type {
	CapitalTransfer,
	CatalogItem,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	MonthlyLedger,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/biz"
import { z } from "zod"

/**
 * Wire schemas for the OpenAPI document.
 *
 * These describe the API for docs and generated clients; they are NOT used to
 * validate requests (handlers keep their current behaviour). Each entity
 * schema is checked against its `@excited-live/biz` type with `satisfies`, so
 * adding or renaming a field in the engine breaks the typecheck here instead of
 * silently drifting from the published spec.
 */

const billingCycle = z.enum(["weekly", "monthly", "quarterly", "semi-annual", "yearly", "one_time"])

export const EntityAccountSchema = z
	.object({
		id: z.string().describe("Client-generated unique id."),
		name: z.string(),
		type: z.enum(["personal", "business"]),
		cashReserve: z.number().describe("Cash on hand, in `currency`."),
		salary: z.number().optional(),
		paydayDayOfMonth: z.number().int().min(1).max(31).optional(),
		targetSafetyBuffer: z.number().optional(),
		currency: z.string().describe("ISO currency code, typically `THB` or `USD`."),
		createdAt: z.string().optional(),
		active: z.boolean().optional(),
		notes: z.string().optional(),
		imageUrl: z.string().optional(),
		careerTitle: z.string().optional(),
		careerCompany: z.string().optional(),
		careerImageUrl: z.string().optional(),
	})
	.meta({ id: "EntityAccount", description: "A personal or business entity that owns money flows." }) satisfies z.ZodType<EntityAccount>

export const RecurringSubscriptionSchema = z
	.object({
		id: z.string(),
		entityId: z.string().describe("Owning `EntityAccount.id`."),
		name: z.string(),
		amount: z.number(),
		cycle: billingCycle,
		category: z.string(),
		nextRenewalDate: z.string().describe("`YYYY-MM-DD`."),
		billingDay: z.number().int().optional(),
		active: z.boolean(),
		notes: z.string().optional(),
		imageUrl: z.string().optional(),
	})
	.meta({ id: "RecurringSubscription", description: "A recurring cost (SaaS, rent, insurance…)." }) satisfies z.ZodType<RecurringSubscription>

export const HardwareAssetSchema = z
	.object({
		id: z.string(),
		entityId: z.string().describe("Owning `EntityAccount.id`."),
		name: z.string(),
		cost: z.number(),
		lifespanMonths: z.number().int(),
		purchaseDate: z.string().describe("`YYYY-MM-DD` or `YYYY-MM`."),
		salvageValue: z.number().optional(),
		category: z.string(),
		imageUrl: z.string().optional(),
		isDefault: z.boolean().optional(),
	})
	.meta({ id: "HardwareAsset", description: "A depreciating asset." }) satisfies z.ZodType<HardwareAsset>

export const RevenueStreamSchema = z
	.object({
		id: z.string(),
		entityId: z.string().describe("Owning `EntityAccount.id`."),
		name: z.string(),
		amount: z.number(),
		frequency: z.enum(["monthly", "yearly", "one_time"]),
		source: z.enum(["stripe", "bank_transfer", "cash", "freelance", "salary", "other"]),
		active: z.boolean(),
		startMonth: z.string().optional().describe("`YYYY-MM`."),
		endMonth: z.string().optional().describe("`YYYY-MM`."),
		notes: z.string().optional(),
		imageUrl: z.string().optional(),
	})
	.meta({ id: "RevenueStream", description: "An income stream." }) satisfies z.ZodType<RevenueStream>

export const LiabilityStreamSchema = z
	.object({
		id: z.string(),
		entityId: z.string().describe("Owning `EntityAccount.id`."),
		name: z.string(),
		amount: z.number().describe("Monthly payment."),
		category: z
			.string()
			.describe(
				"`mortgage`, `car_loan`, `student_loan`, `credit_card`, `business_loan`, `equipment_loan`, `credit_line`, `lease`, `other`, or a custom string.",
			),
		active: z.boolean(),
		notes: z.string().optional(),
		imageUrl: z.string().optional(),
	})
	.meta({ id: "LiabilityStream", description: "A debt payment stream." }) satisfies z.ZodType<LiabilityStream>

export const CapitalTransferSchema = z
	.object({
		id: z.string(),
		fromEntityId: z.string(),
		toEntityId: z.string(),
		amount: z.number(),
		date: z.string().describe("`YYYY-MM-DD` or `YYYY-MM`."),
		note: z.string(),
		targetAssetId: z.string().optional(),
		frequency: z.enum(["one_time", "monthly"]).optional(),
	})
	.meta({ id: "CapitalTransfer", description: "Money moved between two entities." }) satisfies z.ZodType<CapitalTransfer>

export const BizSnapshotSchema = z
	.object({
		accounts: z.array(EntityAccountSchema),
		subscriptions: z.array(RecurringSubscriptionSchema),
		hardware: z.array(HardwareAssetSchema),
		revenues: z.array(RevenueStreamSchema),
		transfers: z.array(CapitalTransferSchema),
		liabilities: z.array(LiabilityStreamSchema),
		updatedAt: z.string().optional().describe("ISO timestamp of the last save."),
		isDefault: z.boolean().optional().describe("`true` while the user has never saved and seed data is returned."),
	})
	.meta({ id: "BizSnapshot", description: "Everything a user owns in the biz domain, in one document." })

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
		type: z.enum(["subscription", "hardware", "career", "revenue"]),
		category: z.string(),
		defaultAmounts: z.record(z.string(), z.number().optional()).describe("Default amount per currency code."),
		cycle: z.enum(["monthly", "yearly"]).optional(),
		domain: z.string().optional(),
		imageUrl: z.string(),
		coverImageUrl: z.string().optional(),
		notes: z.string().optional(),
	})
	.meta({ id: "CatalogItem", description: "A preset from the built-in subscription/hardware catalog." }) satisfies z.ZodType<CatalogItem>

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
