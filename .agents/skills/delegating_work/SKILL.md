---
name: delegating_work
description: >-
  How the lead agent splits work for subagents in excited.live: write the plan into the repo, cut it
  into independent tasks with exact files and done commands, dispatch the pinned model per harness,
  isolate every writer in its own worktree, and review every diff before it merges. Use
  this skill for multi-part implementation, parallel investigation, or any time you are about to
  spawn a subagent.
---

# Delegating Work

The lead agent plans, writes briefs, and reviews. Implementers write code. You own every line a subagent produces, so you read its diff, not its summary.

---

## 1. Plan in the repo

For work bigger than one task, write `docs/plan-<slug>.md` first. Every implementer reads the same brief, and the plan survives context compaction. It holds:

- The goal and the done predicate (see `autonomous_run`).
- The data shapes and contracts that tasks share, decided before anyone writes logic.
- The task list, each task with: files it may touch, the contract it must satisfy, its done command, and which tasks block it.
- Global constraints: AGENTS.md rules, the domain skills each task must load.

Slice vertically. Each task is a narrow but complete path that ends green on its own. A wide mechanical change (rename across the repo) goes expand, migrate in batches, contract, so every batch stays green.

## 2. Decide what runs in parallel

- **Independent** tasks touch disjoint files or packages. They run in parallel.
- **Shared writes** (the same file, `pnpm-lock.yaml`, a shared type in `packages/*`) serialize, or better, land the shared part first as its own task and fan out after.
- Prefer one owner for tightly coupled code. Parallel fan-out pays off for independent artifacts: separate packages, audits, competing prototypes.

## 3. Dispatch the pinned model

The pins are in AGENTS.md rule 8: OpenCode subagents run `opencode-go/deepseek-v4.1-flash#max`, agy subagents run `gemini-3.8-flash-high`. The guardrail fixes the model, so the tiers below differ only in the brief; the final review is the exception, moving to another harness. Default implementers to OpenCode unless the task says otherwise.

- **Mechanical** (1 to 2 files, complete spec): the exact code or the precise edit list in the brief.
- **Integration** (multi-file, follows existing patterns): the files to copy and the commands to run in the brief.
- **Design and debugging**: the constraints, the failure, and the evidence you expect back in the brief.
- **The final review**: another harness. OpenCode work goes to an agy (Gemini) agent, or to Claude Code or Codex; agy work goes to an OpenCode (DeepSeek) agent, or to Claude Code or Codex. A reviewer in the implementer's own harness is not independent, whatever model it names. Claude Code, Codex, and Hermes reviewers count only when their model is a different family than the implementer's. Money, tax, auth, and data changes always get this review.

Name the model on every dispatch. An omitted model in an OpenCode or agy dispatch usually inherits the lead's model, which breaks the pin. A vague brief costs turns, so tighten it before dispatch.

**Pin checks.** Probe with `opencode run --standalone -m 'opencode-go/deepseek-v4.1-flash#max' "reply with OK"` or `agy --model gemini-3.8-flash-high -p="reply with OK"`. The `#max` suffix is OpenCode's variant syntax (`provider/model#variant`, see `opencode run --help`). See what a harness still offers with `opencode models` and `agy models`.

**Retirement.** Change a pin only when its harness no longer lists that model, or the provider announces a deprecation. A model that is still listed but failing (credits, rate limit, auth) is an outage: retry, run the review from another harness, and flag the PR `Human attention needed: YES` if it blocks the work. If the implementer's harness is down, stop or move the work to the other harness. Do not swap the pin for an outage. The provider prefix is part of the pin: if the same model moves to another provider, that is also a pin change.

When a pin is really retired, pick the closest current model in the same family and tier, keep its effort level (`#max` stays max, `-high` stays high), and update AGENTS.md rule 8, this section, and `autonomous_run` in a small `docs/*` PR of its own. Until that PR merges, the old pin stays the rule and the work stops or moves to another harness.

## 4. Write the brief

A subagent starts cold. It does not see your conversation. Give it:

- The task, the plan file path, and the exact files it may touch.
- The contract: types, function signatures, expected outputs.
- The skills to load (by name) and the AGENTS.md rules that matter here.
- The done command it must run and paste output from.
- What to do when stuck: report back with what it tried, never weaken a test or a check to get green.

Hand artifacts over as file paths, not pasted text. Everything pasted into a dispatch stays in your context for the rest of the session.

## 5. Isolate every writer

Each file-writing subagent gets its own worktree or exclusive branch. Telling two agents "don't touch each other's files" is not a lock. Do not edit files or run a suite inside a worktree a subagent still holds.

## 6. Review every diff

When a subagent reports done:

1. Read `git diff <base>..<its-branch>` yourself.
2. Re-run its done command yourself. Its report is a claim, not evidence.
3. Check the diff against the brief: scope creep, skipped requirements, weakened tests, new comments that narrate instead of explain.
4. Give a fix round to a **fresh** subagent with the original brief, the review findings, and the branch. Resuming the old agent drops directives.

Before merging delegate branches into yours, confirm every delegate has stopped. "Completed" in an agent list can mean notified, not exited; `git status` disagreeing with its report is the tell.

## 7. Integrate and verify

Merge delegate branches into the PR branch in dependency order, then run the full done criteria (AGENTS.md rule 6) and the local review gate (`autonomous_run` section 6) on the combined result. Delete the worktrees you created once their branches are merged.
