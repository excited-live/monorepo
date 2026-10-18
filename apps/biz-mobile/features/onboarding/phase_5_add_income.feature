@mobile @onboarding @phase_5 @smoke @e2e
Feature: Onboarding Phase 5 - Add Income (not skippable)
  As a user
  I want to record my salary and any additional income streams
  So that Homepage shows my career card and Management shows recurring inflow

  Background:
    Given the user has completed Steps 1 through 4

  Scenario: Add income and verify Homepage countdown and Management inflow
    When the user taps "Add" in the "Add Income" step on the checklist
    Then the "Add Income" drawer should open under the entity "My Living"
    When the user enters income "Agoda Salary" with amount "150000" THB monthly
    And the user saves the income
    Then the "Add Income" step should still be marked "Up next" on the checklist
    And the "Add Income" step should not offer "Skip for now"
    When the user marks the "Add Income" step done on the checklist
    Then the "Add Income" step should be marked "Done already" on the checklist
    And the Homepage Personal card should display the career card with live payday countdown
    When the user switches to the "capital" tab
    Then the Management hero monthly income should show "+฿150,000/mo"
    And the runway status pill should update to "DEFAULT ALIVE"

  Scenario: Multiple income streams are listed inside the step
    When the user records a second income "Brand Retainer" with amount "20000" THB monthly
    Then the "Add Income" step should list 2 entries
