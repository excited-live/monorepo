---
name: delegating_work
description: >-
  How the lead agent splits work for subagents in excited.live: write the plan into the repo, cut it
  into independent tasks with exact files and done commands, pick the cheapest model that can do
  each task, isolate every writer in its own worktree, and review every diff before it merges. Use
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

## 3. Pick the model per task

Use the least capable model that can finish the task in few turns.

- **Mechanical** (1 to 2 files, complete spec, or the brief contains the exact code): the cheapest tier. Prame's standing preference for implementers is a cheap model via OpenCode. Provider credits change, so probe before dispatching: `opencode run --standalone -m <provider/model> "reply with OK"`.
- **Integration** (multi-file, follows existing patterns): a mid tier.
- **Design, debugging, and the final review**: the strongest model available.
- **Reviews** scale with the diff's risk and always run on a different model family than the implementer. Money, tax, auth, and data changes always get a strong reviewer.

Name the model explicitly on every dispatch. An omitted model usually inherits the lead's model, the most expensive one. Cheap models that take three times the turns cost more, so a mid tier is the floor for vague briefs.

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
