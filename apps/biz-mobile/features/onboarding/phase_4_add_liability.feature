@mobile @onboarding @phase_4 @smoke @e2e
Feature: Onboarding Phase 4 - Add Expense
  As a user
  I want to register baseline recurring living expenses
  So that Homepage and Management display monthly burn and net cashflow

  Background:
    Given the user has completed Steps 1 through 3

  Scenario: Add living expense and verify Homepage monthly burn and Management net cashflow
    When the user taps "Add Expense" on the checklist
    Then the "Add Outflow / Expense" drawer should open for "My Living"
    When the user enters expense "Condo Rent" under "Housing & Rent" with amount "22000" THB monthly
    And the user saves the expense
    Then Step 4 "Add Expense" should be marked completed
    And the Homepage should show recurring monthly burn "-฿22,000/mo"
    When the user switches to the "capital" tab
    Then the Management hero should display net cashflow "+฿128,000/mo" (150k - 22k)
    And the Expense subtab should list "Condo Rent" with "-฿22,000"
