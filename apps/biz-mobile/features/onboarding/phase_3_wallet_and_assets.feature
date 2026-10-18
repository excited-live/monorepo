@mobile @onboarding @phase_3 @smoke @e2e
Feature: Onboarding Phase 3 - Wallet & Assets (skippable, merged)
  As a user
  I want one step that covers my real bank wallet and my hardware assets
  So that liquid cash and gear are recorded together, personal first and businesses below

  Background:
    Given the user has completed Steps 1 through 2

  Scenario: Record the personal wallet and a hardware asset, then mark the step done
    When the user taps "Add" in the "Wallet & Assets" step on the checklist
    Then the "Add Asset" drawer should open under the entity "My Living"
    When the user registers "Kasikorn Main Reserve" as a cash asset with 250000 THB
    And the user registers "MacBook Pro M3 Max" costing 72000 THB with 36 months lifespan
    And the user navigates back to the "home" tab
    Then the "Wallet & Assets" step should still be marked "Up next" on the checklist
    When the user marks the "Wallet & Assets" step done on the checklist
    Then the "Add Liability" step should be marked "Up next" on the checklist
    And the Homepage consolidated treasury should update from "฿0" to "฿250,000"
    And the Personal card on Homepage should display "Kasikorn Main Reserve" with "฿250,000"
    When the user switches to the "capital" tab
    Then the Management hero balance should update to "฿322,000" (250k liquid + 72k gear)
    And the asset progress bar should display 78% Liquid and 22% Gear
    And the Assets subtab should list "MacBook Pro M3 Max" with ฿72,000 book value

  Scenario: Business entries render below personal inside the step panel
    Given the user has a business "Studio Neon Co., Ltd."
    When the user taps the "Assets" step on the checklist
    Then the "Wallet & Assets" step should list the entity sections "My Living" first, then "Studio Neon Co., Ltd."
