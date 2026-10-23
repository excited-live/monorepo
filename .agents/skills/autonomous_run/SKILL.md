---
name: autonomous_run
description: >-
  The operating contract for any task an agent drives without a human watching: define done as a
  checkable predicate, decide forks yourself and log them as rulings, keep a decision trail, prove
  every claim with fresh command output, and pause or hand off cleanly. Use this skill when given a
  task to finish unattended (an Orca workspace, a Paperclip issue, "run until done", "I'm going to
  bed"), when picking up another agent's in-flight work, or before claiming any work is done.
---

# Autonomous Run

You own the exit condition. Define done, then drive to it without parking reversible work on a human.

Built from three outside skill stacks (obra/superpowers, Lauren Tan's pstack, mattpocock/skills), cut down to what this repo needs. AGENTS.md rules still win over anything here.

---

## 1. Frame the run

Before the first edit, write these at the top of the decision trail (section 3):

1. **The ask**, in one sentence, and its GitHub issue. GitHub issues are the one tracker (AGENTS.md). If the task arrived some other way (an Orca workspace title, a chat message) and spans more than one session, open an issue for it. Quote the original wording and say how you read it.
2. **Done**, as a predicate you can check by running something: `pnpm --filter @excited-live/tax test` green, the repro script prints `OK`, PR open with auto-merge armed, a doc published at a URL. "Works well" is not a predicate.
3. **Playbook**, picked from section 2.
4. **Skills to load**, from the AGENTS.md list. Load each before touching its area, not after.

A fresh worktree has no `node_modules`: run `pnpm install --frozen-lockfile` before any check, or a missing binary looks like a failure.

Ground the framing in what exists: `honcho_memory` for prior decisions, `git log` for recent work in the area, `docs/PRD.md` for scope. The product is MCP first: the user's own agent is the primary client, and the apps are where people check in. When a task trades API or MCP work against app UI, the agent surface wins.

## 2. Pick the playbook

- **Bug.** Load `debugging`. No fix before a red-capable loop exists.
- **Feature.** Name the data shape first (types, the table or state machine that holds it). Write the plan into `docs/plan-<slug>.md` when it spans more than one session or more than one implementer. Build in vertical slices: each slice cuts schema to UI and ends green.
- **Refactor.** Behavior-preserving. Capture the behavior first (tests, visual baselines, `scripts/recompute-mvp.py` output), change structure, show the same evidence after.
- **Multi-part implementation.** Load `delegating_work`. You plan and review, cheaper implementers write the code.
- **Agent setup or docs.** Load `writing_agent_docs`.
- **Investigation.** Read-only. The deliverable is a cited answer, every claim pointing at a `file:line`, a command output, or a URL you read.

## 3. Keep a decision trail

Long or unattended work keeps a log at `.audit/<task-slug>.tsv` (git-ignored). One row per decision, tab-separated, single-line cells:

```
ts	phase	decision	why	evidence	result
```

Evidence is a pointer (commit SHA, `file:line`, command, URL), never a paragraph. Log forks, pivots, reverts, rulings, and each verified unit. Skip the self-evident. Append only: a wrong call gets a new row that supersedes it.

The trail is your recovery map. After a context compaction, trust the trail and `git log` over your memory of what you did.

## 4. Rulings, not stalls

A running task does not wait on a human for reversible choices. Ambiguity, plan defects, two valid designs: decide, log `Ruling: <what> | <why> | <cost if wrong>`, keep going. A wrong ruling costs rework the human can see and undo. A session parked on a question costs their whole day.

Before asking "which approach?", check whether the answer is observable. Behavior, layout, timing, output: build a throwaway sketch and let the result decide. Ask only for genuine product or preference calls no experiment settles, and when you must ask, apply a sensible default first and keep working on everything that doesn't depend on the answer.

Stop and ask for exactly these:

- Irreversible or destructive operations (data deletion, force-push, history rewrites on shared branches).
- Security-sensitive actions (credentials, auth changes in production, anything touching secrets).
- Outward side effects AGENTS.md reserves for humans: merging, pushing to `main`, production deploys, messages to customers or the public. Deploying `apps/api` to prelive is allowed, through the deploy path documented in the `deployment_ci` skill. Until #146 lands there is no such path: do not improvise a `wrangler deploy`.
- Money or tax math you cannot cover with tests. Flag it `Human attention needed: YES` and keep building around it. Covered math plus a different-model review ships as `NO` (AGENTS.md PR rules).

Mid-run discoveries are yours: a flaky test, a broken skill, a stale doc. Fix small ones in place and note them in the trail. Put unrelated fixes in their own PR so the main diff stays reviewable.

## 5. Evidence before claims

No completion claim without fresh verification output from this session. Before writing "done", "fixed", "passes", or "works":

1. Name the command that proves the claim.
2. Run it in full, now.
3. Read the output and exit code.
4. State the claim with the evidence, or state the real status.

| Claim | Proof in this repo |
|---|---|
| Ready for PR | `pnpm build && pnpm typecheck && pnpm lint --max-warnings=0` all exit 0 |
| Engine tests pass | `pnpm test` or `pnpm --filter <pkg> test` output, 0 failures |
| Sim math unchanged or correct | `python3 scripts/recompute-mvp.py` agrees with the engine |
| User-facing change works | the `verify` skill: a journey that covers it PASSes on the local stack, evidence path quoted in the PR |
| UI change is safe | `pnpm test:visual` / `pnpm test:visual:mobile` run, snapshot diffs explained (local pixel noise is expected, see AGENTS.md rule 6) |
| Bug fixed | the original repro loop now passes, and a regression test went red before the fix. A bug seen in the app gets its repro as a `verify` journey |
| Subagent finished | `git diff` of its branch read by you, checks rerun by you |
| Requirements met | the ask re-read line by line against the diff |

"Should work", "looks right", and an agent's own success report are not evidence. If a check could not run (no browser, no credentials), say so plainly and mark the PR `Human attention needed: YES`.

## 6. Local review gate

Before pushing a PR branch:

1. The done criteria in AGENTS.md rule 6 pass, with output read.
2. An independent review of the full diff against the ask, by a fresh agent on a different model family than the one that wrote the code (for example Claude reviews DeepSeek or GPT work, and the reverse). Dispatch it with the diff, the ask, and the issue, read-only. Your own reread, and a review command running on your own model, do not count. For money and tax changes, this review plus test coverage is what lets the PR ship as `NO`. Auth changes stay `YES` regardless.
3. Each finding is fixed or dismissed with a concrete reason in the trail. Review bots and reviewers file real bugs and also non-issues; judge each on its merits.
4. Record the reviewer's model and verdict in the trail, so the PR's attention flag can be checked.

One way to run it from any harness: `git diff origin/main... > /tmp/pr.diff`, then `opencode run --standalone -m <provider/model> -f /tmp/pr.diff "<read-only review brief>"`. Provider credits change; probe a model with `opencode run --standalone -m <model> "reply with OK"` first. A reviewer that times out or prints nothing has given no verdict, not a clean one: rerun it, on another model if needed.

## 7. Finish the PR

The run ends with an open PR, not with a question. Without asking:

1. `git fetch origin && git rebase origin/main`, then re-run the done criteria on the rebased branch.
2. If the change moves scope, priority, or architecture, update `docs/PRD.md` (or the PRD file it indexes) in the same PR. PRD rule P9: the PRD is the source of truth, so a stale PRD is a bug.
3. Push, open the PR with the AGENTS.md body format and `Closes #N`, and arm auto-merge (`gh pr merge <number> --auto --squash`).
4. Reply with the PR link. Merging stays Prame's call.

## 8. Pause or hand off

When the run must stop before done (budget, context, a hard blocker), leave it resumable:

- Commit work in progress on the branch (a `wip:` commit is fine; never stash, the stash is shared across worktrees).
- Add a final trail row naming the next step and what blocks it.
- Write a handoff into Honcho or the issue/PR: the ask, done predicate, what landed (SHAs), what's open, which skills the next agent should load. Point at existing artifacts instead of restating them.

Picking up someone else's run: read their trail, `git log origin/main..HEAD`, and the PR thread before touching anything. Re-run their verification yourself before building on it.

## 9. Close the loop

At the end of the run, ask what would have made it faster or safer: a missing pointer, a check that would have caught a mistake, a stale instruction. Encode the lesson where it fires next time. A mechanical rule becomes a lint rule, a test, or a script. A judgment rule goes into the matching skill (see `writing_agent_docs`). Do this in the same PR when it's small.

The final reply states: the ask as you read it, the done predicate and its final state with evidence, what landed (PR link), rulings worth a second look, and anything left open.
