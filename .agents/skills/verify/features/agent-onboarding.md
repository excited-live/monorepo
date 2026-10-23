# Agent onboarding (MCP first)

The product's primary loop: the user's own agent does the work through MCP, and the user only checks in on the app.

## Sub-features

- Agent catalog and "Generate key" on Home (`OnboardingAgentSetup`).
- Agent key (`elk_…`) shown once, with a ready-made prompt that names this API's `/mcp` URL.
- MCP tools: `get_onboarding_status`, `list_entities`, `create_business`, `add_asset`, `add_liability`, `add_income`, `add_expense`, `lookup_catalog`, `complete_onboarding_step`, `skip_onboarding_step`, `get_financial_summary`.
- Progress list on Home that ticks as the agent completes steps.

## How to get to it (user POV)

Sign up. On Home press "Set up with your AI agent", pick an agent (Claude Code is preselected), press "Generate key". Copy the key or the prompt into the agent. The agent creates entries; Home shows them and ticks each step.

## Driving it with Playwright

`node .agents/skills/verify/scripts/drive.mjs agent-onboarding`

1. Sign up (see [signup](signup.md)), press "Set up with your AI agent" and "Generate key", read the key from the text matching `/^elk_\w+/`.
2. As the agent: `initialize`, `tools/list`, then `tools/call create_business { name }` and `tools/call complete_onboarding_step { stepId: "add_business" }`.
3. Reload Home.

End state checked: MCP `initialize` → 200; both tool calls succeed; the business appears as an entity button on Home; the progress list reads "✓ Add Business"; `POST /mcp` without a key → 401.

## Gotchas

- The progress tick and its label are separate elements. Match `main`'s rendered text with `/✓\s*Add Business/`, not `getByText`.
- `complete_onboarding_step` needs at least one entry first, so create before completing.
- Step ids come from `packages/accounting/src/onboarding.ts` (`add_business`, …).
- `drive.mjs` masks `elk_…` keys on the page before the screenshot and `--snapshot`, on pass and fail. Keys in your own ad-hoc scripts are not masked: keep them out of PRs and issues.
