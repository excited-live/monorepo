@mobile @account_management @portability @settings @P2 @e2e
Feature: Account Data Backup and Portability
  As a privacy-focused founder
  I want to export and import complete JSON backups
  So that my entities and records can be restored offline

  Scenario: Export and Import account snapshot JSON for backup and recovery
    Given the user is on the "settings" tab
    When the user taps "Export Snapshot JSON"
    Then a valid JSON payload containing all accounts and records should be generated
    When the user clears local state and imports the JSON snapshot
    Then all original accounts and balances should be fully restored
