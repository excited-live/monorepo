@mobile @account_management @crud @business_edit @business_delete @cascade @P1 @e2e
Feature: Edit Business and Cascading Delete
  As a founder modifying or closing an entity
  I want to update business branding and safely delete an entity with cascading resource cleanup
  So that obsolete companies and their attached data are completely removed

  Background:
    Given "FromSukong Media" has starting cash 480000 THB and linked subscription "Cloud Server"

  Scenario: Rename business then delete entity with full cascading confirmation
    When the user taps "TuneIcon" on "FromSukong Media"
    And the user changes "Business Name" to "FromSukong Studios"
    And the user submits the business form
    Then the Management hero title should display "FromSukong Studios"
    When the user re-opens "TuneIcon" and taps "Delete Business"
    Then a confirmation dialog should warn that linked subscriptions and revenues will be removed
    When the user confirms the deletion dialog
    Then "FromSukong Studios" should be removed from all entity lists
    And all linked subscriptions should be deleted
    And the active entity should automatically fallback to the Personal account
