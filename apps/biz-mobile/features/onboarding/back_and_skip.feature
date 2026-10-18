@mobile @onboarding @navigation @smoke @e2e
Feature: Onboarding stepper navigation - go back and skip steps
  As a user working through onboarding
  I want to reopen completed steps and skip optional ones
  So that the stepper never traps me in a one-way flow

  Background:
    Given the user is on the "home" tab with Step 1 completed

  Scenario: Done is gated on at least one entry
    Then the "Add Business" step should offer a disabled "Done" button
    And the "Add Business" step should offer "Skip for now"

  Scenario: Future steps cannot be opened early
    When the user taps the "Add Expense" step on the checklist
    Then the "Add Expense" drawer should not open

  Scenario: Going back to a completed step reopens its editor
    Given the user has completed Steps 1 through 2
    When the user taps the "Add Business" step on the checklist
    Then the "Add Business" drawer should open with "Studio Neon" prefilled
    And the "Add Business" step should remain marked "Done already" on the checklist

  Scenario: Editing an entry from a completed step
    Given the user has completed Steps 1 through 3
    When the user taps the entry "MacBook Pro M3 Max" in the "Wallet & Assets" step on the checklist
    Then the "Add Asset" drawer should open with "MacBook Pro M3 Max" prefilled
