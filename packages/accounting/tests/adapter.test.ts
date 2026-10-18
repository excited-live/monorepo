import { describe, expect, it } from "vitest";
import {
	accountToBookEntity,
	assetToBookAsset,
	type Account,
	type AccountingBook,
	type AccountingSnapshot,
	type Asset,
	bookToSnapshot,
	calculateConsolidatedWealthMetrics,
	calculateEntityWealthMetrics,
	expenseToBookExpense,
	type Expense,
	generateMonthlyLedger,
	incomeToBookIncome,
	type Income,
	liabilityToBookLiability,
	type Liability,
	snapshotToBook,
	transferToBookTransfer,
	type Transfer,
} from "../src";

const personal: Account = {
	id: "acc_personal",
	name: "Prame Personal",
	type: "personal",
	currency: "THB",
	cashReserve: 0,
	paydayDayOfMonth: 28,
	targetSafetyBuffer: 50000,
	active: true,
	careerTitle: "Engineer",
	careerCompany: "Acme",
};

const business: Account = {
	id: "acc_biz",
	name: "Side Studio",
	type: "business",
	currency: "THB",
	cashReserve: 0,
	active: true,
};

const laptop: Asset = {
	id: "hw_laptop",
	entityId: "acc_personal",
	name: "MacBook",
	cost: 60000,
	lifespanMonths: 36,
	purchaseDate: "2026-03-15",
	salvageValue: 6000,
	category: "laptop",
};

const bankWallet: Asset = {
	id: "cash_bank",
	entityId: "acc_personal",
	name: "Bank",
	cost: 100000,
	lifespanMonths: 0,
	purchaseDate: "2026-01",
	category: "cash",
	isDefault: true,
	currency: "THB",
};

const ewallet: Asset = {
	id: "wallet_ewallet",
	entityId: "acc_personal",
	name: "E-Wallet",
	cost: 5000,
	lifespanMonths: 0,
	purchaseDate: "2026-01",
	category: "cash",
};

const bizCash: Asset = {
	id: "cash_biz",
	entityId: "acc_biz",
	name: "Studio Bank",
	cost: 50000,
	lifespanMonths: 0,
	purchaseDate: "2026-01",
	category: "cash",
	isDefault: true,
};

const salary: Income = {
	id: "rev_salary",
	entityId: "acc_personal",
	name: "Salary",
	amount: 75000,
	frequency: "monthly",
	source: "salary",
	active: true,
	startMonth: "2026-01",
};

const freelance: Income = {
	id: "rev_freelance",
	entityId: "acc_biz",
	name: "Client retainer",
	amount: 30000,
	frequency: "monthly",
	source: "stripe",
	active: true,
	startMonth: "2026-01",
	dayOfMonth: 15,
};

const netflix: Expense = {
	id: "sub_netflix",
	entityId: "acc_personal",
	name: "Netflix",
	amount: 419,
	cycle: "monthly",
	category: "subscription",
	nextRenewalDate: "2026-01-05",
	billingDay: 5,
	active: true,
	startMonth: "2026-01",
};

const passport: Expense = {
	id: "sub_passport",
	entityId: "acc_personal",
	name: "Passport",
	amount: 3000,
	cycle: "one_time",
	category: "travel",
	nextRenewalDate: "2026-11-08",
	active: true,
	startMonth: "2026-11",
};

const cardLunch: Expense = {
	id: "sub_lunch",
	entityId: "acc_personal",
	name: "Lunch on card",
	amount: 1500,
	cycle: "monthly",
	category: "food",
	nextRenewalDate: "2026-01-20",
	active: true,
	startMonth: "2026-01",
	paidFromLiabilityId: "liab_card",
};

const hosting: Expense = {
	id: "sub_hosting",
	entityId: "acc_biz",
	name: "Hosting",
	amount: 800,
	cycle: "monthly",
	category: "subscription",
	nextRenewalDate: "2026-01-10",
	active: true,
	startMonth: "2026-01",
};

const carLoan: Liability = {
	id: "liab_car",
	entityId: "acc_personal",
	name: "Car loan",
	amount: 7800,
	category: "car_loan",
	active: true,
	kind: "loan",
	startMonth: "2026-01",
	loan: {
		principal: 400000,
		annualRate: 0.065,
		termMonths: 60,
		originatedOn: "2026-01",
		financedAssetId: undefined,
	},
};

const card: Liability = {
	id: "liab_card",
	entityId: "acc_personal",
	name: "Credit card",
	amount: 0,
	category: "credit_card",
	active: true,
	kind: "revolving",
	startMonth: "2026-01",
	revolving: { creditLimit: 100000, balance: 5000, balanceAsOf: "2026-01", annualRate: 0.2 },
};

const transfers: Transfer[] = [
	{
		id: "tr_laptop",
		fromEntityId: "acc_personal",
		toEntityId: "acc_personal",
		amount: 60000,
		date: "2026-03-15",
		note: "Laptop",
		targetAssetId: "hw_laptop",
		frequency: "one_time",
		fromAssetId: "cash_bank",
	},
	{
		id: "tr_ewallet",
		fromEntityId: "acc_personal",
		toEntityId: "acc_personal",
		amount: 2000,
		date: "2026-01-01",
		note: "Top up",
		targetAssetId: "wallet_ewallet",
		frequency: "monthly",
		fromAssetId: "cash_bank",
	},
	{
		id: "tr_prepay",
		fromEntityId: "acc_personal",
		toEntityId: "acc_personal",
		amount: 20000,
		date: "2026-06-10",
		note: "Extra loan payment",
		frequency: "one_time",
		fromAssetId: "cash_bank",
		toLiabilityId: "liab_car",
	},
	{
		id: "tr_draw",
		fromEntityId: "acc_biz",
		toEntityId: "acc_personal",
		amount: 10000,
		date: "2026-02-01",
		note: "Owner draw",
		frequency: "monthly",
		fromAssetId: "cash_biz",
	},
	{
		id: "tr_card",
		fromEntityId: "acc_personal",
		toEntityId: "acc_personal",
		amount: 5000,
		date: "2026-10-03",
		note: "Card payoff",
		frequency: "one_time",
		fromAssetId: "cash_bank",
		toLiabilityId: "liab_card",
	},
];

/** Engine snapshot where every entity has a cash asset and no account.salary fallback. */
const legacy: AccountingSnapshot = {
	accounts: [personal, business],
	hardware: [laptop, bankWallet, ewallet, bizCash],
	revenues: [salary, freelance],
	subscriptions: [netflix, passport, cardLunch, hosting],
	liabilities: [carLoan, card],
	transfers,
};

describe("@excited-live/accounting - book adapter", () => {
	describe("reverse converters", () => {
		it("defaults entity active to true when absent", () => {
			const entity = accountToBookEntity({ ...business, active: undefined });
			expect(entity).toEqual({
				id: "acc_biz",
				name: "Side Studio",
				type: "business",
				currency: "THB",
				active: true,
			});
		});

		it("converts a cash wallet to a cash asset", () => {
			expect(assetToBookAsset(bankWallet)).toEqual({
				id: "cash_bank",
				entityId: "acc_personal",
				kind: "cash",
				name: "Bank",
				category: "cash",
				active: true,
				balance: 100000,
				balanceAsOf: "2026-01",
				currency: "THB",
				isDefault: true,
			});
		});

		it("converts a depreciating laptop to a fixed asset", () => {
			expect(assetToBookAsset(laptop)).toEqual({
				id: "hw_laptop",
				entityId: "acc_personal",
				kind: "fixed",
				name: "MacBook",
				category: "laptop",
				active: true,
				cost: 60000,
				acquiredOn: "2026-03-15",
				usefulLifeMonths: 36,
				salvageValue: 6000,
				depreciationMethod: "straight_line",
			});
		});

		it("keeps an explicit kind over the cash/fixed heuristic", () => {
			const investment: Asset = { ...laptop, id: "inv_fund", kind: "investment", category: "stock" };
			const book = assetToBookAsset(investment);
			expect(book.kind).toBe("investment");
		});

		it("converts a salary income with payday and career details", () => {
			expect(incomeToBookIncome(salary, personal)).toEqual({
				id: "rev_salary",
				entityId: "acc_personal",
				name: "Salary",
				kind: "employment",
				category: "salary",
				amount: 75000,
				cycle: "monthly",
				startMonth: "2026-01",
				active: true,
				dayOfMonth: 28,
				employment: { title: "Engineer", employer: "Acme" },
			});
		});

		it("keeps the 1st-of-month default for non-employment incomes", () => {
			const book = incomeToBookIncome(freelance, business);
			expect(book.kind).toBe("business");
			expect(book.category).toBe("stripe");
			expect(book.dayOfMonth).toBe(15);
			expect(book.employment).toBeUndefined();
		});

		it("converts a one-time expense to its charge month and day", () => {
			const book = expenseToBookExpense({
				...passport,
				startMonth: undefined,
			});
			expect(book.startMonth).toBe("2026-11");
			expect(book.dayOfMonth).toBe(8);
			expect(book.cycle).toBe("one_time");
		});

		it("converts a recurring expense with billingDay and card link", () => {
			expect(expenseToBookExpense(cardLunch)).toEqual({
				id: "sub_lunch",
				entityId: "acc_personal",
				name: "Lunch on card",
				amount: 1500,
				cycle: "monthly",
				category: "food",
				startMonth: "2026-01",
				active: true,
				dayOfMonth: 20,
				paidFromLiabilityId: "liab_card",
				details: { renewalDate: "2026-01-20" },
			});
			expect(expenseToBookExpense(netflix).dayOfMonth).toBe(5);
		});

		it("converts a revolving card and a loan with defaults", () => {
			const cardBook = liabilityToBookLiability(card);
			expect(cardBook.kind).toBe("revolving");
			expect(cardBook.cycle).toBe("monthly");
			expect(cardBook.revolving).toEqual(card.revolving);

			const loanBook = liabilityToBookLiability({ ...carLoan, kind: undefined, cycle: undefined });
			expect(loanBook.kind).toBe("other");
			expect(loanBook.cycle).toBe("monthly");
			expect(loanBook.loan).toEqual(carLoan.loan);
		});

		it("converts a transfer with an explicit target asset", () => {
			expect(transferToBookTransfer(transfers[0]!, legacy.hardware)).toEqual({
				id: "tr_laptop",
				amount: 60000,
				date: "2026-03-15",
				cycle: "one_time",
				note: "Laptop",
				fromAssetId: "cash_bank",
				toAssetId: "hw_laptop",
			});
		});

		it("routes a transfer without a target to the destination's default cash", () => {
			expect(transferToBookTransfer(transfers[3]!, legacy.hardware)).toMatchObject({
				fromAssetId: "cash_biz",
				toAssetId: "cash_bank",
				cycle: "monthly",
			});
		});

		it("returns null when no source can be found", () => {
			const orphan: Transfer = { ...transfers[3]!, fromEntityId: "nobody", fromAssetId: undefined };
			expect(transferToBookTransfer(orphan, legacy.hardware)).toBeNull();
		});

		it("returns null for a liability destination missing from the given liabilities", () => {
			expect(transferToBookTransfer(transfers[2]!, legacy.hardware, [])).toBeNull();
			expect(transferToBookTransfer(transfers[2]!, legacy.hardware, [carLoan])?.toLiabilityId).toBe("liab_car");
		});
	});

	describe("bookToSnapshot", () => {
		const book: AccountingBook = {
			entities: [{ id: "acc_biz", name: "Side Studio", type: "business", currency: "THB", active: true }],
			assets: [
				{
					id: "cash_biz",
					entityId: "acc_biz",
					kind: "cash",
					name: "Studio Bank",
					category: "bank",
					active: true,
					balance: 50000,
					balanceAsOf: "2026-01",
					currency: "THB",
					isDefault: true,
				},
				{
					id: "inv_fund",
					entityId: "acc_biz",
					kind: "investment",
					name: "Index fund",
					category: "stock",
					active: true,
					instrument: "etf",
					costBasis: 20000,
					marketValue: 22000,
					valuedAsOf: "2026-02",
					expectedAnnualReturn: 0.07,
					currency: "THB",
				},
			],
			incomes: [],
			expenses: [
				{
					id: "sub_rent",
					entityId: "acc_biz",
					name: "Office",
					amount: 9000,
					cycle: "monthly",
					category: "rent",
					startMonth: "2027-02",
					dayOfMonth: 31,
					active: true,
				},
			],
			liabilities: [],
			transfers: [
				{
					id: "tr_dropped",
					amount: 1,
					date: "2026-01-01",
					cycle: "one_time",
					note: "",
					fromAssetId: "missing",
					toAssetId: "cash_biz",
				},
			],
		};

		it("builds the engine snapshot with investment details and clamped renewal dates", () => {
			const snapshot = bookToSnapshot(book);
			expect(snapshot.isDefault).toBe(false);
			expect(snapshot.updatedAt).toBeUndefined();
			expect(snapshot.wallets).toBeUndefined();
			expect(snapshot.accounts[0]).toEqual({
				id: "acc_biz",
				name: "Side Studio",
				type: "business",
				currency: "THB",
				cashReserve: 0,
				active: true,
			});
			expect(snapshot.hardware[1]).toEqual({
				id: "inv_fund",
				entityId: "acc_biz",
				kind: "investment",
				name: "Index fund",
				cost: 20000,
				lifespanMonths: 0,
				purchaseDate: "2026-02",
				category: "stock",
				investment: {
					instrument: "etf",
					costBasis: 20000,
					marketValue: 22000,
					valuedAsOf: "2026-02",
					expectedAnnualReturn: 0.07,
				},
				currency: "THB",
			});
			expect(snapshot.subscriptions[0]?.nextRenewalDate).toBe("2027-02-28");
			expect(snapshot.subscriptions[0]?.billingDay).toBe(31);
			expect(snapshot.transfers).toEqual([]);
		});

		it("takes career fields from the primary employment income", () => {
			const withJob: AccountingBook = {
				...book,
				entities: [{ ...book.entities[0]!, id: "acc_p", type: "personal" }],
				incomes: [
					{
						id: "later",
						entityId: "acc_p",
						kind: "employment",
						category: "salary",
						name: "Later job",
						amount: 1,
						cycle: "monthly",
						startMonth: "2027-01",
						active: true,
						dayOfMonth: 1,
					},
					{
						id: "first",
						entityId: "acc_p",
						kind: "employment",
						category: "salary",
						name: "First job",
						amount: 75000,
						cycle: "monthly",
						startMonth: "2026-01",
						active: true,
						dayOfMonth: 25,
						employment: { title: "Engineer", employer: "Acme" },
						imageUrl: "https://example.com/logo.png",
					},
				],
			};
			expect(bookToSnapshot(withJob).accounts[0]).toMatchObject({
				paydayDayOfMonth: 25,
				careerTitle: "Engineer",
				careerCompany: "Acme",
				careerImageUrl: "https://example.com/logo.png",
			});
		});
	});

	describe("round trip", () => {
		const months = ["2026-10", "2026-11", "2027-03"];

		it("keeps engine results identical through snapshotToBook and bookToSnapshot", () => {
			const rebuilt = bookToSnapshot(snapshotToBook(legacy));
			const accounts = legacy.accounts;

			for (const yearMonth of months) {
				for (const account of accounts) {
					const ledgerParams = {
						account,
						yearMonth,
						subscriptions: legacy.subscriptions,
						hardware: legacy.hardware,
						revenues: legacy.revenues,
						transfers: legacy.transfers,
						liabilities: legacy.liabilities,
					};
					const rebuiltAccount = rebuilt.accounts.find((a) => a.id === account.id)!;
					expect(generateMonthlyLedger({ ...ledgerParams, account: rebuiltAccount }).summary).toEqual(
						generateMonthlyLedger(ledgerParams).summary,
					);

					const wealthParams = {
						account,
						hardware: legacy.hardware,
						subscriptions: legacy.subscriptions,
						revenues: legacy.revenues,
						liabilities: legacy.liabilities ?? [],
						transfers: legacy.transfers,
						yearMonth,
					};
					expect(
						calculateEntityWealthMetrics({
							...wealthParams,
							account: rebuiltAccount,
							hardware: rebuilt.hardware,
							subscriptions: rebuilt.subscriptions,
							revenues: rebuilt.revenues,
							liabilities: rebuilt.liabilities ?? [],
							transfers: rebuilt.transfers,
						}),
					).toEqual(calculateEntityWealthMetrics(wealthParams));
				}

				expect(
					calculateConsolidatedWealthMetrics({
						accounts: rebuilt.accounts,
						hardware: rebuilt.hardware,
						subscriptions: rebuilt.subscriptions,
						revenues: rebuilt.revenues,
						liabilities: rebuilt.liabilities ?? [],
						transfers: rebuilt.transfers,
						yearMonth,
					}),
				).toEqual(
					calculateConsolidatedWealthMetrics({
						accounts: legacy.accounts,
						hardware: legacy.hardware,
						subscriptions: legacy.subscriptions,
						revenues: legacy.revenues,
						liabilities: legacy.liabilities ?? [],
						transfers: legacy.transfers,
						yearMonth,
					}),
				);
			}
		});

		it("synthesizes a default cash asset and a salary income for a legacy entity", () => {
			const bare: AccountingSnapshot = {
				accounts: [{ ...personal, cashReserve: 12000, salary: 50000 }],
				hardware: [],
				revenues: [],
				subscriptions: [],
				transfers: [],
			};
			const book = snapshotToBook(bare);
			expect(book.assets).toEqual([
				expect.objectContaining({
					id: "cash_acc_personal",
					kind: "cash",
					balance: 12000,
					balanceAsOf: "2026-10",
					isDefault: true,
					active: true,
				}),
			]);
			expect(book.incomes).toEqual([
				expect.objectContaining({
					id: "salary_acc_personal",
					kind: "employment",
					category: "salary",
					name: "Career Base Salary",
					amount: 50000,
					cycle: "monthly",
					startMonth: "2026-10",
					dayOfMonth: 28,
					active: true,
				}),
			]);
		});
	});
});

describe("display fields the UI reads", () => {
	it("keeps a yearly expense's renewal date and mirrors the primary salary onto the account", () => {
		const domain: Expense = {
			id: "sub_domain",
			entityId: "acc_personal",
			name: "Domain",
			amount: 600,
			cycle: "yearly",
			category: "subscription",
			nextRenewalDate: "2027-03-02",
			active: true,
			startMonth: "2026-01",
		};
		const salary: Income = {
			id: "rev_salary",
			entityId: "acc_personal",
			name: "Salary",
			amount: 85000,
			frequency: "monthly",
			source: "salary",
			active: true,
			startMonth: "2026-01",
		};
		const account: Account = { id: "acc_personal", name: "Personal", type: "personal", cashReserve: 0, currency: "THB" };
		const book = snapshotToBook({
			accounts: [account],
			subscriptions: [domain],
			hardware: [],
			revenues: [salary],
			transfers: [],
		});
		const back = bookToSnapshot(book);
		expect(back.subscriptions[0]?.nextRenewalDate).toBe("2027-03-02");
		expect(back.accounts[0]?.salary).toBe(85000);
	});
});
