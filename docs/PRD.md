# excited.live — PRD Overview

Status: agreed with Prame 2026-09-05 (5 interview rounds); split into phase files same day. Revised 2026-09-06 (self-serve pricing) and 2026-09-07 (docs/pricing.md Revision 3): $109/year subscription — AI unlimited for personal use (fair-use TBD), 7-day free trial, no BYOK on personal; Advisor tier $59/mo or $599/yr (AI via BYOK or credit packs).

excited.live is financial simulation software: "can I afford this life?" for Thai planners. Sold as a $109/year subscription — AI included and unmetered for personal use ("unlimited", fair-use TBD), 7-day free trial; Advisor tier $59/mo or $599/yr with AI via BYOK or credit packs ([pricing.md](pricing.md)); white-label revenue comes later (B2B2C).

Motto: "(I am) excited to live". FromSukong content funnels attention to excited.live.

## Phase files

1. [PRD — MVP (Google Sheet)](prd-mvp.md) — proves the math and UX with pure formulas. The sheet IS the spec: every tab ports 1:1 into the app later.
2. [PRD — MLP (Web App)](prd-mlp.md) — the Minimum Lovable Product: accounts, wizard, life-story chart, sliders, scenario toggles, AI/MCP.
3. [PRD — Post-MLP](prd-post-mlp.md) — trigger-based backlog: mobile, white-label, US tax, exit-tax realism, corporate tax, per-goal wallets, public API for your own AI.
4. [Pricing](pricing.md) — $109/year subscription (whole app gated, AI unlimited, 7-day free trial); Advisor tier $599/yr or $59/mo (5 client seats + unlimited 30-day trial clients, AI via BYOK or credits).
5. [PRD — Flows (all apps)](prd-flows.md) — flow-first specs for every app: what the user sees and does, screen by screen, with Mobbin reference links per flow. Features live in the phase files; flows live here.

## Principles shared by every phase

- P1: The MVP sheet is the spec — app modules port its tabs 1:1 (Tax tab ↔ packages/tax, Simulation tab ↔ packages/sim, Income/Expenses rows ↔ input schemas).
- P2: Engines stay pure TypeScript: no network, no DOM, no date/locale-dependent logic.
- P3: plan-service is the single backend boundary for the app.
- P4: All user-facing strings bilingual `{ en, th }`, EN first.
- P5: Astryx-first UI (@astryxdesign/core); custom components only for design-system gaps; raw HTML banned in apps/webapp/src.
- P6: TH tax is the only user-facing engine. The US engine stays registered in code, hidden, for future expansion.
- P7: ThaiESG only, everywhere user-facing (SSF is discontinued; code naming can lag, sheet + UI must not).
- P8: Every MVP simplification is documented in the sheet README.
- P9: The PRD is the source of truth for product scope. Before implementing anything, check the PRD first. The MVP will keep growing over time — new ideas go into the PRD (as user stories or backlog items) before they go into the sheet or code.

## Global non-goals (all phases)

- No brokerage/account execution — planning only.
- No enterprise features until the white-label phase (see prd-post-mlp.md).
