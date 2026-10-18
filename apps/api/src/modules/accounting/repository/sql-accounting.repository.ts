import type {
	BookAsset,
	BookCashAsset,
	BookEntity,
	BookExpense,
	BookFixedAsset,
	BookIncome,
	BookIncomeKind,
	BookInvestmentAsset,
	BookLiability,
	BookSchedule,
	BookTransfer,
	DepreciationMethod,
	Stored,
	ThaiTaxCategory,
} from "@excited-live/accounting";
import type { SqlDriver, SqlStatement, SqlValue } from "../../../db/types";
import type {
	AccountingRepository,
	ListFilter,
	ResourceName,
	ResourceTypes,
	StoredBook,
	WriteOp,
} from "../domain/accounting.repository";
import {
	DomainError,
	DuplicateError,
	NotFoundError,
	ValidationError,
	VersionConflictError,
} from "../domain/errors";

/**
 * SQLite-backed accounting repository over the normalized tables in
 * migrations/0001_init.sql (schema and mapping rules: docs/accounting-data-model.md).
 */

type Row = Record<string, SqlValue>;
type AnyRecord = ResourceTypes[ResourceName];
type AnyStored = Stored<AnyRecord>;
type Filters = Array<[column: string, value: SqlValue]>;
type KindState = { kind: string | null; version: number };

const TABLES: Record<ResourceName, string> = {
	entities: "accounting_entities",
	assets: "accounting_assets",
	incomes: "accounting_incomes",
	expenses: "accounting_expenses",
	liabilities: "accounting_liabilities",
	transfers: "accounting_transfers",
};

/** Column holding the record's kind (entities: `type`), or null when there is none. */
const KIND_COLUMNS: Record<ResourceName, string | null> = {
	entities: "type",
	assets: "kind",
	incomes: "kind",
	expenses: null,
	liabilities: "kind",
	transfers: null,
};

// ROW TYPES ---------------------------------------------------------------

interface MetaRow {
	version: number;
	created_at: string;
	updated_at: string;
}

interface EntityRow extends MetaRow {
	id: string;
	name: string;
	type: string;
	currency: string;
	target_safety_buffer: number | null;
	active: number;
	notes: string | null;
	image_url: string | null;
}

interface AssetRow extends MetaRow {
	id: string;
	entity_id: string;
	kind: string;
	name: string;
	category: string;
	active: number;
	notes: string | null;
	image_url: string | null;
	details: string | null;
	balance: number | null;
	balance_as_of: string | null;
	cash_currency: string | null;
	is_default: number | null;
	cost: number | null;
	acquired_on: string | null;
	depreciation_method: string | null;
	useful_life_months: number | null;
	salvage_value: number | null;
	instrument: string | null;
	symbol: string | null;
	units: number | null;
	cost_basis: number | null;
	market_value: number | null;
	valued_as_of: string | null;
	expected_annual_return: number | null;
	investment_currency: string | null;
}

interface ScheduleRow {
	amount: number;
	cycle: string;
	day_of_month: number | null;
	start_month: string;
	end_month: string | null;
}

interface IncomeRow extends MetaRow, ScheduleRow {
	id: string;
	entity_id: string;
	kind: string;
	category: string;
	name: string;
	tax_category: string | null;
	deposit_asset_id: string | null;
	source_asset_id: string | null;
	active: number;
	notes: string | null;
	image_url: string | null;
	details: string | null;
	employer: string | null;
	title: string | null;
}

interface ExpenseRow extends MetaRow, ScheduleRow {
	id: string;
	entity_id: string;
	name: string;
	category: string;
	paid_from_asset_id: string | null;
	paid_from_liability_id: string | null;
	asset_id: string | null;
	income_id: string | null;
	active: number;
	notes: string | null;
	image_url: string | null;
	details: string | null;
}

interface LiabilityRow extends MetaRow, ScheduleRow {
	id: string;
	entity_id: string;
	kind: string;
	name: string;
	category: string;
	paid_from_asset_id: string | null;
	active: number;
	notes: string | null;
	image_url: string | null;
	details: string | null;
	principal: number | null;
	loan_annual_rate: number | null;
	term_months: number | null;
	originated_on: string | null;
	financed_asset_id: string | null;
	proceeds_asset_id: string | null;
	credit_limit: number | null;
	revolving_balance: number | null;
	balance_as_of: string | null;
	revolving_annual_rate: number | null;
}

interface TransferRow extends MetaRow {
	id: string;
	amount: number;
	date: string;
	cycle: string;
	note: string;
	from_asset_id: string;
	to_asset_id: string | null;
	to_liability_id: string | null;
}

// ROW -> RECORD ----------------------------------------------------------

/** Drops undefined values so optional fields are absent rather than `undefined`. */
function compact<T extends object>(value: T): T {
	return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

function optional<T>(value: T | null): T | undefined {
	return value ?? undefined;
}

function parseDetails(text: string | null): Record<string, unknown> | undefined {
	return text === null ? undefined : (JSON.parse(text) as Record<string, unknown>);
}

function meta(row: MetaRow) {
	return { version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}

function schedule(row: ScheduleRow): BookSchedule {
	return compact<BookSchedule>({
		amount: row.amount,
		cycle: row.cycle as BookSchedule["cycle"],
		dayOfMonth: optional(row.day_of_month),
		startMonth: row.start_month,
		endMonth: optional(row.end_month),
	});
}

function toEntity(row: EntityRow): Stored<BookEntity> {
	return compact<Stored<BookEntity>>({
		id: row.id,
		name: row.name,
		type: row.type as BookEntity["type"],
		currency: row.currency,
		targetSafetyBuffer: optional(row.target_safety_buffer),
		active: row.active === 1,
		notes: optional(row.notes),
		imageUrl: optional(row.image_url),
		...meta(row),
	});
}

function toAsset(row: AssetRow): Stored<BookAsset> {
	const base = {
		id: row.id,
		entityId: row.entity_id,
		name: row.name,
		category: row.category,
		active: row.active === 1,
		notes: optional(row.notes),
		imageUrl: optional(row.image_url),
		details: parseDetails(row.details),
		...meta(row),
	};
	if (row.kind === "cash") {
		return compact<Stored<BookCashAsset>>({
			...base,
			kind: "cash",
			balance: row.balance ?? 0,
			balanceAsOf: row.balance_as_of ?? "",
			currency: row.cash_currency ?? "THB",
			isDefault: row.is_default === 1,
		});
	}
	if (row.kind === "fixed") {
		return compact<Stored<BookFixedAsset>>({
			...base,
			kind: "fixed",
			cost: row.cost ?? 0,
			acquiredOn: row.acquired_on ?? "",
			depreciationMethod: (row.depreciation_method ?? "straight_line") as DepreciationMethod,
			usefulLifeMonths: optional(row.useful_life_months),
			salvageValue: row.salvage_value ?? 0,
		});
	}
	return compact<Stored<BookInvestmentAsset>>({
		...base,
		kind: "investment",
		instrument: row.instrument ?? "other",
		symbol: optional(row.symbol),
		units: optional(row.units),
		costBasis: row.cost_basis ?? 0,
		marketValue: row.market_value ?? 0,
		valuedAsOf: row.valued_as_of ?? "",
		expectedAnnualReturn: optional(row.expected_annual_return),
		currency: row.investment_currency ?? "THB",
	});
}

function toIncome(row: IncomeRow): Stored<BookIncome> {
	const kind = row.kind as BookIncomeKind;
	return compact<Stored<BookIncome>>({
		...schedule(row),
		id: row.id,
		entityId: row.entity_id,
		kind,
		category: row.category,
		name: row.name,
		taxCategory: optional(row.tax_category) as ThaiTaxCategory | undefined,
		depositAssetId: optional(row.deposit_asset_id),
		sourceAssetId: optional(row.source_asset_id),
		// Always present for employment, even when no detail values are set.
		employment:
			kind === "employment"
				? compact({ employer: optional(row.employer), title: optional(row.title) })
				: undefined,
		active: row.active === 1,
		notes: optional(row.notes),
		imageUrl: optional(row.image_url),
		details: parseDetails(row.details),
		...meta(row),
	});
}

function toExpense(row: ExpenseRow): Stored<BookExpense> {
	return compact<Stored<BookExpense>>({
		...schedule(row),
		id: row.id,
		entityId: row.entity_id,
		name: row.name,
		category: row.category,
		paidFromAssetId: optional(row.paid_from_asset_id),
		paidFromLiabilityId: optional(row.paid_from_liability_id),
		assetId: optional(row.asset_id),
		incomeId: optional(row.income_id),
		active: row.active === 1,
		notes: optional(row.notes),
		imageUrl: optional(row.image_url),
		details: parseDetails(row.details),
		...meta(row),
	});
}

function toLiability(row: LiabilityRow): Stored<BookLiability> {
	const kind = row.kind as BookLiability["kind"];
	return compact<Stored<BookLiability>>({
		...schedule(row),
		id: row.id,
		entityId: row.entity_id,
		kind,
		name: row.name,
		category: row.category,
		paidFromAssetId: optional(row.paid_from_asset_id),
		loan:
			kind === "loan"
				? compact({
						principal: row.principal ?? 0,
						annualRate: row.loan_annual_rate ?? 0,
						termMonths: row.term_months ?? 0,
						originatedOn: row.originated_on ?? "",
						financedAssetId: optional(row.financed_asset_id),
						proceedsAssetId: optional(row.proceeds_asset_id),
					})
				: undefined,
		revolving:
			kind === "revolving"
				? compact({
						creditLimit: optional(row.credit_limit),
						balance: row.revolving_balance ?? 0,
						balanceAsOf: row.balance_as_of ?? "",
						annualRate: optional(row.revolving_annual_rate),
					})
				: undefined,
		active: row.active === 1,
		notes: optional(row.notes),
		imageUrl: optional(row.image_url),
		details: parseDetails(row.details),
		...meta(row),
	});
}

function toTransfer(row: TransferRow): Stored<BookTransfer> {
	return compact<Stored<BookTransfer>>({
		id: row.id,
		amount: row.amount,
		date: row.date,
		cycle: row.cycle as BookTransfer["cycle"],
		note: row.note,
		fromAssetId: row.from_asset_id,
		toAssetId: optional(row.to_asset_id),
		toLiabilityId: optional(row.to_liability_id),
		...meta(row),
	});
}

// SELECTS -----------------------------------------------------------------

const ENTITY_SELECT = `SELECT id, name, type, currency, target_safety_buffer, active, notes, image_url,
	version, created_at, updated_at FROM accounting_entities`;

const ASSET_SELECT = `SELECT a.id, a.entity_id, a.kind, a.name, a.category, a.active, a.notes, a.image_url,
	a.details, a.version, a.created_at, a.updated_at,
	c.balance, c.balance_as_of, c.currency AS cash_currency, c.is_default,
	f.cost, f.acquired_on, f.depreciation_method, f.useful_life_months, f.salvage_value,
	i.instrument, i.symbol, i.units, i.cost_basis, i.market_value, i.valued_as_of,
	i.expected_annual_return, i.currency AS investment_currency
	FROM accounting_assets a
	LEFT JOIN accounting_cash_assets c ON c.asset_id = a.id
	LEFT JOIN accounting_fixed_assets f ON f.asset_id = a.id
	LEFT JOIN accounting_investment_assets i ON i.asset_id = a.id`;

const INCOME_SELECT = `SELECT i.id, i.entity_id, i.kind, i.category, i.name, i.amount, i.cycle,
	i.day_of_month, i.start_month, i.end_month, i.tax_category, i.deposit_asset_id, i.source_asset_id,
	i.active, i.notes, i.image_url, i.details, i.version, i.created_at, i.updated_at,
	e.employer, e.title
	FROM accounting_incomes i
	LEFT JOIN accounting_employment_incomes e ON e.income_id = i.id`;

const EXPENSE_SELECT = `SELECT id, entity_id, name, category, amount, cycle, day_of_month, start_month,
	end_month, paid_from_asset_id, paid_from_liability_id, asset_id, income_id, active, notes, image_url,
	details, version, created_at, updated_at FROM accounting_expenses`;

const LIABILITY_SELECT = `SELECT l.id, l.entity_id, l.kind, l.name, l.category, l.amount, l.cycle,
	l.day_of_month, l.start_month, l.end_month, l.paid_from_asset_id, l.active, l.notes, l.image_url,
	l.details, l.version, l.created_at, l.updated_at,
	n.principal, n.annual_rate AS loan_annual_rate, n.term_months, n.originated_on,
	n.financed_asset_id, n.proceeds_asset_id,
	r.credit_limit, r.balance AS revolving_balance, r.balance_as_of, r.annual_rate AS revolving_annual_rate
	FROM accounting_liabilities l
	LEFT JOIN accounting_loan_liabilities n ON n.liability_id = l.id
	LEFT JOIN accounting_revolving_liabilities r ON r.liability_id = l.id`;

const TRANSFER_SELECT = `SELECT id, amount, date, cycle, note, from_asset_id, to_asset_id, to_liability_id,
	version, created_at, updated_at FROM accounting_transfers`;

function idFilter(column: string, id: string | undefined): Filters {
	return id === undefined ? [] : [[column, id]];
}

async function query<T>(driver: SqlDriver, select: string, filters: Filters, order: string): Promise<T[]> {
	const where = filters.map(([column]) => `${column} = ?`).join(" AND ");
	return driver.all<T>(
		`${select} WHERE ${where} ORDER BY ${order}`,
		filters.map(([, value]) => value),
	);
}

async function loadEntities(
	driver: SqlDriver,
	userId: string,
	_filter: ListFilter,
	id?: string,
	personalOnly = false,
): Promise<Stored<BookEntity>[]> {
	const filters: Filters = [["user_id", userId], ...idFilter("id", id)];
	if (personalOnly) filters.push(["type", "personal"]);
	const rows = await query<EntityRow>(driver, ENTITY_SELECT, filters, "created_at, rowid");
	return rows.map(toEntity);
}

async function loadAssets(
	driver: SqlDriver,
	userId: string,
	filter: ListFilter,
	id?: string,
): Promise<Stored<BookAsset>[]> {
	const filters: Filters = [["a.user_id", userId], ...idFilter("a.id", id)];
	if (filter.entityId !== undefined) filters.push(["a.entity_id", filter.entityId]);
	if (filter.kind !== undefined) filters.push(["a.kind", filter.kind]);
	const rows = await query<AssetRow>(driver, ASSET_SELECT, filters, "a.created_at, a.rowid");
	return rows.map(toAsset);
}

async function loadIncomes(
	driver: SqlDriver,
	userId: string,
	filter: ListFilter,
	id?: string,
): Promise<Stored<BookIncome>[]> {
	const filters: Filters = [["i.user_id", userId], ...idFilter("i.id", id)];
	if (filter.entityId !== undefined) filters.push(["i.entity_id", filter.entityId]);
	if (filter.kind !== undefined) filters.push(["i.kind", filter.kind]);
	const rows = await query<IncomeRow>(driver, INCOME_SELECT, filters, "i.created_at, i.rowid");
	return rows.map(toIncome);
}

async function loadExpenses(
	driver: SqlDriver,
	userId: string,
	filter: ListFilter,
	id?: string,
): Promise<Stored<BookExpense>[]> {
	const filters: Filters = [["user_id", userId], ...idFilter("id", id)];
	if (filter.entityId !== undefined) filters.push(["entity_id", filter.entityId]);
	const rows = await query<ExpenseRow>(driver, EXPENSE_SELECT, filters, "created_at, rowid");
	return rows.map(toExpense);
}

async function loadLiabilities(
	driver: SqlDriver,
	userId: string,
	filter: ListFilter,
	id?: string,
): Promise<Stored<BookLiability>[]> {
	const filters: Filters = [["l.user_id", userId], ...idFilter("l.id", id)];
	if (filter.entityId !== undefined) filters.push(["l.entity_id", filter.entityId]);
	if (filter.kind !== undefined) filters.push(["l.kind", filter.kind]);
	const rows = await query<LiabilityRow>(driver, LIABILITY_SELECT, filters, "l.created_at, l.rowid");
	return rows.map(toLiability);
}

async function loadTransfers(
	driver: SqlDriver,
	userId: string,
	_filter: ListFilter,
	id?: string,
): Promise<Stored<BookTransfer>[]> {
	const filters: Filters = [["user_id", userId], ...idFilter("id", id)];
	const rows = await query<TransferRow>(driver, TRANSFER_SELECT, filters, "created_at, rowid");
	return rows.map(toTransfer);
}

async function loadResource(
	driver: SqlDriver,
	userId: string,
	resource: ResourceName,
	filter: ListFilter,
	id?: string,
): Promise<AnyStored[]> {
	switch (resource) {
		case "entities":
			return loadEntities(driver, userId, filter, id);
		case "assets":
			return loadAssets(driver, userId, filter, id);
		case "incomes":
			return loadIncomes(driver, userId, filter, id);
		case "expenses":
			return loadExpenses(driver, userId, filter, id);
		case "liabilities":
			return loadLiabilities(driver, userId, filter, id);
		case "transfers":
			return loadTransfers(driver, userId, filter, id);
	}
}

// RECORD -> ROW ----------------------------------------------------------

/** One base row plus the detail row(s) that complete the record. */
interface RecordPlan {
	table: string;
	base: Row;
	details: Array<{ table: string; key: string; row: Row }>;
}

function flag(value: boolean): number {
	return value ? 1 : 0;
}

function json(value: Record<string, unknown> | undefined): string | null {
	return value === undefined ? null : JSON.stringify(value);
}

function scheduleRow(record: BookSchedule): Row {
	return {
		amount: record.amount,
		cycle: record.cycle,
		day_of_month: record.dayOfMonth ?? null,
		start_month: record.startMonth,
		end_month: record.endMonth ?? null,
	};
}

function planEntity(userId: string, record: BookEntity): RecordPlan {
	return {
		table: TABLES.entities,
		base: {
			id: record.id,
			user_id: userId,
			name: record.name,
			type: record.type,
			currency: record.currency,
			target_safety_buffer: record.targetSafetyBuffer ?? null,
			active: flag(record.active),
			notes: record.notes ?? null,
			image_url: record.imageUrl ?? null,
		},
		details: [],
	};
}

function planAsset(userId: string, record: BookAsset): RecordPlan {
	const base: Row = {
		id: record.id,
		user_id: userId,
		entity_id: record.entityId,
		kind: record.kind,
		name: record.name,
		category: record.category,
		active: flag(record.active),
		notes: record.notes ?? null,
		image_url: record.imageUrl ?? null,
		details: json(record.details),
	};
	switch (record.kind) {
		case "cash":
			return {
				table: TABLES.assets,
				base,
				details: [
					{
						table: "accounting_cash_assets",
						key: "asset_id",
						row: {
							asset_id: record.id,
							kind: "cash",
							balance: record.balance,
							balance_as_of: record.balanceAsOf,
							currency: record.currency,
							is_default: flag(record.isDefault),
						},
					},
				],
			};
		case "fixed":
			return {
				table: TABLES.assets,
				base,
				details: [
					{
						table: "accounting_fixed_assets",
						key: "asset_id",
						row: {
							asset_id: record.id,
							kind: "fixed",
							cost: record.cost,
							acquired_on: record.acquiredOn,
							depreciation_method: record.depreciationMethod,
							useful_life_months: record.usefulLifeMonths ?? null,
							salvage_value: record.salvageValue,
						},
					},
				],
			};
		case "investment":
			return {
				table: TABLES.assets,
				base,
				details: [
					{
						table: "accounting_investment_assets",
						key: "asset_id",
						row: {
							asset_id: record.id,
							kind: "investment",
							instrument: record.instrument,
							symbol: record.symbol ?? null,
							units: record.units ?? null,
							cost_basis: record.costBasis,
							market_value: record.marketValue,
							valued_as_of: record.valuedAsOf,
							expected_annual_return: record.expectedAnnualReturn ?? null,
							currency: record.currency,
						},
					},
				],
			};
	}
}

function planIncome(userId: string, record: BookIncome): RecordPlan {
	return {
		table: TABLES.incomes,
		base: {
			id: record.id,
			user_id: userId,
			entity_id: record.entityId,
			kind: record.kind,
			category: record.category,
			name: record.name,
			...scheduleRow(record),
			tax_category: record.taxCategory ?? null,
			deposit_asset_id: record.depositAssetId ?? null,
			source_asset_id: record.sourceAssetId ?? null,
			active: flag(record.active),
			notes: record.notes ?? null,
			image_url: record.imageUrl ?? null,
			details: json(record.details),
		},
		details:
			record.kind === "employment"
				? [
						{
							table: "accounting_employment_incomes",
							key: "income_id",
							row: {
								income_id: record.id,
								kind: "employment",
								employer: record.employment?.employer ?? null,
								title: record.employment?.title ?? null,
							},
						},
					]
				: [],
	};
}

function planExpense(userId: string, record: BookExpense): RecordPlan {
	return {
		table: TABLES.expenses,
		base: {
			id: record.id,
			user_id: userId,
			entity_id: record.entityId,
			name: record.name,
			category: record.category,
			...scheduleRow(record),
			paid_from_asset_id: record.paidFromAssetId ?? null,
			paid_from_liability_id: record.paidFromLiabilityId ?? null,
			asset_id: record.assetId ?? null,
			income_id: record.incomeId ?? null,
			active: flag(record.active),
			notes: record.notes ?? null,
			image_url: record.imageUrl ?? null,
			details: json(record.details),
		},
		details: [],
	};
}

function planLiability(userId: string, record: BookLiability): RecordPlan {
	const base: Row = {
		id: record.id,
		user_id: userId,
		entity_id: record.entityId,
		kind: record.kind,
		name: record.name,
		category: record.category,
		...scheduleRow(record),
		paid_from_asset_id: record.paidFromAssetId ?? null,
		active: flag(record.active),
		notes: record.notes ?? null,
		image_url: record.imageUrl ?? null,
		details: json(record.details),
	};
	const details: RecordPlan["details"] = [];
	if (record.kind === "loan") {
		if (!record.loan) throw new ValidationError("A loan liability needs loan details");
		details.push({
			table: "accounting_loan_liabilities",
			key: "liability_id",
			row: {
				liability_id: record.id,
				kind: "loan",
				principal: record.loan.principal,
				annual_rate: record.loan.annualRate,
				term_months: record.loan.termMonths,
				originated_on: record.loan.originatedOn,
				financed_asset_id: record.loan.financedAssetId ?? null,
				proceeds_asset_id: record.loan.proceedsAssetId ?? null,
			},
		});
	}
	if (record.kind === "revolving") {
		if (!record.revolving) throw new ValidationError("A revolving liability needs revolving details");
		details.push({
			table: "accounting_revolving_liabilities",
			key: "liability_id",
			row: {
				liability_id: record.id,
				kind: "revolving",
				credit_limit: record.revolving.creditLimit ?? null,
				balance: record.revolving.balance,
				balance_as_of: record.revolving.balanceAsOf,
				annual_rate: record.revolving.annualRate ?? null,
			},
		});
	}
	return { table: TABLES.liabilities, base, details };
}

function planTransfer(userId: string, record: BookTransfer): RecordPlan {
	return {
		table: TABLES.transfers,
		base: {
			id: record.id,
			user_id: userId,
			amount: record.amount,
			date: record.date,
			cycle: record.cycle,
			note: record.note,
			from_asset_id: record.fromAssetId,
			to_asset_id: record.toAssetId ?? null,
			to_liability_id: record.toLiabilityId ?? null,
		},
		details: [],
	};
}

function planRecord(userId: string, resource: ResourceName, record: AnyRecord): RecordPlan {
	switch (resource) {
		case "entities":
			return planEntity(userId, record as BookEntity);
		case "assets":
			return planAsset(userId, record as BookAsset);
		case "incomes":
			return planIncome(userId, record as BookIncome);
		case "expenses":
			return planExpense(userId, record as BookExpense);
		case "liabilities":
			return planLiability(userId, record as BookLiability);
		case "transfers":
			return planTransfer(userId, record as BookTransfer);
	}
}

function kindOf(resource: ResourceName, record: AnyRecord): string | null {
	if (resource === "entities") return (record as BookEntity).type;
	return "kind" in record ? record.kind : null;
}

// STATEMENTS -------------------------------------------------------------

function insertSql(table: string, row: Row): SqlStatement {
	const columns = Object.keys(row);
	return {
		sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
		params: columns.map((column) => row[column] ?? null),
	};
}

/** Insert, or replace the detail row keyed by `key` when it already exists. */
function upsertSql(table: string, key: string, row: Row): SqlStatement {
	const insert = insertSql(table, row);
	const updates = Object.keys(row)
		.filter((column) => column !== key)
		.map((column) => `${column} = excluded.${column}`)
		.join(", ");
	return { sql: `${insert.sql} ON CONFLICT (${key}) DO UPDATE SET ${updates}`, params: insert.params };
}

function insertStatements(plan: RecordPlan, now: string): SqlStatement[] {
	return [
		insertSql(plan.table, { ...plan.base, version: 1, created_at: now, updated_at: now }),
		...plan.details.map((detail) => insertSql(detail.table, detail.row)),
	];
}

/**
 * Updates the base row (version + 1) and upserts each detail row. Upserting,
 * not delete + insert: deleting a cash, revolving or incomes detail row would
 * fire ON DELETE SET NULL on every link that points at it.
 */
function updateStatements(plan: RecordPlan, userId: string, id: string, now: string): SqlStatement[] {
	const columns = Object.keys(plan.base).filter((column) => column !== "id" && column !== "user_id");
	return [
		{
			sql: `UPDATE ${plan.table} SET ${columns.map((column) => `${column} = ?`).join(", ")}, updated_at = ?, version = version + 1 WHERE id = ? AND user_id = ?`,
			params: [...columns.map((column) => plan.base[column] ?? null), now, id, userId],
		},
		...plan.details.map((detail) => upsertSql(detail.table, detail.key, detail.row)),
	];
}

// ERRORS ------------------------------------------------------------------

/** Maps a failed batch to the domain error the service expects. */
function toDomainError(error: unknown): unknown {
	if (error instanceof DomainError) return error;
	const message = error instanceof Error ? error.message : String(error);
	if (/UNIQUE constraint failed/i.test(message)) {
		if (/one_personal_uidx|accounting_entities\.user_id/.test(message)) {
			return new DuplicateError("A personal entity already exists");
		}
		return new DuplicateError();
	}
	if (/constraint failed/i.test(message)) return new ValidationError(message);
	return error;
}

async function readState(
	driver: SqlDriver,
	userId: string,
	resource: ResourceName,
	id: string,
): Promise<KindState | null> {
	const kindColumn = KIND_COLUMNS[resource] ?? "NULL";
	return driver.first<KindState>(
		`SELECT ${kindColumn} AS kind, version FROM ${TABLES[resource]} WHERE id = ? AND user_id = ?`,
		[id, userId],
	);
}

// REPOSITORY --------------------------------------------------------------

export function createSqlAccountingRepository(driver: SqlDriver): AccountingRepository {
	return {
		async loadBook(userId: string): Promise<StoredBook> {
			const none: ListFilter = {};
			return {
				entities: await loadEntities(driver, userId, none),
				assets: await loadAssets(driver, userId, none),
				incomes: await loadIncomes(driver, userId, none),
				expenses: await loadExpenses(driver, userId, none),
				liabilities: await loadLiabilities(driver, userId, none),
				transfers: await loadTransfers(driver, userId, none),
			};
		},

		async list<R extends ResourceName>(userId: string, resource: R, filter: ListFilter = {}) {
			return (await loadResource(driver, userId, resource, filter)) as unknown as Stored<ResourceTypes[R]>[];
		},

		async get<R extends ResourceName>(userId: string, resource: R, id: string) {
			const [record] = await loadResource(driver, userId, resource, {}, id);
			return (record ?? null) as Stored<ResourceTypes[R]> | null;
		},

		async write(userId: string, ops: WriteOp[]) {
			const now = new Date().toISOString();
			const statements: SqlStatement[] = [];
			const written: Array<{ resource: ResourceName; id: string }> = [];
			// State each record is in once the ops before the current one have run,
			// so an op can target a row an earlier op in the same batch created.
			const pending = new Map<string, KindState | null>();

			for (const op of ops) {
				const id = op.op === "delete" ? op.id : op.record.id;
				const key = `${op.resource}:${id}`;

				if (op.op === "insert") {
					const record: AnyRecord = op.record;
					statements.push(...insertStatements(planRecord(userId, op.resource, record), now));
					pending.set(key, { kind: kindOf(op.resource, record), version: 1 });
					written.push({ resource: op.resource, id });
					continue;
				}

				const current = pending.has(key)
					? (pending.get(key) ?? null)
					: await readState(driver, userId, op.resource, id);
				if (!current) throw new NotFoundError();

				if (op.op === "delete") {
					statements.push({
						sql: `DELETE FROM ${TABLES[op.resource]} WHERE id = ? AND user_id = ?`,
						params: [id, userId],
					});
					pending.set(key, null);
					continue;
				}

				const record: AnyRecord = op.record;
				if (kindOf(op.resource, record) !== current.kind) {
					throw new ValidationError("A record's kind cannot change");
				}
				if (op.expectedVersion !== undefined && op.expectedVersion !== current.version) {
					throw new VersionConflictError();
				}
				statements.push(...updateStatements(planRecord(userId, op.resource, record), userId, id, now));
				pending.set(key, { kind: current.kind, version: current.version + 1 });
				written.push({ resource: op.resource, id });
			}

			if (statements.length > 0) {
				try {
					await driver.batch(statements);
				} catch (error) {
					throw toDomainError(error);
				}
			}

			const stored: AnyStored[] = [];
			for (const { resource, id } of written) {
				const [record] = await loadResource(driver, userId, resource, {}, id);
				if (record) stored.push(record);
			}
			return stored;
		},

		async ensurePersonalEntity(userId: string, seed: { entity: BookEntity; wallet: BookCashAsset }) {
			const existing = (await loadEntities(driver, userId, {}, undefined, true))[0];
			if (existing) return existing;

			const now = new Date().toISOString();
			const statements = [
				...insertStatements(planEntity(userId, seed.entity), now),
				...insertStatements(planAsset(userId, seed.wallet), now),
			];
			try {
				await driver.batch(statements);
			} catch (error) {
				// A concurrent first request won the race for the unique personal
				// entity; its row is the one to return.
				const winner = (await loadEntities(driver, userId, {}, undefined, true))[0];
				if (winner) return winner;
				throw toDomainError(error);
			}

			const created = (await loadEntities(driver, userId, {}, undefined, true))[0];
			if (!created) throw new DuplicateError("A personal entity already exists");
			return created;
		},
	};
}
