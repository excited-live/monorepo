@mobile @onboarding @phase_3 @smoke @e2e
Feature: Onboarding Phase 3 - Add Career
  As a user
  I want to configure my employer, salary, and payday
  So that Homepage displays my career card and Management displays recurring living income

  Background:
    Given the user has completed Step 1 and Step 2

  Scenario: Add career and verify Homepage countdown and Management income
    When the user taps "Add career" on the checklist
    Then the "CareerDrawer" should slide up
    When the user selects company "Agoda" with role "Senior Software Architect"
    And the user enters salary "150000" THB and payday day "25"
    And the user saves career income
    Then Step 3 "Add career" should be marked completed
    And the Homepage Personal card should display the career card with live payday countdown
    When the user switches to the "capital" tab
    Then the Management hero monthly income should show "+฿150,000/mo"
    And the runway status pill should update to "DEFAULT ALIVE"
