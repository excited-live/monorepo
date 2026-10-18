@mobile @wealth_management @expense @deploy_capital_bridge @P2 @e2e
Feature: Deploy Capital via Expense Drawer
  As a user reviewing personal outflows
  I want selecting "Deploy Capital to Business" in the Expense drawer to bridge directly to capital injection
  So that I don't have to switch to another screen

  Scenario: Deploy capital to business directly from Expense drawer
    Given the user is on the "capital" tab for "Alex Living"
    When the user opens "Add Expense" and chooses category "Deploy Capital to Business"
    Then the drawer transforms into the capital injection form
    When the user injects 40000 THB to "FromSukong Media"
    Then 40000 THB should be transferred from Personal to Business reserve
