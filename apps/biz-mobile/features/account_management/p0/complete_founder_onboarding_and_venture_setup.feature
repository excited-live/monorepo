@mobile @account_management @onboarding @P0 @smoke @e2e
Feature: Complete 6-Step Onboarding Journey with Homepage and Management State Changes
  As a new founder landing on biz-mobile
  I want a clear step-by-step onboarding stepper covering business, wallet & assets, liabilities, income and expenses
  So that I see my Homepage and Management screens evolve phase-by-phase, with only Create Account completing automatically

  Scenario: User progresses through all 6 onboarding steps verifying Homepage and Management transformations
    # =========================================================================
    # STEP 1: CREATE ACCOUNT (DONE ALREADY)
    # =========================================================================
    Given the user opens the application for the first time without cached data
    When the initial bootstrap completes
    Then the user should land on the "home" tab and see the Onboarding Checklist:
      | Step            | Status       |
      | Create Account  | Done already |
      | Add Business    | Up next      |
      | Wallet & Assets | Pending      |
      | Add Liability   | Pending      |
      | Add Income      | Pending      |
      | Add Expense     | Pending      |
    And the Homepage should display:
      | Home Element          | State / Content         |
      | Consolidated Treasury | ฿0                      |
      | Personal Account Card | "My Living" (฿0 cash)   |
      | Business Count        | 0 businesses registered |

    # =========================================================================
    # STEP 2: ADD BUSINESS
    # =========================================================================
    When the user taps "Add" in the "Add Business" step on the checklist
    Then the "Add Business" drawer should open without any Starting Treasury field
    When the user fills in the business form:
      | Business Name | Studio Neon Co., Ltd. |
    And the user submits the business form
    And the user marks the "Add Business" step done on the checklist
    Then the "Add Business" step should be marked "Done already" on the checklist
    And the Homepage Entities section should display 2 accounts: "My Living" and "Studio Neon Co., Ltd."

    # =========================================================================
    # STEP 3: WALLET & ASSETS (MERGED, SKIPPABLE)
    # =========================================================================
    When the user taps "Add" in the "Wallet & Assets" step on the checklist
    Then the "Add Asset" drawer should open under the entity "My Living"
    When the user registers "Kasikorn Main Reserve" as a cash asset with 250000 THB
    And the user registers "MacBook Pro M3 Max" costing 72000 THB with 36 months lifespan
    And the user navigates back to the "home" tab
    And the user marks the "Wallet & Assets" step done on the checklist
    Then the "Wallet & Assets" step should be marked "Done already" on the checklist
    And the Homepage consolidated treasury should update from "฿0" to "฿250,000"
    And the Personal card on Homepage should display "Kasikorn Main Reserve" with "฿250,000"
    When the user switches to the "capital" tab
    Then the Management hero balance should update to "฿322,000" (250k liquid + 72k gear)

    # =========================================================================
    # STEP 4: ADD LIABILITY (SKIPPABLE)
    # =========================================================================
    When the user navigates to the "home" tab
    And the user taps "Add" in the "Add Liability" step on the checklist
    Then the "Add Liability" drawer should open
    When the user enters liability "Auto Loan" with monthly payment 9000 THB
    And the user saves the liability
    And the user marks the "Add Liability" step done on the checklist
    Then the "Add Liability" step should be marked "Done already" on the checklist
    When the user switches to the "capital" tab
    Then the Management hero should display debt service "-฿9,000/mo"

    # =========================================================================
    # STEP 5: ADD INCOME (NOT SKIPPABLE, MANUAL DONE)
    # =========================================================================
    When the user navigates to the "home" tab
    And the user taps "Add" in the "Add Income" step on the checklist
    Then the "Add Income" drawer should open under the entity "My Living"
    When the user enters income "Agoda Salary" with amount "150000" THB monthly
    And the user saves the income
    Then the "Add Income" step should still be marked "Up next" on the checklist
    And the "Add Income" step should not offer "Skip for now"
    When the user marks the "Add Income" step done on the checklist
    Then the "Add Income" step should be marked "Done already" on the checklist
    When the user switches to the "capital" tab
    Then the Management hero monthly income should show "+฿150,000/mo"

    # =========================================================================
    # STEP 6: ADD EXPENSE (NOT SKIPPABLE, MANUAL DONE)
    # =========================================================================
    When the user navigates to the "home" tab
    And the user taps "Add" in the "Add Expense" step on the checklist
    Then the "Add Outflow / Expense" drawer should open for "My Living"
    When the user enters expense "Condo Rent" under "Housing & Rent" with amount "22000" THB monthly
    And the user saves the expense
    And the user marks the "Add Expense" step done on the checklist
    Then the "Add Expense" step should be marked "Done already" on the checklist
    And the Homepage should show recurring monthly burn "-฿22,000/mo"
    When the user switches to the "capital" tab
    Then the Management hero should display net cashflow "+฿119,000/mo" (150k - 22k - 9k)
    And the Expense subtab should list "Condo Rent" with "-฿22,000"
    When the user navigates to the "home" tab
    Then the Onboarding Complete card should be visible on the Homepage
    When the user taps the "Wallet & Assets" step on the checklist
    Then the "Add Asset" drawer should open with "Kasikorn Main Reserve" prefilled
