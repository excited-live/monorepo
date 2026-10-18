import { DEFAULT_BASELINE_MONTH } from "../ledger";
import { daysInMonth, isCashAsset } from "../math";
import { normalizeSnapshot } from "../normalize";
import type { Account, AccountingSnapshot, Asset, AssetKind, Expense, Income, Liability, Transfer } from "../types";
import type {
	AccountingBook,
	BookAsset,
	BookEntity,
	BookExpense,
	BookIncome,
	BookLiability,
	BookTransfer,
} from "./types";

/**
 * Converters between the normalized book (./types) and the engine snapshot.
 * Rules are in docs/accounting-data-model.md section 3.
 */

// Currency for legacy assets that never recorded one.
const DEFAULT_CURRENCY = "THB";
const YEAR_MONTH = /^\d{4}-\d{2}/;
// Income sources that the engine treats as business revenue (legacy source values).
const BUSINESS_SOURCES: readonly string[] = ["stripe", "bank_transfer", "cash", "freelance"];

/** Copies only the fields whose value is defined, so optional fields stay absent. */
function defined<T extends object>(fields: T): Partial<T> {
	return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as Partial<T>;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Day of month of a YYYY-MM-DD date; undefined for a YYYY-MM date. */
function dayOfDate(date: string): number | undefined {
	return /^\d{4}-\d{2}-\d{2}/.test(date) ? Number(date.slice(8, 10)) : undefined;
}

function assetKind(asset: Asset): AssetKind {
	return asset.kind ?? (isCashAsset(asset) ? "cash" : "fixed");
}

function isCash(asset: Asset): boolean {
	return assetKind(asset) === "cash";
}

/** Primary employment income: earliest startMonth; ties keep book order. */
function primaryEmployment(incomes: BookIncome[], entityId: string): BookIncome | undefined {
	let primary: BookIncome | undefined;
	for (const income of incomes) {
		if (income.entityId !== entityId || income.kind !== "employment") continue;
		if (!primary || income.startMonth < primary.startMonth) primary = income;
	}
	return primary;
}

function incomeSource(income: BookIncome): Income["source"] {
	if (income.kind === "employment") return "salary";
	return BUSINESS_SOURCES.includes(income.category) ? (income.category as Income["source"]) : "other";
}

function bookEntityToAccount(entity: BookEntity, job?: BookIncome): Account {
	return {
		id: entity.id,
		name: entity.name,
		type: entity.type,
		currency: entity.currency,
		cashReserve: 0,
		active: entity.active,
		...defined({
			targetSafetyBuffer: entity.targetSafetyBuffer,
			notes: entity.notes,
			imageUrl: entity.imageUrl,
			careerTitle: job?.employment?.title,
			careerCompany: job?.employment?.employer,
			careerImageUrl: job?.imageUrl,
			paydayDayOfMonth: job?.dayOfMonth,
		}),
	};
}

function bookAssetToAsset(asset: BookAsset): Asset {
	const base = {
		id: asset.id,
		entityId: asset.entityId,
		name: asset.name,
		kind: asset.kind,
		...defined({ imageUrl: asset.imageUrl, notes: asset.notes }),
	};
	switch (asset.kind) {
		case "cash":
			return {
				...base,
				cost: asset.balance,
				lifespanMonths: 0,
				purchaseDate: asset.balanceAsOf,
				category: "cash",
				isDefault: asset.isDefault,
				currency: asset.currency,
			};
		case "fixed":
			return {
				...base,
				cost: asset.cost,
				lifespanMonths: asset.usefulLifeMonths ?? 0,
				purchaseDate: asset.acquiredOn,
				salvageValue: asset.salvageValue,
				category: asset.category,
				depreciationMethod: asset.depreciationMethod,
			};
		case "investment":
			return {
				...base,
				cost: asset.costBasis,
				lifespanMonths: 0,
				purchaseDate: asset.valuedAsOf,
				category: asset.category,
				investment: {
					instrument: asset.instrument,
					costBasis: asset.costBasis,
					marketValue: asset.marketValue,
					valuedAsOf: asset.valuedAsOf,
					...defined({
						symbol: asset.symbol,
						units: asset.units,
						expectedAnnualReturn: asset.expectedAnnualReturn,
					}),
				},
				currency: asset.currency,
			};
	}
}

function bookIncomeToIncome(income: BookIncome): Income {
	return {
		id: income.id,
		entityId: income.entityId,
		name: income.name,
		amount: income.amount,
		frequency: income.cycle,
		source: incomeSource(income),
		active: income.active,
		startMonth: income.startMonth,
		...defined({
			endMonth: income.endMonth,
			notes: income.notes,
			imageUrl: income.imageUrl,
			dayOfMonth: income.dayOfMonth,
			depositAssetId: income.depositAssetId,
			sourceAssetId: income.sourceAssetId,
			kind: income.kind,
			category: income.category,
			taxCategory: income.taxCategory,
			employment: income.employment,
		}),
	};
}

function bookExpenseToExpense(expense: BookExpense): Expense {
	// Engine expenses carry a date, not a day rule: the day is clamped to the month length.
	const day = Math.min(expense.dayOfMonth ?? 1, daysInMonth(expense.startMonth));
	return {
		id: expense.id,
		entityId: expense.entityId,
		name: expense.name,
		amount: expense.amount,
		cycle: expense.cycle,
		category: expense.category,
		nextRenewalDate: `${expense.startMonth}-${pad2(day)}`,
		active: expense.active,
		startMonth: expense.startMonth,
		...defined({
			billingDay: expense.dayOfMonth,
			endMonth: expense.endMonth,
			notes: expense.notes,
			imageUrl: expense.imageUrl,
			paidFromAssetId: expense.paidFromAssetId,
			paidFromLiabilityId: expense.paidFromLiabilityId,
			assetId: expense.assetId,
			incomeId: expense.incomeId,
		}),
	};
}

function bookLiabilityToLiability(liability: BookLiability): Liability {
	return {
		id: liability.id,
		entityId: liability.entityId,
		name: liability.name,
		amount: liability.amount,
		category: liability.category,
		active: liability.active,
		kind: liability.kind,
		cycle: liability.cycle,
		startMonth: liability.startMonth,
		...defined({
			dayOfMonth: liability.dayOfMonth,
			endMonth: liability.endMonth,
			notes: liability.notes,
			imageUrl: liability.imageUrl,
			paidFromAssetId: liability.paidFromAssetId,
			loan: liability.loan,
			revolving: liability.revolving,
		}),
	};
}

/**
 * Builds the engine snapshot from the normalized records. Transfers whose source
 * or destination cannot be resolved to an entity are dropped.
 */
export function bookToSnapshot(book: AccountingBook): AccountingSnapshot {
	const assetEntity = new Map(book.assets.map((asset) => [asset.id, asset.entityId]));
	const liabilityEntity = new Map(book.liabilities.map((liability) => [liability.id, liability.entityId]));

	const transfers: Transfer[] = [];
	for (const t of book.transfers) {
		const fromEntityId = assetEntity.get(t.fromAssetId);
		const toEntityId =
			t.toLiabilityId !== undefined
				? liabilityEntity.get(t.toLiabilityId)
				: t.toAssetId !== undefined
					? assetEntity.get(t.toAssetId)
					: undefined;
		if (!fromEntityId || !toEntityId) continue;
		transfers.push({
			id: t.id,
			fromEntityId,
			toEntityId,
			amount: t.amount,
			date: t.date,
			note: t.note,
			frequency: t.cycle,
			fromAssetId: t.fromAssetId,
			...defined({ targetAssetId: t.toAssetId, toLiabilityId: t.toLiabilityId }),
		});
	}

	return {
		accounts: book.entities.map((entity) => bookEntityToAccount(entity, primaryEmployment(book.incomes, entity.id))),
		hardware: book.assets.map(bookAssetToAsset),
		revenues: book.incomes.map(bookIncomeToIncome),
		subscriptions: book.expenses.map(bookExpenseToExpense),
		liabilities: book.liabilities.map(bookLiabilityToLiability),
		transfers,
		isDefault: false,
	};
}

export function accountToBookEntity(account: Account): BookEntity {
	return {
		id: account.id,
		name: account.name,
		type: account.type,
		currency: account.currency,
		active: account.active ?? true,
		...defined({
			targetSafetyBuffer: account.targetSafetyBuffer,
			notes: account.notes,
			imageUrl: account.imageUrl,
		}),
	};
}

export function assetToBookAsset(asset: Asset): BookAsset {
	const kind = assetKind(asset);
	const common = {
		id: asset.id,
		entityId: asset.entityId,
		name: asset.name,
		active: true,
		...defined({ imageUrl: asset.imageUrl, notes: asset.notes }),
	};
	if (kind === "cash") {
		return {
			...common,
			kind,
			category: "cash",
			balance: asset.cost,
			balanceAsOf: YEAR_MONTH.test(asset.purchaseDate) ? asset.purchaseDate : DEFAULT_BASELINE_MONTH,
			currency: asset.currency ?? DEFAULT_CURRENCY,
			isDefault: Boolean(asset.isDefault),
		};
	}
	if (kind === "fixed") {
		return {
			...common,
			kind,
			category: asset.category,
			cost: asset.cost,
			acquiredOn: asset.purchaseDate,
			usefulLifeMonths: asset.lifespanMonths,
			salvageValue: asset.salvageValue ?? 0,
			depreciationMethod: asset.depreciationMethod ?? "straight_line",
		};
	}
	// Investment without details falls back to the asset's own cost and date.
	const details = asset.investment;
	return {
		...common,
		kind,
		category: asset.category,
		instrument: details?.instrument ?? "other",
		costBasis: details?.costBasis ?? asset.cost,
		marketValue: details?.marketValue ?? asset.cost,
		valuedAsOf: details?.valuedAsOf ?? asset.purchaseDate.slice(0, 7),
		...defined({
			symbol: details?.symbol,
			units: details?.units,
			expectedAnnualReturn: details?.expectedAnnualReturn,
		}),
		currency: asset.currency ?? DEFAULT_CURRENCY,
	};
}

export function incomeToBookIncome(income: Income, account?: Account): BookIncome {
	const kind =
		income.kind ??
		(income.source === "salary" ? "employment" : BUSINESS_SOURCES.includes(income.source) ? "business" : "other");
	const isEmployment = kind === "employment";
	const employment = isEmployment
		? (income.employment ??
			(account && (account.careerTitle !== undefined || account.careerCompany !== undefined)
				? defined({ title: account.careerTitle, employer: account.careerCompany })
				: undefined))
		: undefined;
	return {
		id: income.id,
		entityId: income.entityId,
		name: income.name,
		kind,
		category: income.category ?? income.source,
		amount: income.amount,
		cycle: income.frequency,
		startMonth: income.startMonth ?? DEFAULT_BASELINE_MONTH,
		active: income.active,
		// Only employment incomes fall back to the payday; others keep the engine's 1st-of-month default.
		...defined({
			endMonth: income.endMonth,
			dayOfMonth: isEmployment ? (income.dayOfMonth ?? account?.paydayDayOfMonth) : income.dayOfMonth,
			depositAssetId: income.depositAssetId,
			sourceAssetId: income.sourceAssetId,
			taxCategory: income.taxCategory as BookIncome["taxCategory"],
			employment,
			notes: income.notes,
			imageUrl: income.imageUrl,
		}),
	};
}

export function expenseToBookExpense(expense: Expense): BookExpense {
	const renewalDay = dayOfDate(expense.nextRenewalDate);
	const oneTime = expense.cycle === "one_time";
	return {
		id: expense.id,
		entityId: expense.entityId,
		name: expense.name,
		amount: expense.amount,
		cycle: expense.cycle,
		category: expense.category,
		startMonth: oneTime ? expense.nextRenewalDate.slice(0, 7) : (expense.startMonth ?? DEFAULT_BASELINE_MONTH),
		active: expense.active,
		...defined({
			dayOfMonth: oneTime ? renewalDay : (expense.billingDay ?? renewalDay),
			endMonth: expense.endMonth,
			notes: expense.notes,
			imageUrl: expense.imageUrl,
			paidFromAssetId: expense.paidFromAssetId,
			paidFromLiabilityId: expense.paidFromLiabilityId,
			assetId: expense.assetId,
			incomeId: expense.incomeId,
		}),
	};
}

export function liabilityToBookLiability(liability: Liability): BookLiability {
	return {
		id: liability.id,
		entityId: liability.entityId,
		name: liability.name,
		amount: liability.amount,
		category: liability.category,
		kind: liability.kind ?? "other",
		cycle: liability.cycle ?? "monthly",
		startMonth: liability.startMonth ?? DEFAULT_BASELINE_MONTH,
		active: liability.active,
		...defined({
			dayOfMonth: liability.dayOfMonth,
			endMonth: liability.endMonth,
			notes: liability.notes,
			imageUrl: liability.imageUrl,
			paidFromAssetId: liability.paidFromAssetId,
			loan: liability.loan,
			revolving: liability.revolving,
		}),
	};
}

/**
 * Reverse of a transfer. Each end falls back to the entity's default cash asset
 * when its asset id is missing or unknown (as the engine does). Returns null when
 * an end cannot be resolved, or a liability destination is not in `liabilities`.
 */
export function transferToBookTransfer(
	transfer: Transfer,
	hardware: Asset[],
	liabilities?: Liability[],
): BookTransfer | null {
	const defaultCash = (entityId: string) =>
		hardware.find((h) => h.entityId === entityId && isCash(h) && h.isDefault) ??
		hardware.find((h) => h.entityId === entityId && isCash(h));

	const source =
		hardware.find((h) => h.id === transfer.fromAssetId) ?? defaultCash(transfer.fromEntityId);
	if (!source) return null;

	if (transfer.toLiabilityId !== undefined) {
		if (liabilities && !liabilities.some((l) => l.id === transfer.toLiabilityId)) return null;
		return bookTransferRecord(transfer, source.id, { toLiabilityId: transfer.toLiabilityId });
	}
	const target =
		hardware.find((h) => h.id === transfer.targetAssetId) ?? defaultCash(transfer.toEntityId);
	if (!target) return null;
	return bookTransferRecord(transfer, source.id, { toAssetId: target.id });
}

function bookTransferRecord(
	transfer: Transfer,
	fromAssetId: string,
	destination: { toAssetId?: string; toLiabilityId?: string },
): BookTransfer {
	return {
		id: transfer.id,
		amount: transfer.amount,
		date: transfer.date,
		cycle: transfer.frequency ?? "one_time",
		note: transfer.note,
		fromAssetId,
		...destination,
	};
}

/**
 * Builds a book from a legacy or engine-shaped snapshot. Normalizes it first, then
 * adds a default cash asset for each entity without one, and an employment income
 * for `account.salary` when the entity has no incomes.
 */
export function snapshotToBook(snapshot: AccountingSnapshot): AccountingBook {
	const s = normalizeSnapshot(snapshot);
	const accountById = new Map(s.accounts.map((account) => [account.id, account]));
	const liabilities = s.liabilities ?? [];

	const hardware: Asset[] = [...s.hardware];
	const withCash = new Set(hardware.filter(isCash).map((h) => h.entityId));
	for (const account of s.accounts) {
		if (withCash.has(account.id)) continue;
		hardware.push({
			id: `cash_${account.id}`,
			entityId: account.id,
			name: account.name,
			kind: "cash",
			cost: account.cashReserve,
			lifespanMonths: 0,
			purchaseDate: DEFAULT_BASELINE_MONTH,
			category: "cash",
			isDefault: true,
			currency: account.currency,
		});
	}

	const incomes: BookIncome[] = s.revenues.map((revenue) =>
		incomeToBookIncome(revenue, accountById.get(revenue.entityId)),
	);
	const hasIncome = new Set(s.revenues.map((revenue) => revenue.entityId));
	for (const account of s.accounts) {
		if (!(account.salary && account.salary > 0) || hasIncome.has(account.id)) continue;
		incomes.push({
			id: `salary_${account.id}`,
			entityId: account.id,
			kind: "employment",
			category: "salary",
			name: "Career Base Salary",
			amount: account.salary,
			cycle: "monthly",
			startMonth: DEFAULT_BASELINE_MONTH,
			active: true,
			...defined({ dayOfMonth: account.paydayDayOfMonth }),
		});
	}

	const transfers = s.transfers.flatMap((transfer) => {
		const book = transferToBookTransfer(transfer, hardware, liabilities);
		return book ? [book] : [];
	});

	return {
		entities: s.accounts.map(accountToBookEntity),
		assets: hardware.map((asset) =>
			assetToBookAsset({ ...asset, currency: asset.currency ?? accountById.get(asset.entityId)?.currency }),
		),
		incomes,
		expenses: s.subscriptions.map(expenseToBookExpense),
		liabilities: liabilities.map(liabilityToBookLiability),
		transfers,
	};
}
