# AGENTS.md — instructions for AI coding agents

Contract for any AI agent working in this repo (Hermes, OpenCode, Claude Code, Codex, agy). Read before your first commit.

## Core rules

1. **Never commit directly to `main`**. Work on a branch (`feat/*`, `fix/*`, `docs/*`) and open a PR.
2. **Never commit secrets, tokens, or `.env` files**. Credentials belong in local user dotfiles or GitHub repo secrets.
3. **Pure logic in `packages/*`**: No network, DOM, framework imports, or locale/timezone dependencies.
4. **Bilingual UI strings**: Always `{ en, th }`, English first.
5. **Don't edit generated files**: `routeTree.gen.ts`, `pnpm-lock.yaml`, `dist/`, `.output/`.
6. **Done criteria**: `pnpm build && pnpm typecheck && pnpm lint` must pass (0 warnings) before opening a PR. If you changed a component or page under `apps/webapp/src/components`, `apps/biz-mobile/src/components`, or `apps/biz-mobile/src/pages`, also run visual tests (`pnpm test:visual` or `pnpm test:visual:mobile`) and commit any updated `__snapshots__` PNGs. Baselines must be captured on the CI runner (workflow_dispatch → "Re-record baselines on the CI runner"), never on your machine — local pixel diffs are expected and are not a failure signal.
7. **Check FromSukong MCP tools first**: In every workflow, always check tools in the FromSukong MCP gateway (`fromsukong`) first. This is the unified MCP gateway (`https://mcp.fromsukong.com/mcp`).
8. **Subagent model pin**: OpenCode subagents, implementers and reviewers alike, run `opencode-go/deepseek-v4.1-flash#max`. agy subagents run `gemini-3.8-flash-high`. Name the model on every dispatch and never substitute another one from those harnesses. A reviewer in the implementer's own harness does not satisfy the cross-family gate, whatever model it names. Probes, provider identity, and the pin retirement procedure are in `delegating_work` section 3.

## MCP gateway & tools (FromSukong)

The **FromSukong MCP** is the unified MCP gateway (`https://mcp.fromsukong.com/mcp`) for `excited.live`.

- **Rule: Check FromSukong MCP tools first in every flow.** Before performing actions via external tools or manual fallbacks, check if a FromSukong MCP tool provides the capability.
- **Unified tool suites**:
  - `honcho_*`: Shared memory, semantic context search, peer discovery, and cross-agent coordination across workspaces.
  - `github-gitobs_*`: Pull requests, issues, commits, branches, and repository operations.
  - `cloud-flare_*`: Cloudflare docs, worker/Pages deployment status, and diagnostics.
  - `mobbin_*`: UI/UX design search for mobile and web screens, flows, and sections.
  - `portal_*`: Service portal server listing and toggling.
- **Native harness configuration in this repo** (project-scoped is canonical, one entry per harness):
  - **Claude Code**: configured in `.mcp.json` (`fromsukong` via `npx -y mcp-remote https://mcp.fromsukong.com/mcp`).
  - **OpenCode**: configured in `opencode.json` (`fromsukong` local mcp-remote command).
  - **Codex**: configured in `.codex/config.toml` (`fromsukong` stdio mcp-remote command).
  - **Antigravity CLI / Gemini**: configured in `.gemini/mcp_config.json` and `.antigravity/mcp_config.json`.
  - Do not register the gateway a second time in user dotfiles (`~/.codex/config.toml`, `~/.claude.json`, `~/.config/opencode/opencode.jsonc`, `~/.gemini/config/mcp_config.json`): two entries for one gateway means two copies of every tool.

## PR & merge pipeline

- **Review is local, not in the PR.** Run the local review gate (`autonomous_run` skill, section 6) before pushing; the PR itself carries no review content.
- **PR body format.** First line: `**Human attention needed:** YES — <one-line why>` or `**Human attention needed:** NO`. Then a short `## Summary` (what changed + why, a few bullets). Preview links are auto-appended; add nothing else.
  - YES when: auth, data, infra, user-visible behavior, or anything not fully verified. NO when: docs/CI-only, mechanical, verified safe.
  - Money/tax math is NO only when tests cover the changed math (golden tests, plus `scripts/recompute-*.py` where they apply) **and** an independent review agent on a different model family than the implementer approved it. Otherwise YES.
- **Auto-merge.** Arm it right after opening the PR: `gh pr merge <number> --auto --squash`. Arm from a user account (the assistant's credentials), never a bot/`GITHUB_TOKEN` — bot-armed merges do not trigger the deploy workflows. `main` is protected: GitHub merges automatically once Prame approves and the required checks pass — squash only.
- **Never merge or push to `main` yourself.** After Prame approves, do not push anything: a new push dismisses his approval and blocks the merge.

## Skill loading rules & native harness support

- **Canonical source**: Skills live in `.agents/skills/`.
- **Native harness support**: Each skill is individually symlinked into:
  - `.claude/skills/<skill>` for **Claude Code**
  - `.gemini/skills/<skill>` and `.antigravity/skills/<skill>` for **Antigravity CLI**
  - `.opencode/skills/<skill>` for **OpenCode**
  Run `scripts/sync-skills.sh` after adding or modifying skills to synchronize symlinks.
- **`honcho_memory`**: **Always load every time**. Use it on every turn to recall user context, inspect peers, or ground decisions in shared memory.
- **All other skills**: **Load only on demand as needed** — do NOT load all skills upfront:
  - `frontend_engineering` — only when building webapp UI, routes, or components.
  - `mobile_architecture` — **mandatory** when building or refactoring mobile screens, components, hooks, selectors, or component tests (`apps/biz-mobile`). Always consult `.agents/skills/mobile_architecture/references/page_component_structure.md` for the page/component folder layout, hook separation, and direct-mount Playwright visual test conventions.
  - `design_system` — only when styling or modifying theme tokens (`packages/design-system`).
  - `tax_engine` — only when touching tax math or `packages/tax`.
  - `deployment_ci` — only when touching CI workflows or preview deploys.
  - `simulation_engine` — only when touching `packages/sim`, plan math, or plan-service.
  - `i18n_platform` — only when touching locale resolution, dictionaries, or en/th strings (webapp and biz-mobile).
  - `landing_seo` — only when touching `apps/landingpage`, its meta/SEO layer, or its content pipeline.
  - `auth_better` — only when touching authentication, the middleware chain, or auth routes.
- **Workflow skills** (how to work, not what the code is). Load on demand like the domain skills:
  - `autonomous_run` — any task you drive unattended (Orca workspace, Paperclip issue, "run until done"), when picking up another agent's work, and before claiming anything is done. Defines the done predicate, when to stop and ask, the decision trail, and the local review gate.
  - `debugging` — before proposing a fix for any bug, test failure, CI failure, or regression.
  - `delegating_work` — multi-part implementation or any time you are about to spawn a subagent.
  - `writing_agent_docs` — creating or editing a skill, changing this file, or encoding a lesson after a run.
  - `verify` — proving a user-facing change on the real app (isolated local api + biz-mobile, sign-up and agent/MCP journeys, screenshot evidence) before a PR, or reproducing a bug a user saw.

## Setup & commands

```bash
pnpm install
pnpm dev        # webapp on http://localhost:3000
pnpm build      # all packages + app (turbo, cached)
pnpm typecheck  # tsc across workspace
pnpm lint       # eslint across repo (--max-warnings=0)
pnpm test       # run engine tests
pnpm test:visual        # Playwright component screenshots (needs `playwright install chromium` once)
pnpm test:visual:update # re-record screenshot baselines — commit the PNGs with your change
pnpm test:visual:mobile # Playwright mobile component screenshots
pnpm test:visual:mobile:update # re-record mobile screenshot baselines
```

## Agent execution guidelines

- **Minimal diffs**: Smallest change satisfying the task. No drive-by formatting or unsolicited refactors.
- **Git isolation**: Work in a branch or dedicated worktree. Check `git log origin/main..HEAD` before pushing.
- **Deploys**: Automatic for PR previews and prelive (`main`) — webapp, landing, and the `apps/api` Worker (`excited-live-api-prelive`, via `api-prelive.yml`). Agents may deploy `apps/api` to prelive (#146); production deploys are manual and human-only.
- **Task inbox**: GitHub issues on `fromsukong/excited.live` are the one tracker. Pick work up from there, link the issue in the PR (`Closes #N`), and file follow-ups there, not in other trackers.
- **References**: `docs/PRD.md` (scope source of truth), `DEVELOPMENT.md` (dev details), `.agents/skills/README.md`, `.agents/skills/mobile_architecture/references/page_component_structure.md`.
