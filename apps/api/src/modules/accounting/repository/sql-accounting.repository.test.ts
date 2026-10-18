import type {
	BookAsset,
	BookCashAsset,
	BookEntity,
	BookExpense,
	BookFixedAsset,
	BookIncome,
	BookInvestmentAsset,
	BookLiability,
	BookTransfer,
} from "@excited-live/accounting";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDriver } from "../../../db/testing";
import type { SqlDriver } from "../../../db/types";
import type { AccountingRepository, WriteOp } from "../domain/accounting.repository";
import {
	DuplicateError,
	NotFoundError,
	ValidationError,
	VersionConflictError,
} from "../domain/errors";
import { createSqlAccountingRepository } from "./sql-accounting.repository";

const ME = "user-a";
const OTHER = "user-b";
const PERSONAL = "personal-a";
const WALLET = "cash-1";
const DEFAULT_WALLET = "wallet-a";

const timestamps = { createdAt: expect.any(String), updatedAt: expect.any(String) };

let driver: SqlDriver;
let repo: AccountingRepository;

beforeEach(async () => {
	driver = await createTestDriver();
	repo = createSqlAccountingRepository(driver);
	await repo.ensurePersonalEntity(ME, personalSeed(PERSONAL, DEFAULT_WALLET));
});

afterEach(() => {
	driver.close();
});

function personalSeed(entityId: string, walletId: string) {
	const entity: BookEntity = { id: entityId, name: "Me", type: "personal", currency: "THB", active: true };
	const wallet: BookCashAsset = {
		id: walletId,
		entityId,
		kind: "cash",
		name: "Wallet",
		category: "e_wallet",
		active: true,
		balance: 0,
		balanceAsOf: "2026-10",
		currency: "THB",
		isDefault: true,
	};
	return { entity, wallet };
}

const cash: BookCashAsset = {
	id: "cash-1",
	entityId: PERSONAL,
	kind: "cash",
	name: "KBank",
	category: "bank",
	active: true,
	balance: 1000,
	balanceAsOf: "2026-10",
	currency: "THB",
	isDefault: false,
	notes: undefined,
};

const laptop: BookFixedAsset = {
	id: "fixed-1",
	entityId: PERSONAL,
	kind: "fixed",
	name: "Laptop",
	category: "laptop",
	active: true,
	cost: 50000,
	acquiredOn: "2026-01-15",
	depreciationMethod: "straight_line",
	usefulLifeMonths: 36,
	salvageValue: 0,
	details: { color: "silver" },
};

const land: BookFixedAsset = {
	id: "land-1",
	entityId: PERSONAL,
	kind: "fixed",
	name: "Land",
	category: "property",
	active: true,
	cost: 1000000,
	acquiredOn: "2020-01",
	depreciationMethod: "none",
	salvageValue: 0,
};

const etf: BookInvestmentAsset = {
	id: "inv-1",
	entityId: PERSONAL,
	kind: "investment",
	name: "VT",
	category: "etf",
	active: true,
	instrument: "etf",
	symbol: "VT",
	units: 10,
	costBasis: 1000,
	marketValue: 1200,
	valuedAsOf: "2026-10",
	expectedAnnualReturn: 0.07,
	currency: "USD",
};

const mortgage: BookLiability = {
	id: "loan-1",
	entityId: PERSONAL,
	kind: "loan",
	name: "Mortgage",
	category: "mortgage",
	amount: 15000,
	cycle: "monthly",
	dayOfMonth: 5,
	startMonth: "2026-01",
	paidFromAssetId: WALLET,
	active: true,
	loan: {
		principal: 2000000,
		annualRate: 0.065,
		termMonths: 240,
		originatedOn: "2025-12",
		financedAssetId: "fixed-1",
	},
};

const card: BookLiability = {
	id: "card-1",
	entityId: PERSONAL,
	kind: "revolving",
	name: "Visa",
	category: "credit_card",
	amount: 500,
	cycle: "monthly",
	startMonth: "2026-01",
	active: true,
	revolving: { creditLimit: 50000, balance: 12000, balanceAsOf: "2026-10", annualRate: 0.2 },
};

const salary: BookIncome = {
	id: "salary-1",
	entityId: PERSONAL,
	kind: "employment",
	category: "salary",
	name: "Salary",
	amount: 80000,
	cycle: "monthly",
	dayOfMonth: 25,
	startMonth: "2026-01",
	depositAssetId: WALLET,
	taxCategory: "40_1",
	active: true,
	employment: { employer: "Acme", title: "Engineer" },
};

const netflix: BookExpense = {
	id: "exp-1",
	entityId: PERSONAL,
	name: "Netflix",
	category: "subscription",
	amount: 419,
	cycle: "monthly",
	startMonth: "2026-01",
	paidFromLiabilityId: "card-1",
	active: true,
};

const savings: BookTransfer = {
	id: "tr-1",
	amount: 5000,
	date: "2026-10-01",
	cycle: "monthly",
	note: "savings",
	fromAssetId: WALLET,
	toAssetId: "inv-1",
};

/** Inserts the personal fixture set in dependency order. */
async function seedFixtures(): Promise<void> {
	await repo.write(ME, [
		{ op: "insert", resource: "assets", record: cash },
		{ op: "insert", resource: "assets", record: laptop },
		{ op: "insert", resource: "assets", record: land },
		{ op: "insert", resource: "assets", record: etf },
		{ op: "insert", resource: "liabilities", record: card },
		{ op: "insert", resource: "liabilities", record: mortgage },
		{ op: "insert", resource: "incomes", record: salary },
		{ op: "insert", resource: "expenses", record: netflix },
		{ op: "insert", resource: "transfers", record: savings },
	]);
}

describe("insert and read back", () => {
	it("round-trips every asset kind with its detail fields", async () => {
		const stored = await repo.write(ME, [
			{ op: "insert", resource: "assets", record: cash },
			{ op: "insert", resource: "assets", record: laptop },
			{ op: "insert", resource: "assets", record: land },
			{ op: "insert", resource: "assets", record: etf },
		]);
		expect(stored).toHaveLength(4);

		expect(await repo.get(ME, "assets", "cash-1")).toEqual({ ...cash, version: 1, ...timestamps });
		expect(await repo.get(ME, "assets", "fixed-1")).toEqual({ ...laptop, version: 1, ...timestamps });
		expect(await repo.get(ME, "assets", "inv-1")).toEqual({ ...etf, version: 1, ...timestamps });
	});

	it("omits absent optional fields instead of returning undefined or null", async () => {
		await repo.write(ME, [{ op: "insert", resource: "assets", record: land }]);
		const stored = await repo.get(ME, "assets", "land-1");

		expect(stored).not.toBeNull();
		expect(Object.keys(stored ?? {})).not.toContain("usefulLifeMonths");
		expect(Object.keys(stored ?? {})).not.toContain("notes");
		expect(Object.keys(stored ?? {})).not.toContain("details");
		expect(stored).toMatchObject({ depreciationMethod: "none", salvageValue: 0 });
	});

	it("round-trips loan and revolving liabilities under their detail key", async () => {
		await seedFixtures();

		const loan = await repo.get(ME, "liabilities", "loan-1");
		expect(loan).toEqual({ ...mortgage, version: 1, ...timestamps });
		expect(loan).not.toHaveProperty("revolving");

		const revolving = await repo.get(ME, "liabilities", "card-1");
		expect(revolving).toEqual({ ...card, version: 1, ...timestamps });
		expect(revolving).not.toHaveProperty("loan");
	});

	it("round-trips employment income with its employment details", async () => {
		await seedFixtures();
		expect(await repo.get(ME, "incomes", "salary-1")).toEqual({ ...salary, version: 1, ...timestamps });
	});

	it("always returns an employment object for employment income, even when empty", async () => {
		await repo.write(ME, [
			{
				op: "insert",
				resource: "incomes",
				record: { ...salary, id: "salary-bare", depositAssetId: undefined, employment: undefined },
			},
		]);
		const stored = await repo.get(ME, "incomes", "salary-bare");
		expect(stored?.employment).toEqual({});
	});

	it("round-trips expenses and transfers", async () => {
		await seedFixtures();
		expect(await repo.get(ME, "expenses", "exp-1")).toEqual({ ...netflix, version: 1, ...timestamps });
		expect(await repo.get(ME, "transfers", "tr-1")).toEqual({ ...savings, version: 1, ...timestamps });
	});

	it("loadBook returns every list for the user", async () => {
		await seedFixtures();
		const book = await repo.loadBook(ME);

		expect(book.entities.map((entity) => entity.id)).toEqual([PERSONAL]);
		expect(book.assets.map((asset) => asset.id)).toEqual([DEFAULT_WALLET, "cash-1", "fixed-1", "land-1", "inv-1"]);
		expect(book.incomes.map((income) => income.id)).toEqual(["salary-1"]);
		expect(book.expenses.map((expense) => expense.id)).toEqual(["exp-1"]);
		expect(book.liabilities.map((liability) => liability.id)).toEqual(["card-1", "loan-1"]);
		expect(book.transfers.map((transfer) => transfer.id)).toEqual(["tr-1"]);
	});
});

describe("list", () => {
	beforeEach(async () => {
		await seedFixtures();
		await repo.write(ME, [
			{
				op: "insert",
				resource: "entities",
				record: { id: "biz-1", name: "Shop", type: "business", currency: "THB", active: true },
			},
			{
				op: "insert",
				resource: "assets",
				record: { ...cash, id: "biz-cash", entityId: "biz-1", name: "Shop Cash", isDefault: true },
			},
		]);
	});

	it("keeps creation order", async () => {
		const assets = await repo.list(ME, "assets");
		expect(assets.map((asset) => asset.id)).toEqual([DEFAULT_WALLET, "cash-1", "fixed-1", "land-1", "inv-1", "biz-cash"]);
	});

	it("filters by entity", async () => {
		const assets = await repo.list(ME, "assets", { entityId: "biz-1" });
		expect(assets.map((asset) => asset.id)).toEqual(["biz-cash"]);
	});

	it("filters by kind", async () => {
		const cashAssets = await repo.list(ME, "assets", { kind: "cash" });
		expect(cashAssets.map((asset) => asset.id)).toEqual([DEFAULT_WALLET, "cash-1", "biz-cash"]);

		const liabilities = await repo.list(ME, "liabilities", { kind: "revolving" });
		expect(liabilities.map((liability) => liability.id)).toEqual(["card-1"]);
	});

	it("combines entity and kind filters", async () => {
		const assets = await repo.list(ME, "assets", { entityId: PERSONAL, kind: "fixed" });
		expect(assets.map((asset) => asset.id)).toEqual(["fixed-1", "land-1"]);
	});

	it("lists every entity, ignoring filters that do not apply", async () => {
		const entities = await repo.list(ME, "entities", { entityId: "biz-1", kind: "x" });
		expect(entities.map((entity) => entity.id)).toEqual([PERSONAL, "biz-1"]);
	});
});

describe("update", () => {
	it("bumps the version, sets updatedAt and keeps createdAt", async () => {
		await seedFixtures();
		const before = await repo.get(ME, "assets", "cash-1");

		const [after] = await repo.write(ME, [
			{ op: "update", resource: "assets", record: { ...cash, name: "KBank Savings", balance: 2000 }, expectedVersion: 1 },
		]);

		expect(after).toMatchObject({ id: "cash-1", name: "KBank Savings", balance: 2000, version: 2 });
		expect(after?.createdAt).toBe(before?.createdAt);
		expect(await repo.get(ME, "assets", "cash-1")).toMatchObject({ balance: 2000, version: 2 });
	});

	it("accepts an update without expectedVersion", async () => {
		await seedFixtures();
		const [after] = await repo.write(ME, [
			{ op: "update", resource: "assets", record: { ...cash, balance: 5 } },
		]);
		expect(after).toMatchObject({ balance: 5, version: 2 });
	});

	it("replaces detail fields, dropping ones the new record does not set", async () => {
		await seedFixtures();
		const replaced: BookFixedAsset = { ...laptop, depreciationMethod: "none", usefulLifeMonths: undefined, details: undefined };

		await repo.write(ME, [{ op: "update", resource: "assets", record: replaced }]);

		const stored = await repo.get(ME, "assets", "fixed-1");
		expect(stored).toEqual({ ...replaced, version: 2, ...timestamps });
		expect(Object.keys(stored ?? {})).not.toContain("usefulLifeMonths");
		expect(Object.keys(stored ?? {})).not.toContain("details");
	});

	it("replaces loan detail fields", async () => {
		await seedFixtures();
		const refinanced: BookLiability = {
			...mortgage,
			loan: { ...mortgage.loan!, principal: 1500000, annualRate: 0.05 },
		};

		await repo.write(ME, [
			{ op: "update", resource: "liabilities", record: refinanced, expectedVersion: 1 },
		]);

		expect(await repo.get(ME, "liabilities", "loan-1")).toMatchObject({
			version: 2,
			loan: { principal: 1500000, annualRate: 0.05, termMonths: 240 },
		});
	});

	it("rejects a stale expectedVersion and leaves the record unchanged", async () => {
		await seedFixtures();
		await expect(
			repo.write(ME, [
				{ op: "update", resource: "assets", record: { ...cash, balance: 9 }, expectedVersion: 7 },
			]),
		).rejects.toBeInstanceOf(VersionConflictError);

		expect(await repo.get(ME, "assets", "cash-1")).toMatchObject({ balance: 1000, version: 1 });
	});

	it("rejects changing the kind", async () => {
		await seedFixtures();
		const asFixed = {
			...cash,
			kind: "fixed",
			cost: 1,
			acquiredOn: "2026-01",
			depreciationMethod: "none",
			salvageValue: 0,
		} as unknown as BookAsset;

		await expect(
			repo.write(ME, [{ op: "update", resource: "assets", record: asFixed }]),
		).rejects.toBeInstanceOf(ValidationError);
		expect(await repo.get(ME, "assets", "cash-1")).toMatchObject({ kind: "cash" });
	});

	it("can update a record created earlier in the same batch", async () => {
		const [stored] = await repo.write(ME, [
			{ op: "insert", resource: "assets", record: cash },
			{ op: "update", resource: "assets", record: { ...cash, balance: 42 }, expectedVersion: 1 },
		]);
		expect(stored).toMatchObject({ balance: 42, version: 2 });
	});
});

describe("delete, not found and duplicates", () => {
	it("throws NotFound when updating or deleting an unknown id", async () => {
		await expect(
			repo.write(ME, [{ op: "update", resource: "assets", record: { ...cash, id: "missing" } }]),
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(
			repo.write(ME, [{ op: "delete", resource: "transfers", id: "missing" }]),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("deletes a record", async () => {
		await seedFixtures();
		await repo.write(ME, [{ op: "delete", resource: "transfers", id: "tr-1" }]);
		expect(await repo.get(ME, "transfers", "tr-1")).toBeNull();
	});

	it("throws DuplicateError when an inserted id already exists", async () => {
		await seedFixtures();
		await expect(
			repo.write(ME, [{ op: "insert", resource: "assets", record: cash }]),
		).rejects.toBeInstanceOf(DuplicateError);
	});

	it("throws DuplicateError for a second personal entity", async () => {
		await expect(
			repo.write(ME, [
				{
					op: "insert",
					resource: "entities",
					record: { id: "second", name: "Me again", type: "personal", currency: "THB", active: true },
				},
			]),
		).rejects.toBeInstanceOf(DuplicateError);
	});
});

describe("constraints", () => {
	it("rejects a transfer with both destinations", async () => {
		await seedFixtures();
		const both = { ...savings, id: "tr-both", toLiabilityId: "card-1" };
		await expect(
			repo.write(ME, [{ op: "insert", resource: "transfers", record: both }]),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects a transfer with no destination", async () => {
		await seedFixtures();
		const neither = { ...savings, id: "tr-none", toAssetId: undefined };
		await expect(
			repo.write(ME, [{ op: "insert", resource: "transfers", record: neither }]),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects an expense paid from both an asset and a liability", async () => {
		await seedFixtures();
		const both = { ...netflix, id: "exp-both", paidFromAssetId: WALLET };
		await expect(
			repo.write(ME, [{ op: "insert", resource: "expenses", record: both }]),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects a link to an entity that does not exist", async () => {
		const orphan: BookCashAsset = { ...cash, id: "orphan", entityId: "no-such-entity" };
		await expect(
			repo.write(ME, [{ op: "insert", resource: "assets", record: orphan }]),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects a fixed asset with straight-line depreciation and no useful life", async () => {
		const bad: BookFixedAsset = { ...laptop, id: "bad-fixed", usefulLifeMonths: undefined };
		await expect(
			repo.write(ME, [{ op: "insert", resource: "assets", record: bad }]),
		).rejects.toBeInstanceOf(ValidationError);
	});
});

describe("cascades", () => {
	it("deleting an entity removes its records and the transfers touching its assets", async () => {
		await seedFixtures();
		await repo.write(ME, [
			{
				op: "insert",
				resource: "entities",
				record: { id: "biz-1", name: "Shop", type: "business", currency: "THB", active: true },
			},
			{
				op: "insert",
				resource: "assets",
				record: { ...cash, id: "biz-cash", entityId: "biz-1", isDefault: true },
			},
			{
				op: "insert",
				resource: "incomes",
				record: {
					id: "biz-income",
					entityId: "biz-1",
					kind: "business",
					category: "sales",
					name: "Sales",
					amount: 10000,
					cycle: "monthly",
					startMonth: "2026-01",
					depositAssetId: "biz-cash",
					active: true,
				},
			},
			{
				op: "insert",
				resource: "expenses",
				record: {
					id: "biz-expense",
					entityId: "biz-1",
					name: "Rent",
					category: "rent",
					amount: 5000,
					cycle: "monthly",
					startMonth: "2026-01",
					paidFromAssetId: "biz-cash",
					active: true,
				},
			},
			{
				op: "insert",
				resource: "liabilities",
				record: {
					id: "biz-loan-other",
					entityId: "biz-1",
					kind: "other",
					name: "Tax owed",
					category: "tax_owed",
					amount: 100,
					cycle: "monthly",
					startMonth: "2026-01",
					active: true,
				},
			},
			{
				op: "insert",
				resource: "transfers",
				record: { id: "tr-biz", amount: 300, date: "2026-10-01", cycle: "one_time", note: "", fromAssetId: WALLET, toAssetId: "biz-cash" },
			},
		]);

		await repo.write(ME, [{ op: "delete", resource: "entities", id: "biz-1" }]);

		expect(await repo.get(ME, "assets", "biz-cash")).toBeNull();
		expect(await repo.get(ME, "incomes", "biz-income")).toBeNull();
		expect(await repo.get(ME, "expenses", "biz-expense")).toBeNull();
		expect(await repo.get(ME, "liabilities", "biz-loan-other")).toBeNull();
		expect(await repo.get(ME, "transfers", "tr-biz")).toBeNull();
		// Records of the personal entity survive.
		expect(await repo.get(ME, "transfers", "tr-1")).not.toBeNull();
	});

	it("deleting a cash asset unlinks incomes and expenses that pointed at it", async () => {
		await seedFixtures();
		await repo.write(ME, [
			{
				op: "insert",
				resource: "expenses",
				record: { ...netflix, id: "exp-cash", paidFromLiabilityId: undefined, paidFromAssetId: WALLET },
			},
		]);

		await repo.write(ME, [{ op: "delete", resource: "assets", id: WALLET }]);

		expect(await repo.get(ME, "assets", WALLET)).toBeNull();
		expect(await repo.get(ME, "incomes", "salary-1")).toEqual({
			...salary,
			depositAssetId: undefined,
			version: 1,
			...timestamps,
		});
		expect(await repo.get(ME, "expenses", "exp-cash")).not.toHaveProperty("paidFromAssetId");
		expect(await repo.get(ME, "liabilities", "loan-1")).not.toHaveProperty("paidFromAssetId");
		// The transfer out of the deleted cash asset is removed with it.
		expect(await repo.get(ME, "transfers", "tr-1")).toBeNull();
	});

	it("updating a cash asset keeps the links that point at it", async () => {
		await seedFixtures();
		await repo.write(ME, [
			{ op: "update", resource: "assets", record: { ...cash, balance: 1 }, expectedVersion: 1 },
		]);

		expect(await repo.get(ME, "incomes", "salary-1")).toMatchObject({ depositAssetId: WALLET });
		expect(await repo.get(ME, "liabilities", "loan-1")).toMatchObject({ paidFromAssetId: WALLET });
	});
});

describe("user isolation", () => {
	it("hides another user's rows from every read", async () => {
		await seedFixtures();
		await repo.ensurePersonalEntity(OTHER, personalSeed("personal-b", "cash-b"));

		const book = await repo.loadBook(OTHER);
		expect(book.entities.map((entity) => entity.id)).toEqual(["personal-b"]);
		expect(book.assets.map((asset) => asset.id)).toEqual(["cash-b"]);
		expect(book.transfers).toEqual([]);

		expect(await repo.get(OTHER, "assets", "cash-1")).toBeNull();
		expect(await repo.list(OTHER, "assets", { entityId: PERSONAL })).toEqual([]);
	});

	it("cannot update or delete another user's rows", async () => {
		await seedFixtures();
		await repo.ensurePersonalEntity(OTHER, personalSeed("personal-b", "cash-b"));

		await expect(
			repo.write(OTHER, [{ op: "update", resource: "assets", record: { ...cash, balance: 0 } }]),
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(
			repo.write(OTHER, [{ op: "delete", resource: "assets", id: "cash-1" }]),
		).rejects.toBeInstanceOf(NotFoundError);

		expect(await repo.get(ME, "assets", "cash-1")).toMatchObject({ balance: 1000, version: 1 });
	});

	it("cannot claim another user's id on insert", async () => {
		await seedFixtures();
		await repo.ensurePersonalEntity(OTHER, personalSeed("personal-b", "cash-b"));
		await expect(
			repo.write(OTHER, [{ op: "insert", resource: "assets", record: { ...cash, entityId: "personal-b" } }]),
		).rejects.toBeInstanceOf(DuplicateError);
	});
});

describe("ensurePersonalEntity", () => {
	it("is idempotent: a second call returns the existing entity and creates nothing", async () => {
		const first = await repo.ensurePersonalEntity(OTHER, personalSeed("personal-b", "cash-b"));
		const second = await repo.ensurePersonalEntity(OTHER, personalSeed("personal-c", "cash-c"));

		expect(second.id).toBe(first.id);
		expect(first).toMatchObject({ type: "personal", version: 1 });

		const book = await repo.loadBook(OTHER);
		expect(book.entities).toHaveLength(1);
		expect(book.assets).toHaveLength(1);
		expect(book.assets[0]).toMatchObject({ id: "cash-b", kind: "cash", isDefault: true, balance: 0 });
	});

	it("returns the same entity to concurrent first requests and creates one wallet", async () => {
		const [a, b] = await Promise.all([
			repo.ensurePersonalEntity(OTHER, personalSeed("personal-b", "cash-b")),
			repo.ensurePersonalEntity(OTHER, personalSeed("personal-c", "cash-c")),
		]);

		expect(a.id).toBe(b.id);
		const book = await repo.loadBook(OTHER);
		expect(book.entities).toHaveLength(1);
		expect(book.assets).toHaveLength(1);
	});
});

describe("batch atomicity", () => {
	it("leaves nothing written when the last op of a batch fails a constraint", async () => {
		const ops: WriteOp[] = [
			{
				op: "insert",
				resource: "entities",
				record: { id: "biz-1", name: "Shop", type: "business", currency: "THB", active: true },
			},
			{
				op: "insert",
				resource: "assets",
				record: { ...cash, id: "biz-cash", entityId: "biz-1" },
			},
			{
				op: "insert",
				resource: "expenses",
				record: {
					id: "bad-expense",
					entityId: "biz-1",
					name: "Bad",
					category: "x",
					amount: 1,
					cycle: "monthly",
					startMonth: "2026-01",
					paidFromAssetId: WALLET,
					paidFromLiabilityId: "card-1",
					active: true,
				},
			},
		];

		await expect(repo.write(ME, ops)).rejects.toBeInstanceOf(ValidationError);

		const book = await repo.loadBook(ME);
		expect(book.entities.map((entity) => entity.id)).toEqual([PERSONAL]);
		expect(book.assets.map((asset) => asset.id)).toEqual([DEFAULT_WALLET]);
	});

	it("rolls back an earlier update when a later statement fails inside the batch", async () => {
		await seedFixtures();
		const ops: WriteOp[] = [
			{ op: "update", resource: "assets", record: { ...cash, balance: 77 }, expectedVersion: 1 },
			{
				op: "insert",
				resource: "transfers",
				record: { ...savings, id: "tr-both", toLiabilityId: "card-1" },
			},
		];

		await expect(repo.write(ME, ops)).rejects.toBeInstanceOf(ValidationError);
		expect(await repo.get(ME, "assets", "cash-1")).toMatchObject({ balance: 1000, version: 1 });
		expect(await repo.get(ME, "transfers", "tr-both")).toBeNull();
	});
});
