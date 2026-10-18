@mobile @onboarding @phase_2 @smoke @e2e
Feature: Onboarding Phase 2 - Add Business (skippable)
  As a founder
  I want to register my first business right after account creation
  So that every later step can record entries for the business below the personal entity

  Background:
    Given the user is on the "home" tab with Step 1 completed

  Scenario: Add first business and verify Homepage entity card and Management book value
    When the user taps "Add" in the "Add Business" step on the checklist
    Then the "Add Business" drawer should open without any Starting Treasury field
    When the user fills in the business form:
      | Business Name | Studio Neon Co., Ltd. |
    And the user submits the business form
    Then the "Add Business" step should still be marked "Up next" on the checklist
    And the "Add Business" step should offer "Done"
    When the user marks the "Add Business" step done on the checklist
    Then the "Add Business" step should be marked "Done already" on the checklist
    And the Homepage Entities section should display 2 accounts: "My Living" and "Studio Neon Co., Ltd."
    When the user taps "Studio Neon Co., Ltd." to switch to Management
    Then the Management hero eyebrow should display "BOOK VALUE" with balance "฿0"
    And a default operating wallet "Studio Neon Co., Ltd. Main Wallet" should be auto-created with ฿0

  Scenario: Skip the Add Business step and reopen it later
    When the user skips the "Add Business" step on the checklist
    Then the "Add Business" step should be marked "Skipped" on the checklist
    And the "Wallet & Assets" step should be marked "Up next" on the checklist
    When the user taps "Set up now" in the "Add Business" step on the checklist
    Then the "Add Business" drawer should open
    And the "Add Business" step should be marked "Up next" on the checklist
