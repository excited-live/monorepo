@mobile @account_management @career @autofill @user_touch_protection @P2 @e2e
Feature: Career Autofill Manual Touch Protection
  As a user who manually typed custom compensation
  I want catalog auto-suggestions to respect my manual edits
  So that selecting an employer never overwrites my customized salary

  Scenario: Manual salary input is preserved when selecting an employer chip
    Given the user opens the "CareerDrawer"
    When the user manually enters "180000" into "Monthly Salary (THB)"
    And the user types "LINE MAN Wongnai" into "Company / Employer"
    And the user selects "LINE MAN Wongnai" from the suggestions
    Then the "Monthly Salary (THB)" input should remain "180000"
