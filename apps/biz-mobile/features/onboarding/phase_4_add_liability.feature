@mobile @onboarding @phase_4 @smoke @e2e
Feature: Onboarding Phase 4 - Add Liability (skippable)
  As a user
  I want to register debt or skip the step entirely
  So that debt service is factored in or the step is cleanly skipped

  Background:
    Given the user has completed Steps 1 through 3

  Scenario: Register a liability and verify Management debt split
    When the user taps "Add" in the "Add Liability" step on the checklist
    Then the "Add Liability" drawer should open
    When the user enters liability "Auto Loan" with monthly payment 9000 THB
    And the user saves the liability
    Then the "Add Liability" step should still be marked "Up next" on the checklist
    When the user marks the "Add Liability" step done on the checklist
    Then the "Add Income" step should be marked "Up next" on the checklist
    When the user switches to the "capital" tab
    Then the Management hero should display debt service "-฿9,000/mo"

  Scenario: Skip the liability step without recording debt
    When the user skips the "Add Liability" step on the checklist
    Then the "Add Income" step should be marked "Up next" on the checklist
    When the user taps the "Liability" step on the checklist
    Then the "Add Liability" step should be marked "Skipped" on the checklist
