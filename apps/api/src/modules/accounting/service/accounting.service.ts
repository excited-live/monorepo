import {
	bookToSnapshot,
	buildCashFlows,
	buildLoanSchedule,
	buildRevolvingSchedule,
	calculateConsolidatedBalanceSheet,
	calculateConsolidatedWealthMetrics,
	calculateEntityBalanceSheet,
	calculateEntityWealthMetrics,
	calculateLoanPayment,
	calculateProjectionBalances,
	generateMonthlyLedger,
	normalizeCategory,
	shiftYearMonth,
	summarizeCashFlows,
	summarizeSpendingByCategory,
	type AccountingBook,
	type AccountingSnapshot,
	type BookAsset,
	type BookCashAsset,
	type BookEntity,
	type BookExpense,
	type BookIncome,
	type BookLiability,
	type BookTransfer,
	type Liability,
	type LoanScheduleEntry,
	type MonthlyLedger,
	type RevolvingScheduleEntry,
	type Stored,
} from "@excited-live/accounting";
import type { z } from "zod";
import type { AccountingRepository, ResourceName, ResourceTypes, WriteOp } from "../domain/accounting.repository";
import { NotFoundError, ValidationError } from "../domain/errors";
import {
	CreateAssetBody,
	CreateEntityBody,
	CreateExpenseBody,
	CreateIncomeBody,
	CreateLiabilityBody,
	CreateTransferBody,
	UpdateAssetBody,
	UpdateEntityBody,
	UpdateExpenseBody,
	UpdateIncomeBody,
	UpdateLiabilityBody,
	UpdateTransferBody,
	type SetCareerIncomeBody,
} from "../route/accounting.schemas";

/**
 * Accounting use cases over the normalized book (docs/accounting-data-model.md).
 *
 * Every method first bootstraps the caller's personal entity and its default
 * wallet, so a brand-new user never sees an empty book. Computed endpoints load
 * the whole book and run the engine on `bookToSnapshot(book)`.
 */

type Meta = { version: number; createdAt: string; updatedAt: string };
type Plain<T> = T extends unknown ? Omit<T, keyof Meta> : never;

/** Strips the wire metadata (version, createdAt, updatedAt) from a stored record. */
function plain<S extends Meta>(stored: S): Plain<S> {
	return Object.fromEntries(
		Object.entries(stored).filter(([key]) => key !== "version" && key !== "createdAt" && key !== "updatedAt"),
	) as Plain<S>;
}

/** Copies only the fields whose value is defined, so optional fields stay absent. */
function definedOnly<T extends object>(fields: T): Partial<T> {
	return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as Partial<T>;
}

/** `YYYY-MM` of the client's `asOf` when given, else of the current UTC date. */
/** Merges a PATCH body onto a stored record: undefined keeps a field, null clears it. */
function applyPatch<T extends object>(record: T, patch: object): T {
	const next: Record<string, unknown> = { ...(record as Record<string, unknown>) };
	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) continue;
		if (value === null) delete next[key];
		else next[key] = value;
	}
	return next as T;
}

function monthOf(asOf?: string): string {
	return asOf ? asOf.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

/** Validates a merged record against a schema; the output is the record to store. */
function parseRecord<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
	const result = schema.safeParse(value);
	if (result.success) return result.data;
	const issue = result.error.issues[0];
	throw new ValidationError(issue ? [issue.path.join("."), issue.message].filter(Boolean).join(": ") : "Invalid record");
}

const insert = <R extends ResourceName>(resource: R, record: ResourceTypes[R]): WriteOp =>
	({ op: "insert", resource, record }) as WriteOp;

const update = <R extends ResourceName>(resource: R, record: ResourceTypes[R], expectedVersion?: number): WriteOp =>
	({ op: "update", resource, record, expectedVersion }) as WriteOp;

const remove = (resource: ResourceName, id: string): WriteOp => ({ op: "delete", resource, id }) as WriteOp;

/** The record a write returned for `id` (writes return every insert/update, in op order). */
function written<T>(records: ReadonlyArray<{ id: string }>, id: string): T {
	const record = records.find((r) => r.id === id);
	if (!record) throw new Error(`Write returned no record for ${id}`);
	return record as unknown as T;
}

/** Longest loan schedule the default horizon will build (50 years). */
const MAX_SCHEDULE_MONTHS = 600;

/** The entity's default cash asset: the flagged one, else the oldest (list order is creation order). */
function defaultCash<T extends { isDefault: boolean }>(cash: T[]): T | undefined {
	return cash.find((asset) => asset.isDefault) ?? cash[0];
}

/** Straight-line depreciation needs a positive useful life; creates and patches both enforce it. */
function assertUsefulLife(depreciationMethod: string | undefined, usefulLifeMonths: number | undefined): void {
	if (depreciationMethod === "straight_line" && !(usefulLifeMonths !== undefined && usefulLifeMonths > 0)) {
		throw new ValidationError("usefulLifeMonths is required for straight-line depreciation");
	}
}

/** Rounds a money amount to 2 decimals. */
function roundCents(value: number): number {
	return Math.round(value * 100) / 100;
}

export function createAccountingService(repo: AccountingRepository) {
	// BOOTSTRAP ----------------------------------------------------------------

	/** Creates the personal entity and its default wallet unless the user already has one. Race-safe. */
	async function ensureBootstrap(userId: string, month: string): Promise<void> {
		const entityId = crypto.randomUUID();
		const entity: BookEntity = {
			id: entityId,
			name: "Personal",
			type: "personal",
			currency: "THB",
			active: true,
		};
		const wallet: BookCashAsset = {
			id: crypto.randomUUID(),
			entityId,
			kind: "cash",
			name: "Personal Main Wallet",
			category: "cash",
			active: true,
			balance: 0,
			balanceAsOf: month,
			currency: "THB",
			isDefault: true,
		};
		await repo.ensurePersonalEntity(userId, { entity, wallet });
	}

	// READS --------------------------------------------------------------------

	async function loadBook(userId: string): Promise<AccountingBook> {
		const stored = await repo.loadBook(userId);
		return {
			entities: stored.entities.map(plain),
			assets: stored.assets.map(plain),
			incomes: stored.incomes.map(plain),
			expenses: stored.expenses.map(plain),
			liabilities: stored.liabilities.map(plain),
			transfers: stored.transfers.map(plain),
		};
	}

	async function loadSnapshot(userId: string): Promise<AccountingSnapshot & { liabilities: Liability[] }> {
		const snapshot = bookToSnapshot(await loadBook(userId));
		return { ...snapshot, liabilities: snapshot.liabilities ?? [] };
	}

	async function findOrThrow<R extends ResourceName>(
		userId: string,
		resource: R,
		id: string,
		label: string,
	): Promise<Stored<ResourceTypes[R]>> {
		const record = await repo.get(userId, resource, id);
		if (!record) throw new NotFoundError(`${label} ${id} not found`);
		return record;
	}

	/** A body link: the referenced record must exist for this user, else 400. */
	async function linkOrThrow<R extends ResourceName>(
		userId: string,
		resource: R,
		id: string,
		label: string,
	): Promise<Stored<ResourceTypes[R]>> {
		const record = await repo.get(userId, resource, id);
		if (!record) throw new ValidationError(`${label} ${id} not found`);
		return record;
	}

	async function requireEntity(userId: string, entityId: string): Promise<Stored<BookEntity>> {
		return linkOrThrow(userId, "entities", entityId, "Entity");
	}

	async function requireAsset(userId: string, assetId: string, label = "Asset"): Promise<Stored<BookAsset>> {
		return linkOrThrow(userId, "assets", assetId, label);
	}

	async function requireCash(
		userId: string,
		assetId: string,
		entityId: string | undefined,
		label: string,
	): Promise<Stored<BookCashAsset>> {
		const asset = await requireAsset(userId, assetId, label);
		if (asset.kind !== "cash") throw new ValidationError(`${label} ${assetId} must be a cash asset`);
		if (entityId !== undefined && asset.entityId !== entityId) {
			throw new ValidationError(`${label} ${assetId} belongs to another entity`);
		}
		return asset;
	}

	async function requireRevolving(userId: string, liabilityId: string): Promise<void> {
		const liability = await linkOrThrow(userId, "liabilities", liabilityId, "Liability");
		if (liability.kind !== "revolving") throw new ValidationError(`Liability ${liabilityId} is not a revolving liability`);
	}

	async function cashAssetsOf(userId: string, entityId: string): Promise<Stored<BookCashAsset>[]> {
		const assets = await repo.list(userId, "assets", { entityId, kind: "cash" });
		return assets.filter((asset): asset is Stored<BookCashAsset> => asset.kind === "cash");
	}

	/** The entity's default cash asset, or 400 when the entity is unknown or has none. */
	async function requireDefaultCash(userId: string, entityId: string): Promise<Stored<BookCashAsset>> {
		await requireEntity(userId, entityId);
		const cash = defaultCash(await cashAssetsOf(userId, entityId));
		if (!cash) throw new ValidationError(`Entity ${entityId} has no cash asset`);
		return cash;
	}

	// ENTITIES -----------------------------------------------------------------

	type CreateEntityInput = z.output<typeof CreateEntityBody>;
	type UpdateEntityInput = z.output<typeof UpdateEntityBody>;

	async function createEntity(userId: string, body: CreateEntityInput): Promise<Stored<BookEntity>> {
		await ensureBootstrap(userId, monthOf());
		if ((body.type ?? "business") !== "business") {
			throw new ValidationError("Only business entities can be created; the personal entity is created automatically");
		}
		const entityId = body.id ?? crypto.randomUUID();
		const currency = body.currency ?? "THB";
		const entity: BookEntity = {
			id: entityId,
			name: body.name,
			type: "business",
			currency,
			active: body.active ?? true,
			...definedOnly({ targetSafetyBuffer: body.targetSafetyBuffer, notes: body.notes, imageUrl: body.imageUrl }),
		};
		const wallet: BookCashAsset = {
			id: crypto.randomUUID(),
			entityId,
			kind: "cash",
			name: `${body.name} Main Wallet`,
			category: "cash",
			active: true,
			balance: 0,
			balanceAsOf: monthOf(body.asOf),
			currency,
			isDefault: true,
		};
		const records = await repo.write(userId, [insert("entities", entity), insert("assets", wallet)]);
		return written(records, entityId);
	}

	async function updateEntity(userId: string, id: string, patch: UpdateEntityInput): Promise<Stored<BookEntity>> {
		await ensureBootstrap(userId, monthOf());
		const stored = await findOrThrow(userId, "entities", id, "Entity");
		const { version, type, ...fields } = patch;
		if (type !== undefined && type !== stored.type) throw new ValidationError("Entity type cannot change");
		const next: BookEntity = applyPatch(plain(stored), fields);
		return written(await repo.write(userId, [update("entities", next, version)]), id);
	}

	async function deleteEntity(userId: string, id: string): Promise<{ ok: true }> {
		await ensureBootstrap(userId, monthOf());
		const stored = await findOrThrow(userId, "entities", id, "Entity");
		if (stored.type === "personal") throw new ValidationError("The personal entity cannot be deleted");
		await repo.write(userId, [remove("entities", id)]);
		return { ok: true };
	}

	// ASSETS -------------------------------------------------------------------

	type CreateAssetInput = z.output<typeof CreateAssetBody>;
	type UpdateAssetInput = z.output<typeof UpdateAssetBody>;

	/** Source cash for a purchase: an explicit cash asset, else an entity's default cash. */
	async function paidFromCash(
		userId: string,
		paidFrom: { assetId?: string; entityId?: string },
		entityId: string,
	): Promise<string> {
		if (paidFrom.assetId !== undefined) {
			return (await requireCash(userId, paidFrom.assetId, undefined, "paidFrom asset")).id;
		}
		return (await requireDefaultCash(userId, paidFrom.entityId ?? entityId)).id;
	}

	async function createAsset(userId: string, body: CreateAssetInput): Promise<Stored<BookAsset>> {
		await ensureBootstrap(userId, monthOf());
		await requireEntity(userId, body.entityId);

		const id = body.id ?? crypto.randomUUID();
		const base = {
			id,
			entityId: body.entityId,
			name: body.name,
			category: body.category,
			active: body.active ?? true,
			...definedOnly({ notes: body.notes, imageUrl: body.imageUrl, details: body.details }),
		};
		// Writes that must land before the asset row (default-cash clears) and after it (purchase, loan).
		const before: WriteOp[] = [];
		const after: WriteOp[] = [];
		let asset: BookAsset;

		if (body.kind === "cash") {
			const cash = await cashAssetsOf(userId, body.entityId);
			const isDefault = cash.length === 0 || body.isDefault === true;
			if (isDefault) {
				for (const other of cash) {
					if (other.isDefault) before.push(update("assets", { ...plain(other), isDefault: false }));
				}
			}
			asset = {
				...base,
				kind: "cash",
				balance: body.balance ?? 0,
				balanceAsOf: body.balanceAsOf ?? monthOf(),
				currency: body.currency ?? "THB",
				isDefault,
			};
		} else if (body.kind === "fixed") {
			const depreciationMethod = body.depreciationMethod ?? "straight_line";
			assertUsefulLife(depreciationMethod, body.usefulLifeMonths);
			asset = {
				...base,
				kind: "fixed",
				cost: body.cost,
				acquiredOn: body.acquiredOn,
				depreciationMethod,
				salvageValue: body.salvageValue ?? 0,
				...definedOnly({ usefulLifeMonths: body.usefulLifeMonths }),
			};
			if (body.paidFrom) {
				const from = await paidFromCash(userId, body.paidFrom, body.entityId);
				// Financed purchases are paid from cash only for the down payment; without financing, the full cost.
				const amount =
					body.paidFrom.amount ??
					(body.financing ? roundCents(Math.max(0, body.cost - body.financing.principal)) : body.cost);
				if (amount > 0) {
					after.push(
						insert("transfers", {
							id: crypto.randomUUID(),
							amount,
							date: body.paidFrom.date ?? body.acquiredOn,
							cycle: "one_time",
							note: "",
							fromAssetId: from,
							toAssetId: id,
						}),
					);
				}
			}
			if (body.financing) {
				const f = body.financing;
				const loan: BookLiability = {
					id: crypto.randomUUID(),
					entityId: body.entityId,
					kind: "loan",
					name: f.name ?? `${body.name} loan`,
					category: f.category ?? "loan",
					amount: f.amount ?? calculateLoanPayment(f.principal, f.annualRate, f.termMonths),
					cycle: "monthly",
					startMonth: monthOf(f.originatedOn ?? body.acquiredOn),
					active: true,
					loan: {
						principal: f.principal,
						annualRate: f.annualRate,
						termMonths: f.termMonths,
						originatedOn: f.originatedOn ?? body.acquiredOn,
						financedAssetId: id,
					},
				};
				after.push(insert("liabilities", loan));
			}
		} else {
			asset = {
				...base,
				kind: "investment",
				instrument: body.instrument,
				costBasis: body.costBasis ?? 0,
				marketValue: body.marketValue ?? 0,
				valuedAsOf: body.valuedAsOf ?? monthOf(),
				currency: body.currency ?? "THB",
				...definedOnly({
					symbol: body.symbol,
					units: body.units,
					expectedAnnualReturn: body.expectedAnnualReturn,
				}),
			};
			if (body.paidFrom) {
				const from = await paidFromCash(userId, body.paidFrom, body.entityId);
				after.push(
					insert("transfers", {
						id: crypto.randomUUID(),
						amount: body.paidFrom.amount ?? asset.marketValue ?? 0,
						date: body.paidFrom.date ?? asset.valuedAsOf,
						cycle: "one_time",
						note: "",
						fromAssetId: from,
						toAssetId: id,
					}),
				);
			}
		}

		const records = await repo.write(userId, [...before, insert("assets", asset), ...after]);
		return written(records, id);
	}

	async function updateAsset(userId: string, id: string, patch: UpdateAssetInput): Promise<Stored<BookAsset>> {
		await ensureBootstrap(userId, monthOf());
		const stored = await findOrThrow(userId, "assets", id, "Asset");
		const { version, ...fields } = patch;
		const merged = applyPatch(plain(stored), fields);
		if (merged.kind === "fixed") assertUsefulLife(merged.depreciationMethod, merged.usefulLifeMonths);
		const next = parseRecord(CreateAssetBody, merged) as BookAsset;

		const before: WriteOp[] = [];
		if (next.kind === "cash" && stored.kind === "cash") {
			if (stored.isDefault && !next.isDefault) {
				throw new ValidationError("Set another cash asset as default instead of unsetting this one");
			}
			if (next.isDefault && !stored.isDefault) {
				for (const other of await cashAssetsOf(userId, next.entityId)) {
					if (other.isDefault && other.id !== id) before.push(update("assets", { ...plain(other), isDefault: false }));
				}
			}
		}

		return written(await repo.write(userId, [...before, update("assets", next, version)]), id);
	}

	async function deleteAsset(userId: string, id: string): Promise<{ ok: true }> {
		await ensureBootstrap(userId, monthOf());
		const stored = await findOrThrow(userId, "assets", id, "Asset");
		const ops: WriteOp[] = [];
		if (stored.kind === "cash" && stored.isDefault) {
			// The oldest remaining cash asset takes over as the entity's default.
			const successor = (await cashAssetsOf(userId, stored.entityId)).find((asset) => asset.id !== id);
			if (successor) ops.push(update("assets", { ...plain(successor), isDefault: true }));
		}
		ops.push(remove("assets", id));
		await repo.write(userId, ops);
		return { ok: true };
	}

	// INCOMES ------------------------------------------------------------------

	type CreateIncomeInput = z.output<typeof CreateIncomeBody>;
	type UpdateIncomeInput = z.output<typeof UpdateIncomeBody>;
	type CareerInput = z.output<typeof SetCareerIncomeBody>;

	async function validateIncomeLinks(userId: string, income: BookIncome): Promise<void> {
		await requireEntity(userId, income.entityId);
		if (income.depositAssetId !== undefined) {
			await requireCash(userId, income.depositAssetId, income.entityId, "Deposit asset");
		}
		if (income.sourceAssetId !== undefined) await requireAsset(userId, income.sourceAssetId, "Source asset");
	}

	async function createIncome(userId: string, body: CreateIncomeInput): Promise<Stored<BookIncome>> {
		await ensureBootstrap(userId, monthOf(body.asOf));
		const income: BookIncome = {
			id: body.id ?? crypto.randomUUID(),
			entityId: body.entityId,
			kind: body.kind,
			category: body.category,
			name: body.name,
			amount: body.amount,
			cycle: body.cycle ?? "monthly",
			startMonth: body.startMonth ?? monthOf(body.asOf),
			active: body.active ?? true,
			...definedOnly({
				dayOfMonth: body.dayOfMonth,
				endMonth: body.endMonth,
				taxCategory: body.taxCategory,
				depositAssetId: body.depositAssetId,
				sourceAssetId: body.sourceAssetId,
				notes: body.notes,
				imageUrl: body.imageUrl,
				details: body.details,
			}),
			...(body.kind === "employment" ? { employment: definedOnly(body.employment ?? {}) } : {}),
		};
		await validateIncomeLinks(userId, income);
		return written(await repo.write(userId, [insert("incomes", income)]), income.id);
	}

	async function updateIncome(userId: string, id: string, patch: UpdateIncomeInput): Promise<Stored<BookIncome>> {
		await ensureBootstrap(userId, monthOf());
		const stored = await findOrThrow(userId, "incomes", id, "Income");
		const { version, employment, ...fields } = patch;
		const merged: Record<string, unknown> = applyPatch(plain(stored), fields);
		if (employment !== undefined) {
			merged.employment = { ...(stored.kind === "employment" ? stored.employment : undefined), ...employment };
		}
		const next = parseRecord(CreateIncomeBody, merged) as BookIncome;
		await validateIncomeLinks(userId, next);
		return written(await repo.write(userId, [update("incomes", next, version)]), id);
	}

	async function deleteIncome(userId: string, id: string): Promise<{ ok: true }> {
		await ensureBootstrap(userId, monthOf());
		await findOrThrow(userId, "incomes", id, "Income");
		await repo.write(userId, [remove("incomes", id)]);
		return { ok: true };
	}

	/**
	 * Sets the entity's primary salary (its employment income with the earliest
	 * startMonth; ties keep creation order). Promotion rows are never touched.
	 */
	async function setCareerIncome(userId: string, input: CareerInput): Promise<{ income: Stored<BookIncome> | null }> {
		await ensureBootstrap(userId, monthOf(input.asOf));
		await requireEntity(userId, input.entityId);
		const jobs = await repo.list(userId, "incomes", { entityId: input.entityId, kind: "employment" });
		const primary = jobs.reduce<Stored<BookIncome> | undefined>(
			(best, job) => (!best || job.startMonth < best.startMonth ? job : best),
			undefined,
		);
		const { salary, paydayDayOfMonth, title, company, imageUrl, startMonth, endMonth } = input;

		if (primary) {
			const next: BookIncome = {
				...plain(primary),
				amount: salary,
				name: title || primary.name || "Career Base Salary",
				active: salary > 0,
				dayOfMonth: paydayDayOfMonth ?? primary.dayOfMonth ?? 28,
				employment: {
					...primary.employment,
					...(title ? { title } : {}),
					...(company ? { employer: company } : {}),
				},
				...(imageUrl ? { imageUrl } : {}),
				...(startMonth ? { startMonth } : {}),
				...(endMonth !== undefined ? { endMonth: endMonth || undefined } : {}),
			};
			return { income: written(await repo.write(userId, [update("incomes", next)]), primary.id) };
		}

		if (salary <= 0) return { income: null };
		const id = crypto.randomUUID();
		const income: BookIncome = {
			id,
			entityId: input.entityId,
			kind: "employment",
			category: "salary",
			name: title || "Career Base Salary",
			amount: salary,
			cycle: "monthly",
			dayOfMonth: paydayDayOfMonth ?? 28,
			startMonth: startMonth || monthOf(input.asOf),
			...(endMonth ? { endMonth } : {}),
			active: true,
			employment: {
				...(title ? { title } : {}),
				...(company ? { employer: company } : {}),
			},
			...(imageUrl ? { imageUrl } : {}),
		};
		return { income: written(await repo.write(userId, [insert("incomes", income)]), id) };
	}

	// EXPENSES -----------------------------------------------------------------

	// The schema's category is a strict enum at the edge; the service accepts any
	// string because it canonicalizes one itself (a legacy Thai label on a PATCH
	// must not fail re-validation, #173).
	type CreateExpenseInput = Omit<z.output<typeof CreateExpenseBody>, "category"> & { category: string };
	type UpdateExpenseInput = Omit<z.output<typeof UpdateExpenseBody>, "category"> & {
		category?: string | null;
	};

	async function validateExpenseLinks(userId: string, expense: BookExpense): Promise<void> {
		await requireEntity(userId, expense.entityId);
		if (expense.paidFromAssetId !== undefined && expense.paidFromLiabilityId !== undefined) {
			throw new ValidationError("An expense is paid from a cash asset or a card, not both");
		}
		if (expense.paidFromAssetId !== undefined) {
			await requireCash(userId, expense.paidFromAssetId, expense.entityId, "Paid-from asset");
		}
		if (expense.paidFromLiabilityId !== undefined) await requireRevolving(userId, expense.paidFromLiabilityId);
		if (expense.assetId !== undefined) await requireAsset(userId, expense.assetId);
		if (expense.incomeId !== undefined) await linkOrThrow(userId, "incomes", expense.incomeId, "Income");
	}

	async function createExpense(userId: string, body: CreateExpenseInput): Promise<Stored<BookExpense>> {
		await ensureBootstrap(userId, monthOf(body.asOf));
		const expense: BookExpense = {
			id: body.id ?? crypto.randomUUID(),
			entityId: body.entityId,
			name: body.name,
			// Strict at the edge (schema enum); normalized here so a direct service
			// caller and a legacy label still store the canonical key (#173).
			category: normalizeCategory(body.category),
			amount: body.amount,
			cycle: body.cycle ?? "monthly",
			startMonth: body.startMonth ?? monthOf(body.asOf),
			active: body.active ?? true,
			...definedOnly({
				dayOfMonth: body.dayOfMonth,
				endMonth: body.endMonth,
				paidFromAssetId: body.paidFromAssetId,
				paidFromLiabilityId: body.paidFromLiabilityId,
				assetId: body.assetId,
				incomeId: body.incomeId,
				notes: body.notes,
				imageUrl: body.imageUrl,
				details: body.details,
			}),
		};
		await validateExpenseLinks(userId, expense);
		return written(await repo.write(userId, [insert("expenses", expense)]), expense.id);
	}

	async function updateExpense(userId: string, id: string, patch: UpdateExpenseInput): Promise<Stored<BookExpense>> {
		await ensureBootstrap(userId, monthOf());
		const stored = await findOrThrow(userId, "expenses", id, "Expense");
		const { version, details, ...fields } = patch;
		// `details` merges shallowly onto what is stored. `applyPatch` is shallow,
		// so leaving it in `fields` would let a PATCH carrying only one key (for
		// example the webapp's `renewalDate`) replace the whole object and drop a
		// check-in. Same rule as `loan`/`revolving` on a liability.
		const merged: Record<string, unknown> = applyPatch(plain(stored), fields);
		if (details !== undefined) merged.details = { ...(plain(stored).details ?? {}), ...details };
		// A legacy free-text or Thai-label row converges on its next write instead
		// of failing the strict enum (#173).
		if (typeof merged.category === "string") merged.category = normalizeCategory(merged.category);
		const next = parseRecord(CreateExpenseBody, merged) as BookExpense;
		await validateExpenseLinks(userId, next);
		return written(await repo.write(userId, [update("expenses", next, version)]), id);
	}

	async function deleteExpense(userId: string, id: string): Promise<{ ok: true }> {
		await ensureBootstrap(userId, monthOf());
		await findOrThrow(userId, "expenses", id, "Expense");
		await repo.write(userId, [remove("expenses", id)]);
		return { ok: true };
	}

	// LIABILITIES --------------------------------------------------------------

	type CreateLiabilityInput = z.output<typeof CreateLiabilityBody>;
	type UpdateLiabilityInput = z.output<typeof UpdateLiabilityBody>;

	async function validateLiabilityLinks(userId: string, liability: BookLiability): Promise<void> {
		await requireEntity(userId, liability.entityId);
		if (liability.paidFromAssetId !== undefined) {
			await requireCash(userId, liability.paidFromAssetId, liability.entityId, "Paid-from asset");
		}
		if (liability.loan?.proceedsAssetId !== undefined) {
			await requireCash(userId, liability.loan.proceedsAssetId, liability.entityId, "Proceeds asset");
		}
		if (liability.loan?.financedAssetId !== undefined) {
			await requireAsset(userId, liability.loan.financedAssetId, "Financed asset");
		}
	}

	async function createLiability(userId: string, body: CreateLiabilityInput): Promise<Stored<BookLiability>> {
		await ensureBootstrap(userId, monthOf(body.asOf));
		const amount =
			body.kind === "loan" && body.amount === undefined
				? calculateLoanPayment(body.loan.principal, body.loan.annualRate ?? 0, body.loan.termMonths)
				: body.amount;
		if (amount === undefined) throw new ValidationError("amount is required");
		// A loan's payments start in its origination month, as the financing path does.
		const startMonth = body.startMonth ?? (body.kind === "loan" ? body.loan.originatedOn.slice(0, 7) : monthOf(body.asOf));
		const base = {
			id: body.id ?? crypto.randomUUID(),
			entityId: body.entityId,
			name: body.name,
			category: body.category,
			amount,
			cycle: body.cycle ?? ("monthly" as const),
			startMonth,
			active: body.active ?? true,
			...definedOnly({
				dayOfMonth: body.dayOfMonth,
				endMonth: body.endMonth,
				paidFromAssetId: body.paidFromAssetId,
				notes: body.notes,
				imageUrl: body.imageUrl,
				details: body.details,
			}),
		};
		let liability: BookLiability;
		if (body.kind === "loan") {
			const loan = body.loan;
			liability = {
				...base,
				kind: "loan",
				loan: {
					principal: loan.principal,
					annualRate: loan.annualRate ?? 0,
					termMonths: loan.termMonths,
					originatedOn: loan.originatedOn,
					...definedOnly({ financedAssetId: loan.financedAssetId, proceedsAssetId: loan.proceedsAssetId }),
				},
			};
		} else if (body.kind === "revolving") {
			const revolving = body.revolving;
			liability = {
				...base,
				kind: "revolving",
				revolving: {
					...definedOnly({ creditLimit: revolving.creditLimit, annualRate: revolving.annualRate }),
					balance: revolving.balance ?? 0,
					balanceAsOf: revolving.balanceAsOf ?? startMonth,
				},
			};
		} else {
			liability = { ...base, kind: "other" };
		}
		await validateLiabilityLinks(userId, liability);
		return written(await repo.write(userId, [insert("liabilities", liability)]), liability.id);
	}

	async function updateLiability(userId: string, id: string, patch: UpdateLiabilityInput): Promise<Stored<BookLiability>> {
		await ensureBootstrap(userId, monthOf());
		const stored = await findOrThrow(userId, "liabilities", id, "Liability");
		const { version, loan, revolving, ...fields } = patch;
		// Nested details merge shallowly onto what is stored.
		const merged: Record<string, unknown> = applyPatch(plain(stored), fields);
		if (loan !== undefined) merged.loan = { ...(stored.kind === "loan" ? stored.loan : undefined), ...loan };
		if (revolving !== undefined) {
			merged.revolving = { ...(stored.kind === "revolving" ? stored.revolving : undefined), ...revolving };
		}
		const next = parseRecord(CreateLiabilityBody, merged) as BookLiability;
		await validateLiabilityLinks(userId, next);
		return written(await repo.write(userId, [update("liabilities", next, version)]), id);
	}

	async function deleteLiability(userId: string, id: string): Promise<{ ok: true }> {
		await ensureBootstrap(userId, monthOf());
		await findOrThrow(userId, "liabilities", id, "Liability");
		await repo.write(userId, [remove("liabilities", id)]);
		return { ok: true };
	}

	// TRANSFERS ----------------------------------------------------------------

	type CreateTransferInput = z.output<typeof CreateTransferBody>;
	type UpdateTransferInput = z.output<typeof UpdateTransferBody>;
	type Endpoints = {
		fromAssetId?: string;
		fromEntityId?: string;
		toAssetId?: string;
		toEntityId?: string;
		toLiabilityId?: string;
	};

	/** Resolves entity shortcuts to default cash assets and checks the endpoints. */
	async function resolveEndpoints(
		userId: string,
		input: Endpoints,
	): Promise<{ fromAssetId: string; toAssetId?: string; toLiabilityId?: string }> {
		let fromAssetId: string;
		if (input.fromAssetId !== undefined && input.fromEntityId === undefined) {
			fromAssetId = (await requireAsset(userId, input.fromAssetId, "Source asset")).id;
		} else if (input.fromEntityId !== undefined && input.fromAssetId === undefined) {
			fromAssetId = (await requireDefaultCash(userId, input.fromEntityId)).id;
		} else {
			throw new ValidationError("Give exactly one source: fromAssetId or fromEntityId");
		}

		const destinations = [input.toAssetId, input.toEntityId, input.toLiabilityId].filter((v) => v !== undefined);
		if (destinations.length !== 1) {
			throw new ValidationError("Give exactly one destination: toAssetId, toEntityId or toLiabilityId");
		}
		let toAssetId: string | undefined;
		let toLiabilityId: string | undefined;
		if (input.toAssetId !== undefined) {
			toAssetId = (await requireAsset(userId, input.toAssetId, "Destination asset")).id;
		} else if (input.toEntityId !== undefined) {
			toAssetId = (await requireDefaultCash(userId, input.toEntityId)).id;
		} else if (input.toLiabilityId !== undefined) {
			toLiabilityId = (await linkOrThrow(userId, "liabilities", input.toLiabilityId, "Destination liability")).id;
		}

		if (toAssetId !== undefined && toAssetId === fromAssetId) {
			throw new ValidationError("Source and destination must differ");
		}
		return { fromAssetId, toAssetId, toLiabilityId };
	}

	async function createTransfer(userId: string, body: CreateTransferInput): Promise<Stored<BookTransfer>> {
		await ensureBootstrap(userId, monthOf());
		const endpoints = await resolveEndpoints(userId, body);
		const id = body.id ?? crypto.randomUUID();
		const transfer: BookTransfer = {
			id,
			amount: body.amount,
			date: body.date,
			cycle: body.cycle ?? "one_time",
			note: body.note ?? "",
			fromAssetId: endpoints.fromAssetId,
			...definedOnly({ toAssetId: endpoints.toAssetId, toLiabilityId: endpoints.toLiabilityId }),
		};
		return written(await repo.write(userId, [insert("transfers", transfer)]), id);
	}

	async function updateTransfer(userId: string, id: string, patch: UpdateTransferInput): Promise<Stored<BookTransfer>> {
		await ensureBootstrap(userId, monthOf());
		const stored = await findOrThrow(userId, "transfers", id, "Transfer");
		const { version, amount, date, cycle, note, ...endpointPatch } = patch;
		// Endpoints are re-resolved only when the patch names one side; the other side keeps its stored value.
		const touchesSource = endpointPatch.fromAssetId !== undefined || endpointPatch.fromEntityId !== undefined;
		const touchesDestination =
			endpointPatch.toAssetId !== undefined ||
			endpointPatch.toEntityId !== undefined ||
			endpointPatch.toLiabilityId !== undefined;
		const endpoints = await resolveEndpoints(userId, {
			fromAssetId: touchesSource ? endpointPatch.fromAssetId : stored.fromAssetId,
			fromEntityId: touchesSource ? endpointPatch.fromEntityId : undefined,
			toAssetId: touchesDestination ? endpointPatch.toAssetId : stored.toAssetId,
			toEntityId: touchesDestination ? endpointPatch.toEntityId : undefined,
			toLiabilityId: touchesDestination ? endpointPatch.toLiabilityId : stored.toLiabilityId,
		});
		const next: BookTransfer = {
			id,
			amount: amount ?? stored.amount,
			date: date ?? stored.date,
			cycle: cycle ?? stored.cycle,
			note: note ?? stored.note,
			fromAssetId: endpoints.fromAssetId,
			...definedOnly({ toAssetId: endpoints.toAssetId, toLiabilityId: endpoints.toLiabilityId }),
		};
		return written(await repo.write(userId, [update("transfers", next, version)]), id);
	}

	async function deleteTransfer(userId: string, id: string): Promise<{ ok: true }> {
		await ensureBootstrap(userId, monthOf());
		await findOrThrow(userId, "transfers", id, "Transfer");
		await repo.write(userId, [remove("transfers", id)]);
		return { ok: true };
	}

	// COMPUTED -----------------------------------------------------------------

	async function getSummary(
		userId: string,
		query: { month: string; asOf?: string },
	) {
		await ensureBootstrap(userId, monthOf(query.asOf));
		const snapshot = await loadSnapshot(userId);
		const shared = {
			hardware: snapshot.hardware,
			subscriptions: snapshot.subscriptions,
			revenues: snapshot.revenues,
			liabilities: snapshot.liabilities,
			transfers: snapshot.transfers,
		};
		return {
			yearMonth: query.month,
			...(query.asOf ? { asOf: query.asOf } : {}),
			entities: snapshot.accounts.map((account) => ({
				entityId: account.id,
				metrics: calculateEntityWealthMetrics({
					account,
					...shared,
					yearMonth: query.month,
					asOfDate: query.asOf,
				}),
				balanceSheet: calculateEntityBalanceSheet({ account, ...shared, yearMonth: query.month }),
			})),
			consolidated: {
				...calculateConsolidatedWealthMetrics({
					accounts: snapshot.accounts,
					...shared,
					yearMonth: query.month,
				}),
				balanceSheet: calculateConsolidatedBalanceSheet({
					accounts: snapshot.accounts,
					...shared,
					yearMonth: query.month,
				}),
			},
		};
	}

	/** The entity's account (default: personal), or 404. Shared by the entity-scoped computed reads. */
	function accountOrThrow<A extends { id: string; type: string }>(accounts: A[], entityId: string | undefined): A {
		const account = entityId !== undefined ? accounts.find((a) => a.id === entityId) : accounts.find((a) => a.type === "personal");
		if (!account) throw new NotFoundError(`Entity ${entityId ?? "personal"} not found`);
		return account;
	}

	async function getCashFlows(
		userId: string,
		query: { month: string; entityId?: string; direction?: "in" | "out"; includeDepreciation?: "true" | "false" },
	) {
		await ensureBootstrap(userId, monthOf());
		const snapshot = await loadSnapshot(userId);
		const account = accountOrThrow(snapshot.accounts, query.entityId);
		// Totals cover the unfiltered feed, so the direction filter never changes them.
		const all = buildCashFlows({
			account,
			yearMonth: query.month,
			subscriptions: snapshot.subscriptions,
			hardware: snapshot.hardware,
			revenues: snapshot.revenues,
			transfers: snapshot.transfers,
			liabilities: snapshot.liabilities,
			includeDepreciation: query.includeDepreciation === "true",
		});
		return {
			yearMonth: query.month,
			entityId: account.id,
			items: query.direction !== undefined ? all.filter((item) => item.direction === query.direction) : all,
			totals: summarizeCashFlows(all),
			// Over the unfiltered feed, like totals: a direction filter must not
			// change the month's category split (#173).
			spendingByCategory: summarizeSpendingByCategory(all),
		};
	}

	/**
	 * Month-by-month schedule of a liability. A loan defaults to its payoff month
	 * (first month with nothing owed) or the end of its term, whichever comes first;
	 * revolving balances default to the current UTC month. `other` has no schedule.
	 */
	async function getLiabilitySchedule(
		userId: string,
		id: string,
		query: { through?: string },
	): Promise<
		| { liabilityId: string; kind: "loan"; entries: LoanScheduleEntry[] }
		| { liabilityId: string; kind: "revolving"; entries: RevolvingScheduleEntry[] }
	> {
		await ensureBootstrap(userId, monthOf());
		const stored = await findOrThrow(userId, "liabilities", id, "Liability");
		if (stored.kind === "other") throw new ValidationError("This liability has no schedule");
		const snapshot = await loadSnapshot(userId);
		const liability = snapshot.liabilities.find((l) => l.id === id);
		if (!liability) throw new NotFoundError(`Liability ${id} not found`);

		if (liability.loan) {
			const termEnd = shiftYearMonth(
				liability.loan.originatedOn.slice(0, 7),
				Math.min(liability.loan.termMonths, MAX_SCHEDULE_MONTHS) - 1,
			);
			const full = buildLoanSchedule({ liability, transfers: snapshot.transfers, throughYearMonth: termEnd });
			const payoff = full.find((entry) => entry.closing <= 0)?.yearMonth ?? termEnd;
			const through = query.through ?? payoff;
			const entries =
				through <= termEnd
					? full.filter((entry) => entry.yearMonth <= through)
					: buildLoanSchedule({ liability, transfers: snapshot.transfers, throughYearMonth: through });
			return { liabilityId: id, kind: "loan", entries };
		}
		if (liability.revolving) {
			const entries = buildRevolvingSchedule({
				liability,
				subscriptions: snapshot.subscriptions,
				transfers: snapshot.transfers,
				yearMonth: query.through ?? monthOf(),
			});
			return { liabilityId: id, kind: "revolving", entries };
		}
		throw new ValidationError("This liability has no schedule");
	}

	async function getLedger(userId: string, yearMonth: string, entityId?: string): Promise<MonthlyLedger> {
		await ensureBootstrap(userId, monthOf());
		const snapshot = await loadSnapshot(userId);
		const account = accountOrThrow(snapshot.accounts, entityId);

		const raw = generateMonthlyLedger({
			account,
			yearMonth,
			subscriptions: snapshot.subscriptions,
			hardware: snapshot.hardware,
			revenues: snapshot.revenues,
			transfers: snapshot.transfers,
			liabilities: snapshot.liabilities,
		});

		return {
			yearMonth,
			summary: {
				entityId: account.id,
				yearMonth,
				startingTreasury: raw.summary.startingTreasury,
				endingTreasury: raw.summary.endingTreasury,
				totalInflow: raw.summary.totalInflow,
				totalCashOutflow: raw.summary.totalCashOutflow,
				totalDepreciation: raw.summary.totalDepreciation,
				netCashFlow: raw.summary.netCashFlow,
				runwayMonths: raw.summary.runwayMonths,
				isDefaultAlive: raw.summary.isDefaultAlive,
			},
			actionItems: raw.actions.map((a) => ({
				id: a.id,
				entityId: account.id,
				yearMonth,
				title: a.description,
				date: a.date,
				amount: a.direction === "inflow" ? a.amount : -a.amount,
				type: a.direction,
				category: a.category,
				reference: a.counterparty,
			})),
		};
	}

	async function getProjection(
		userId: string,
		query: { entityId?: string; month?: string; pastMonths?: number; futureMonths?: number; asOf?: string },
	) {
		await ensureBootstrap(userId, monthOf(query.asOf));
		const snapshot = await loadSnapshot(userId);
		const account =
			query.entityId !== undefined
				? snapshot.accounts.find((a) => a.id === query.entityId)
				: snapshot.accounts.find((a) => a.type === "personal");
		if (!account) throw new NotFoundError(`Entity ${query.entityId ?? "personal"} not found`);

		const yearMonth = query.month ?? monthOf();
		const projection = calculateProjectionBalances({
			account,
			yearMonth,
			subscriptions: snapshot.subscriptions,
			hardware: snapshot.hardware,
			revenues: snapshot.revenues,
			transfers: snapshot.transfers,
			liabilities: snapshot.liabilities,
			pastMonths: query.pastMonths,
			futureMonths: query.futureMonths,
			asOfDate: query.asOf,
		});
		return {
			points: projection.offsets.map((offset) => ({
				offset,
				yearMonth: shiftYearMonth(yearMonth, offset),
				balance: projection.balances.get(offset) ?? 0,
			})),
			totalIncome: projection.totalIncome,
			totalExpense: projection.totalExpense,
			liabilityMonthly: projection.liabilityMonthly,
			projectedNet: projection.projectedNet,
		};
	}

	return {
		// entities
		listEntities: async (userId: string) => {
			await ensureBootstrap(userId, monthOf());
			return repo.list(userId, "entities");
		},
		getEntity: async (userId: string, id: string) => {
			await ensureBootstrap(userId, monthOf());
			return findOrThrow(userId, "entities", id, "Entity");
		},
		createEntity,
		updateEntity,
		deleteEntity,

		// assets
		listAssets: async (userId: string, filter: { entityId?: string; kind?: "cash" | "fixed" | "investment" }) => {
			await ensureBootstrap(userId, monthOf());
			return repo.list(userId, "assets", filter);
		},
		getAsset: async (userId: string, id: string) => {
			await ensureBootstrap(userId, monthOf());
			return findOrThrow(userId, "assets", id, "Asset");
		},
		createAsset,
		updateAsset,
		deleteAsset,

		// incomes
		listIncomes: async (userId: string, filter: { entityId?: string; kind?: BookIncome["kind"] }) => {
			await ensureBootstrap(userId, monthOf());
			return repo.list(userId, "incomes", filter);
		},
		getIncome: async (userId: string, id: string) => {
			await ensureBootstrap(userId, monthOf());
			return findOrThrow(userId, "incomes", id, "Income");
		},
		createIncome,
		updateIncome,
		deleteIncome,
		setCareerIncome,

		// expenses
		listExpenses: async (userId: string, filter: { entityId?: string }) => {
			await ensureBootstrap(userId, monthOf());
			return repo.list(userId, "expenses", filter);
		},
		getExpense: async (userId: string, id: string) => {
			await ensureBootstrap(userId, monthOf());
			return findOrThrow(userId, "expenses", id, "Expense");
		},
		createExpense,
		updateExpense,
		deleteExpense,

		// liabilities
		listLiabilities: async (userId: string, filter: { entityId?: string; kind?: BookLiability["kind"] }) => {
			await ensureBootstrap(userId, monthOf());
			return repo.list(userId, "liabilities", filter);
		},
		getLiability: async (userId: string, id: string) => {
			await ensureBootstrap(userId, monthOf());
			return findOrThrow(userId, "liabilities", id, "Liability");
		},
		createLiability,
		updateLiability,
		deleteLiability,

		// transfers
		listTransfers: async (userId: string) => {
			await ensureBootstrap(userId, monthOf());
			return repo.list(userId, "transfers");
		},
		getTransfer: async (userId: string, id: string) => {
			await ensureBootstrap(userId, monthOf());
			return findOrThrow(userId, "transfers", id, "Transfer");
		},
		createTransfer,
		updateTransfer,
		deleteTransfer,

		// computed
		getSummary,
		getLedger,
		getProjection,
		getCashFlows,
		getLiabilitySchedule,
	};
}

export type AccountingService = ReturnType<typeof createAccountingService>;
