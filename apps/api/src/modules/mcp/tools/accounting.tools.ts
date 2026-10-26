import { z } from "zod";
import { ValidationError } from "../../accounting/domain/errors";
import { CreateTransferBody } from "../../accounting/route/accounting.schemas";
import { productDate, productMonth } from "../../../lib/product-time";
import { createOrReuse, type McpToolContext, type McpToolDefinition } from "../registry";

/**
 * Accounting MCP tool suite.
 *
 * Exposes core accounting operations: cash flows feed, inter-wallet/liability transfers,
 * computed double-entry monthly ledger, and treasury projection balances.
 */

const emptyInput = z.object({});

const input = <S extends z.ZodType>(schema: S): z.ZodType<Record<string, unknown>> =>
	schema as unknown as z.ZodType<Record<string, unknown>>;

function parseBody<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
	const result = schema.safeParse(value);
	if (result.success) return result.data;
	const issue = result.error.issues[0];
	throw new ValidationError(issue ? [issue.path.join("."), issue.message].filter(Boolean).join(": ") : "Invalid input");
}

async function personalEntityId(ctx: McpToolContext): Promise<string> {
	const entities = await ctx.accounting.listEntities(ctx.userId);
	const personal = entities.find((entity) => entity.type === "personal");
	if (!personal) throw new ValidationError("The personal entity is missing");
	return personal.id;
}

const CashFlowsInput = z.object({
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM")
		.optional()
		.describe("Month in YYYY-MM format. Defaults to current UTC month."),
	entityId: z.string().min(1).optional().describe("Entity ID. Defaults to personal entity."),
	direction: z.enum(["in", "out"]).optional().describe("Filters items by direction; totals always cover every item."),
	includeDepreciation: z.boolean().optional().describe("Include non-cash depreciation items. Defaults to false."),
});

const TransferInput = z.object({
	id: z.string().uuid().optional(),
	amount: z.number().min(0).describe("Transfer amount."),
	date: z
		.string()
		.regex(/^\d{4}-\d{2}(-\d{2})?$/, "Expected YYYY-MM or YYYY-MM-DD")
		.optional()
		.describe("Date or month of the transfer. Defaults to today."),
	cycle: z.enum(["one_time", "monthly"]).optional().describe("Transfer cycle. Defaults to one_time."),
	note: z.string().optional().describe("Optional note or description."),
	fromAssetId: z.string().min(1).optional().describe("Source cash asset ID."),
	fromEntityId: z
		.string()
		.min(1)
		.optional()
		.describe("Source entity ID (resolves to its default cash asset). Defaults to personal entity if fromAssetId is omitted."),
	toAssetId: z.string().min(1).optional().describe("Destination cash asset ID."),
	toEntityId: z.string().min(1).optional().describe("Destination entity ID (resolves to its default cash asset)."),
	toLiabilityId: z.string().min(1).optional().describe("Destination liability ID for loan/debt paydown."),
});

const MonthlyLedgerInput = z.object({
	yearMonth: z
		.string()
		.regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM")
		.optional()
		.describe("Target month in YYYY-MM format. Defaults to current UTC month."),
	entityId: z.string().min(1).optional().describe("Entity ID. Defaults to personal entity."),
});

const TreasuryProjectionInput = z.object({
	entityId: z.string().min(1).optional().describe("Entity ID. Defaults to personal entity."),
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM")
		.optional()
		.describe("Centre month in YYYY-MM format. Defaults to current UTC month."),
	pastMonths: z.number().int().min(0).max(120).optional().describe("Past months to project (default: 12)."),
	futureMonths: z.number().int().min(0).max(120).optional().describe("Future months to project (default: 120)."),
	asOf: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
		.optional()
		.describe("Anchor date in YYYY-MM-DD format."),
});

export const accountingTools: readonly McpToolDefinition[] = [
	{
		name: "get_cash_flows",
		title: "Get cash flows",
		description:
			"Query dated cash flows and totals (income, expense, transfer, debt service) for one month. Defaults to current month and personal entity. Each expense item carries its `category`; answer \"how much on X this month\" from `spendingByCategory` (it always includes `uncategorised` and sums to `totals.spending`), never by grouping `items` yourself — on non-expense rows `category` is a flow class, not a user category. `spendingByCategory` is recorded spend, not a limit: there are no per-category budgets, so never subtract it from income or treasury to answer \"what's left\".",
		inputSchema: input(CashFlowsInput),
		requiredScope: "accounting:read",
		async handler(ctx, raw) {
			const month = typeof raw.month === "string" && raw.month ? raw.month : productMonth();
			const entityId = typeof raw.entityId === "string" && raw.entityId ? raw.entityId : undefined;
			const direction = raw.direction === "in" || raw.direction === "out" ? raw.direction : undefined;
			const includeDepreciation = raw.includeDepreciation ? "true" : "false";
			const cashFlows = await ctx.accounting.getCashFlows(ctx.userId, {
				month,
				entityId,
				direction,
				includeDepreciation,
			});
			return { cashFlows, ...cashFlows };
		},
	},
	{
		name: "create_transfer",
		title: "Create a transfer",
		description:
			"Move funds between cash wallets or pay down a liability. Source: fromAssetId or fromEntityId (defaults to personal). Destination: toAssetId, toEntityId or toLiabilityId.",
		inputSchema: input(TransferInput),
		requiredScope: "accounting:write",
		async handler(ctx, raw) {
			const fromEntityId =
				raw.fromAssetId || raw.fromEntityId
					? (raw.fromEntityId as string | undefined)
					: await personalEntityId(ctx);
			const date = typeof raw.date === "string" && raw.date ? raw.date : productDate();
			const body = parseBody(CreateTransferBody, {
				...raw,
				date,
				fromEntityId,
			});
			return createOrReuse({
				id: body.id,
				key: "transfer",
				create: () => ctx.accounting.createTransfer(ctx.userId, body),
				read: (id) => ctx.accounting.getTransfer(ctx.userId, id),
			});
		},
	},
	{
		name: "list_transfers",
		title: "List transfers",
		description: "List all inter-wallet, investment funding, and debt paydown transfers.",
		inputSchema: input(emptyInput),
		requiredScope: "accounting:read",
		async handler(ctx) {
			const transfers = await ctx.accounting.listTransfers(ctx.userId);
			return { transfers };
		},
	},
	{
		name: "get_monthly_ledger",
		title: "Get monthly ledger",
		description:
			"Get the computed double-entry monthly ledger with summary metrics (opening/closing treasury, inflow, outflow, runway) and dated action items.",
		inputSchema: input(MonthlyLedgerInput),
		requiredScope: "accounting:read",
		async handler(ctx, raw) {
			const yearMonth = typeof raw.yearMonth === "string" && raw.yearMonth ? raw.yearMonth : productMonth();
			const entityId = typeof raw.entityId === "string" && raw.entityId ? raw.entityId : undefined;
			const ledger = await ctx.accounting.getLedger(ctx.userId, yearMonth, entityId);
			// #174 (Ada's 15:22 ruling): a ฿0 opening with no inflow and no runway
			// is an unstated balance, not a solvency fact. Adapter-level only.
			const { startingTreasury, totalInflow, runwayMonths, isDefaultAlive } = ledger.summary;
			const unknown =
				startingTreasury === 0 && totalInflow === 0 && runwayMonths === 0 && !isDefaultAlive;
			return { ledger, ...ledger, ...(unknown ? { treasuryStatus: "unknown" } : {}) };
		},
	},
	{
		name: "get_treasury_projection",
		title: "Get treasury projection",
		description:
			"Get treasury balance projection points (up to 120 months) and waterfall figures around a centre month.",
		inputSchema: input(TreasuryProjectionInput),
		requiredScope: "accounting:read",
		async handler(ctx, raw) {
			const month = typeof raw.month === "string" && raw.month ? raw.month : productMonth();
			const entityId = typeof raw.entityId === "string" && raw.entityId ? raw.entityId : undefined;
			const pastMonths = typeof raw.pastMonths === "number" ? raw.pastMonths : undefined;
			const futureMonths = typeof raw.futureMonths === "number" ? raw.futureMonths : undefined;
			const asOf = typeof raw.asOf === "string" && raw.asOf ? raw.asOf : undefined;
			const projection = await ctx.accounting.getProjection(ctx.userId, {
				entityId,
				month,
				pastMonths,
				futureMonths,
				asOf,
			});
			return { projection, ...projection };
		},
	},
];
