@mobile @onboarding @phase_6 @smoke @e2e
Feature: Onboarding Phase 6 - Add Expense (not skippable, last step)
  As a user
  I want to register baseline recurring living expenses
  So that Homepage and Management display monthly burn and net cashflow, and the stepper disappears

  Background:
    Given the user has completed Steps 1 through 5

  Scenario: Add living expense, finish onboarding and hide the stepper
    When the user taps "Add" in the "Add Expense" step on the checklist
    Then the "Add Outflow / Expense" drawer should open for "My Living"
    When the user enters expense "Condo Rent" under "Housing & Rent" with amount "22000" THB monthly
    And the user saves the expense
    Then the "Add Expense" step should still be marked "Up next" on the checklist
    And the "Add Expense" step should not offer "Skip for now"
    When the user marks the "Add Expense" step done on the checklist
    Then the onboarding stepper should no longer be visible on the Homepage
    And the Homepage should show recurring monthly burn "-฿22,000/mo"
    When the user switches to the "capital" tab
    Then the Management hero should display net cashflow "+฿119,000/mo" (150k - 22k - 9k)
    And the Expense subtab should list "Condo Rent" with "-฿22,000"

  Scenario: Multiple expenses are listed inside the step panel across entities
    When the user records a second expense "Cloud Server Hosting" for "Studio Neon Co., Ltd." with amount "1200" THB monthly
    And the user taps the "Expense" step on the checklist
    Then the "Add Expense" step should list 2 entries
