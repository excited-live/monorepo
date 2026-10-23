# Follow-ups: AI-native onboarding

What comes after #134 (MCP server, agent keys, sign-in link, agent-first mobile
onboarding). The design is in [plan-ai-native-onboarding.md](plan-ai-native-onboarding.md).
Each item is a GitHub issue; this page is the index and the suggested order.

## Direction

1. **Ship MCP as the product first** (decided 2026-10-23, see [PRD.md](PRD.md)).
   The user's own agent is the first-class client. The MCP server already gives
   users value on its own ("connect your AI agent to your books"), so launch it
   before the web app is finished.
2. **Web next.** Mobile is close to shippable; the webapp has no onboarding yet.
3. **Harden the agent surface** before many users connect agents to real books.

## Issues

| # | Issue | Area | Suggested order |
| --- | --- | --- | --- |
| [#139](https://github.com/fromsukong/excited.live/issues/139) | Validate the sign-in link end to end on prelive (Claude.ai, ChatGPT, Claude Code, Hermes) | auth, infra | 1. Blocks the launch |
| [#140](https://github.com/fromsukong/excited.live/issues/140) | Lock down unauthenticated `/mcp` (and `/api/v1`) on public previews and prelive | security | 1. Blocks the launch |
| [#143](https://github.com/fromsukong/excited.live/issues/143) | MCP tools beyond onboarding (runway, bills, update/delete) | api | 2 |
| [#136](https://github.com/fromsukong/excited.live/issues/136) | MCP-first launch: update docs and landing page | landing, docs | 3. After #139, #140, ideally #143 |
| [#141](https://github.com/fromsukong/excited.live/issues/141) | Device flow: issue scoped agent credentials instead of a full session | auth | 3 |
| [#142](https://github.com/fromsukong/excited.live/issues/142) | Agent audit trail: tag agent writes and add one-tap undo | api, mobile | 4 |
| [#137](https://github.com/fromsukong/excited.live/issues/137) | Web next: AI-native onboarding on the webapp + share the agent catalog | webapp | 4. Can run in parallel |
| [#138](https://github.com/fromsukong/excited.live/issues/138) | Screenshot tests: use real images instead of monogram placeholders | testing, mobile | Anytime |

## Known gaps carried over from #134

These are tracked in the issues above. They're listed here so nobody rediscovers them:

- **Link sign-in is off until configured.** It needs `BETTER_AUTH_URL` and
  `EXCITED_API_URL` on the webapp and `EXCITED_WEBAPP_URL` on the API (#139).
- **`apps/api` is not deployed anywhere yet.** `apps/api/wrangler.toml` has only a
  placeholder D1 database id (`REPLACE_WITH_DATABASE_ID`), no workflow deploys it, so `/mcp` returns 404 on prelive
  (checked 2026-10-23). Deploying it to prelive (#146) comes before #139.
- **Dev passthrough once deployed.** Without `BETTER_AUTH_SECRET`, `/mcp`
  accepts unauthenticated calls into the `default` bucket. The first public
  deploy must set the secret (#140).
- **Device-flow tokens are full sessions,** not scoped like agent keys (#141).
- **Unverified agent setup text:** the Claude.ai and ChatGPT connector steps,
  and the config snippets for Antigravity, Windsurf, VS Code, Cline and Zed in
  `apps/biz-mobile/src/domain/agents.ts` (#139).
- **Agent tiles use monograms** instead of brand logos (#138).
- **The agent catalog lives in `apps/biz-mobile`.** It must move to a package
  before the webapp uses it (#137).
