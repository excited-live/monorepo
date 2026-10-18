@mobile @account_management @differences @P0 @e2e
Feature: Account Type Differences and Permission Boundaries
  As a founder
  I want strict behavioral divergence between Personal and Business accounts across lifecycle, branding, and expense categories
  So that living funds and enterprise capital maintain total separation

  Scenario: Verify complete behavioral separation between Personal and Business accounts in one cohesive journey
    Given the user has Personal account "Alex Living" and Business account "FromSukong Media"

    # 1. Lifecycle & Deletion Boundary Check
    When the user inspects "Alex Living" on the Management screen
    Then the settings button should render as "UserIcon"
    When the user taps the settings button
    Then the app routes to "settings" without any account deletion capability
    When the user switches to "FromSukong Media"
    Then the settings button should render as "TuneIcon"
    When the user taps the configure button
    Then the "Edit Business" drawer opens with a destructive "Delete Business" action

    # 2. Hero Card & Branding Differences
    When the user views the capital hero for "Alex Living"
    Then the eyebrow should display "PERSONAL WEALTH" with Liquid % and Gear % split bar
    And the cumulative capital badge should be hidden
    When the user switches to "FromSukong Media"
    Then the eyebrow should display "BOOK VALUE"
    And the cumulative capital pill should be visible

    # 3. Expense & Capital Deployment Category Differences
    When the user opens "Add Expense" on "Alex Living"
    Then the category dropdown should include "Housing & Rent" and "Deploy Capital to Business"
    When the user opens "Add Expense" on "FromSukong Media"
    Then the category dropdown should include "Developer Tools & APIs" and "Hosting & Infrastructure"
    And "Deploy Capital to Business" should NOT be available for a Business account
