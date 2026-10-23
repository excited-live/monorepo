# Project skills

Project-local agent skills for the excited.live repo. Every agent that works here (Hermes, OpenCode, Claude Code, Codex, agy) should start from these.

## What lives here

One directory per skill, `snake_case`, each with a `SKILL.md`:

- `frontend_engineering/`: app structure, routing, component placement, i18n patterns.
- `mobile_architecture/`: Clean Architecture, state management, UI patterns, and visual regression testing for Tauri v2 mobile apps (`apps/biz-mobile`).
- `tax_engine/`: the pure tax engine in `packages/tax`.
- `design_system/`: Mastercard theme pipeline, component surface, the no-raw-HTML rule.
- `deployment_ci/`: the three deploy tiers, workflow set, CI checks, deploy pitfalls.
- `honcho_memory/`: shared agent memory system (Honcho), peer discovery, and context recall conventions.
- `simulation_engine/`: the plan projection engine in `packages/sim`, the plan-service boundary, Monte Carlo, the optimizer.
- `i18n_platform/`: the packages/i18n engine, SSR locale wiring in the webapp, dictionary conventions.
- `landing_seo/`: the Astro marketing site, meta/OG/JSON-LD layer, waitlist flow, blog and docs pipeline.
- `auth_better/`: Better Auth (packages/auth) — webapp cookies mount, api tokens mount, the middleware chain, the opt-in page gate.

## Native harness support & symlinks

`.agents/skills/` is the canonical single source of truth for all skills. To support multiple agent tools natively without duplicating skill content, each skill directory is individually symlinked:

- **Claude Code**: `.claude/skills/<skill>` → `../../.agents/skills/<skill>`
- **Antigravity CLI**: `.gemini/skills/<skill>` and `.antigravity/skills/<skill>` → `../../.agents/skills/<skill>`
- **OpenCode**: `.opencode/skills/<skill>` → `../../.agents/skills/<skill>`

To keep all harness symlinks synchronized after adding or renaming skills, run:
```bash
./scripts/sync-skills.sh
```

## Unified MCP gateway (FromSukong)

The **FromSukong MCP** (`fromsukong`) is the unified MCP gateway for `excited.live`:
- **Gateway Endpoint**: `https://mcp.fromsukong.com/mcp`
- **Core Rule**: In every workflow, check tools in the FromSukong MCP gateway first before manual fallbacks.
- **Tools Included**:
  - `honcho_*`: Shared cross-agent memory, peer discovery, and semantic context search.
  - `github-gitobs_*`: GitHub PRs, issues, commits, branch management, and repo ops.
  - `cloud-flare_*`: Cloudflare docs, deployment status, and diagnostics.
  - `mobbin_*`: Mobile and web UI patterns, screens, and flows.
  - `portal_*`: Unified server management and toggles.

Project configurations (one entry per harness, project-scoped is canonical):
- Claude Code: `.mcp.json`
- OpenCode: `opencode.json`
- Codex: `.codex/config.toml`
- Antigravity CLI / Gemini: `.gemini/mcp_config.json` and `.antigravity/mcp_config.json`

## Conventions

- Directory name, skill `name` in frontmatter, and content language stay in sync; descriptions read like "use this skill when ...".
- `references/` inside a skill holds focused reference material (inventories, token tables) so `SKILL.md` stays readable.
- House voice: English, human, no em-dashes, no filler. Exact paths and copy-pasteable commands.

## How loading works

- Project skills load only in sessions started inside a trusted checkout. Trust one with:
  `hermes skills trust <checkout-path>`
- It reports: `N project skill(s) will load in sessions started inside this repo (they take precedence over same-named profile skills).`
- They take precedence over same-named profile skills.

## The learning loop

- When a piece of work establishes a new convention, or a review or bugfix reveals a class-level lesson, update the matching skill: in the same PR when the change is small, otherwise in a focused follow-up PR.
- Never edit a skill to weaken a safety rule (engine purity, no-raw-HTML, secrets, deploy gates). Fix the code or the process instead, and update the skill to match.
