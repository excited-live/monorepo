@mobile @wealth_management @expense @cycle_conversion @P2 @e2e
Feature: Billing Cycle Conversion Rates
  As a subscriber paying on different schedules
  I want annual, quarterly, and weekly subscriptions converted to monthly equivalents
  So that monthly run rate accurately reflects average burn

  Scenario Outline: Billing cycle conversion to monthly equivalent burn
    Given the user adds an expense with amount "<raw_amount>" and cycle "<cycle>"
    Then the calculated monthly equivalent burn should be "<monthly_equivalent>"

    Examples:
      | raw_amount | cycle       | monthly_equivalent |
      | 1200       | monthly     | ฿1,200/mo          |
      | 12000      | yearly      | ฿1,000/mo          |
      | 3000       | quarterly   | ฿1,000/mo          |
      | 6000       | semi-annual | ฿1,000/mo          |
