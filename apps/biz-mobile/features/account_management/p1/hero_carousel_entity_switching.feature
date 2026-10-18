@mobile @account_management @navigation @hero_carousel @P1 @e2e
Feature: Hero Carousel Fast Entity Switching
  As a multi-company director
  I want to swipe between entities in the Hero Carousel
  So that I can transition between companies with zero navigation lag

  Scenario: Swipe Hero Carousel to transition between Personal and multiple Business accounts
    Given the user is on the "capital" tab viewing Personal account "Alex Living"
    When the user swipes the Hero Carousel to "FromSukong Media"
    Then the active entity should switch to "FromSukong Media"
    And all cards, metrics, and subtabs should immediately re-render for "FromSukong Media"
