@mobile @onboarding @phase_6 @smoke @e2e
Feature: Onboarding Phase 6 - Add Liability or Skip
  As a user
  I want to register debt or select "I don't have liabilities"
  So that debt service is factored in or the step is cleanly completed

  Background:
    Given the user has completed Steps 1 through 5

  Scenario: Register debt liability or skip and verify Management debt split
    When the user taps "Add Liability (or option to say I dont have)" on the checklist
    Then the liability options modal should display "Register Liability" and "I don't have any liabilities or debts"
    When the user selects "Register Liability" and enters "Auto Loan" with monthly payment 9000 THB
    And the user submits the liability form
    Then Step 6 "Add Liability (or option to say I dont have)" should be marked completed
    When the user switches to the "capital" tab
    Then the Management hero should display debt service "-฿9,000/mo"
    And Net Cashflow should update to "+฿119,000/mo" (150k - 22k - 9k)
