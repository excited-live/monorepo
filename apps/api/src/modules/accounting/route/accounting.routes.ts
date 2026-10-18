import { Hono } from "hono";
import { validator } from "hono-openapi";
import { z } from "zod";
import type { ApiEnv } from "../../../lib/env";
import { getUserId } from "../../../lib/request";
import { jsonResponse, route } from "../../../openapi/docs";
import {
	AssetSchema,
	EntitySchema,
	ErrorSchema,
	ExpenseSchema,
	IncomeSchema,
	LiabilitySchema,
	OkSchema,
	TransferSchema,
} from "../../../openapi/schemas";
import {
	AssetListQuery,
	CareerIncomeResultSchema,
	CashFlowsQuery,
	CashFlowsResponseSchema,
	CreateAssetBody,
	CreateEntityBody,
	CreateExpenseBody,
	CreateIncomeBody,
	CreateLiabilityBody,
	CreateTransferBody,
	GetLedgerQuerySchema,
	ExpenseListQuery,
	IncomeListQuery,
	LiabilityListQuery,
	LiabilityScheduleQuery,
	LiabilityScheduleSchema,
	MonthlyLedgerSchema,
	ProjectionQuery,
	ProjectionSchema,
	SetCareerIncomeBody,
	SummaryQuery,
	SummarySchema,
	UpdateAssetBody,
	UpdateEntityBody,
	UpdateExpenseBody,
	UpdateIncomeBody,
	UpdateLiabilityBody,
	UpdateTransferBody,
} from "./accounting.schemas";
import { createAccountingService, type AccountingService } from "../service/accounting.service";
import { createSqlAccountingRepository } from "../repository/sql-accounting.repository";

export interface AccountingRouterOptions {
	service?: AccountingService;
}

/** Errors every write and by-id route can return (the 401 is added by `route()`). */
const errors = {
	400: jsonResponse("Validation error.", ErrorSchema),
	404: jsonResponse("Record not found.", ErrorSchema),
	409: jsonResponse("Version conflict or duplicate id.", ErrorSchema),
};

const notFound = { 404: jsonResponse("Record not found.", ErrorSchema) };

export function createAccountingRouter(options: AccountingRouterOptions = {}) {
	const router = new Hono<ApiEnv>();

	const getService = (c: { get: (key: "db") => ApiEnv["Variables"]["db"] }): AccountingService => {
		if (options.service) return options.service;
		return createAccountingService(createSqlAccountingRepository(c.get("db")));
	};

	return (
		router
			// ENTITIES
			.get(
				"/entities",
				route({
					tags: ["Accounting"],
					operationId: "listEntities",
					summary: "List entities",
					description: "Bootstraps the personal entity and its default wallet on first call.",
					responses: { 200: jsonResponse("Entities.", z.array(EntitySchema)) },
				}),
				async (c) => c.json(await getService(c).listEntities(getUserId(c)), 200),
			)
			.get(
				"/entities/:id",
				route({
					tags: ["Accounting"],
					operationId: "getEntity",
					summary: "Get an entity",
					responses: { 200: jsonResponse("The entity.", EntitySchema), ...notFound },
				}),
				async (c) => c.json(await getService(c).getEntity(getUserId(c), c.req.param("id")), 200),
			)
			.post(
				"/entities",
				route({
					tags: ["Accounting"],
					operationId: "createEntity",
					summary: "Create a business entity",
					description: "Business only. Also creates its default cash asset, \"<name> Main Wallet\", at ฿0.",
					responses: { 201: jsonResponse("Entity created.", EntitySchema), ...errors },
				}),
				validator("json", CreateEntityBody),
				async (c) => c.json(await getService(c).createEntity(getUserId(c), c.req.valid("json")), 201),
			)
			.patch(
				"/entities/:id",
				route({
					tags: ["Accounting"],
					operationId: "updateEntity",
					summary: "Update an entity",
					description: "Partial update. The entity type cannot change.",
					responses: { 200: jsonResponse("Entity updated.", EntitySchema), ...errors },
				}),
				validator("json", UpdateEntityBody),
				async (c) =>
					c.json(await getService(c).updateEntity(getUserId(c), c.req.param("id"), c.req.valid("json")), 200),
			)
			.delete(
				"/entities/:id",
				route({
					tags: ["Accounting"],
					operationId: "deleteEntity",
					summary: "Delete a business entity",
					description: "The personal entity cannot be deleted. Deleting cascades to all of its records.",
					responses: { 200: jsonResponse("Entity deleted.", OkSchema), ...errors },
				}),
				async (c) => c.json(await getService(c).deleteEntity(getUserId(c), c.req.param("id")), 200),
			)

			// ASSETS
			.get(
				"/assets",
				route({
					tags: ["Accounting"],
					operationId: "listAssets",
					summary: "List assets",
					responses: { 200: jsonResponse("Assets.", z.array(AssetSchema)) },
				}),
				validator("query", AssetListQuery),
				async (c) => c.json(await getService(c).listAssets(getUserId(c), c.req.valid("query")), 200),
			)
			.get(
				"/assets/:id",
				route({
					tags: ["Accounting"],
					operationId: "getAsset",
					summary: "Get an asset",
					responses: { 200: jsonResponse("The asset.", AssetSchema), ...notFound },
				}),
				async (c) => c.json(await getService(c).getAsset(getUserId(c), c.req.param("id")), 200),
			)
			.post(
				"/assets",
				route({
					tags: ["Accounting"],
					operationId: "createAsset",
					summary: "Create an asset",
					description:
						"Body discriminated by `kind`. Fixed and investment assets accept `paidFrom` (creates the purchase transfer in the same write); fixed assets accept `financing` (creates a loan liability, paid at its level payment unless `amount` is given). A cash asset with `isDefault` clears the entity's other defaults; an entity's first cash asset is always the default.",
					responses: { 201: jsonResponse("Asset created.", AssetSchema), ...errors },
				}),
				validator("json", CreateAssetBody),
				async (c) => c.json(await getService(c).createAsset(getUserId(c), c.req.valid("json")), 201),
			)
			.patch(
				"/assets/:id",
				route({
					tags: ["Accounting"],
					operationId: "updateAsset",
					summary: "Update an asset",
					description: "Partial update. `kind` and `entityId` cannot change.",
					responses: { 200: jsonResponse("Asset updated.", AssetSchema), ...errors },
				}),
				validator("json", UpdateAssetBody),
				async (c) => c.json(await getService(c).updateAsset(getUserId(c), c.req.param("id"), c.req.valid("json")), 200),
			)
			.delete(
				"/assets/:id",
				route({
					tags: ["Accounting"],
					operationId: "deleteAsset",
					summary: "Delete an asset",
					description: "Deleting the default cash asset promotes the oldest remaining cash asset of the entity.",
					responses: { 200: jsonResponse("Asset deleted.", OkSchema), ...errors },
				}),
				async (c) => c.json(await getService(c).deleteAsset(getUserId(c), c.req.param("id")), 200),
			)

			// INCOMES
			.get(
				"/incomes",
				route({
					tags: ["Accounting"],
					operationId: "listIncomes",
					summary: "List incomes",
					responses: { 200: jsonResponse("Incomes.", z.array(IncomeSchema)) },
				}),
				validator("query", IncomeListQuery),
				async (c) => c.json(await getService(c).listIncomes(getUserId(c), c.req.valid("query")), 200),
			)
			.get(
				"/incomes/:id",
				route({
					tags: ["Accounting"],
					operationId: "getIncome",
					summary: "Get an income",
					responses: { 200: jsonResponse("The income.", IncomeSchema), ...notFound },
				}),
				async (c) => c.json(await getService(c).getIncome(getUserId(c), c.req.param("id")), 200),
			)
			.post(
				"/incomes",
				route({
					tags: ["Accounting"],
					operationId: "createIncome",
					summary: "Create an income",
					description: "`employment` only for kind employment; `sourceAssetId` only for kind investment.",
					responses: { 201: jsonResponse("Income created.", IncomeSchema), ...errors },
				}),
				validator("json", CreateIncomeBody),
				async (c) => c.json(await getService(c).createIncome(getUserId(c), c.req.valid("json")), 201),
			)
			.patch(
				"/incomes/:id",
				route({
					tags: ["Accounting"],
					operationId: "updateIncome",
					summary: "Update an income",
					responses: { 200: jsonResponse("Income updated.", IncomeSchema), ...errors },
				}),
				validator("json", UpdateIncomeBody),
				async (c) => c.json(await getService(c).updateIncome(getUserId(c), c.req.param("id"), c.req.valid("json")), 200),
			)
			.delete(
				"/incomes/:id",
				route({
					tags: ["Accounting"],
					operationId: "deleteIncome",
					summary: "Delete an income",
					responses: { 200: jsonResponse("Income deleted.", OkSchema), ...errors },
				}),
				async (c) => c.json(await getService(c).deleteIncome(getUserId(c), c.req.param("id")), 200),
			)
			.post(
				"/incomes/career",
				route({
					tags: ["Accounting"],
					operationId: "setCareerIncome",
					summary: "Set the career salary",
					description:
						"Updates the entity's primary employment income (earliest startMonth), or creates one when `salary > 0`. A salary of 0 deactivates the primary income.",
					responses: { 200: jsonResponse("Primary income, or null when none exists.", CareerIncomeResultSchema), ...errors },
				}),
				validator("json", SetCareerIncomeBody),
				async (c) => c.json(await getService(c).setCareerIncome(getUserId(c), c.req.valid("json")), 200),
			)

			// EXPENSES
			.get(
				"/expenses",
				route({
					tags: ["Accounting"],
					operationId: "listExpenses",
					summary: "List expenses",
					responses: { 200: jsonResponse("Expenses.", z.array(ExpenseSchema)) },
				}),
				validator("query", ExpenseListQuery),
				async (c) => c.json(await getService(c).listExpenses(getUserId(c), c.req.valid("query")), 200),
			)
			.get(
				"/expenses/:id",
				route({
					tags: ["Accounting"],
					operationId: "getExpense",
					summary: "Get an expense",
					responses: { 200: jsonResponse("The expense.", ExpenseSchema), ...notFound },
				}),
				async (c) => c.json(await getService(c).getExpense(getUserId(c), c.req.param("id")), 200),
			)
			.post(
				"/expenses",
				route({
					tags: ["Accounting"],
					operationId: "createExpense",
					summary: "Create an expense",
					responses: { 201: jsonResponse("Expense created.", ExpenseSchema), ...errors },
				}),
				validator("json", CreateExpenseBody),
				async (c) => c.json(await getService(c).createExpense(getUserId(c), c.req.valid("json")), 201),
			)
			.patch(
				"/expenses/:id",
				route({
					tags: ["Accounting"],
					operationId: "updateExpense",
					summary: "Update an expense",
					responses: { 200: jsonResponse("Expense updated.", ExpenseSchema), ...errors },
				}),
				validator("json", UpdateExpenseBody),
				async (c) => c.json(await getService(c).updateExpense(getUserId(c), c.req.param("id"), c.req.valid("json")), 200),
			)
			.delete(
				"/expenses/:id",
				route({
					tags: ["Accounting"],
					operationId: "deleteExpense",
					summary: "Delete an expense",
					responses: { 200: jsonResponse("Expense deleted.", OkSchema), ...errors },
				}),
				async (c) => c.json(await getService(c).deleteExpense(getUserId(c), c.req.param("id")), 200),
			)

			// LIABILITIES
			.get(
				"/liabilities",
				route({
					tags: ["Accounting"],
					operationId: "listLiabilities",
					summary: "List liabilities",
					responses: { 200: jsonResponse("Liabilities.", z.array(LiabilitySchema)) },
				}),
				validator("query", LiabilityListQuery),
				async (c) => c.json(await getService(c).listLiabilities(getUserId(c), c.req.valid("query")), 200),
			)
			.get(
				"/liabilities/:id",
				route({
					tags: ["Accounting"],
					operationId: "getLiability",
					summary: "Get a liability",
					responses: { 200: jsonResponse("The liability.", LiabilitySchema), ...notFound },
				}),
				async (c) => c.json(await getService(c).getLiability(getUserId(c), c.req.param("id")), 200),
			)
			.post(
				"/liabilities",
				route({
					tags: ["Accounting"],
					operationId: "createLiability",
					summary: "Create a liability",
					description:
						"Body discriminated by `kind`. A loan without `amount` is paid at its level payment, calculateLoanPayment(principal, annualRate, termMonths), and its payments start in the origination month unless `startMonth` is given.",
					responses: { 201: jsonResponse("Liability created.", LiabilitySchema), ...errors },
				}),
				validator("json", CreateLiabilityBody),
				async (c) => c.json(await getService(c).createLiability(getUserId(c), c.req.valid("json")), 201),
			)
			.patch(
				"/liabilities/:id",
				route({
					tags: ["Accounting"],
					operationId: "updateLiability",
					summary: "Update a liability",
					description: "Partial update. `loan` and `revolving` merge shallowly onto the stored details.",
					responses: { 200: jsonResponse("Liability updated.", LiabilitySchema), ...errors },
				}),
				validator("json", UpdateLiabilityBody),
				async (c) =>
					c.json(await getService(c).updateLiability(getUserId(c), c.req.param("id"), c.req.valid("json")), 200),
			)
			.get(
				"/liabilities/:id/schedule",
				route({
					tags: ["Accounting"],
					operationId: "getLiabilitySchedule",
					summary: "Get a liability's month-by-month schedule",
					description:
						"Loans: payments, interest and principal per month, including extra-payment transfers. Revolving: opening balance, interest, card charges and payments per month. Liabilities of kind `other` have no schedule (400).",
					responses: {
						200: jsonResponse("Loan or revolving schedule.", LiabilityScheduleSchema),
						400: jsonResponse("Validation error, or the liability has no schedule.", ErrorSchema),
						404: jsonResponse("Liability not found.", ErrorSchema),
					},
				}),
				validator("query", LiabilityScheduleQuery),
				async (c) =>
					c.json(await getService(c).getLiabilitySchedule(getUserId(c), c.req.param("id"), c.req.valid("query")), 200),
			)
			.delete(
				"/liabilities/:id",
				route({
					tags: ["Accounting"],
					operationId: "deleteLiability",
					summary: "Delete a liability",
					responses: { 200: jsonResponse("Liability deleted.", OkSchema), ...errors },
				}),
				async (c) => c.json(await getService(c).deleteLiability(getUserId(c), c.req.param("id")), 200),
			)

			// TRANSFERS
			.get(
				"/transfers",
				route({
					tags: ["Accounting"],
					operationId: "listTransfers",
					summary: "List transfers",
					responses: { 200: jsonResponse("Transfers.", z.array(TransferSchema)) },
				}),
				async (c) => c.json(await getService(c).listTransfers(getUserId(c)), 200),
			)
			.get(
				"/transfers/:id",
				route({
					tags: ["Accounting"],
					operationId: "getTransfer",
					summary: "Get a transfer",
					responses: { 200: jsonResponse("The transfer.", TransferSchema), ...notFound },
				}),
				async (c) => c.json(await getService(c).getTransfer(getUserId(c), c.req.param("id")), 200),
			)
			.post(
				"/transfers",
				route({
					tags: ["Accounting"],
					operationId: "createTransfer",
					summary: "Create a transfer",
					description:
						"Source: `fromAssetId` or `fromEntityId` (its default cash asset). Destination: exactly one of `toAssetId`, `toEntityId` (its default cash asset) or `toLiabilityId`.",
					responses: { 201: jsonResponse("Transfer created.", TransferSchema), ...errors },
				}),
				validator("json", CreateTransferBody),
				async (c) => c.json(await getService(c).createTransfer(getUserId(c), c.req.valid("json")), 201),
			)
			.patch(
				"/transfers/:id",
				route({
					tags: ["Accounting"],
					operationId: "updateTransfer",
					summary: "Update a transfer",
					description: "Partial update. Name a new source or destination to re-resolve that side.",
					responses: { 200: jsonResponse("Transfer updated.", TransferSchema), ...errors },
				}),
				validator("json", UpdateTransferBody),
				async (c) =>
					c.json(await getService(c).updateTransfer(getUserId(c), c.req.param("id"), c.req.valid("json")), 200),
			)
			.delete(
				"/transfers/:id",
				route({
					tags: ["Accounting"],
					operationId: "deleteTransfer",
					summary: "Delete a transfer",
					responses: { 200: jsonResponse("Transfer deleted.", OkSchema), ...errors },
				}),
				async (c) => c.json(await getService(c).deleteTransfer(getUserId(c), c.req.param("id")), 200),
			)

			// COMPUTED
			.get(
				"/summary",
				route({
					tags: ["Accounting"],
					operationId: "getSummary",
					summary: "Get wealth metrics and balance sheet per entity and consolidated",
					description:
						"Per entity: wealth metrics and balance sheet at `month`. Consolidated: metrics plus the balance sheet summed over all entities.",
					responses: {
						200: jsonResponse("Summary for the month.", SummarySchema),
						400: jsonResponse("Validation error.", ErrorSchema),
					},
				}),
				validator("query", SummaryQuery),
				async (c) => c.json(await getService(c).getSummary(getUserId(c), c.req.valid("query")), 200),
			)
			.get(
				"/ledger/:yearMonth",
				route({
					tags: ["Accounting"],
					operationId: "getComputedLedger",
					summary: "Get computed monthly ledger",
					responses: {
						200: jsonResponse("Monthly ledger.", MonthlyLedgerSchema),
						404: jsonResponse("Entity not found.", ErrorSchema),
					},
				}),
				validator("query", GetLedgerQuerySchema),
				async (c) => {
					const { entityId } = c.req.valid("query");
					const ledger = await getService(c).getLedger(getUserId(c), c.req.param("yearMonth"), entityId);
					return c.json(ledger, 200);
				},
			)
			.get(
				"/cash-flows",
				route({
					tags: ["Accounting"],
					operationId: "getCashFlows",
					summary: "Get the cash-flow feed for a month",
					description:
						"Dated money movements of one entity (default: personal) for one month. `direction` filters `items`; `totals` (moneyIn, moneyOut, spending) always cover every item.",
					responses: {
						200: jsonResponse("Cash-flow feed and totals.", CashFlowsResponseSchema),
						400: jsonResponse("Validation error.", ErrorSchema),
						404: jsonResponse("Entity not found.", ErrorSchema),
					},
				}),
				validator("query", CashFlowsQuery),
				async (c) => c.json(await getService(c).getCashFlows(getUserId(c), c.req.valid("query")), 200),
			)
			.get(
				"/projection",
				route({
					tags: ["Accounting"],
					operationId: "getProjection",
					summary: "Get treasury balance per month around a centre month",
					responses: {
						200: jsonResponse("Projection points and waterfall figures.", ProjectionSchema),
						400: jsonResponse("Validation error.", ErrorSchema),
						404: jsonResponse("Entity not found.", ErrorSchema),
					},
				}),
				validator("query", ProjectionQuery),
				async (c) => c.json(await getService(c).getProjection(getUserId(c), c.req.valid("query")), 200),
			)
	);
}

export type AccountingRouter = ReturnType<typeof createAccountingRouter>;
