@mobile @onboarding @phase_7 @smoke @e2e
Feature: Onboarding Phase 7 - Add First Business (No Starting Treasury)
  As a founder
  I want to register my first business without outdated starting treasury inputs
  So that legal entity structure is established cleanly with a ฿0 default operating wallet

  Background:
    Given the user has completed Steps 1 through 6

  Scenario: Add first business and verify Homepage entity card and Management book value
    When the user taps "Add First Business" on the checklist
    Then the "Add Business" drawer should open without any Starting Treasury field
    When the user enters Business Name "Studio Neon Co., Ltd." and submits
    Then Step 7 "Add First Business" should be marked completed
    And the Homepage Entities section should display 2 accounts: "My Living" and "Studio Neon Co., Ltd."
    When the user taps "Studio Neon Co., Ltd." to switch to Management
    Then the Management hero eyebrow should display "BOOK VALUE" with balance "฿0"
    And a default operating wallet "Studio Neon Co., Ltd. Main Wallet" should be auto-created with ฿0
