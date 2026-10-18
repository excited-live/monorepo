@mobile @onboarding @phase_2 @smoke @e2e
Feature: Onboarding Phase 2 - Update Detail for Personal Default Wallet
  As a new user
  I want to set up my real personal bank wallet and initial cash balance
  So that the Homepage treasury and Management hero show my liquid wealth

  Background:
    Given the user is on the "home" tab with Step 1 completed

  Scenario: Update Personal default wallet and verify Homepage and Management updates
    When the user taps "Update Detail for Personal default Wallet" on the checklist
    Then the "Edit Asset / Wallet" modal should slide up
    When the user enters:
      | Account / Reserve Name  | Kasikorn Main Reserve |
      | Starting Balance (THB)  | 250000                |
      | Default Operating       | checked               |
    And the user saves the wallet
    Then Step 2 "Update Detail for Personal default Wallet" should be marked completed
    And the Homepage consolidated treasury should update from "฿0" to "฿250,000"
    When the user switches to the "capital" tab
    Then the Management hero balance should update to "฿250,000" with 100% Liquid Cash
