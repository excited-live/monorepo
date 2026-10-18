# biz-mobile E2E Cucumber Test Suites (P0, P1, P2 & 7-Step Onboarding)

Comprehensive Behavioral-Driven Development (BDD) End-to-End test suite specifications for **`biz-mobile`** in Cucumber / Gherkin format, organized into **P0**, **P1**, and **P2** priority tiers with **1 Scenario per Feature File**.

---

## 🧭 The 7-Step Onboarding Flow & Screen Transformations

When a user opens the application for the first time, they are guided through a 7-step onboarding journey where **Homepage** and **Management** evolve at every step:

```
[1. Create Account] -> [2. Personal Wallet] -> [3. Career] -> [4. Expense] -> [5. Assets] -> [6. Liability] -> [7. First Business]
```

### Phase-by-Phase Transformations:

| Step # | User Action | Homepage State Change | Management State Change |
| :--- | :--- | :--- | :--- |
| **Step 1**<br>`[Done already]` | App cold launch bootstrap | Auto-provisions Personal account `"My Living"` with ฿0 reserve. Onboarding Checklist banner appears. | Hero eyebrow displays `PERSONAL WEALTH`, balance ฿0, status `SETUP NEEDED`. |
| **Step 2** | Update Detail for Personal Default Wallet | Consolidated Treasury updates from ฿0 $\rightarrow$ ฿250,000. Personal card displays wallet name. | Hero balance updates to ฿250,000 with 100% Liquid Cash allocation. |
| **Step 3** | Add Career (`Agoda`, ฿150k/mo, Payday 25th) | Personal card embeds Career subcard with live dynamic payday countdown badge. | Monthly Inflow updates to `+฿150,000/mo`. Runway status switches to `DEFAULT ALIVE`. |
| **Step 4** | Add Expense (Living Rent ฿22k/mo) | Homepage displays recurring monthly living burn `-฿22,000/mo`. | Hero displays Net Cashflow `+฿128,000/mo`. Expense subtab lists itemized costs. |
| **Step 5** | Add Assets (MacBook Pro ฿72k, 36 mos) | Home assets summary reflects active computing gear. | Hero total wealth updates to ฿322,000. Asset split bar shows 78% Liquid / 22% Gear. |
| **Step 6** | Add Liability (Auto Loan ฿9k/mo or Skip) | Homepage reflects active debt service obligations. | Hero displays Debt Split Bar (฿9,000/mo). Net Cashflow recalculates to `+฿119,000/mo`. |
| **Step 7** | Add First Business *(No Starting Treasury!)* | Entities list updates to 2 accounts (`My Living` & `Studio Neon`). Entity is switchable. | Switch to Business displays `BOOK VALUE` with ฿0 treasury. Default wallet auto-created. All 7 steps complete! |

> **⚠️ Architectural Invariant**: **Starting Treasury / Capital has been completely eliminated**. Businesses are registered with legal identity and logo only; capital is deployed via genuine bank cash assets, founder capital injections, or real client revenue.

---

## 📁 Tiered Directory Architecture

```
apps/biz-mobile/features/
├── onboarding/                          # 🚀 Dedicated Phase-by-Phase Onboarding Specs
│   ├── phase_1_account_created.feature          [@onboarding @phase_1]
│   ├── phase_2_update_personal_wallet.feature   [@onboarding @phase_2]
│   ├── phase_3_add_career.feature               [@onboarding @phase_3]
│   ├── phase_4_add_expense.feature              [@onboarding @phase_4]
│   ├── phase_5_add_assets.feature               [@onboarding @phase_5]
│   ├── phase_6_add_liability_or_skip.feature    [@onboarding @phase_6]
│   └── phase_7_add_first_business.feature       [@onboarding @phase_7]
│
├── account_management/
│   ├── p0/                              # 🔥 Master Core Journeys (Multi-step integration)
│   │   ├── complete_founder_onboarding_and_venture_setup.feature [@P0 @onboarding @smoke]
│   │   └── account_type_differences_and_permissions.feature      [@P0 @differences]
│   │
│   ├── p1/                              # ⚡ Key Functional Features
│   │   ├── edit_and_delete_business_cascade.feature              [@P1 @crud @cascade]
│   │   ├── payday_countdown_schedule.feature                     [@P1 @career]
│   │   └── hero_carousel_entity_switching.feature                [@P1 @navigation]
│   │
│   └── p2/                              # 🔍 Edge Cases, Validations & Quirks
│       ├── business_input_validation_guards.feature              [@P2 @validation]
│       ├── autofill_manual_touch_protection.feature              [@P2 @autofill]
│       ├── cancel_deletion_safety.feature                        [@P2 @safety]
│       └── bilingual_language_toggle.feature                     [@P2 @i18n]
│
├── wealth_management/
│   ├── p0/                              # 🔥 Master Core Journeys (Multi-step integration)
│   │   ├── complete_wealth_treasury_and_ledger_lifecycle.feature [@P0 @smoke]
│   │   └── wealth_deltas_variance_and_zero_sum_reconciliation.feature [@P0 @delta @differences]
│   │
│   ├── p1/                              # ⚡ Key Functional Features
│   │   ├── recurring_capital_subsidy.feature                     [@P1 @capital_injection]
│   │   ├── hardware_straight_line_depreciation.feature           [@P1 @assets @depreciation]
│   │   ├── liquid_cash_operating_wallet.feature                  [@P1 @assets @liquid_cash]
│   │   ├── debt_and_liability_management.feature                 [@P1 @liability]
│   │   └── month_stepper_time_travel.feature                     [@P1 @time_travel]
│   │
│   └── p2/                              # 🔍 Edge Cases, Validations & Quirks
│       ├── capital_injection_overdraft_guard.feature             [@P2 @validation]
│       ├── billing_cycle_conversion_rates.feature                [@P2 @expense]
│       ├── fully_depreciated_hardware_asset.feature              [@P2 @assets]
│       ├── deploy_capital_via_expense_drawer.feature             [@P2 @ux]
│       └── edit_delete_capital_transfer_refund.feature           [@P2 @crud]
│
├── steps/
│   ├── account_steps.ts                 # Playwright / Cucumber step definitions for account & onboarding
│   └── wealth_steps.ts                  # Playwright / Cucumber step definitions for wealth & calculations
├── cucumber.js                          # Configured profiles (p0, p1, p2, onboarding, differences)
└── README.md
```

---

## 🏃 Running Tests

```bash
# 1. Run all Onboarding phases
pnpm --filter @excited-live/biz-mobile exec cucumber-js --profile onboarding

# 2. Run P0 Master Core Journeys
pnpm --filter @excited-live/biz-mobile exec cucumber-js --profile p0

# 3. Run P1 Functional Features
pnpm --filter @excited-live/biz-mobile exec cucumber-js --profile p1

# 4. Run P2 Edge Cases & Validation Guards
pnpm --filter @excited-live/biz-mobile exec cucumber-js --profile p2

# 5. Run Difference & Delta Reconciliation
pnpm --filter @excited-live/biz-mobile exec cucumber-js --profile differences
```
