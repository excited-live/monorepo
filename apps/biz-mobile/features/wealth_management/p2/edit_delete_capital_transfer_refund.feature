@mobile @wealth_management @capital_injection @crud @edit_delete @P2 @e2e
Feature: Edit and Delete Capital Transfer with Refund
  As a founder correcting a capital transfer
  I want edits and deletions to refund cash back to the personal reserve
  So that erroneous transfers can be reversed

  Scenario: Edit and delete an existing capital transfer
    Given an existing capital transfer of 50000 THB from "Alex Living" to "FromSukong Media" exists
    When the user edits the transfer amount to "30000" THB
    Then 20000 THB should be refunded back to the Personal reserve
    When the user deletes the transfer
    Then the remaining 30000 THB should be fully restored to the Personal reserve
