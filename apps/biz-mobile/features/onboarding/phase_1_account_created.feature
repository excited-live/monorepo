@mobile @onboarding @phase_1 @smoke @e2e
Feature: Onboarding Phase 1 - Default Account Creation
  As a new user landing on biz-mobile
  I want my foundational Personal account provisioned automatically
  So that I see the onboarding checklist with step 1 already completed

  Scenario: User lands on empty state with Step 1 completed
    Given the user opens the application for the first time without cached data
    When the initial bootstrap completes
    Then the Onboarding Checklist should show:
      | Step                                      | Status        |
      | Create Account                            | Done already  |
      | Update Detail for Personal default Wallet | Up next       |
    And the Homepage should display:
      | Element               | Initial State |
      | Consolidated Treasury | ฿0            |
      | Personal Card         | "My Living"   |
    When the user navigates to the "capital" tab
    Then the Management hero card should show "PERSONAL WEALTH" with ฿0 balance
