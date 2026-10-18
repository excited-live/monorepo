@mobile @account_management @crud @business_delete @safety @P2 @e2e
Feature: Cancel Account Deletion Safety Guard
  As a user who triggered deletion by accident
  I want to cancel the confirmation prompt
  So that my business entity remains untouched

  Scenario: Canceling business deletion retains all records
    Given the user opens the "Edit Business" drawer for "FromSukong Media"
    When the user taps "Delete Business"
    And the user cancels the confirmation dialog
    Then the drawer should remain open
    And "FromSukong Media" should not be deleted
