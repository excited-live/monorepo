# Feature map

User journeys the `verify` skill can drive. One file per journey: what it is, how a user reaches it, how `drive.mjs` drives it, and the observable end state that proves it.

| Journey | Proves | Status |
|---|---|---|
| [signup](signup.md) | A new user can create an account and reach Home with a working session | mapped, passing |
| [agent-onboarding](agent-onboarding.md) | The MCP-first loop: key minted in the app, agent writes through `/mcp`, the human sees it on Home; anonymous `/mcp` is refused | mapped, passing |

Not mapped yet (add a journey when you touch one):

- Manual onboarding ("Set up manually"): business, wallet, liability, income, expense steps.
- Settings: revoke an agent key, then the agent's `/mcp` calls fail.
- Management and Personal Detail screens.
- Sign out and sign back in on the same account.
