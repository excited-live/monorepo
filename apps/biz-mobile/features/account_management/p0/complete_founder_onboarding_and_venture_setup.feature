@mobile @account_management @onboarding @P0 @smoke @e2e
Feature: Complete 7-Step Onboarding Journey with Homepage and Management State Changes
  As a new founder landing on biz-mobile
  I want a clear step-by-step onboarding checklist walking me through setting up my wallet, career, expenses, assets, liabilities, and first business
  So that I see my Homepage and Management screens evolve phase-by-phase into a complete financial operating system without outdated starting treasury concepts

  Scenario: User progresses through all 7 onboarding phases verifying Homepage and Management transformations
    # =========================================================================
    # STEP 1: CREATE ACCOUNT (DONE ALREADY)
    # =========================================================================
    Given the user opens the application for the first time without cached data
    When the initial bootstrap completes
    Then the user should land on the "home" tab and see the Onboarding Checklist:
      | Step                                         | Status        |
      | Create Account                               | Done already  |
      | Update Detail for Personal default Wallet    | Up next       |
      | Add career                                   | Pending       |
      | Add Expense                                  | Pending       |
      | Add Assets                                   | Pending       |
      | Add Liability (or option to say I dont have) | Pending       |
      | Add First Business                           | Pending       |
    And the Homepage should display:
      | Home Element          | State / Content              |
      | Consolidated Treasury | ฿0                           |
      | Personal Account Card | "My Living" (฿0 cash)        |
      | Business Count        | 0 businesses registered      |
    When the user navigates to the "capital" tab
    Then the Management page should display:
      | Management Element    | State / Content              |
      | Hero Eyebrow          | PERSONAL WEALTH              |
      | Balance               | ฿0                           |
      | Runway Status         | SETUP NEEDED                 |
      | Operating Wallet      | "My Living Main Wallet" (฿0) |

    # =========================================================================
    # STEP 2: UPDATE DETAIL FOR PERSONAL DEFAULT WALLET
    # =========================================================================
    When the user navigates to the "home" tab
    And the user taps "Update Detail for Personal default Wallet"
    Then the "Edit Asset / Wallet" modal should slide up for "My Living Main Wallet"
    When the user updates the wallet details:
      | Field                  | Value                         |
      | Account / Reserve Name | Kasikorn Main Reserve         |
      | Starting Balance (THB) | 250000                        |
      | Default Operating      | checked                       |
    And the user saves the wallet
    Then the step "Update Detail for Personal default Wallet" should be marked completed
    # Verify Homepage & Management changes:
    And the Homepage consolidated treasury should update from "฿0" to "฿250,000"
    And the Personal card on Homepage should display "Kasikorn Main Reserve" with "฿250,000"
    When the user switches to the "capital" tab
    Then the Management hero balance should update to "฿250,000" (100% Liquid Cash)

    # =========================================================================
    # STEP 3: ADD CAREER
    # =========================================================================
    When the user navigates to the "home" tab
    And the user taps "Add career" on the checklist
    Then the "CareerDrawer" should slide up
    When the user types "Agoda" into "Company / Employer"
    And the user selects "Agoda" from the catalog autofill suggestions
    And the user enters "Senior Software Architect" into "Job Title"
    And the user enters "150000" into "Monthly Salary (THB)"
    And the user sets payday to the "25"th day of the month
    And the user taps "Save Career Income"
    Then the step "Add career" should be marked completed
    # Verify Homepage & Management changes:
    And the Homepage Personal card should display the career card:
      | Role     | Senior Software Architect |
      | Company  | Agoda                     |
      | Salary   | +฿150,000/mo              |
    And the live payday countdown badge should show days remaining until the 25th
    When the user switches to the "capital" tab
    Then the Management hero monthly income should show "+฿150,000/mo"
    And the runway status pill should update to "DEFAULT ALIVE"

    # =========================================================================
    # STEP 4: ADD EXPENSE
    # =========================================================================
    When the user navigates to the "home" tab
    And the user taps "Add Expense" on the checklist
    Then the "Add Outflow / Expense" drawer should open for "My Living"
    When the user adds recurring living expenses:
      | Vendor / Name | Category      | Amount (THB) | Billing Cycle |
      | Condo Rent    | Housing & Rent| 22000        | Monthly       |
    And the user saves the expense
    Then the step "Add Expense" should be marked completed
    # Verify Homepage & Management changes:
    And the Homepage should display recurring monthly living burn "-฿22,000/mo"
    When the user switches to the "capital" tab
    Then the Management hero should display:
      | Metric          | Value         |
      | Monthly Inflow  | +฿150,000/mo  |
      | Monthly Outflow | -฿22,000/mo   |
      | Net Cashflow    | +฿128,000/mo  |
    And the Expense subtab should list "Condo Rent" with "-฿22,000"

    # =========================================================================
    # STEP 5: ADD ASSETS
    # =========================================================================
    When the user navigates to the "home" tab
    And the user taps "Add Assets" on the checklist
    Then the "Add Asset" drawer should open
    When the user registers physical hardware:
      | Field            | Value                    |
      | Asset Type       | Workstation / Computing  |
      | Asset Name       | MacBook Pro M3 Max       |
      | Cost (THB)       | 72000                    |
      | Lifespan (Months)| 36                       |
      | Purchase Month   | Current Month            |
    And the user saves the asset
    Then the step "Add Assets" should be marked completed
    # Verify Homepage & Management changes:
    When the user switches to the "capital" tab
    Then the Management hero balance should update to "฿322,000" (฿250k cash + ฿72k hardware)
    And the asset split progress bar should display:
      | Segment | Percentage |
      | Liquid  | 78%        |
      | Gear    | 22%        |
    And the Assets subtab should list "MacBook Pro M3 Max" with book value ฿72,000

    # =========================================================================
    # STEP 6: ADD LIABILITY (OR OPTION TO SAY I DONT HAVE)
    # =========================================================================
    When the user navigates to the "home" tab
    And the user taps "Add Liability (or option to say I dont have)" on the checklist
    Then the Liability onboarding modal should open with options:
      | Option                                | Action              |
      | Register Liability                    | Open liability form |
      | I don't have any liabilities or debts | Skip liability step |
    When the user chooses "Register Liability"
    And the user fills in the liability form:
      | Field                 | Value                        |
      | Liability Name        | Auto Loan Installment        |
      | Category              | Auto / Vehicle Loan          |
      | Monthly Payment (THB) | 9000                         |
    And the user submits the liability form
    Then the step "Add Liability (or option to say I dont have)" should be marked completed
    # Verify Homepage & Management changes:
    When the user switches to the "capital" tab
    Then the Management hero should display debt service "-฿9,000/mo"
    And the debt split progress bar should indicate liability commitments
    And the Net Cashflow should recalculate to "+฿119,000/mo" (150k - 22k - 9k)

    # =========================================================================
    # STEP 7: ADD FIRST BUSINESS (NO STARTING TREASURY INPUT!)
    # =========================================================================
    When the user navigates to the "home" tab
    And the user taps "Add First Business" on the checklist
    Then the "Add Business" drawer should slide up
    And the form should contain only Business Name and Image URL without any Starting Treasury field
    When the user enters:
      | Business Name | Studio Neon Co., Ltd.        |
      | Image URL     | https://excited.live/biz.png |
    And the user submits the business form
    Then the step "Add First Business" should be marked completed
    # Verify Homepage & Management changes:
    And the Homepage Entities section should display 2 accounts:
      | Entity Name           | Type       | Initial Cash Reserve |
      | My Living             | Personal   | ฿250,000             |
      | Studio Neon Co., Ltd. | Business   | ฿0                   |
    When the user taps "Studio Neon Co., Ltd." to switch to Management
    Then the Management hero eyebrow should display "BOOK VALUE"
    And the starting business treasury should be "฿0" with status "NO INFLOW YET"
    And the default operating wallet should be auto-created as "Studio Neon Co., Ltd. Main Wallet" with ฿0
    # Final Completion
    When the user navigates back to the "home" tab
    Then all 7 onboarding checklist steps should show completed with green checkmarks
    And the Onboarding Checklist banner should display "Onboarding Complete! Your Financial OS is Ready."
