---
name: deployment_ci
description: >-
  How excited.live builds, tests, and deploys through GitHub Actions: the three deploy tiers
  (PR previews, prelive, manual production), the workflow set, what CI enforces, secrets handling,
  the sanitized-branch preview aliases, and the current FRO-36 deploy failure. Use this skill when
  touching CI or workflow files, checking previews, or before handing a PR to Prame.
---

# Deployment & CI Skill

Three deploy tiers. PR previews are automatic, pushes to `main` go to prelive, and production is a manual human action. Agents never deploy to production. The one deploy an agent may run is `apps/api` to prelive (decided by Prame 2026-10-23). Its deploy path is not wired yet (#146): until that lands, there is nothing to run, so do not improvise a `wrangler deploy`. Every other deploy goes through the workflows.

Workflows live in `.github/workflows/`. All build and deploy workflows use Node 22 and pnpm 10.12.0; the 9 deploy workflows pin wrangler via `WRANGLER_VERSION`.

---

## 1. The three tiers

**Tier 1: PR previews (automatic).** On every `pull_request`, apps are built and deployed as aliases on Cloudflare Pages:
- Main webapp: `preview.yml` → project `excited-live`, jobs `preview-mock` (`VITE_API_MODE=mock`) and `preview-live` (`VITE_API_MODE=live`). Aliases `<sanitized-branch>-mock` and `<sanitized-branch>-live` on `*.excited-live.pages.dev`.
- Landing site: `landing-preview.yml` → project `excited-live-landing-preview`, single `preview` job, alias is the sanitized branch or `pr` when it comes out empty. Path-filtered to `apps/landingpage/**` plus the lockfile/turbo/workflow files.

The sanitized branch name: lowercased, every non `[a-z0-9-]` character becomes `-`, dashes trimmed, cut to 23 characters so a `-mock` / `-live` suffix still fits Cloudflare's 28-character alias limit.

**Tier 2: prelive (on push to `main`).**
- `prelive.yml` → `excited-live-prelive` (main webapp, `VITE_API_MODE=live`).
- `landing-prelive.yml` → `excited-live-landing-prelive` (path-filtered like landing-preview).

All three deploy with `--branch=main`.

**Tier 3: production (manual only).**
- `production.yml` → `excited-live` (app.excited.live). Triggered by `workflow_dispatch` with a `confirm` input that must be typed as `PROD`; the job checks `github.event.inputs.confirm == 'PROD'`.
- `landing-production.yml` → `excited-live-landing`, plain `workflow_dispatch` (no confirm field as of this audit; treat it extra carefully).

Agents never trigger production workflows, for any reason, including "just testing". Merges are Prame's call too.

## 2. The workflow set (15 files)

- Deploy tiers: `preview.yml` / `prelive.yml` / `production.yml` (main webapp), `landing-preview.yml` / `landing-prelive.yml` / `landing-production.yml`.
- `pr-tests.yml` ("PR Checks"): PR lint + affected-package tests (section 3).
- Preview metadata: `pr-description.yml`, `landing-pr-description.yml`. They run on `workflow_run` completion of the matching preview workflow and write the preview URLs into the PR body between the `AUTO-PREVIEWS` (main webapp), and `AUTO-LANDING-PREVIEWS` (landing) markers.
- Cleanup: `pr-cleanup.yml` removes preview deployments for the branch on `pull_request` closed, for both `excited-live` and `excited-live-landing-preview`.

## 3. What CI enforces (pr-tests.yml)

- **Lint**: whole-repo `pnpm lint --max-warnings=0` (flat config `eslint.config.mjs`). The warning budget is zero, so a local warning blocks the PR.
- **Tests**: only packages affected by the PR. The `detect` job diffs against the merge base and feeds a matrix; packages with a real test script run, packages without one are skipped. Root-level changes (lockfile, configs, `turbo.json`) trigger all packages that have tests.
- Runs on PR `opened`, `synchronize`, and `reopened`, with cancel-in-progress concurrency.
- **No app builds in PR Checks; turbo may still build upstream dependency packages for tested packages**. Builds happen inside the deploy workflows: main webapp runs `pnpm --filter @excited-live/webapp^... build && pnpm build` in `apps/webapp`; landing runs `pnpm exec turbo run build --filter=@excited-live/landingpage` (turbo builds the dependency chain first).
- On a docs-only PR expect: lint runs, test job skipped ("affected packages with tests: none").

## 4. The sanitize algorithm: 11 copies across 8 workflow files

The branch-name sanitization block is copy-pasted and must stay in sync. Verified audit (2026-10-04):
- Python copies: `preview.yml` (2: mock and live jobs), `landing-preview.yml` (2: deploy step and comment step), `pr-cleanup.yml` (1).
- JS copies: `pr-description.yml` (1), `landing-pr-description.yml` (1).

`DEVELOPMENT.md` says the algorithm "lives in several copies (preview.yml, landing-preview.yml, pr-cleanup.yml) plus the JS copy in each pr-description workflow". That text predates the landing workflows (`landing-preview.yml` was added later) and does not count the mock/live duplication inside the preview files. The audit above is the current reality. When you change the algorithm, update every copy and verify with:

```bash
grep -rln "SANITIZED_BRANCH\|sanitize" .github/workflows/
```

## 5. Secrets

- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exist only as GitHub repo secrets. Workflows reference them as `${{ secrets.CLOUDFLARE_API_TOKEN }}` / `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` in deploy steps.
- Never commit values, never echo them in logs, never paste them into PRs, comments, or issues. If you see a value in a diff, treat it as a security incident and remove it.

## 6. Generated files off-limits

- `apps/webapp/src/routeTree.gen.ts` (TanStack Router generates it).
- `pnpm-lock.yaml` (pnpm manages it; change dependencies via pnpm, not by editing).
- `dist/`, `.output/` (build outputs).
- The design-system theme outputs (`mastercard-theme.css`, `mastercard.js`, `mastercard.d.ts`) are generated too, but they are regenerated on purpose with `theme:build` and committed as part of the change. See the `design_system` skill.

## 7. Deploy failure triage (the FRO-36 story)

- Symptom: a deploy step fails with Cloudflare auth errors while the build, lint, and test steps ahead of it stay green. That is a repository credential problem, not your change.
- Response: do not attempt credential workarounds, do not edit workflows around it, do not re-run "until it works". Report the failure with the run link and stop; credentials are handled outside the repo.
- History: FRO-36 tracked a credential outage where PR preview and prelive deploy steps failed this way. The credential was restored on 2026-10-04 and deploys were verified working the same day: PR previews deployed and their aliases served HTTP 200, and a `main` merge deployed to prelive successfully. FRO-36 was in review at audit time.
- Known harmless noise: the `wrangler pages project create ... || true` line logs "A project with this name already exists. Choose a different project name. [code: 8000002]" on every run. It is tolerated. Judge the deploy by its own lines: "Deployment complete!" plus the alias URL.

## 8. Agent checklist around CI

1. Before opening a PR: run the narrowest relevant checks (`pnpm lint --max-warnings=0`, the affected package's tests). Do not run the whole workspace "just in case".
2. Push only your own commits: `git log origin/main..HEAD` first (shared clone rules in AGENTS.md).
3. After opening the PR: check `PR Checks`. Lint must be green; the test job may be skipped for docs-only changes. For deploy workflows, the build steps must pass and the deploy step should end with "Deployment complete!" plus an alias URL. A deploy auth failure against the Cloudflare API means the repo credential (section 7), not your change.
4. Never trigger production, never merge. Hand the PR to Prame; merges and production deploys wait for him. The only agent-run deploy is `apps/api` to prelive (section 1).
5. Report state honestly: which checks ran, which passed, which failed, and why.

## 9. Source of truth and known drift

Ground truth is `DEVELOPMENT.md` plus the workflow files themselves. Verified drift as of 2026-10-04:
- `DEVELOPMENT.md` documents the main webapp pipeline in detail but has no landing section, even though the landing tier (three workflows, plus cleanup and description) exists.
- Its sanitize section misses the landing copies and the mock/live duplication (section 4).
- Everything else it states was verified accurate: projects, alias limits, the `PROD` gate, path filters, and the tax build-through-turbo note.

Update `DEVELOPMENT.md` in the same PR when you change deploy behavior; it is the human-facing guide.
