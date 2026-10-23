---
name: debugging
description: >-
  The diagnosis loop for bugs, test failures, CI failures, and regressions in excited.live: build a
  red-capable feedback loop first, minimise the repro, rank falsifiable hypotheses, fix at the root
  cause, and lock it with a regression test. Use this skill when something is broken, throwing,
  failing, slow, or behaving unexpectedly, before proposing any fix.
---

# Debugging

No fix before a loop that goes red on this bug. Reading code to build a theory before that loop exists is the failure this skill prevents.

---

## Phase 1: Build a feedback loop

Spend most of the effort here. With a tight pass/fail signal for this exact bug, bisection and hypothesis testing become mechanical. Without one, staring at code rarely helps.

Loops available in this repo, roughly in order of preference:

1. **A failing Vitest test** at the seam that reaches the bug: `pnpm --filter @excited-live/<pkg> exec vitest run <file>` in `packages/{tax,sim,accounting,auth,i18n}`, `apps/api`, or `apps/biz-mobile`.
2. **Differential check** for plan math: `python3 scripts/recompute-mvp.py` (and `scripts/recompute-accounting.py`) recompute independently of the TS engine. A disagreement is a red loop.
3. **HTTP script** against `pnpm dev:api` with `curl`, asserting the response body.
4. **Playwright** for UI: the component visual tests (`pnpm test:visual`, `pnpm test:visual:mobile`) or a throwaway script against `pnpm dev` asserting DOM, console, or network.
5. **Bisection** when it worked at a known commit: `git bisect run <loop-command>`.
6. **Human in the loop**, last resort: a small script that tells the human exactly what to click and captures what they report.

The loop is done when you can name one command that you have already run, and it is:

- **Red-capable.** It drives the real code path and asserts the user's exact symptom, not "didn't crash".
- **Deterministic.** Same verdict every run. For flaky bugs, raise the reproduction rate (loop it, add stress, pin time and seeds) until it is high enough to debug against.
- **Fast.** Seconds, not minutes.
- **Agent-runnable.** It runs unattended.

If you genuinely cannot build one, stop and say so: list what you tried and what access or artifact (logs, a HAR file, a screen recording) would unblock it.

## Phase 2: Reproduce and minimise

Run the loop and watch it go red with the failure the user described, not a nearby one. Then shrink the scenario one cut at a time (inputs, callers, config, steps), re-running after each, until every remaining element is load-bearing.

## Phase 3: Hypothesise

Write 3 to 5 ranked hypotheses before testing any. Each states its prediction: "If X is the cause, changing Y makes the bug disappear." A hypothesis without a prediction is a vibe; sharpen or drop it.

Check the obvious first: `git log -p` on the area since it last worked, recent dependency bumps in `pnpm-lock.yaml`, env differences between local, preview, and prelive.

## Phase 4: Instrument

Each probe tests one prediction. Change one variable at a time. Prefer a debugger or REPL over logs. Tag every temporary log with a unique prefix (`[DEBUG-a4f2]`) so cleanup is one grep. For performance, measure a baseline before changing anything.

When two fixes in a row fail on the same assumption, write that assumption down and test it directly before a third fix.

## Phase 5: Fix at the root

Trace the symptom back to the first place the system went wrong and fix it there. A guard or fallback at the symptom is a fix only when the state it handles is legitimate.

1. Turn the minimised repro into a regression test at a seam that exercises the real bug pattern.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass, then re-run the original Phase 1 loop.

If no honest seam exists for the test, say so in the PR. That is an architecture finding, not a reason to write a shallow test.

Pure packages (`packages/*`) stay pure while you debug: no network, DOM, or locale/timezone dependencies sneak in as part of a fix.

## Phase 6: Clean up

- The original loop passes.
- The regression test passes, or the missing seam is documented.
- `grep -rn "DEBUG-" .` finds nothing you added.
- Throwaway scripts are deleted.
- The PR names the hypothesis that turned out true, so the next debugger learns from it.
