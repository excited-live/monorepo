@mobile @account_management @validation @business_create @P2 @e2e
Feature: Business Creation Input Validation Guards
  As the account validation system
  I want to disable submission for empty or whitespace entity names
  So that invalid entity records cannot be created

  Scenario Outline: Business creation input validation guards
    Given the user opens the "Add Business" drawer
    When the user enters "<business_name>" into "Business Name"
    Then the "Create Business" button should be "<button_state>"

    Examples:
      | business_name        | button_state |
      |                      | disabled     |
      |    	
              | disabled     |
      | A                    | enabled      |
      | 555 Media & Labs Ltd | enabled      |
