@mobile @onboarding @phase_1 @smoke @e2e
Feature: Onboarding Phase 1 - Default Account Creation
  As a new user landing on biz-mobile
  I want my foundational Personal account provisioned automatically
  So that I see the onboarding stepper with step 1 already completed

  Scenario: User lands on empty state with Step 1 completed and the stepper at Add Business
    Given the user opens the application for the first time without cached data
    When the initial bootstrap completes
    Then the user should land on the "home" tab and see the Onboarding Checklist:
      | Step            | Status       |
      | Create Account  | Done already |
      | Add Business    | Up next      |
      | Wallet & Assets | Pending      |
      | Add Liability   | Pending      |
      | Add Income      | Pending      |
      | Add Expense     | Pending      |
    And the "Add Business" step should offer "Done"
    And the "Add Business" step should offer "Skip for now"
    And the "Add Income" step should not offer "Skip for now"
    And the "Add Expense" step should not offer "Skip for now"
    And the Homepage should display:
      | Element               | Initial State |
      | Consolidated Treasury | ฿0            |
      | Personal Card         | "My Living"   |
    When the user navigates to the "capital" tab
    Then the Management hero card should show "PERSONAL WEALTH" with ฿0 balance
