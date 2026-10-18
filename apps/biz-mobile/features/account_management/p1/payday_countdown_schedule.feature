@mobile @account_management @career @payday_countdown @P1 @e2e
Feature: Payday Countdown Schedule
  As a salaried individual
  I want a dynamic countdown badge indicating remaining days until payday
  So that I can anticipate upcoming monthly liquidity

  Scenario Outline: Payday countdown indicator calculation
    Given the current system day is "18" of the month
    When the personal account has payday configured as "<payday_day>"
    Then the career card countdown badge should display "<countdown_label>"

    Examples:
      | payday_day | countdown_label    |
      | 18         | Payday today       |
      | 19         | Payday tomorrow    |
      | 28         | Payday in 10 days  |
      | 15         | Payday in 28 days  |
