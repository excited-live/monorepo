@mobile @wealth_management @capital_injection @recurring @P1 @e2e
Feature: Recurring Monthly Capital Subsidy
  As a founder funding an early-stage venture
  I want to schedule a recurring monthly capital grant
  So that future projection months reflect consistent operational subsidies

  Scenario: Schedule recurring monthly capital subsidy from Personal to Business
    Given the user opens the "CapitalDrawer"
    When the user selects "Monthly Recurring" for Transfer Schedule
    And the user enters transfer amount "25000" THB
    And the user confirms the injection
    Then a recurring transfer of 25000 THB/mo should be registered
    And for all future projection months, Personal outflow increases and Business inflow increases by 25000 THB
