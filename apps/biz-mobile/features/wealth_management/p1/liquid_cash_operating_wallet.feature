@mobile @wealth_management @assets @liquid_cash @P1 @smoke @e2e
Feature: Liquid Cash Operating Wallet Asset
  As a business owner
  I want bank accounts tracked at 100% face value without depreciation
  So that liquid operating accounts count toward treasury and absorb net cashflow

  Scenario: Track liquid non-depreciating bank reserve as default operating wallet
    Given the user is on the "capital" tab for "FromSukong Media"
    When the user adds a Cash Asset "SCB Biz Payroll" with balance 150000 THB marked as "Default Operating Wallet"
    Then "SCB Biz Payroll" should appear in "Liquid Reserves" with "DEFAULT" badge
    And the balance should be held at 100% value with zero depreciation
