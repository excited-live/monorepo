# Agent surface ownership

Status: drafted by Agents Productivity (Lung Pok) 2026-10-23, corrected against Infra's
review (P Nu) the same day. Infra review complete; Prame's merge of PR #11 is the remaining
gate. The approval-scope question that was open is now a working rule in non-negotiable 7, and
Prame can overrule it in one line. Infra's CI wiring is folded into the same branch, so the
charter and the gate that enforces it land together.

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
| `.codex/` | `config.toml` only. Codex reads `AGENTS.md` and the root config, so `sync-skills.sh` deliberately creates no `.codex/skills/`. Adding one is a surface change, not a fix |
| `.mcp.json`, `opencode.json`, `.codex/config.toml`, `.gemini/mcp_config.json`, `.antigravity/mcp_config.json`, `.claude/settings.local.json` | Which MCP servers each harness loads, one entry per harness. Cross-surface: the entry is Agents Productivity's, the endpoint and credential material are Infra's (see below) |
| `scripts/sync-skills.sh` (`pnpm sync:skills`) | Creates and repairs the harness symlinks |
| `.gitea/workflows/**` | The live gate: `ci.yml`, job `ci`, self-hosted runner on homeserver2 |
| `.github/workflows/**` | 12 legacy workflows, inert for Gitea PRs. Infra decides their fate |
| `.audit/`, `.verify/` | Local decision trails and verification evidence. Gitignored, never committed |

## Owners

| Owner | Who | Decides |
| --- | --- | --- |
| Repo owner | Prame (`@fromsukong`) | Everything on `main`. The merge click on every PR — the approval gate, with CI enforced by branch protection. Secrets, spend, production deploys |
| Agents Productivity | Lung Pok | Skill content and inventory, `AGENTS.md`, harness symlink layout, which MCP servers and tools each harness registers, model and subagent policy for agents working in this repo |
| Infra | P Nu | The MCP gateway service behind the endpoint (`mcp.fromsukong.com`, Worker, Cloudflare Access/Zero Trust, DNS, TLS, OAuth, tokens) and the hosting behind it for uptime; CI/CD (`.gitea/workflows/**`, `gitea-runner` on homeserver2 and its label set, registration); Gitea and Cloudflare org and repo settings, collaborators, deploy keys, branch protection, repo and org secrets, webhooks; the mirror and sync timers (`gitea-github-mirror`, `mirror-main.sh`, `gitea-issues-sync`); deploy gates and the fate of the legacy `.github/workflows/**`; the runtime agents run in (Open Design image, key injection, workspace mounts) |
| Model routing | Switch | Executes model changes in harness configs and bot settings on the Agents Productivity decision |
| Token measurement | Meter | Measures burn and context cost. Advisory input to skill and config changes, no ownership |

## Decision rights by surface

| Surface | Owner | Required reviewer |
| --- | --- | --- |
| Skill content under `.agents/skills/` | Agents Productivity | Domain owner of the code the skill describes |
| `AGENTS.md` rules, skill triggers, done criteria | Agents Productivity | Prame; Infra for rule 2 (secrets) and rule 7 (which gateway agents must check) |
| `.agents/skills/README.md` | Agents Productivity | none |
| Harness symlink directories | Agents Productivity | none |
| `scripts/sync-skills.sh` | Agents Productivity | Infra when it runs in CI |
| MCP server list in harness configs (`.mcp.json`, `opencode.json`, `.codex/config.toml`, `.gemini/mcp_config.json`, `.antigravity/mcp_config.json`, `.claude/settings.local.json`) | Agents Productivity | Infra when the endpoint or auth changes |
| Endpoint, auth and credential material referenced by those entries | Infra | Agents Productivity for the tool surface exposed |
| MCP gateway endpoint, auth, secrets | Infra | Agents Productivity for the tool surface it exposes |
| `scripts/check-skills.sh` | Agents Productivity | Infra when CI calls it |
| `.gitea/workflows/**`, the runner and its labels | Infra | Agents Productivity for any skills or agent-config check it runs |
| `.github/workflows/**` (legacy), mirror and sync timers | Infra | none, Infra decides their fate |
| `scripts/*` other than `sync-skills.sh` and `check-skills.sh` | unclaimed | whoever claims it in a PR; do not fold into either column silently |
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
6. Nobody but Prame merges or pushes to `main`, whatever the surface. `main` is protected and
   requires CI; Prame's merge click is still the approval gate, and a green check is not
   permission.
7. **Settled 2026-10-23, reversible by Prame:** "Prame approves" means Prame clicks merge.
   No separate approval is required for a routine agent-surface PR that has its owner and
   named reviewer. Approval is asked for explicitly only on release, spend, production,
   secrets, and anything that rewrites `main` history. This replaces the earlier "every PR"
   default, which deadlocked: `infra` cannot approve its own PR and Prame is the only other
   human, so requiring an approval as well as a merge would have blocked the gate that
   protection needs.

## When a change crosses two owners

The owner of the surface being edited opens the PR on Gitea and names the other owner as
reviewer in the PR body. The other owner's objection blocks the merge until Prame rules. After
Prame rules, the outcome is written into this file in the same PR, so the next identical
question does not get re-argued.

Cross-surface config, the one case that looks like two owners: in `.mcp.json`, `opencode.json`
and the per-harness MCP configs, the server entry belongs to Agents Productivity and the endpoint,
auth and any credential material it references belong to Infra. Those files carry environment
variable names only, never tokens. A PR that changes an endpoint needs both owners.

## Where the repo actually lives

Gitea at `git.fromsukong.com` (host `Excited.live/monorepo`) is canonical. `github.com/excited-live/monorepo`
is a one-way mirror pushed by `mirror-main.sh`, so a GitHub workflow cannot gate a Gitea PR,
and GitHub-side merge automation in `AGENTS.md` describes a path that no longer exists.

Verified 2026-10-23, by Infra against the Gitea API and by Agents Productivity against the
remote:

| Fact | State |
| --- | --- |
| Branch protection on `main` | enabled 2026-10-23: `can_push=0`, `can_force_push=0`, no deletion; required check `CI / ci (pull_request)` |
| Collaborators | `infra` (repo admin) is the only added collaborator. `prame` is site admin and owns the `excited.live` org, so pushes from this host authenticate as Prame and attribute to `prame` |
| Repo and org secrets | zero of each |
| CI | `.gitea/workflows/ci.yml`, job `ci`, on push and PR, self-hosted runner, ~1-2.5 min; runs `scripts/check-skills.sh` |
| Required-check context | `CI / ci (pull_request)`, read from the protection row itself; CI writes exactly that string and it is green on `7b39f86`. `CI / ci (push)` does not satisfy it |
| GitHub | mirror only. `has_pull_requests: false`; the PR pipeline documented in `AGENTS.md` is dead |

Status, owner named:

- **Infra, done 2026-10-23:** `main` is protected — no direct push, no force-push, no deletion —
  and requires `CI / ci (pull_request)`. No approval requirement, so rule 7's merge click is the
  approval gate; an approval requirement comes back when a second non-admin account exists.
- **Infra, done 2026-10-23:** `AGENTS.md` rule 2 now names Gitea repo/org secrets, and rule 7
  tells agents not to depend on the FromSukong gateway (inert: the Cloudflare edge cannot reach
  the tailnet-only backend). The gateway section carries the same status line, so agents stop
  treating it as a first step.
- **Infra, done 2026-10-23:** `scripts/check-skills.sh` runs in `.gitea/workflows/ci.yml`, job
  `ci`. It arrived as a stack on this branch and is folded into PR #11 so one merge ships both;
  Infra's own stacked PR #12 has no diff left and is for Infra to close.

## What is still prose

Ownership that a script can check should be a script. `scripts/sync-skills.sh` repairs
symlinks; `scripts/check-skills.sh` (added with this file) verifies them and the skill
frontmatter without writing anything.

`check-skills.sh` now runs in `.gitea/workflows/ci.yml`, job `ci` (Infra, 2026-10-23), so the
symlink and frontmatter rules are enforced on every PR. Wiring it into
`.github/workflows/pr-tests.yml` would never run, since Gitea PRs do not execute GitHub
workflows.
