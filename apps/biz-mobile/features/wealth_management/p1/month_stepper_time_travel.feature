@mobile @wealth_management @time_travel @month_stepper @P1 @e2e
Feature: MonthStepper Time Travel Navigation
  As a founder inspecting past and future ledgers
  I want to step backward and forward month-by-month
  So that all transactions, depreciation, and balances update for that specific month

  Scenario: Step forward and backward in time using the MonthStepper
    Given the user is on the "capital" tab with selected month "2026-10"
    When the user taps the next month button "›"
    Then the selected month should become "2026-11"
    And the stepper label should display "November 2026"
    When the user taps the previous month button "‹"
    Then the selected month should revert to "October 2026"
