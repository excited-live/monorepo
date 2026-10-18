@mobile @onboarding @navigation @smoke @e2e
Feature: Onboarding stepper navigation - one step at a time, go back and skip
  As a user working through onboarding
  I want a horizontal stepper that shows one step at a time
  So that I can reopen completed steps, skip optional ones, and never get trapped in a one-way flow

  Background:
    Given the user is on the "home" tab with Step 1 completed

  Scenario: Done is gated on at least one entry
    Then the "Add Business" step should offer a disabled "Done" button
    And the "Add Business" step should offer "Skip for now"

  Scenario: Future steps cannot be opened early
    When the user taps the "Expense" step on the checklist
    Then the "Expense" step panel should not be visible

  Scenario: Going back to a completed step reopens its panel
    Given the user has completed Steps 1 through 2
    When the user taps the "Business" step on the checklist
    Then the "Add Business" step should be marked "Done already" on the checklist

  Scenario: Editing an entry from a completed step
    Given the user has completed Steps 1 through 3
    When the user taps the "Assets" step on the checklist
    And the user taps the entry "MacBook Pro M3 Max" in the "Wallet & Assets" step on the checklist
    Then the "Add Asset" drawer should open with "MacBook Pro M3 Max" prefilled
