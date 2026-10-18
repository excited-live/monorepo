# Accounting data model

How excited.live stores and computes accounting data. This replaced the
per-user JSON snapshot (`accounting_snapshots`, `GET/PUT /accounting/snapshot`).

- **Storage**: one table per resource in D1/SQLite (`apps/api/migrations/0001_init.sql`).
- **Wire + record types**: `packages/accounting/src/book/types.ts` (`BookEntity`, `BookAsset`, …, `AccountingBook`).
- **Engine**: `packages/accounting` still calculates on the `AccountingSnapshot`
  aggregate. `bookToSnapshot(book)` builds it from the records. New optional
  fields on the engine types (marked `book:` in `src/types.ts`) carry the new
  model; when they are absent the engine behaves exactly as before, and the
  golden tests (`tests/golden.test.ts`) must keep passing unchanged.

## 1. Concepts

| Concept | Table(s) | Notes |
|---|---|---|
| Entity | `accounting_entities` | Personal (exactly one per user) or a business. |
| Asset | `accounting_assets` + one detail table per kind | `cash`, `fixed` (PP&E, depreciated), `investment` (market value). |
| Income | `accounting_incomes` (+ `accounting_employment_incomes`) | kinds `employment`, `business`, `investment`, `other`. |
| Expense | `accounting_expenses` | One table. Differs by category and links. |
| Liability | `accounting_liabilities` + `accounting_loan_liabilities` / `accounting_revolving_liabilities` | kinds `loan`, `revolving`, `other`. |
| Transfer | `accounting_transfers` | Asset → asset, or asset → liability. |

Accounting rules the model follows:

- Buying a fixed asset is not an expense: cash becomes the asset (a transfer
  cash → fixed asset). Its depreciation is the expense.
- A loan payment is interest (expense) plus principal (reduces the debt).
- Buying an investment is a transfer cash → investment asset.
- An expense charged to a credit card moves no cash; it raises the card's
  balance. The card payment is the cash outflow.
- Every link is stored once, on the dependent side.

## 2. Schema

Conventions:

- `id TEXT PRIMARY KEY`: client-generated UUID (`crypto.randomUUID()`),
  globally unique. The server generates one when the client omits it.
- `user_id TEXT NOT NULL` on every base table. **No foreign key to `"user"`**:
  while auth is unconfigured requests run as the `"default"` user, which has no
  `"user"` row. Every query filters by `user_id`; the service verifies that every
  linked id belongs to the same user.
- `version INTEGER NOT NULL DEFAULT 1`, `created_at TEXT NOT NULL`,
  `updated_at TEXT NOT NULL` (ISO) on every base table.
- Booleans are `INTEGER` 0/1. `details` is a JSON text column.
- Enum-like columns are `TEXT` validated by the API (Zod), never SQL `CHECK`.
  The only `CHECK`s pin a detail table's `kind` and guard invariants.
- Detail tables hold `(id, kind)` → base row, cascade on delete, no `user_id`.
- Statements are separated by `;` and comments never contain `;`
  (`src/db/splitStatements`).

```sql
CREATE TABLE IF NOT EXISTS accounting_entities (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	name TEXT NOT NULL,
	type TEXT NOT NULL,
	currency TEXT NOT NULL DEFAULT 'THB',
	target_safety_buffer REAL,
	active INTEGER NOT NULL DEFAULT 1,
	notes TEXT,
	image_url TEXT,
	version INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS accounting_entities_one_personal_uidx ON accounting_entities (user_id) WHERE type = 'personal';

CREATE INDEX IF NOT EXISTS accounting_entities_user_idx ON accounting_entities (user_id);

CREATE TABLE IF NOT EXISTS accounting_assets (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	entity_id TEXT NOT NULL REFERENCES accounting_entities (id) ON DELETE CASCADE,
	kind TEXT NOT NULL,
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	active INTEGER NOT NULL DEFAULT 1,
	notes TEXT,
	image_url TEXT,
	details TEXT,
	version INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	UNIQUE (id, kind)
);

CREATE TABLE IF NOT EXISTS accounting_cash_assets (
	asset_id TEXT PRIMARY KEY,
	kind TEXT NOT NULL DEFAULT 'cash' CHECK (kind = 'cash'),
	balance REAL NOT NULL DEFAULT 0,
	balance_as_of TEXT NOT NULL,
	currency TEXT NOT NULL DEFAULT 'THB',
	is_default INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY (asset_id, kind) REFERENCES accounting_assets (id, kind) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_fixed_assets (
	asset_id TEXT PRIMARY KEY,
	kind TEXT NOT NULL DEFAULT 'fixed' CHECK (kind = 'fixed'),
	cost REAL NOT NULL,
	acquired_on TEXT NOT NULL,
	depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
	useful_life_months INTEGER,
	salvage_value REAL NOT NULL DEFAULT 0,
	CHECK (depreciation_method = 'none' OR useful_life_months > 0),
	FOREIGN KEY (asset_id, kind) REFERENCES accounting_assets (id, kind) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_investment_assets (
	asset_id TEXT PRIMARY KEY,
	kind TEXT NOT NULL DEFAULT 'investment' CHECK (kind = 'investment'),
	instrument TEXT NOT NULL,
	symbol TEXT,
	units REAL,
	cost_basis REAL NOT NULL DEFAULT 0,
	market_value REAL NOT NULL DEFAULT 0,
	valued_as_of TEXT NOT NULL,
	expected_annual_return REAL,
	currency TEXT NOT NULL DEFAULT 'THB',
	FOREIGN KEY (asset_id, kind) REFERENCES accounting_assets (id, kind) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_liabilities (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	entity_id TEXT NOT NULL REFERENCES accounting_entities (id) ON DELETE CASCADE,
	kind TEXT NOT NULL,
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	amount REAL NOT NULL,
	cycle TEXT NOT NULL DEFAULT 'monthly',
	day_of_month INTEGER,
	start_month TEXT NOT NULL,
	end_month TEXT,
	paid_from_asset_id TEXT REFERENCES accounting_cash_assets (asset_id) ON DELETE SET NULL,
	active INTEGER NOT NULL DEFAULT 1,
	notes TEXT,
	image_url TEXT,
	details TEXT,
	version INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	UNIQUE (id, kind)
);

CREATE TABLE IF NOT EXISTS accounting_loan_liabilities (
	liability_id TEXT PRIMARY KEY,
	kind TEXT NOT NULL DEFAULT 'loan' CHECK (kind = 'loan'),
	principal REAL NOT NULL,
	annual_rate REAL NOT NULL DEFAULT 0,
	term_months INTEGER NOT NULL CHECK (term_months > 0),
	originated_on TEXT NOT NULL,
	financed_asset_id TEXT REFERENCES accounting_assets (id) ON DELETE SET NULL,
	proceeds_asset_id TEXT REFERENCES accounting_cash_assets (asset_id) ON DELETE SET NULL,
	FOREIGN KEY (liability_id, kind) REFERENCES accounting_liabilities (id, kind) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_revolving_liabilities (
	liability_id TEXT PRIMARY KEY,
	kind TEXT NOT NULL DEFAULT 'revolving' CHECK (kind = 'revolving'),
	credit_limit REAL,
	balance REAL NOT NULL DEFAULT 0,
	balance_as_of TEXT NOT NULL,
	annual_rate REAL,
	FOREIGN KEY (liability_id, kind) REFERENCES accounting_liabilities (id, kind) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_incomes (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	entity_id TEXT NOT NULL REFERENCES accounting_entities (id) ON DELETE CASCADE,
	kind TEXT NOT NULL,
	category TEXT NOT NULL,
	name TEXT NOT NULL,
	amount REAL NOT NULL,
	cycle TEXT NOT NULL DEFAULT 'monthly',
	day_of_month INTEGER,
	start_month TEXT NOT NULL,
	end_month TEXT,
	tax_category TEXT,
	deposit_asset_id TEXT REFERENCES accounting_cash_assets (asset_id) ON DELETE SET NULL,
	source_asset_id TEXT REFERENCES accounting_assets (id) ON DELETE CASCADE,
	active INTEGER NOT NULL DEFAULT 1,
	notes TEXT,
	image_url TEXT,
	details TEXT,
	version INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	CHECK (kind = 'investment' OR source_asset_id IS NULL),
	UNIQUE (id, kind)
);

CREATE TABLE IF NOT EXISTS accounting_employment_incomes (
	income_id TEXT PRIMARY KEY,
	kind TEXT NOT NULL DEFAULT 'employment' CHECK (kind = 'employment'),
	employer TEXT,
	title TEXT,
	FOREIGN KEY (income_id, kind) REFERENCES accounting_incomes (id, kind) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_expenses (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	entity_id TEXT NOT NULL REFERENCES accounting_entities (id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	amount REAL NOT NULL,
	cycle TEXT NOT NULL DEFAULT 'monthly',
	day_of_month INTEGER,
	start_month TEXT NOT NULL,
	end_month TEXT,
	paid_from_asset_id TEXT REFERENCES accounting_cash_assets (asset_id) ON DELETE SET NULL,
	paid_from_liability_id TEXT REFERENCES accounting_revolving_liabilities (liability_id) ON DELETE SET NULL,
	asset_id TEXT REFERENCES accounting_assets (id) ON DELETE SET NULL,
	income_id TEXT REFERENCES accounting_incomes (id) ON DELETE SET NULL,
	active INTEGER NOT NULL DEFAULT 1,
	notes TEXT,
	image_url TEXT,
	details TEXT,
	version INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	CHECK (paid_from_asset_id IS NULL OR paid_from_liability_id IS NULL)
);

CREATE TABLE IF NOT EXISTS accounting_transfers (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	amount REAL NOT NULL,
	date TEXT NOT NULL,
	cycle TEXT NOT NULL DEFAULT 'one_time',
	note TEXT NOT NULL DEFAULT '',
	from_asset_id TEXT NOT NULL REFERENCES accounting_assets (id) ON DELETE CASCADE,
	to_asset_id TEXT REFERENCES accounting_assets (id) ON DELETE CASCADE,
	to_liability_id TEXT REFERENCES accounting_liabilities (id) ON DELETE CASCADE,
	version INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	CHECK ((to_asset_id IS NULL) <> (to_liability_id IS NULL))
);
```

Indexes (one `CREATE INDEX IF NOT EXISTS` each):

- `(user_id, entity_id)` on `accounting_assets`, `accounting_incomes`,
  `accounting_expenses`, `accounting_liabilities`; `(user_id)` on `accounting_transfers`.
- Every link column (SQLite scans the child table on a parent delete without one):
  `accounting_incomes(deposit_asset_id)`, `accounting_incomes(source_asset_id)`,
  `accounting_expenses(paid_from_asset_id)`, `accounting_expenses(paid_from_liability_id)`,
  `accounting_expenses(asset_id)`, `accounting_expenses(income_id)`,
  `accounting_liabilities(paid_from_asset_id)`, `accounting_loan_liabilities(financed_asset_id)`,
  `accounting_loan_liabilities(proceeds_asset_id)`, `accounting_transfers(from_asset_id)`,
  `accounting_transfers(to_asset_id)`, `accounting_transfers(to_liability_id)`.

Foreign keys must be enforced on both drivers: D1 enforces them by default; the
node:sqlite driver runs `PRAGMA foreign_keys = ON` right after opening the file.

Row ↔ record mapping: `snake_case` columns ↔ `camelCase` fields, `NULL` ↔
field absent, 0/1 ↔ boolean, `details` JSON ↔ object. Detail-table columns map
onto the record (cash/fixed/investment fields sit directly on the asset; loan
and revolving fields go under `liability.loan` / `liability.revolving`;
employment fields under `income.employment`).

## 3. Book → engine snapshot (`packages/accounting/src/book/adapter.ts`)

`bookToSnapshot(book: AccountingBook): AccountingSnapshot` is pure. Field by field:

**Entity → `Account`**: `id, name, type, currency, targetSafetyBuffer, active,
notes, imageUrl`; `cashReserve: 0`; `salary` absent. Career fields come from the
entity's *primary employment income* (kind `employment`, earliest `startMonth`,
ties keep book order): `careerTitle = employment.title`,
`careerCompany = employment.employer`, `careerImageUrl = imageUrl`,
`paydayDayOfMonth = dayOfMonth`. No employment income → those stay absent.

**Assets → `Asset` (`hardware`)**, all with `kind` set:

- cash: `cost = balance`, `lifespanMonths = 0`, `purchaseDate = balanceAsOf`,
  `category = "cash"`, `isDefault`, `currency`. (The book `category` such as
  `bank` is kept in nothing the engine reads; put it in `details` only if needed.
  The engine requires `category: "cash"`.)
- fixed: `cost`, `lifespanMonths = usefulLifeMonths ?? 0`, `purchaseDate = acquiredOn`,
  `salvageValue`, `category`, `depreciationMethod`.
- investment: `cost = costBasis`, `lifespanMonths = 0`, `purchaseDate = valuedAsOf`,
  `category`, `investment = { instrument, symbol, units, costBasis, marketValue,
  valuedAsOf, expectedAnnualReturn }`, `currency`.

**Incomes → `Income` (`revenues`)**: `frequency = cycle`, `startMonth`,
`endMonth`, `dayOfMonth`, `depositAssetId`, `sourceAssetId`, `kind`, `category`,
`taxCategory`, `employment`, `active`, `notes`, `imageUrl`.
`source`: kind `employment` → `"salary"`; otherwise `category` when it is one of
`stripe | bank_transfer | cash | freelance` → that; else `"other"`.

**Expenses → `Expense` (`subscriptions`)**: `cycle`, `category`, `startMonth`,
`endMonth`, `billingDay = dayOfMonth`, `nextRenewalDate = startMonth + "-" +
dd(dayOfMonth ?? 1)` (day clamped to the month length), the four link ids,
`active`, `notes`, `imageUrl`.

**Liabilities → `Liability`**: `amount`, `cycle`, `dayOfMonth`, `startMonth`,
`endMonth`, `category`, `kind`, `paidFromAssetId`, `loan`, `revolving`,
`active`, `notes`, `imageUrl`.

**Transfers → `Transfer`**: `fromEntityId` = entity of `fromAssetId`;
`toEntityId` = entity of `toAssetId`, or of `toLiabilityId`'s liability;
`targetAssetId = toAssetId`; `fromAssetId`; `toLiabilityId`;
`frequency = cycle`; `amount`, `date`, `note`. A transfer whose endpoints cannot
be resolved is dropped.

`updatedAt` = absent, `isDefault` = false, `wallets` = absent.

The reverse direction, per record, for legacy data and the mobile UI (which
still edits engine-shaped records): `accountToBookEntity`, `assetToBookAsset`,
`incomeToBookIncome`, `expenseToBookExpense`, `liabilityToBookLiability`,
`transferToBookTransfer(transfer, hardware)`, plus
`snapshotToBook(snapshot)`. Rules:

- Asset: `kind` if present; else `isCashAsset(asset)` → cash
  (`balance = cost`, `balanceAsOf = purchaseDate` when it starts with
  `YYYY-MM`, else `DEFAULT_BASELINE_MONTH`, `category: "cash"`,
  `isDefault: Boolean(isDefault)`); else fixed (`usefulLifeMonths = lifespanMonths`,
  `acquiredOn = purchaseDate`, `salvageValue = salvageValue ?? 0`,
  `depreciationMethod = depreciationMethod ?? "straight_line"`).
- Income: `kind` if present, else `source === "salary"` → `employment`;
  `freelance | stripe | bank_transfer | cash` → `business`; else `other`.
  `category` if present, else `source`. `cycle = frequency`.
  `startMonth ?? DEFAULT_BASELINE_MONTH`. Employment incomes get
  `employment: { title, employer }` from the income, else from the owning
  account's `careerTitle` / `careerCompany`, and
  `dayOfMonth = income.dayOfMonth ?? account.paydayDayOfMonth`, when an account
  is given.
- Expense: one-time → `startMonth = nextRenewalDate.slice(0, 7)`,
  `dayOfMonth = day of nextRenewalDate`; recurring →
  `startMonth ?? DEFAULT_BASELINE_MONTH`,
  `dayOfMonth = billingDay ?? day of nextRenewalDate (when it has one)`.
- Liability: `kind ?? "other"`, `cycle ?? "monthly"`, `startMonth ?? DEFAULT_BASELINE_MONTH`.
- Transfer: `fromAssetId ??` the from-entity's default cash asset (`isDefault`,
  else the first cash asset); `toLiabilityId` if set, else
  `toAssetId = targetAssetId ??` the to-entity's default cash asset;
  `cycle = frequency ?? "one_time"`.
- `snapshotToBook` first runs `normalizeSnapshot`, then synthesizes a default
  cash asset (`id: "cash_<entityId>"`, `balance = cashReserve`,
  `balanceAsOf = DEFAULT_BASELINE_MONTH`) for every entity that has none, and an
  employment income for `account.salary` when the entity has no incomes.

Round trip guarantee (tested): for a snapshot where every entity has a cash
asset and no legacy `account.salary` fallback, the engine's numbers on
`bookToSnapshot(snapshotToBook(s))` equal those on `s`.

## 4. Engine semantics

Everything here is additive: with the new optional fields absent, results are
identical to the old engine (golden tests unchanged).

### 4.1 Classification

- `isCashAsset(a)`: `a.kind` present → `a.kind === "cash"`; else the old rule.
- `calculateAssetDepreciation(a)`: `kind === "investment"` or
  `depreciationMethod === "none"` → no depreciation (`monthlyRate 0`,
  `remainingBookValue = cost`, `isFullyDepreciated false`, `completionDate "N/A"`).
- Income monthly amount: `yearly` → `round2(amount / 12)` (as before);
  `monthly`/`one_time` → `amount` (as before); `weekly`/`quarterly`/
  `semi-annual` → `calculateMonthlyEquivalent(amount, frequency)`.
- Income day: `dayOfMonth ?? (source === "salary" ? payday || 28 : 1)`.
- Liability payment (`liabilityPaymentInMonth(l, ym, transfers?)`):
  - not due (`!active`, outside the window, or `cycle === "one_time"` and
    `ym !== startMonth`) → 0;
  - `l.loan` → the loan schedule's payment for `ym` (4.4); 
  - otherwise `cycle` absent or `monthly` → `amount`; else
    `calculateMonthlyEquivalent(amount, cycle)`.
  Every place that used `l.amount` for a month uses this. Day: `dayOfMonth ?? 15`.

### 4.2 Transfers

Cash effect of a transfer on entity `E` in a month it occurs:

- **Cash in** = `amount` when `toEntityId === E`, `toLiabilityId` is absent and the
  target is cash: `targetAssetId` absent, or not found in `hardware`, or a cash asset.
  A target that is a fixed or investment asset brings no cash in.
- **Cash out** = `amount` when `fromEntityId === E` and the source is cash:
  `fromAssetId` absent, or not found, or a cash asset. Selling an investment
  (`fromAssetId` = investment asset) takes no cash out.

Used by `calculateWalletBalance`, `calculateEntityMonthlyCashFlow` and
`buildMonthlyActions` (an action exists only for a non-zero side). Per wallet:
cash in lands on `targetAssetId` when it is one of the entity's wallets, else the
default wallet (unchanged); cash out leaves `fromAssetId` when it is one of the
entity's wallets, else the default wallet.

### 4.3 Links → per-wallet cash

Each operating flow has a linked wallet id: income `depositAssetId`, expense
`paidFromAssetId`, liability `paidFromAssetId`, loan proceeds
`loan.proceedsAssetId`. It *resolves* to that id when it is one of the entity's
cash wallets, else to the default wallet. A wallet's operating delta for a month
is `calculateEntityMonthlyOperatingCash` over only the flows resolving to it.
The legacy `account.salary` fallback is decided on the full lists and goes to
the default wallet. Fast path: when no flow of the entity has a link, the
default wallet gets the entity's whole net (exactly the old code).

Expenses with `paidFromLiabilityId` naming an existing liability are **not cash**:
they are excluded from operating cash, cash flow and ledger cash actions, and
instead raise that liability's revolving balance (4.5).

The mid-month baseline correction in `calculateWalletBalance` attributes each
action to its resolved wallet (`LedgerAction.cashAssetId`) instead of "the
default wallet".

### 4.4 Loans (`src/liabilities.ts`)

- `calculateLoanPayment(principal, annualRate, termMonths)`: `r = annualRate / 12`;
  `r === 0` → `round2(principal / termMonths)`; else
  `round2(principal * r / (1 - (1 + r) ** -termMonths))`. The API uses it to
  default `amount` when a loan is created without one.
- `buildLoanSchedule({ liability, transfers, throughYearMonth })`: months from
  `originatedOn.slice(0, 7)` through `throughYearMonth`. Balance starts at
  `principal`. Per month `m`:
  - `opening` = balance; `interest = opening > 0 ? round2(opening * annualRate / 12) : 0`;
  - `due = round2(opening + interest)`;
  - `scheduled` = the liability's base payment in `m` (4.1 rules without the loan cap);
  - `payment = round2(min(scheduled, due))`;
  - `extra = round2(min(Σ transfers with toLiabilityId === id in m, due - payment))`;
  - `principal = round2(payment + extra - interest)` (negative = the balance grows);
  - `closing = round2(opening + interest - payment - extra)`.
  Returns `{ yearMonth, opening, interest, payment, extra, principal, closing }[]`.
- Loan payment in month `ym`: before `originatedOn` → the base payment (no cap);
  else that month's `payment` (0 once paid off, so payments stop).
- Loan proceeds: when `loan.proceedsAssetId` is set, `principal` is a cash
  inflow of the liability's entity in the origination month (date
  `originatedOn` when it has a day, else the 1st), attributed to that wallet.
  Category `loan_proceeds`.
- Loan balance at the end of `ym`: before origination → 0; else the schedule's
  `closing` for `ym`.

### 4.5 Revolving credit

`calculateRevolvingBalance({ liability, subscriptions, transfers, yearMonth })`:
starts at `revolving.balance` at the start of `balanceAsOf`; for each month
`balanceAsOf..yearMonth`:
`interest = round2(max(0, opening) * (annualRate ?? 0) / 12)`,
`charges` = Σ monthly-equivalent amounts of expenses with
`paidFromLiabilityId === id` charged that month (same rule as cash expenses),
`payments` = the base payment that month + Σ transfers to it,
`closing = round2(opening + interest + charges - payments)`. Before
`balanceAsOf` → `balance`. The card's cash payment is the scheduled amount (no
cap); a negative balance is a credit.

### 4.6 Investments (`src/investments.ts`)

`calculateInvestmentValue({ asset, transfers, yearMonth })` for
`asset.investment`: `mr = (1 + (expectedAnnualReturn ?? 0)) ** (1 / 12) - 1`.
Value starts at `marketValue` at the start of `valuedAsOf`; for each month
`valuedAsOf..yearMonth`:
`value = round2(value * (1 + mr) + contributions - withdrawals)` where
contributions are transfers with `targetAssetId === id` and withdrawals are
transfers with `fromAssetId === id` occurring that month. Before
`valuedAsOf` → `marketValue`. Also returns
`costBasis = round2(costBasis + Σcontributions - Σwithdrawals)` over the same
months and `unrealizedGain = round2(value - costBasis)`.

Investment income (dividends, rent, interest) is ordinary income with
`sourceAssetId`; it is cash in like any other income.

### 4.7 Balance sheet

`calculateEntityBalanceSheet({ account, hardware, subscriptions, revenues,
liabilities, transfers, yearMonth })` (end of `yearMonth`):

- `cash` = `calculateCurrentTreasury` (end-of-month treasury);
- `fixedAssets` = Σ `remainingBookValue` of the entity's non-cash, non-investment assets;
- `investments` = Σ `calculateInvestmentValue` of its investment assets;
- `totalAssets = round2(cash + fixedAssets + investments)`;
- `debt` = Σ loan and revolving balances of its liabilities (other kinds have no
  known balance and are skipped);
- `netWorth = round2(totalAssets - debt)`.

`calculateConsolidatedBalanceSheet` sums those over all accounts.
`calculateEntityWealthMetrics.gearAssetsValue` excludes investment assets.

### 4.8 Cash-flow feed (`src/cashflows.ts`)

`buildCashFlows({ account, yearMonth, subscriptions, hardware, revenues,
transfers, liabilities, includeDepreciation? })` → `CashFlowItem[]` sorted by
date, plus `summarizeCashFlows(items) → { moneyIn, moneyOut, spending }`.

```ts
type CashFlowType = "income" | "expense" | "debt_payment" | "asset_purchase" | "investment" | "transfer" | "loan_proceeds" | "depreciation";
interface CashFlowItem {
	id: string;              // unique per item in the month
	sourceType: "income" | "expense" | "liability" | "transfer" | "asset" | "account";
	sourceId: string;        // the record to open when tapped
	flowType: CashFlowType;
	direction: "in" | "out";
	date: string;            // YYYY-MM-DD
	name: string;
	amount: number;
	isCash: boolean;         // false: card charges and depreciation
	spendingAmount: number;  // the part that counts as spending
	cashAssetId?: string;
	chargedToLiabilityId?: string;
	interest?: number;
	principal?: number;
}
```

- income → `flowType income`, in, spending 0.
- expense paid in cash → `expense`, out, spending = amount.
- expense charged to a card → `expense`, out, `isCash false`,
  `chargedToLiabilityId`, spending = amount (excluded from `moneyOut`).
- liability payment → `debt_payment`, out; loans add `interest`/`principal` from
  the schedule and spending = interest; revolving → spending 0 (the charges
  were the spending); other kinds → spending = amount.
- transfer out → `debt_payment` when `toLiabilityId`, `asset_purchase` when the
  target is a fixed asset, `investment` when an investment asset, else `transfer`;
  spending 0.
- transfer in → `investment` when the source is an investment asset, else `transfer`.
- loan proceeds → `loan_proceeds`, in.
- depreciation (only with `includeDepreciation`) → `depreciation`, out,
  `isCash false`, spending = amount.

`moneyIn` / `moneyOut` sum the cash items per direction; `spending` sums
`spendingAmount` over all items.

`LedgerAction` gains optional `flowType`, `sourceType`, `cashAssetId`, and
`split?: { interest; principal }` so the feed is a projection of
`buildMonthlyActions` (the ledger's cash totals and the feed's cash totals
always agree).

## 5. API (`/api/v1/accounting`)

Every endpoint is per user (`getUserId`). Records go over the wire as
`Stored<Book…>` (record + `version`, `createdAt`, `updatedAt`).

| Method | Path | Notes |
|---|---|---|
| GET | `/entities` | Bootstraps the personal entity on first call. |
| GET | `/entities/:id` | |
| POST | `/entities` | Business only. Also creates its default cash asset (`"<name> Main Wallet"`, balance 0, `balanceAsOf = asOf ?? UTC month`). |
| PATCH | `/entities/:id` | Partial; `type` immutable. |
| DELETE | `/entities/:id` | Personal cannot be deleted. Cascades. |
| GET | `/assets?entityId&kind` | |
| GET | `/assets/:id` | |
| POST | `/assets` | Body discriminated by `kind`. Fixed/investment accept `paidFrom: { assetId? , entityId?, date? }` (creates the purchase transfer: fixed → `amount = cost`, `date = acquiredOn`; investment → `amount = paidFrom.amount ?? marketValue`). Fixed accepts `financing` (loan fields → creates a loan liability with `financedAssetId`). Cash with `isDefault` clears the other defaults; an entity's first cash asset is always the default. |
| PATCH | `/assets/:id` | `kind` immutable. |
| DELETE | `/assets/:id` | Deleting the default cash asset promotes the oldest remaining cash asset. |
| GET/POST | `/incomes`, GET/PATCH/DELETE `/incomes/:id` | `employment` only for kind employment; `sourceAssetId` only for kind investment. |
| POST | `/incomes/career` | `{ entityId, salary, paydayDayOfMonth?, title?, company?, imageUrl?, startMonth?, endMonth? }`: updates the primary employment income (earliest `startMonth`) or creates one when `salary > 0`. Returns `{ income: Stored<BookIncome> \| null }`. |
| GET/POST | `/expenses`, GET/PATCH/DELETE `/expenses/:id` | |
| GET/POST | `/liabilities`, GET/PATCH/DELETE `/liabilities/:id` | Loan without `amount` → `calculateLoanPayment`. |
| GET | `/liabilities/:id/schedule?through=YYYY-MM` | Loan schedule or revolving monthly balances. |
| GET/POST | `/transfers`, GET/PATCH/DELETE `/transfers/:id` | Source: `fromAssetId` or `fromEntityId` (its default cash asset). Destination: `toAssetId`, `toEntityId` (default cash asset) or `toLiabilityId`, exactly one. |
| GET | `/summary?month&asOf` | Per entity `EntityWealthMetrics` + balance sheet; consolidated metrics + balance sheet. |
| GET | `/ledger/:yearMonth?entityId` | Unchanged response shape. |
| GET | `/cash-flows?month&entityId&direction&includeDepreciation` | `{ items, totals }`. |
| GET | `/projection?entityId&month&pastMonths&futureMonths&asOf` | `{ points: [{ offset, yearMonth, balance }], totalIncome, totalExpense, liabilityMonthly, projectedNet }`. |

Write rules (service, all return 400 `VALIDATION_ERROR` unless noted):

- POST accepts an optional `id` (UUID); duplicates → 409.
- Linked ids must exist for the same user; `depositAssetId`, `paidFromAssetId`,
  `proceedsAssetId` must be cash assets of the same entity;
  `paidFromLiabilityId` must be a revolving liability; `fromAssetId ≠ toAssetId`.
- `startMonth` defaults: one-time expense without it → its month; otherwise
  the client's `asOf` month, else the UTC month.
- PATCH body may carry `version`; a mismatch → 409 `VERSION_CONFLICT`.
- Multi-row writes (entity + wallet, asset + transfer/loan, default switching)
  run in one `SqlDriver.batch` so they commit together.
- Missing record → 404.

## 6. Mobile (`apps/biz-mobile`)

The UI keeps consuming `useFinances()` (engine-shaped lists). The service layer
fetches each resource list, builds the engine snapshot with `bookToSnapshot`,
and maps UI edits back with the per-record converters in section 3. New ids are
`crypto.randomUUID()`. Optimistic updates patch the affected list cache; the
computed queries (`ledger`, `summary`, `cash-flows`) are invalidated after every
write.

## 7. Not built yet

- UI for investments, loan details, revolving cards and the money-out feed.
- Screens rendering server-computed metrics (`/summary`) instead of the shared engine.
- Cost-per-asset / cost-per-job reports from the expense links.
- Thai tax categories feeding `packages/tax`; money in integer satang.
