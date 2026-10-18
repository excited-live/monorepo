@mobile @wealth_management @liability @debt @P1 @smoke @e2e
Feature: Debt and Liability Management
  As a borrower
  I want to register mortgage or debt payments
  So that debt service is deducted from monthly cashflow and rendered on the hero card

  Scenario: Register loan liability, inspect debt split bar, and payoff liability
    Given the user is on the "capital" tab for "FromSukong Media"
    When the user registers an "Equipment Loan" named "Camera Rig Financing" with monthly payment 8500 THB
    Then Total Monthly Liabilities should equal "฿8,500/mo"
    And the hero card should render a debt split bar of 8500 THB/mo
    When the user deletes the liability
    Then Total Monthly Liabilities should become 0 THB and net cashflow should restore
