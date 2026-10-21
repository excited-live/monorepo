import {
	countCompletedSteps,
	countOnboardingEntries,
	deriveOnboardingSteps,
	findBestCatalogMatch,
	isOnboardingComplete,
	isOnboardingStepId,
	ONBOARDING_STEPS,
	resolveCatalogAmount,
	searchCatalog,
	type CatalogItem,
	type OnboardingStepId,
} from "@excited-live/accounting";
import { z } from "zod";
import { ValidationError } from "../../accounting/domain/errors";
import {
	CreateAssetBody,
	CreateEntityBody,
	CreateExpenseBody,
	CreateIncomeBody,
	CreateLiabilityBody,
} from "../../accounting/route/accounting.schemas";
import type { McpToolContext, McpToolDefinition } from "../registry";

/**
 * Onboarding tool suite. Inputs reuse the REST body schemas from
 * accounting.schemas.ts; the only change is that `entityId` is optional and
 * defaults to the user's personal entity, as the onboarding flow always writes
 * there unless a business is named.
 */

const optionalEntityId = { entityId: z.string().min(1).optional().describe("Defaults to the personal entity.") };

/** Widen a REST body schema so `entityId` may be omitted. */
const optionalEntity = <S extends z.ZodObject<z.ZodRawShape>>(schema: S) => schema.extend(optionalEntityId);
const optionalEntityUnion = (schema: { options: readonly z.ZodObject<z.ZodRawShape>[] }) =>
	z.discriminatedUnion(
		"kind",
		schema.options.map((option) => option.extend(optionalEntityId)) as unknown as [
			z.ZodObject<z.ZodRawShape>,
			...z.ZodObject<z.ZodRawShape>[],
		],
	);

const emptyInput = z.object({});

const AssetInput = optionalEntityUnion(CreateAssetBody);
const IncomeInput = optionalEntityUnion(CreateIncomeBody);
const LiabilityInput = optionalEntityUnion(CreateLiabilityBody);
const ExpenseInput = optionalEntity(CreateExpenseBody);

const StepInput = z.object({
	stepId: z.enum(ONBOARDING_STEPS.map((step) => step.id) as [OnboardingStepId, ...OnboardingStepId[]]),
});

const CatalogInput = z.object({
	query: z.string().min(1).describe("Product, subscription, gear or employer name."),
	currency: z.string().optional().describe("Defaults to THB."),
	type: z.enum(["subscription", "hardware", "career", "revenue", "liability"]).optional(),
});

const SummaryInput = z.object({
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM")
		.optional()
		.describe("Defaults to the current UTC month."),
});

/** The registry wants a plain object schema; these stay validated by zod at runtime. */
const input = <S extends z.ZodType>(schema: S): z.ZodType<Record<string, unknown>> =>
	schema as unknown as z.ZodType<Record<string, unknown>>;

function parseBody<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
	const result = schema.safeParse(value);
	if (result.success) return result.data;
	const issue = result.error.issues[0];
	throw new ValidationError(issue ? [issue.path.join("."), issue.message].filter(Boolean).join(": ") : "Invalid input");
}

function currentMonth(): string {
	return new Date().toISOString().slice(0, 7);
}

async function personalEntityId(ctx: McpToolContext): Promise<string> {
	const entities = await ctx.accounting.listEntities(ctx.userId);
	const personal = entities.find((entity) => entity.type === "personal");
	if (!personal) throw new ValidationError("The personal entity is missing");
	return personal.id;
}

/** The book state behind `get_onboarding_status`, shared by complete/skip. */
async function onboardingSnapshot(ctx: McpToolContext) {
	const entities = await ctx.accounting.listEntities(ctx.userId);
	const personalId = entities.find((entity) => entity.type === "personal")?.id ?? "";
	const [assets, incomes, expenses, liabilities, onboarding] = await Promise.all([
		ctx.accounting.listAssets(ctx.userId, { entityId: personalId }),
		ctx.accounting.listIncomes(ctx.userId, { entityId: personalId }),
		ctx.accounting.listExpenses(ctx.userId, { entityId: personalId }),
		ctx.accounting.listLiabilities(ctx.userId, { entityId: personalId }),
		ctx.onboarding.get(ctx.userId),
	]);

	const businesses = entities.filter((entity) => entity.type === "business");
	const entryCounts = countOnboardingEntries({
		businesses: businesses.length,
		assets: assets.length,
		liabilities: liabilities.length,
		incomes: incomes.length,
		expenses: expenses.length,
	});
	const progress = {
		done: onboarding.done.filter(isOnboardingStepId),
		skipped: onboarding.skipped.filter(isOnboardingStepId),
	};
	const labels: Record<OnboardingStepId, string[]> = {
		create_account: [],
		add_business: businesses.map((entity) => entity.name),
		assets_wallet: assets.map((asset) => asset.name),
		add_liability: liabilities.map((liability) => liability.name),
		add_income: incomes.map((income) => income.name),
		add_expense: expenses.map((expense) => expense.name),
	};

	return { entities, businesses, assets, incomes, expenses, liabilities, onboarding, entryCounts, progress, labels };
}

export const onboardingTools: readonly McpToolDefinition[] = [
	{
		name: "get_onboarding_status",
		title: "Get onboarding status",
		description:
			"Steps in order with status, how many entries each already holds and their names (helps avoid duplicates), the next step to do, whether onboarding is complete, and the chosen method.",
		inputSchema: input(emptyInput),
		requiredScope: "onboarding:read",
		async handler(ctx) {
			const snapshot = await onboardingSnapshot(ctx);
			const steps = deriveOnboardingSteps(snapshot.entryCounts, snapshot.progress).map((step) => ({
				id: step.id,
				title: step.title,
				shortTitle: step.shortTitle,
				skippable: step.skippable,
				status: step.status,
				entryCount: step.entryCount,
				canComplete: step.canComplete,
				entryLabels: snapshot.labels[step.id],
			}));
			return {
				appId: snapshot.onboarding.appId,
				method: snapshot.onboarding.method,
				isComplete: snapshot.onboarding.isCompleted || isOnboardingComplete(steps),
				completedCount: countCompletedSteps(steps),
				totalSteps: steps.length,
				nextStep: steps.find((step) => step.status === "active")?.id ?? null,
				steps,
			};
		},
	},
	{
		name: "list_entities",
		title: "List entities",
		description: "The user's personal entity and every business entity.",
		inputSchema: input(emptyInput),
		requiredScope: "accounting:read",
		async handler(ctx) {
			const entities = await ctx.accounting.listEntities(ctx.userId);
			return { entities };
		},
	},
	{
		name: "create_business",
		title: "Create a business",
		description: "Creates a business entity (and its default cash wallet). The personal entity is created automatically.",
		inputSchema: input(CreateEntityBody),
		requiredScope: "accounting:write",
		async handler(ctx, raw) {
			const body = parseBody(CreateEntityBody, { ...raw, type: "business" });
			return { entity: await ctx.accounting.createEntity(ctx.userId, body) };
		},
	},
	{
		name: "add_asset",
		title: "Add an asset",
		description:
			"Creates a cash wallet, a fixed asset (gear, laptop, vehicle, property) or an investment. Defaults to the personal entity.",
		inputSchema: input(AssetInput),
		requiredScope: "accounting:write",
		async handler(ctx, raw) {
			const body = parseBody(CreateAssetBody, { ...raw, entityId: raw.entityId ?? (await personalEntityId(ctx)) });
			return { asset: await ctx.accounting.createAsset(ctx.userId, body) };
		},
	},
	{
		name: "add_liability",
		title: "Add a liability",
		description: "Creates a loan, revolving credit card or other liability. Defaults to the personal entity.",
		inputSchema: input(LiabilityInput),
		requiredScope: "accounting:write",
		async handler(ctx, raw) {
			const body = parseBody(CreateLiabilityBody, {
				...raw,
				entityId: raw.entityId ?? (await personalEntityId(ctx)),
			});
			return { liability: await ctx.accounting.createLiability(ctx.userId, body) };
		},
	},
	{
		name: "add_income",
		title: "Add income",
		description:
			"Creates an income stream (employment, business, investment or other). Defaults to the personal entity. Career salary goes through the app's career editor.",
		inputSchema: input(IncomeInput),
		requiredScope: "accounting:write",
		async handler(ctx, raw) {
			const body = parseBody(CreateIncomeBody, { ...raw, entityId: raw.entityId ?? (await personalEntityId(ctx)) });
			return { income: await ctx.accounting.createIncome(ctx.userId, body) };
		},
	},
	{
		name: "add_expense",
		title: "Add an expense",
		description: "Creates an expense or subscription. Defaults to the personal entity.",
		inputSchema: input(ExpenseInput),
		requiredScope: "accounting:write",
		async handler(ctx, raw) {
			const body = parseBody(CreateExpenseBody, { ...raw, entityId: raw.entityId ?? (await personalEntityId(ctx)) });
			return { expense: await ctx.accounting.createExpense(ctx.userId, body) };
		},
	},
	{
		name: "lookup_catalog",
		title: "Look up the catalog",
		description:
			"Resolve a known product, subscription, gear item or employer to a preset name, category and price (default currency THB). Use it before asking the user for a price.",
		inputSchema: input(CatalogInput),
		requiredScope: "accounting:read",
		async handler(_ctx, raw) {
			const query = String(raw.query ?? "");
			const currency = typeof raw.currency === "string" && raw.currency ? raw.currency : "THB";
			const type = raw.type as CatalogItem["type"] | undefined;
			const withAmount = (item: CatalogItem) => ({ ...item, amount: resolveCatalogAmount(item, currency) });
			const bestMatch = findBestCatalogMatch(query, type);
			return {
				query,
				currency,
				bestMatch: bestMatch ? withAmount(bestMatch) : null,
				suggestions: searchCatalog(query, type).slice(0, 5).map(withAmount),
			};
		},
	},
	{
		name: "complete_onboarding_step",
		title: "Complete an onboarding step",
		description:
			"Marks a step done. Requires at least one entry first (create_account excepted). Sets the onboarding method to `agent` when it has not been chosen yet.",
		inputSchema: input(StepInput),
		requiredScope: "onboarding:write",
		async handler(ctx, raw) {
			const stepId = raw.stepId as OnboardingStepId;
			const step = ONBOARDING_STEPS.find((candidate) => candidate.id === stepId);
			if (!step) throw new ValidationError(`Unknown onboarding step: ${stepId}`);

			const snapshot = await onboardingSnapshot(ctx);
			if (stepId !== "create_account" && (snapshot.entryCounts[stepId] ?? 0) === 0) {
				throw new ValidationError(
					`Add at least one entry before completing "${step.title}" (use skip_onboarding_step if the user has none).`,
				);
			}

			const progress = {
				done: [...new Set([...snapshot.progress.done, stepId])],
				skipped: snapshot.progress.skipped.filter((id) => id !== stepId),
			};
			const saved = await ctx.onboarding.save(ctx.userId, {
				done: progress.done,
				skipped: progress.skipped,
				isCompleted: isOnboardingComplete(deriveOnboardingSteps(snapshot.entryCounts, progress)),
				method: snapshot.onboarding.method ?? "agent",
			});
			return { method: saved.method, isComplete: saved.isCompleted };
		},
	},
	{
		name: "skip_onboarding_step",
		title: "Skip an onboarding step",
		description: "Skips a skippable step. Skipping is reversible.",
		inputSchema: input(StepInput),
		requiredScope: "onboarding:write",
		async handler(ctx, raw) {
			const stepId = raw.stepId as OnboardingStepId;
			const step = ONBOARDING_STEPS.find((candidate) => candidate.id === stepId);
			if (!step) throw new ValidationError(`Unknown onboarding step: ${stepId}`);
			if (!step.skippable) throw new ValidationError(`"${step.title}" cannot be skipped`);

			const snapshot = await onboardingSnapshot(ctx);
			const progress = {
				done: snapshot.progress.done.filter((id) => id !== stepId),
				skipped: [...new Set([...snapshot.progress.skipped, stepId])],
			};
			const saved = await ctx.onboarding.save(ctx.userId, {
				done: progress.done,
				skipped: progress.skipped,
				isCompleted: isOnboardingComplete(deriveOnboardingSteps(snapshot.entryCounts, progress)),
			});
			return { isComplete: saved.isCompleted };
		},
	},
	{
		name: "get_financial_summary",
		title: "Get the financial summary",
		description:
			"Wealth metrics and balance sheet per entity plus the consolidated totals, for one month. Use it for the closing recap.",
		inputSchema: input(SummaryInput),
		requiredScope: "accounting:read",
		async handler(ctx, raw) {
			const month = typeof raw.month === "string" && raw.month ? raw.month : currentMonth();
			return { summary: await ctx.accounting.getSummary(ctx.userId, { month }) };
		},
	},
];
