@mobile @wealth_management @delta @wealth_differences @P0 @e2e
Feature: Wealth Deltas, Variance and Zero-Sum Reconciliation
  As a financial auditor
  I want mathematically proven delta calculations between NOW and EOM, internal transfers, and month-over-month transitions
  So that cash math is 100% reconciled and error-free

  Scenario: Reconcile NOW vs EOM delta, capital transfer zero-sum invariant, and month continuity
    # 1. NOW vs EOM Delta Invariant
    Given an entity has starting cash reserve 250000 THB, monthly inflow 120000 THB, and outflow 23400 THB
    When the user compares NOW and EOM wealth
    Then the exact delta between EOM and NOW must equal +96600 THB (Surplus)

    # 2. Capital Transfer Zero-Sum Invariant
    Given "Alex Living" has 250000 THB and "FromSukong Media" has 480000 THB (Consolidated: 730000 THB)
    When 60000 THB is transferred from Personal to Business
    Then Personal delta is -60000 THB and Business delta is +60000 THB
    And Consolidated Treasury delta is strictly 0 THB (Zero-sum invariant)

    # 3. Month-over-Month Starting Continuity Invariant
    Given selected month is "2026-10" with projected ending treasury 346600 THB
    When the user advances MonthStepper to "2026-11"
    Then the starting treasury for "2026-11" must equal exactly 346600 THB
