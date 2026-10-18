@mobile @wealth_management @capital_injection @validation @overdraft_guard @P2 @e2e
Feature: Capital Injection Overdraft Protection Guard
  As the wealth safety engine
  I want to prevent transferring more than available personal cash
  So that personal reserves cannot become negative

  Scenario: Prevent capital injection exceeding available Personal cash reserve
    Given the user opens the "CapitalDrawer"
    And the Personal reserve has available cash "฿250,000"
    When the user enters "300000" into "Transfer Amount (THB)"
    Then the "Confirm Injection" button should remain disabled
