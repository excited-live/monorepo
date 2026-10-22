-- 0002_onboarding_method.sql — how the user chose to onboard.
--
-- "agent" when the MCP onboarding tools completed a step (and "manual" when the
-- app stepper ran). NULL when the user has not chosen yet. Same ledger rules as
-- 0001: one statement per semicolon on its own line.

ALTER TABLE user_onboarding ADD COLUMN method TEXT;
