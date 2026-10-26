import { z } from "zod";
import { ValidationError } from "../../accounting/domain/errors";
import { CreateTransferBody, UpdateAssetBody } from "../../accounting/route/accounting.schemas";
import { productDate, productMonth } from "../../../lib/product-time";
import { createOrReuse, type McpToolContext, type McpToolDefinition } from "../registry";

/**
 * Accounting MCP tool suite.
 *
 * Exposes core accounting operations: cash flows feed, inter-wallet/liability transfers,
 * computed double-entry monthly ledger, and treasury projection balances — plus the
 * corrections an agent needs when the book already holds the user's money
 * (`update_asset`, `delete_asset`).
 */

type AssetRecord = Awaited<ReturnType<McpToolContext["accounting"]["getAsset"]>>;

const ASSET_SELECTOR = {
	id: z.string().uuid().optional().describe("Asset id. Takes precedence over `name`."),
	name: z
		.string()
		.min(1)
		.optional()
		.describe("Exact asset name (surrounding spaces ignored). Used when `id` is omitted."),
	entityId: z.string().min(1).optional().describe("Entity to search when selecting by name. Defaults to the personal entity."),
} as const;

/** Fields of `UpdateAssetBody`, minus `imageUrl` (server-picked) and `name` (see `newName`). */
const updateAssetPatch = UpdateAssetBody.omit({ imageUrl: true, name: true });

const UpdateAssetInput = updateAssetPatch.extend({
	...ASSET_SELECTOR,
	newName: z
		.string()
		.min(1)
		.optional()
		.describe("New name for the asset. `name` only selects the record; this renames it."),
});

const DeleteAssetInput = z.object({ ...ASSET_SELECTOR });

/**
 * Resolve an asset by id or by exact name inside one entity.
 *
 * `get_onboarding_status` exposes names only, never ids, so a one-call
 * correction has to be able to start from the name the agent was shown.
 * Anything ambiguous fails before a write instead of guessing.
 */
async function resolveAsset(ctx: McpToolContext, ref: Record<string, unknown>): Promise<AssetRecord> {
	if (typeof ref.id === "string" && ref.id) return ctx.accounting.getAsset(ctx.userId, ref.id);

	const name = typeof ref.name === "string" ? ref.name.trim() : "";
	if (!name) throw new ValidationError("Pass `id` or `name` to identify the asset.");

	const entityId = typeof ref.entityId === "string" && ref.entityId ? ref.entityId : await personalEntityId(ctx);
	const assets = await ctx.accounting.listAssets(ctx.userId, { entityId });
	const matches = assets.filter((asset) => asset.name.trim() === name);
	if (matches.length === 1) return matches[0]!;

	if (matches.length === 0) {
		const known = assets.map((asset) => `${asset.name} (${asset.kind})`).join(", ");
		throw new ValidationError(
			`No asset is named "${name}" in this entity.${known ? ` Existing assets: ${known}.` : " This entity has no assets yet."}`,
		);
	}
	throw new ValidationError(
		`More than one asset is named "${name}" (ids: ${matches.map((asset) => asset.id).join(", ")}). Pass \`id\` to choose one.`,
	);
}

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
			"Query dated cash flows and totals (income, expense, transfer, debt service) for one month. Defaults to current month and personal entity. Each expense item carries its `category`; answer \"how much on X this month\" from `spendingByCategory` (it always includes `uncategorised` and sums to `totals.spending`), never by grouping `items` yourself — on non-expense rows `category` is a flow class, not a user category. `spendingByCategory` is recorded spend, not a limit: there are no per-category budgets, so never subtract it from income or treasury to answer \"what's left\". A `balance_statement` item is a dated wallet balance statement, not income: it is excluded from `totals.moneyIn` and reported separately in `totals.adjustments`.",
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
		name: "update_asset",
		title: "Update an asset",
		description:
			"Correct an existing asset: a wallet balance, a rename, or any other field the REST PATCH accepts. Select it with exactly one of `id` or `name` (`id` wins; `name` is matched exactly, trimmed, inside `entityId`, which defaults to the personal entity) and pass only what changes. An asset's `kind` cannot change, and neither can the entity it belongs to: delete the asset and add it again instead. A `balance` edit is a stock (balance-sheet) correction, not income: `balanceAsOf` defaults to today when `balance` changes, and the response carries `balanceChange` plus that month's `ledger`, where the statement appears in `totalAdjustments` and `totalInflow` stays unchanged. Funding a wallet that still states ฿0 is allowed; a second balance edit on a wallet that already states a non-zero balance is refused with `balance_correction_requires_events`, because the only stored statement cannot hold a second dated correction until the events table exists. Never square a balance correction with income, expense or transfer entries. Pass `newName` to rename; `name` only selects.",
		inputSchema: input(UpdateAssetInput),
		requiredScope: "accounting:write",
		async handler(ctx, raw) {
			const stored = await resolveAsset(ctx, raw);

			// `name` selects the record, so a rename arrives as `newName`.
			const patch: Record<string, unknown> = { ...raw };
			delete patch.id;
			delete patch.entityId;
			delete patch.name;
			delete patch.newName;
			delete patch.imageUrl;
			if (raw.newName !== undefined) patch.name = raw.newName;

			const body = parseBody(UpdateAssetBody, patch);
			if (Object.keys(body).filter((key) => key !== "version").length === 0) {
				throw new ValidationError(
					"Nothing to update: pass at least one field to change. An asset's kind and entity cannot change; delete it and add it again instead.",
				);
			}
			if (body.balance !== undefined && stored.kind !== "cash") {
				throw new ValidationError(
					"`balance` only applies to a cash wallet: a fixed asset's value comes from `cost`, an investment's from `marketValue`.",
				);
			}

			const balanceChanged = stored.kind === "cash" && body.balance !== undefined && body.balance !== stored.balance;
			// A wallet can hold ONE statement. Funding a ฿0 wallet is the first
			// statement; a second correction would overwrite it and leave the
			// difference undated, so it waits for the events table.
			if (balanceChanged && stored.kind === "cash" && stored.balance !== 0) {
				throw new ValidationError(
					"balance_correction_requires_events: this wallet already states a non-zero balance " +
						`(${stored.balance} as of ${stored.balanceAsOf}). A second correction needs the events-table follow-up ` +
						"(dated wallet balance events): the stored statement cannot be rewritten without losing the day the " +
						"difference belongs to. Nothing was changed. Correct the first statement in the app, or record the " +
						"difference as its own dated entry.",
				);
			}
			// Date the correction to the day it was made (the product's Bangkok
			// day), not the UTC month: a balance read today and typed today must
			// book today. The REST default is left alone.
			if (balanceChanged && body.balanceAsOf === undefined) body.balanceAsOf = productDate();

			const asset = await ctx.accounting.updateAsset(ctx.userId, stored.id, body);
			if (!balanceChanged || stored.kind !== "cash" || asset.kind !== "cash") return { asset };

			const yearMonth = asset.balanceAsOf.slice(0, 7);
			const ledger = await ctx.accounting.getLedger(ctx.userId, yearMonth, asset.entityId);
			return {
				asset,
				balanceChange: { from: stored.balance, to: asset.balance, asOf: asset.balanceAsOf, kind: "adjustment" },
				ledger: {
					yearMonth: ledger.yearMonth,
					startingTreasury: ledger.summary.startingTreasury,
					endingTreasury: ledger.summary.endingTreasury,
					totalInflow: ledger.summary.totalInflow,
					totalCashOutflow: ledger.summary.totalCashOutflow,
					totalAdjustments: ledger.summary.totalAdjustments,
					netChange: ledger.summary.netChange,
				},
				note: "A balance correction is a stock (balance-sheet) statement, not income: it lands as one dated balance_statement action reported in totalAdjustments, adds nothing to totalInflow, and never squares with income, expense or transfer entries.",
			};
		},
	},
	{
		name: "delete_asset",
		title: "Delete an asset",
		description:
			"Delete an existing asset. Select it with exactly one of `id` or `name` (`id` wins; `name` is matched exactly, trimmed, inside `entityId`, which defaults to the personal entity). Deleting the entity's default wallet promotes the oldest remaining wallet and the response names it in `promotedDefault` (null when nothing was promoted). The delete is permanent and moves no money.",
		inputSchema: input(DeleteAssetInput),
		requiredScope: "accounting:write",
		async handler(ctx, raw) {
			const stored = await resolveAsset(ctx, raw);
			// Read the wallets first: the successor the service promotes is the
			// oldest remaining cash asset, and the row is gone afterwards.
			const cash =
				stored.kind === "cash"
					? (await ctx.accounting.listAssets(ctx.userId, { entityId: stored.entityId, kind: "cash" })).filter(
							(asset) => asset.kind === "cash",
						)
					: [];
			const successor =
				stored.kind === "cash" && stored.isDefault ? cash.find((asset) => asset.id !== stored.id) : undefined;
			await ctx.accounting.deleteAsset(ctx.userId, stored.id);
			return {
				deleted: { id: stored.id, name: stored.name, kind: stored.kind },
				promotedDefault: successor ? { id: successor.id, name: successor.name } : null,
			};
		},
	},
	{
		name: "get_monthly_ledger",
		title: "Get monthly ledger",
		description:
			"Get the computed double-entry monthly ledger with summary metrics (opening/closing treasury, inflow, outflow, adjustments, runway) and dated action items. `totalAdjustments` is a dated wallet balance statement — a stock correction, not income; it is excluded from `totalInflow`. `netChange = netCashFlow + totalAdjustments` and `endingTreasury = startingTreasury + netChange`, so a month can open at ฿0 and still close funded by its balance statement.",
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
