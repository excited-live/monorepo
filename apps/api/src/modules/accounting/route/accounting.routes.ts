import { Hono } from "hono";
import { validator } from "hono-openapi";
import type { ApiEnv } from "../../../lib/env";
import { getUserId } from "../../../lib/request";
import { jsonResponse, route } from "../../../openapi/docs";
import {
	ErrorSchema,
	OkResponseSchema,
	CreateAccountSchema,
	UpdateAccountSchema,
	EntityAccountSchema,
	CreateExpenseSchema,
	UpdateExpenseSchema,
	RecurringSubscriptionSchema,
	CreateAssetSchema,
	UpdateAssetSchema,
	HardwareAssetSchema,
	CreateIncomeSchema,
	UpdateIncomeSchema,
	SetCareerIncomeSchema,
	RevenueStreamSchema,
	CreateLiabilitySchema,
	UpdateLiabilitySchema,
	LiabilityStreamSchema,
	CreateTransferSchema,
	CapitalTransferSchema,
	ReplaceSnapshotSchema,
	BizSnapshotSchema,
	MonthlyLedgerSchema,
	GetLedgerQuerySchema,
} from "./accounting.schemas";
import { createAccountingService, type AccountingService } from "../service/accounting.service";
import { createSqlAccountingRepository } from "../repository/sql-accounting.repository";

export interface AccountingRouterOptions {
	service?: AccountingService;
}

export function createAccountingRouter(options: AccountingRouterOptions = {}) {
	const router = new Hono<ApiEnv>();

	const getService = (c: { get: (key: "db") => ApiEnv["Variables"]["db"] }): AccountingService => {
		if (options.service) return options.service;
		return createAccountingService(createSqlAccountingRepository(c.get("db")));
	};

	return router
		// SNAPSHOT
		.get(
			"/snapshot",
			route({
				tags: ["Accounting"],
				operationId: "getAccountingSnapshot",
				summary: "Get the full accounting snapshot",
				description: "Accounts, expenses, assets, incomes, liabilities and transfers in one document.",
				responses: { 200: jsonResponse("The snapshot.", BizSnapshotSchema) },
			}),
			async (c) => {
				const service = getService(c);
				const data = await service.getSnapshot(getUserId(c));
				return c.json(data, 200);
			},
		)
		.put(
			"/snapshot",
			route({
				tags: ["Accounting"],
				operationId: "replaceAccountingSnapshot",
				summary: "Replace the full accounting snapshot",
				description: "Replaces full accounting state for import or portability.",
				responses: { 200: jsonResponse("Replaced snapshot.", BizSnapshotSchema) },
			}),
			validator("json", ReplaceSnapshotSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const data = await service.replaceSnapshot(getUserId(c), body);
				return c.json(data, 200);
			},
		)

		// ACCOUNTS
		.post(
			"/accounts",
			route({
				tags: ["Accounting"],
				operationId: "createAccount",
				summary: "Create a new business account",
				responses: {
					201: jsonResponse("Account created.", EntityAccountSchema),
					400: jsonResponse("Validation error.", ErrorSchema),
				},
			}),
			validator("json", CreateAccountSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const account = await service.addAccount(getUserId(c), body);
				return c.json(account, 201);
			},
		)
		.put(
			"/accounts/:id",
			route({
				tags: ["Accounting"],
				operationId: "updateAccount",
				summary: "Update account metadata",
				responses: {
					200: jsonResponse("Account updated.", EntityAccountSchema),
					404: jsonResponse("Account not found.", ErrorSchema),
				},
			}),
			validator("json", UpdateAccountSchema),
			async (c) => {
				const service = getService(c);
				const id = c.req.param("id");
				const body = c.req.valid("json");
				const account = await service.updateAccount(getUserId(c), id, body);
				return c.json(account, 200);
			},
		)
		.delete(
			"/accounts/:id",
			route({
				tags: ["Accounting"],
				operationId: "deleteAccount",
				summary: "Delete account and cascade associated records",
				responses: {
					200: jsonResponse("Account deleted.", OkResponseSchema),
					404: jsonResponse("Account not found.", ErrorSchema),
				},
			}),
			async (c) => {
				const service = getService(c);
				const id = c.req.param("id");
				await service.deleteAccount(getUserId(c), id);
				return c.json({ ok: true as const }, 200);
			},
		)

		// EXPENSES
		.post(
			"/expenses",
			route({
				tags: ["Accounting"],
				operationId: "createExpense",
				summary: "Add a recurring expense",
				responses: { 201: jsonResponse("Expense created.", RecurringSubscriptionSchema) },
			}),
			validator("json", CreateExpenseSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const expense = await service.addExpense(getUserId(c), body);
				return c.json(expense, 201);
			},
		)
		.put(
			"/expenses/:id",
			route({
				tags: ["Accounting"],
				operationId: "updateExpense",
				summary: "Update recurring expense",
				responses: { 200: jsonResponse("Expense updated.", RecurringSubscriptionSchema) },
			}),
			validator("json", UpdateExpenseSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const expense = await service.updateExpense(getUserId(c), body);
				return c.json(expense, 200);
			},
		)
		.delete(
			"/expenses/:id",
			route({
				tags: ["Accounting"],
				operationId: "deleteExpense",
				summary: "Delete recurring expense",
				responses: { 200: jsonResponse("Expense deleted.", OkResponseSchema) },
			}),
			async (c) => {
				const service = getService(c);
				const id = c.req.param("id");
				await service.deleteExpense(getUserId(c), id);
				return c.json({ ok: true as const }, 200);
			},
		)

		// ASSETS
		.post(
			"/assets",
			route({
				tags: ["Accounting"],
				operationId: "createAsset",
				summary: "Add an asset",
				responses: { 201: jsonResponse("Asset created.", HardwareAssetSchema) },
			}),
			validator("json", CreateAssetSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const asset = await service.addAsset(getUserId(c), body);
				return c.json(asset, 201);
			},
		)
		.put(
			"/assets/:id",
			route({
				tags: ["Accounting"],
				operationId: "updateAsset",
				summary: "Update asset",
				responses: { 200: jsonResponse("Asset updated.", HardwareAssetSchema) },
			}),
			validator("json", UpdateAssetSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const asset = await service.updateAsset(getUserId(c), body);
				return c.json(asset, 200);
			},
		)
		.delete(
			"/assets/:id",
			route({
				tags: ["Accounting"],
				operationId: "deleteAsset",
				summary: "Delete asset",
				responses: { 200: jsonResponse("Asset deleted.", OkResponseSchema) },
			}),
			async (c) => {
				const service = getService(c);
				const id = c.req.param("id");
				await service.deleteAsset(getUserId(c), id);
				return c.json({ ok: true as const }, 200);
			},
		)

		// INCOMES
		.post(
			"/incomes",
			route({
				tags: ["Accounting"],
				operationId: "createIncome",
				summary: "Add an income stream",
				responses: { 201: jsonResponse("Income created.", RevenueStreamSchema) },
			}),
			validator("json", CreateIncomeSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const income = await service.addIncome(getUserId(c), body);
				return c.json(income, 201);
			},
		)
		.put(
			"/incomes/:id",
			route({
				tags: ["Accounting"],
				operationId: "updateIncome",
				summary: "Update income stream",
				responses: { 200: jsonResponse("Income updated.", RevenueStreamSchema) },
			}),
			validator("json", UpdateIncomeSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const income = await service.updateIncome(getUserId(c), body);
				return c.json(income, 200);
			},
		)
		.delete(
			"/incomes/:id",
			route({
				tags: ["Accounting"],
				operationId: "deleteIncome",
				summary: "Delete income stream",
				responses: { 200: jsonResponse("Income deleted.", OkResponseSchema) },
			}),
			async (c) => {
				const service = getService(c);
				const id = c.req.param("id");
				await service.deleteIncome(getUserId(c), id);
				return c.json({ ok: true as const }, 200);
			},
		)
		.post(
			"/incomes/career",
			route({
				tags: ["Accounting"],
				operationId: "setCareerIncome",
				summary: "Set career salary and title",
				responses: { 200: jsonResponse("Career updated.", BizSnapshotSchema) },
			}),
			validator("json", SetCareerIncomeSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const snapshot = await service.setCareerIncome(getUserId(c), body);
				return c.json(snapshot, 200);
			},
		)

		// LIABILITIES
		.post(
			"/liabilities",
			route({
				tags: ["Accounting"],
				operationId: "createLiability",
				summary: "Add a liability debt stream",
				responses: { 201: jsonResponse("Liability created.", LiabilityStreamSchema) },
			}),
			validator("json", CreateLiabilitySchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const liability = await service.addLiability(getUserId(c), body);
				return c.json(liability, 201);
			},
		)
		.put(
			"/liabilities/:id",
			route({
				tags: ["Accounting"],
				operationId: "updateLiability",
				summary: "Update liability",
				responses: { 200: jsonResponse("Liability updated.", LiabilityStreamSchema) },
			}),
			validator("json", UpdateLiabilitySchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const liability = await service.updateLiability(getUserId(c), body);
				return c.json(liability, 200);
			},
		)
		.delete(
			"/liabilities/:id",
			route({
				tags: ["Accounting"],
				operationId: "deleteLiability",
				summary: "Delete liability",
				responses: { 200: jsonResponse("Liability deleted.", OkResponseSchema) },
			}),
			async (c) => {
				const service = getService(c);
				const id = c.req.param("id");
				await service.deleteLiability(getUserId(c), id);
				return c.json({ ok: true as const }, 200);
			},
		)

		// TRANSFERS
		.post(
			"/transfers",
			route({
				tags: ["Accounting"],
				operationId: "recordTransfer",
				summary: "Record capital transfer injection",
				responses: { 201: jsonResponse("Transfer recorded.", CapitalTransferSchema) },
			}),
			validator("json", CreateTransferSchema),
			async (c) => {
				const service = getService(c);
				const body = c.req.valid("json");
				const transfer = await service.recordTransfer(getUserId(c), body);
				return c.json(transfer, 201);
			},
		)
		.delete(
			"/transfers/:id",
			route({
				tags: ["Accounting"],
				operationId: "deleteTransfer",
				summary: "Delete capital transfer",
				responses: { 200: jsonResponse("Transfer deleted.", OkResponseSchema) },
			}),
			async (c) => {
				const service = getService(c);
				const id = c.req.param("id");
				await service.deleteTransfer(getUserId(c), id);
				return c.json({ ok: true as const }, 200);
			},
		)

		// LEDGER
		.get(
			"/ledger/:yearMonth",
			route({
				tags: ["Accounting"],
				operationId: "getComputedLedger",
				summary: "Get computed monthly ledger",
				responses: {
					200: jsonResponse("Monthly ledger.", MonthlyLedgerSchema),
					404: jsonResponse("Account not found.", ErrorSchema),
				},
			}),
			validator("query", GetLedgerQuerySchema),
			async (c) => {
				const service = getService(c);
				const yearMonth = c.req.param("yearMonth");
				const { entityId } = c.req.valid("query");
				const ledger = await service.getLedger(getUserId(c), yearMonth, entityId);
				return c.json(ledger, 200);
			},
		);
}

export type AccountingRouter = ReturnType<typeof createAccountingRouter>;
