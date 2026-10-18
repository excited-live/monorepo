@mobile @wealth_management @assets @depreciation @lifespan_end @P2 @e2e
Feature: Fully Depreciated Hardware Asset
  As a founder holding old hardware
  I want assets past their useful lifespan to register 0 book value
  So that expired equipment does not artificially inflate net worth

  Scenario: Fully depreciated asset past its useful lifespan retains zero book value
    Given a hardware asset "Vintage iPad" with cost 30000 THB purchased in "2022-01" with lifespan 36 months
    When the user inspects the asset in "2026-10" (57 months elapsed)
    Then the Remaining Book Value should be "฿0"
    And the remaining months should be "0 mos remaining"
    And the monthly depreciation rate should be "฿0/mo"
