@mobile @onboarding @phase_5 @smoke @e2e
Feature: Onboarding Phase 5 - Add Assets
  As a user
  I want to log physical workstation gear and hardware
  So that Management reflects book value and asset allocation split

  Background:
    Given the user has completed Steps 1 through 4

  Scenario: Add hardware asset and verify Management asset allocation split
    When the user taps "Add Assets" on the checklist
    Then the "Add Asset" drawer should open
    When the user registers "MacBook Pro M3 Max" costing 72000 THB with 36 months lifespan
    And the user saves the asset
    Then Step 5 "Add Assets" should be marked completed
    When the user switches to the "capital" tab
    Then the Management hero balance should update to "฿322,000" (250k liquid + 72k gear)
    And the asset progress bar should display 78% Liquid and 22% Gear
    And the Assets subtab should list "MacBook Pro M3 Max" with ฿72,000 book value
