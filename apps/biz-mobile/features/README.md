# biz-mobile E2E Cucumber Test Suites (P0, P1, P2 & 7-Step Onboarding)

Comprehensive Behavioral-Driven Development (BDD) End-to-End test suite specifications for **`biz-mobile`** in Cucumber / Gherkin format, organized into **P0**, **P1**, and **P2** priority tiers with **1 Scenario per Feature File**.

---

## 🧭 The 7-Step Onboarding Flow & Screen Transformations

When a user opens the application for the first time, they are guided through a 6-step onboarding stepper where **Homepage** and **Management** evolve at every step:

```
[1. Create Account] -> [2. Add Business] -> [3. Wallet & Assets] -> [4. Add Liability] -> [5. Add Income] -> [6. Add Expense]
```

**Stepper UX.** The checklist renders a horizontal Astryx stepper bar (compact labels, scrollable) plus exactly **one step panel at a time** for the viewed step. Tapping a completed or skipped step in the bar reopens its panel (go back); future steps are disabled. Once every step is done or skipped the whole section disappears from the Homepage.

**Completion rules.** Only **Create Account** completes automatically. Every other step is marked done by the user via a **Done** button that stays disabled until the step holds at least one entry. **Add Business**, **Wallet & Assets** and **Add Liability** are skippable ("Skip for now" → "Skipped", reversible via "Set up now"); **Add Income** and **Add Expense** are not. Tapping an entry inside a panel opens that entry for editing. Steps record data per entity: the personal entity first and each business below it.

### Phase-by-Phase Transformations:

| Step # | User Action | Homepage State Change | Management State Change |
| :--- | :--- | :--- | :--- |
| **Step 1**<br>`[Auto]` | App cold launch bootstrap | Auto-provisions Personal account `"My Living"` with ฿0 cash. Onboarding stepper appears with Step 1 done. | Hero eyebrow displays `PERSONAL WEALTH`, balance ฿0, status `SETUP NEEDED`. |
| **Step 2**<br>`[skippable]` | Add Business (`Studio Neon Co., Ltd.`, manual Done) | Entities list updates to 2 accounts (`My Living` & `Studio Neon`). Entity is switchable. | Switch to Business displays `BOOK VALUE` with ฿0 treasury. Default wallet auto-created. |
| **Step 3**<br>`[skippable, merged]` | Wallet & Assets (Kasikorn Reserve ฿250k + MacBook Pro ฿72k, manual Done) | Consolidated Treasury updates from ฿0 to ฿250,000; personal card shows the wallet name; gear listed under personal and below it per business. | Hero total wealth updates to ฿322,000. Asset split bar shows 78% Liquid / 22% Gear. |
| **Step 4**<br>`[skippable]` | Add Liability (Auto Loan ฿9k/mo, manual Done) | Homepage reflects active debt service obligations. | Hero displays Debt Split Bar (฿9,000/mo). |
| **Step 5**<br>`[required]` | Add Income (`Agoda Salary` ฿150k/mo, manual Done; multiple streams supported) | Personal card embeds Career subcard with live dynamic payday countdown badge. | Monthly Inflow updates to `+฿150,000/mo`. Runway status switches to `DEFAULT ALIVE`. |
| **Step 6**<br>`[required]` | Add Expense (Living Rent ฿22k/mo, manual Done; multiple entries across entities) | Homepage displays recurring monthly living burn `-฿22,000/mo`. | Hero displays Net Cashflow `+฿119,000/mo`. Expense subtab lists itemized costs. All 6 steps complete! |

> **⚠️ Architectural Invariant**: **Starting Treasury / Capital has been completely eliminated**. Businesses are registered with legal identity and logo only; capital is deployed via genuine bank cash assets, founder capital injections, or real client revenue.

---

## 📁 Tiered Directory Architecture

```
apps/biz-mobile/features/
├── onboarding/                          # 🚀 Dedicated Phase-by-Phase Onboarding Specs
│   ├── phase_1_account_created.feature          [@onboarding @phase_1]
│   ├── phase_2_add_business.feature   [@onboarding @phase_2]
│   ├── phase_3_wallet_and_assets.feature               [@onboarding @phase_3]
│   ├── phase_4_add_liability.feature              [@onboarding @phase_4]
│   ├── phase_5_add_income.feature               [@onboarding @phase_5]
│   ├── phase_6_add_expense.feature              [@onboarding @phase_6]
│   └── back_and_skip.feature                    [@onboarding @navigation]
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
