# AGENTS.md — instructions for AI coding agents

Contract for any AI agent working in this repo (Hermes, OpenCode, Claude Code, Codex, agy). Read before your first commit.

## Core rules

1. **Never commit directly to `main`**. Work on a branch (`feat/*`, `fix/*`, `docs/*`) and open a PR.
2. **Never commit secrets, tokens, or `.env` files**. Credentials belong in local user dotfiles or GitHub repo secrets.
3. **Pure logic in `packages/*`**: No network, DOM, framework imports, or locale/timezone dependencies.
4. **Bilingual UI strings**: Always `{ en, th }`, English first.
5. **Don't edit generated files**: `routeTree.gen.ts`, `pnpm-lock.yaml`, `dist/`, `.output/`.
6. **Done criteria**: `pnpm build && pnpm typecheck && pnpm lint` must pass (0 warnings) before opening a PR. If you changed a component under `apps/webapp/src/components`, also run `pnpm test:visual` and commit any updated `__snapshots__` PNGs. Baselines must be captured on the CI runner (workflow_dispatch → "Re-record baselines on the CI runner"), never on your machine — local pixel diffs are expected and are not a failure signal.

## PR & merge pipeline

- **Review is local, not in the PR.** Run the local review gate before pushing; the PR itself carries no review content.
- **PR body format.** First line: `**Human attention needed:** YES — <one-line why>` or `**Human attention needed:** NO`. Then a short `## Summary` (what changed + why, a few bullets). Preview links are auto-appended; add nothing else.
  - YES when: money/tax math, auth, data, infra, user-visible behavior, or anything not fully verified. NO when: docs/CI-only, mechanical, verified safe.
- **Auto-merge.** Arm it right after opening the PR: `gh pr merge <number> --auto --squash`. Arm from a user account (the assistant's credentials), never a bot/`GITHUB_TOKEN` — bot-armed merges do not trigger the deploy workflows. `main` is protected: GitHub merges automatically once Prame approves and the required checks pass — squash only.
- **Never merge or push to `main` yourself.** After Prame approves, do not push anything: a new push dismisses his approval and blocks the merge.

## Skill loading rules

- **`honcho_memory`**: **Always load every time**. Use it on every turn to recall user context, inspect peers, or ground decisions in shared memory.
- **All other skills**: **Load only on demand as needed** — do NOT load all skills upfront:
  - `frontend_engineering` — only when building webapp UI, routes, or components.
  - `design_system` — only when styling or modifying theme tokens (`packages/design-system`).
  - `tax_engine` — only when touching tax math or `packages/tax`.
  - `deployment_ci` — only when touching CI workflows or preview deploys.
  - `simulation_engine` — only when touching `packages/sim`, plan math, or plan-service.
  - `i18n_platform` — only when touching locale resolution, dictionaries, or en/th strings.
  - `landing_seo` — only when touching `apps/landingpage`, its meta/SEO layer, or its content pipeline.
  - `auth_better` — only when touching authentication, the middleware chain, or auth routes.

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
```

## Agent execution guidelines

- **Minimal diffs**: Smallest change satisfying the task. No drive-by formatting or unsolicited refactors.
- **Git isolation**: Work in a branch or dedicated worktree. Check `git log origin/main..HEAD` before pushing.
- **Deploys**: Automatic for PR previews and prelive (`main`). Production deploys are manual and human-only.
- **References**: `docs/PRD.md` (scope source of truth), `DEVELOPMENT.md` (dev details), `.agents/skills/README.md`.
