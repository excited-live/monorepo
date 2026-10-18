@mobile @account_management @i18n @settings @P2 @e2e
Feature: Bilingual Language Switcher (EN ↔ TH)
  As an international founder
  I want to switch language between English and Thai in Settings
  So that all UI badges and labels update to Thai

  Scenario: Toggle application language between English and Thai
    Given the user navigates to the "settings" tab
    When the user selects "ไทย (TH)" in the language section
    Then the UI language should change to "th"
    When the user navigates to the "home" tab
    Then the entity badges should display "ส่วนบุคคล" for Personal and "ธุรกิจ" for Business
