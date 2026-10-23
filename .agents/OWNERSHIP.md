# Agent surface ownership

Status: drafted by Agents Productivity (Lung Pok) 2026-10-23. Awaiting Infra sign-off
(P Nu) and Prame's approval on the PR.

This repo has more than one author of agent behaviour: humans, Orca worktrees, Hermes,
Claude Code, Codex, OpenCode and Antigravity all edit the same small set of files. Without
named owners, two failures repeat: the same config lives in two places and drifts (two MCP
entries, a copied skill that no longer matches `.agents/skills/`), and nobody can say who is
allowed to change the contract every agent reads. This file names one owner per surface and
one rule for changes that cross two owners.

## Surfaces

| Path | What it is |
| --- | --- |
| `.agents/skills/**` | Canonical skills, one directory per skill, plus `.agents/skills/README.md` |
| `AGENTS.md`, `CLAUDE.md` | The always-loaded contract. `CLAUDE.md` is a symlink to `AGENTS.md` |
| `.claude/skills/`, `.gemini/skills/`, `.antigravity/skills/`, `.opencode/skills/` | Harness views. Symlinks into `.agents/skills/` only, no content |
| `.mcp.json`, `opencode.json`, `.codex/config.toml`, `.gemini/mcp_config.json`, `.antigravity/mcp_config.json`, `.claude/settings.local.json` | Which MCP servers each harness loads, one entry per harness |
| `scripts/sync-skills.sh` (`pnpm sync:skills`) | Creates and repairs the harness symlinks |
| `.github/workflows/**`, `.github/CODEOWNERS`, `.github/pull_request_template.md` | Checks, deploys, review gate |
| `.audit/`, `.verify/` | Local decision trails and verification evidence. Gitignored, never committed |

## Owners

| Owner | Who | Decides |
| --- | --- | --- |
| Repo owner | Prame (`@fromsukong`) | Everything on `main`. Only approval that satisfies branch protection. Secrets, spend, production deploys |
| Agents Productivity | Lung Pok | Skill content and inventory, `AGENTS.md`, harness symlink layout, which MCP servers and tools each harness registers, model and subagent policy for agents working in this repo |
| Infra | P Nu | The MCP gateway service behind the endpoint (Worker, deploy, DNS, TLS, OAuth, service tokens), CI/CD workflows, runner and baseline infrastructure, GitHub and Cloudflare org settings, repo and org secrets |
| Model routing | Switch | Executes model changes in harness configs and bot settings on Agents Productivity' decision |
| Token measurement | Meter | Measures burn and context cost. Advisory input to skill and config changes, no ownership |

## Decision rights by surface

| Surface | Owner | Required reviewer |
| --- | --- | --- |
| Skill content under `.agents/skills/` | Agents Productivity | Domain owner of the code the skill describes |
| `AGENTS.md` rules, skill triggers, done criteria | Agents Productivity | Prame |
| `.agents/skills/README.md` | Agents Productivity | none |
| Harness symlink directories | Agents Productivity | none |
| `scripts/sync-skills.sh` | Agents Productivity | Infra when it runs in CI |
| MCP server list in harness configs | Agents Productivity | Infra when the endpoint or auth changes |
| MCP gateway endpoint, auth, secrets | Infra | Agents Productivity for the tool surface it exposes |
| `.github/workflows/**`, `CODEOWNERS`, PR template | Infra | Prame |
| Model and effort defaults for repo agents | Agents Productivity | Switch (execution), Prame |
| `.audit/`, `.verify/` conventions | Agents Productivity | none |

Domain reviewers by skill: `tax_engine` and any money math, the tax and accounting owner.
`auth_better`, the auth owner. `deployment_ci`, Infra. `verify`, whoever owns the journey
being proven. `mobile_architecture`, `frontend_engineering`, `design_system`, `i18n_platform`,
`landing_seo`, `simulation_engine`, the owner of that app or package. All workflow skills
(`autonomous_run`, `debugging`, `delegating_work`, `writing_agent_docs`) and `honcho_memory`,
Agents Productivity. Where no domain owner is named, Prame reviews.

## Non-negotiables

1. Skill content lives in `.agents/skills/` only. A real file or directory in a harness
   skills folder is a defect, not a variant. Repair with `pnpm sync:skills`.
2. Harness configs hold no secrets. Anything with a credential, token or key belongs in
   Worker secrets or repo secrets, owned by Infra.
3. The gateway is registered once per harness, project-scoped, never also in a user dotfile.
4. A merged skill matches the code it describes. A change that invalidates a skill updates
   that skill in the same PR, or opens a follow-up PR that names the skill.
5. No skill edit weakens a safety rule (engine purity, no raw HTML, secrets, deploy gates).
6. Nobody but Prame merges or pushes to `main`, whatever the surface.

## When a change crosses two owners

The owner of the surface being edited opens the PR and names the other owner as reviewer in
the PR body. The other owner's objection blocks the merge until Prame rules. After Prame rules,
the outcome is written into this file in the same PR, so the next identical question does not
get re-argued.

## What is still prose

Ownership that a script can check should be a script. `scripts/sync-skills.sh` already repairs
symlinks. Proposed, not yet built:

- `scripts/check-skills.sh`: every skill directory has `SKILL.md`, frontmatter `name` matches
  the directory, `description` is non-empty, every harness symlink resolves into
  `.agents/skills/`, no harness folder contains real skill content.
- A `skills` job in `.github/workflows/pr-tests.yml` that runs it, added to the `PR gate`
  needs list. Infra owns the workflow change, Agents Productivity owns the script.

Until then this file is the reference, and the checks are manual.
