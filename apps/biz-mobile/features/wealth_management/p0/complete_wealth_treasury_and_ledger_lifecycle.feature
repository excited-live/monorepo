@mobile @wealth_management @P0 @smoke @e2e
Feature: Complete Wealth Treasury and Ledger Financial Lifecycle
  As a founder managing personal wealth and venture capital
  I want to monitor consolidated treasury, inject seed capital with live runway simulation, track monthly inflows/outflows, toggle NOW vs EOM, and flip to the 18-month ledger projection
  So that I have total control over my liquidity, cash burn, and financial runway in a single master workflow

  Scenario: Master financial workflow: Consolidated overview, capital injection, recurring flows, NOW/EOM toggle, and 3D ledger flip
    Given "Alex Living" has starting cash 250000 THB and salary 120000 THB
    And "FromSukong Media" has starting cash 480000 THB and retainer revenue 85000 THB

    # 1. Consolidated Treasury Overview
    When the user navigates to the "home" tab
    Then the "HomeTreasuryPanel" should display total treasury "฿730,000" (Personal 250k + Biz 480k)

    # 2. Cross-Entity Capital Injection with Live Runway Sim
    When the user switches to the "capital" tab for "FromSukong Media"
    And the user taps "+ Inject Capital"
    Then the "CapitalDrawer" should display available personal reserve "฿250,000"
    When the user enters transfer amount "50000" with note "Q4 Expansion Grant"
    Then the Live Runway Impact Simulation Box should show both entities remain "Default Alive"
    When the user taps "Confirm Injection"
    Then the Personal cash reserve should become ฿200,000
    And the Business cash reserve should become ฿530,000
    And Consolidated Total Treasury should remain invariant at ฿730,000

    # 3. Add SaaS Expense & Recalculate Burn
    When the user switches to the "Expense" subtab on "FromSukong Media"
    And the user adds an expense for "AWS Infrastructure" with amount 1200 THB monthly
    Then total monthly expenses should show "-฿1,200/mo"

    # 4. NOW vs EOM Mode Switching
    When the user toggles the hero mode from "NOW" to "EOM"
    Then the hero balance should display projected end-of-month cash taking net cashflow into account
    And the "EOM PROJECTION" badge should be visible

    # 5. 3D Flip Card: Cashflow Projection & Waterfall Chart
    When the user taps "Tap to flip" on the hero card
    Then the card should rotate 180 degrees to the "LedgerHeroCard" face
    And the 18-month cashflow timeline chart should be rendered
    And the monthly waterfall chart should show Income (85k) -> AWS Expense (1.2k) -> Net Cash Flow (+83.8k)
    When the user taps the card again
    Then the card flips back to the "CapitalHeroCard"
