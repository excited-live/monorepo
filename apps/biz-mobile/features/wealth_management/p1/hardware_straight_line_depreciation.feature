@mobile @wealth_management @assets @depreciation @straight_line @P1 @smoke @e2e
Feature: Hardware Straight-Line Depreciation Engine
  As a founder purchasing hardware assets
  I want physical gear depreciated straight-line across its useful lifespan
  So that book value decays accurately each month

  Scenario: Register physical hardware asset and calculate straight-line depreciation
    Given the user is on the "capital" tab for "Alex Living"
    When the user adds a "Workstation / Computing" asset named "Studio Display" costing 54000 THB purchased in "2026-01" with 36 months lifespan
    Then for active month "2026-10" (10 months elapsed):
      | Elapsed Months          | 10 months                 |
      | Total Depreciated       | ฿15,000 (1500 * 10)       |
      | Remaining Book Value    | ฿39,000 (54000 - 15000)   |
