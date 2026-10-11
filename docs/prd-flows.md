# PRD - Flows (all apps)

Status: Revision 1, 2026-10-08. Companion to [PRD.md](PRD.md). Where the phase files specify features, this file specifies flows: what a person sees and does, screen by screen, in every app of the repo. Mobbin references are linked per flow as study pointers.

Shipped-state baseline: `main` @ `904a5f3`. Flows that exist in code carry `[shipped]`; flows in an open PR carry `[in review]`; everything else is `[planned]` and traces to a user story.

## 0. How to read this doc

- Flow-first. Each flow describes the experience, not the implementation. Route and screen names are given only where they already exist, so the doc stays honest about what is real today.
- One flow, one block: Goal, Entry, Steps, States, Exit, Route / screen, Status, References.
- Status legend: `[shipped]` on `main`, `[in review]` in an open PR, `[planned]` backlog (user story in brackets).
- References are pointers to study, never copied. Our principles (P1-P9 in [PRD.md](PRD.md)) and our design language ([DESIGN.md](../DESIGN.md)) win wherever a reference conflicts. Deviations are collected in section 8.
- Copy stays bilingual-aware: EN first, `{ en, th }` per P4. Thai is casual, short, spoken. No em-dashes in EN. No AI-isms.
- Post-MLP items with no shipped flow are outlines only, marked `outline`.

App map:

| App | What it is | Route root |
| --- | --- | --- |
| `apps/webapp` | Core product. Plan, chart, inputs, assistant. | `/_layout` |
| `apps/tax-webapp` | Standalone TH/US income-tax calculator. | `/` |
| `apps/tax-mobile` | Tauri v2 Android scaffold. View/summarize first. | `/`, `/about` |
| `apps/landingpage` | Marketing, waitlist, blog, docs. | `/` |
| `apps/api` | BFF. Not user-facing, specced as the boundary in section 5. | `/api/v1` |

## 1. webapp

### F-01 First visit and sign-in `[shipped]`

Goal: a new visitor understands what the app is, can enter without friction, and has an account so the plan saves (US-100).
Entry: any webapp URL. `/_layout` resolves auth server-side before the dashboard renders.
Steps:
1. The page renders the dashboard shell. The topbar shows the wordmark, the "plan / settings" nav, a sync indicator, the EN/TH toggle, and the auth slot (`Topbar`, `TopbarAuth`).
2. Auth is unconfigured (local mock, PR preview): the auth slot renders nothing and the visitor works in a local mock plan. No dead end.
3. Auth is configured and there is no session: the slot shows a sign-in link, and the user lands back where they left off.
4. Auth is configured and there is a session: the slot shows the first name (or email) and a sign-out link.
5. Sign-in leaves the app and returns, handled by the hosted provider.
States: empty, the sign-in link. loading, the dashboard shell renders with the chart panel filled by `Suspense`. error, auth resolution is server-side and a failure falls back to the guest path.
Exit: signed in, on the dashboard with a saved plan. Or guest, on the dashboard with a local plan.
Route / screen: `/_layout` (`__root.tsx`, `_layout.tsx`), `TopbarAuth`; auth routes `/api/auth/sign-in`, `/api/auth/callback`, `/api/auth/sign-out` (WorkOS AuthKit), return param `returnPathname`.
References:
- [Monarch: Dashboard](https://mobbin.com/flows/38ad0506-1509-44dc-86c2-b8c0904cac81) (ref01 + ref02). Borrow the idea that the first thing behind a fresh sign-in is a small get-started card, then the real dashboard. We keep our own sign-in: no standalone marketing screen inside the app.
- [Rocket Money: Onboarding](https://mobbin.com/flows/fed2772b-6edd-432f-b195-0691f2d84d04). Borrow the paced, brand-forward entry feel. Our entry is lighter: one link, then the shell.
- No reference in the set covers the sign-in form itself (WorkOS hosted). Stated, not forced.
- Copy note: sign-in link `{ en: "Sign in", th: "เข้าสู่ระบบ" }`; signed-in label uses the first name; sign-out `{ en: "Sign out", th: "ออกจากระบบ" }`.

### F-02 First-run wizard `[in review]` (US-101, PR #87)

Goal: a new user answers a short guided flow (income, expenses, retirement, goals) and lands on the chart with a complete plan, instead of facing a raw input grid.
Entry: right after first sign-in, or the first time an empty plan is detected on `/_layout/`.
Steps:
1. Step 1, income. One primary amount, TH defaults pre-filled. Short helper line under the field. Skip is allowed.
2. Step 2, expenses. Common TH categories as rows, amounts editable, add-row for the rest.
3. Step 3, retirement wish. Retirement age and target monthly spend, with a plain-language hint.
4. Step 4, goals. One or more life goals (a home, a car, a sabbatical) with a year.
5. Progress is visible across the four steps. Every answer is editable later in the full inputs.
6. On finish, the wizard writes the plan and lands on the life-story chart (`/_layout/`).
States: empty, skipped steps fall back to sensible TH defaults. loading, per-step save is optimistic then reconciled. error, a failed save keeps the user in the step with a retry, never loses typed input.
Exit: the chart, with a complete first plan.
Route / screen: wizard steps feed `/_layout/` (`home.tsx`). Wizard UI arrives with PR #87.
References:
- [Rocket Money: Onboarding](https://mobbin.com/flows/fed2772b-6edd-432f-b195-0691f2d84d04). Borrow the compact, brand-forward pacing for our 4-step wizard.
- [Rocket Money: Setting up budgeting](https://mobbin.com/flows/d4cc0f80-7fe5-4bcb-b0d7-64617e591927). Borrow the deeper income-plus-expenses setup as the shape of optional steps after the wizard.
- [YNAB: Setting up account](https://mobbin.com/flows/dd621846-2646-48f2-bf88-c5a0e6fc31a7). Borrow skip-ability only. We do not copy its length: ours is 4 steps, theirs is 20 screens.
- [YNAB: Edit plan (onboarding)](https://mobbin.com/flows/bfd5b61e-fff0-4efa-9088-0b4a8154a190). Borrow editing inputs inside onboarding without a context switch.
- [Monarch: Dashboard](https://mobbin.com/flows/38ad0506-1509-44dc-86c2-b8c0904cac81). Borrow the get-started checklist card for anything the wizard skipped.
- Copy note: step titles short and spoken, `{ en: "Your income", th: "รายได้ของคุณ" }`, `{ en: "What you spend", th: "ใช้จ่ายอะไรบ้าง" }`, `{ en: "Your retirement", th: "เกษียณแล้วอยากได้เท่าไหร่" }`, `{ en: "Your goals", th: "เป้าหมายของคุณ" }`.

### F-03 Returning home, chart first `[shipped]` (US-102, US-110)

Goal: a returning user sees one chart of the whole life plan and the headline answer, in under two seconds.
Entry: `/_layout/` (`home.tsx`). The default route after sign-in and after the wizard.
Steps:
1. The chart panel loads the plan, then the chart. Metric toggle: net worth (default) or cash flow.
2. Horizon switch: 10 / 20 / 30 / 40 / all, default 30.
3. The chart draws the projection line, milestone markers, and, on the net-worth metric, a shaded P10-P90 Monte Carlo band (US-110, seeded, same plan gives the same band).
4. A band caption reads the trials and survival share, for example survival across 200 market scenarios, and flags the first year the band dips below zero.
5. Hovering a year highlights it and drives the detail readouts.
6. The right rail is the assistant (F-07). The left column starts on the financials snapshot and can switch to milestone, income, expenses, assets, liabilities (F-04).
States: empty, a plan that loads but has no years shows the empty-state copy. loading, both panels show the synced-today text. error, the chart panel shows an empty state with a reload button and guarantees no child endpoints are called; the band caption shows its own retry.
Exit: the user reads the verdict, then edits inputs (F-04) or asks the assistant (F-07).
Route / screen: `/_layout/` (`pages/home/home.tsx`, `ProjectionChart`, `usePlanDashboard`).
References:
- [Monarch: Dashboard](https://mobbin.com/flows/38ad0506-1509-44dc-86c2-b8c0904cac81) (ref01 + ref02). Borrow the card-then-dashboard rhythm and the calm first-run state on the real dashboard.
- [Revolut: Total wealth](https://mobbin.com/flows/4d7d43ff-a7ed-4832-924b-877cbe5f4b42). Borrow the wealth-over-time chart with a breakdown under it.
- [Rocket Money: Net worth](https://mobbin.com/flows/e8cb309e-05c4-446c-b7af-cb60285e575a). Borrow the minimal trend presentation.
- [YNAB: Net worth](https://mobbin.com/flows/9e8ba691-809b-4835-8424-137f22d68aa9). Borrow the one-number-plus-one-trend simplicity for the mobile-width chart.
- [Fidelity: Planning](https://mobbin.com/flows/8b93d0cc-5f46-4980-b7ad-4d99147bda7e). Borrow the mobile planning entry so the narrow-width chart page still reads as a planning tool.
- [Quicken: Calculating retirement projections](https://mobbin.com/flows/16d37ef8-fe5c-4316-9b37-b36e375c532f) (ref04). Borrow the high / expected / low framing and the assumptions panel placed next to the projection.
- Copy note: keep the headline plain, `{ en: "Your plan is on track", th: "แผนของคุณไปได้สวย" }`, `{ en: "You run out in {year}", th: "เงินหมดปี {year}" }`. No hype.

### F-04 Editing inputs `[shipped]` (US-103)

Goal: the user edits any plan input and sees the projection recompute live.
Entry: the left column tabs on `/_layout/`: financials, milestone, income, expenses, assets, liabilities.
Steps:
1. The user picks a tab. Income and expense tabs render grouped period rows. Asset and liability tabs render grouped value rows. The milestone tab renders the milestone list.
2. Add opens the type picker when the type is open, or a dialog locked to a type when the row action came from a type.
3. The entry dialog captures amount, frequency, and start / end period. The value dialog captures an amount and owner. The milestone dialog captures a label and a year.
4. Save writes through the plan service and recomputes the summary in one pass. The chart and rail update.
5. Edit reopens the same dialog prefilled. Remove deletes from the dialog footer.
6. The financials tab is a read-only snapshot of the headline metrics.
States: empty, a tab with no rows shows its add affordance. loading, the dialog save button shows a busy state. error, a failed save keeps the dialog open with a retry.
Exit: back on the chart with the new numbers.
Route / screen: `/_layout/`, `EntryDialog`, `ValueDialog`, `MilestoneDialog`, `TypePickerDialog`, `GroupedPeriodTable`, `GroupedValueTable`.
References:
- [Quicken: Setting a custom amount](https://mobbin.com/flows/09202d2f-5c1d-407f-b9f9-36d302b8d802). Borrow the amount-entry step shape: one field, one confirm.
- [YNAB: Edit plan (onboarding)](https://mobbin.com/flows/bfd5b61e-fff0-4efa-9088-0b4a8154a190). Borrow editing a plan input in place, keeping the surrounding context visible.
- [YNAB: Adding an expected income](https://mobbin.com/flows/05580d79-3fd8-4765-83cd-5623a6cc232d). Borrow the income-row pattern; it mirrors Thai income-type complexity.
- Copy note: dialog actions short, `{ en: "Save", th: "บันทึก" }`, `{ en: "Remove", th: "ลบ" }`, `{ en: "Add", th: "เพิ่ม" }`.

### F-05 Scenario toggles `[planned]` (US-104)

Goal: the user turns whole plan blocks on and off (buy a condo, a second kid, a sabbatical year) and sees the impact instantly.
Entry: the chart page, a scenario strip above the chart or beside the left tabs.
Steps:
1. Each scenario is a labeled toggle that maps to a grouped set of plan rows.
2. Toggling off removes those rows from the simulation and updates the chart and headline answers without a reload.
3. Toggling on restores them.
4. Toggle state persists per saved plan.
States: empty, no scenarios defined yet shows a single create affordance. loading, a toggle flips optimistically and reconciles. error, a failed persist reverts the toggle and surfaces a retry.
Exit: the user keeps comparing on and off without leaving the chart.
Route / screen: `/_layout/`, planned.
References:
- [Origin: Creating a forecast](https://mobbin.com/flows/79ca4173-bc72-431c-b8e8-c966d0dee0b4) (ref03). Borrow the desktop entry into a scenario and its step-by-step setup; this is our closest desktop analog.
- [Quicken: Planning tools](https://mobbin.com/flows/60d65df9-072f-427e-81c3-c4041e22888c). Borrow the tool-switcher layout so scenarios and the tax tab share one arrangement.
- Copy note: `{ en: "On", th: "เปิด" }` / `{ en: "Off", th: "ปิด" }`, scenario label short and concrete.

### F-06 What-if sliders `[planned]` (US-105)

Goal: the user drags savings rate, return rate, and retirement age and watches the future move.
Entry: the chart page, a slider panel next to the chart.
Steps:
1. Three sliders, each with the live value shown next to it.
2. Dragging recomputes the projection in under 100ms (pure engines). The chart follows the drag.
3. Slider values are real inputs, saved with the plan, and editable later as fields.
States: empty, sliders sit at the plan's current values. loading, none, the recompute is synchronous. error, an invalid combination keeps the last good chart and shows an inline note.
Exit: the user found a setting worth keeping; it is already saved.
Route / screen: `/_layout/`, planned.
References:
- [Origin: Creating a forecast](https://mobbin.com/flows/79ca4173-bc72-431c-b8e8-c966d0dee0b4) (ref03). Borrow the desktop scenario setup that ends in a live forecast.
- [Origin: Forecast](https://mobbin.com/flows/d3023e81-39b1-42f5-938c-3369d884c70d). Borrow the result view where the chart and the assumptions sit together.
- No reference in the set shows draggable sliders specifically. Stated, not forced. Our slider look follows our own design language.
- Copy note: slider labels short, `{ en: "Savings", th: "ออม" }`, `{ en: "Return", th: "ผลตอบแทน" }`, `{ en: "Retire at", th: "เกษียณอายุ" }`.

### F-07 AI proposal accept and reject `[shipped: canned demo]` `[planned: live]` (US-103, US-106)

Goal: the assistant proposes plan changes as a diff; nothing changes until the user accepts on the web.
Entry: the right rail on `/_layout/` (`AssistantRail`). The rail is always present.
Steps (shipped, canned): the user types a question; the rail shows tool calls moving from running to complete, then a summary computed from the live plan.
Steps (planned, live, US-103 / US-106):
1. The user asks the assistant a question or a proposal request.
2. The assistant answers or returns a proposal rendered as a before / after diff.
3. The user reviews the diff, then accepts or rejects. Accept applies through the plan service; reject discards.
4. Nothing applies without explicit web acceptance (the invariant).
States: empty, the rail shows the empty-chat line. loading, tool-call rows animate running, then complete. error, a failed proposal shows an inline error with a retry, and the plan is untouched.
Exit: the plan updated by acceptance, or unchanged by rejection.
Route / screen: `/_layout/`, `AssistantRail`, `ChatComposer`, `ChatToolCalls`.
References:
- [Notion: Accepting a suggestion](https://mobbin.com/flows/bbda6c3f-0904-4504-a923-ac03f2be068a). Borrow the inline suggestion, review, accept pattern; closest to our propose and accept flow.
- [Notion: Accepting a suggestion, variant](https://mobbin.com/flows/560a793b-5990-43da-8cb7-be53d7290b08). Borrow the same pattern with more surrounding context.
- [Contractbook: Accepting a suggestion](https://mobbin.com/flows/4034d096-8171-4777-9370-26eed2b5c6d2). Borrow the minimal three-step accept.
- [Langdock: Adding suggestion to edit](https://mobbin.com/flows/23c25e1d-38d3-4baa-a18b-f5e8cf27e110). Borrow attaching a suggestion to a concrete edit.
- [Google Health (Fitbit): Chatting with Coach](https://mobbin.com/flows/3b889d3b-d715-443c-af8c-cd53789e6dd5). Borrow the assistant conversation surface for the rail.
- Copy note: intent verbs only, `{ en: "Accept", th: "ใช้ค่านี้" }`, `{ en: "Reject", th: "ไม่ใช้" }`. The rail never auto-applies.

### F-08 Tax tab, optimizer and real return `[planned]` (US-107)

Goal: the user sees the same ThaiESG / RMF recommendation and real-return comparison as the sheet, computed by our engines.
Entry: a tax tab or tool inside `/_layout/`, arranged like the other planning tools.
Steps:
1. The user opens the tax tool. The cutoff dropdown and the recommended contribution amount are the primary controls.
2. A headline shows tax saved in baht for the recommended amount.
3. A real-return headline shows the comparison, with an expandable per-year table.
4. TH only user-facing (US-109). No US path here.
States: empty, with no income the tool explains what it needs instead of showing zeros as an answer. loading, recompute is quick and shows the last good numbers while it settles. error, an invalid input disables the recommendation with an inline reason.
Exit: the user takes the recommended amount back to their plan.
Route / screen: `/_layout/`, planned tax tool.
References:
- [Quicken: Planning tools](https://mobbin.com/flows/60d65df9-072f-427e-81c3-c4041e22888c). Borrow the tool-switcher layout for the tax tab arrangement.
- [Quicken: Calculating retirement projections](https://mobbin.com/flows/16d37ef8-fe5c-4316-9b37-b36e375c532f) (ref04). Borrow the assumptions panel beside the projection.
- [Oyster: Using equity tax calculator](https://mobbin.com/flows/31f6a976-539f-4ece-bbad-a9ca5db1a9f0) (ref06). Borrow the methodology note that keeps an estimate honest.
- Copy note: honest framing, `{ en: "Estimated tax saved", th: "ภาษีที่ประหยัดได้ (ประมาณ)" }`.

### F-09 Settings `[shipped]`

Goal: the user sets the profile facts the plan needs and nothing more.
Entry: the settings tab in the topbar, `/_layout/settings`.
Steps:
1. The page shows a short note on what settings are for.
2. Fields: name, birthday, gender.
3. Edits save through the settings service and reload clean.
States: empty, a new user sees defaults with birthday unset. loading, the panel shows the synced-today text. error, the panel shows an empty state with reload.
Exit: back to the plan with the profile saved.
Route / screen: `/_layout/settings` (`pages/settings/settings.tsx`).
References:
- No reference in the set covers a settings form. Stated, not forced. Our settings stay on our own design language: one short page, three fields, no tabs.
- Copy note: `{ en: "Your name", th: "ชื่อของคุณ" }`, `{ en: "Birthday", th: "วันเกิด" }`, `{ en: "Gender", th: "เพศ" }`.

### F-10 Trial to subscription `[planned]` (US-106)

Goal: every new account gets a 7-day full-access trial; after it, a $109/year plan gates the whole app. Advisor tier is $59/month or $599/year.
Entry: a plan or trial banner in the topbar, and a wall when a gated action is reached.
Steps:
1. A new account starts a 7-day trial with full access, one trial per person (assumed).
2. The trial state is visible in the topbar, with days left.
3. When the trial ends, gated actions route to the subscribe screen.
4. The subscribe screen shows one recommendation, the yearly price, and the trial status. There is a skip option while the trial is active.
5. Purchase at launch is manual PromptPay activation ([pricing.md](pricing.md) Revision 3), so the screen explains the step and then confirms activation.
6. Advisor tier shows seat count and client seats on the same screen, for advisor accounts.
States: empty, no subscription yet shows the trial start. loading, activation is pending until confirmed. error, a failed activation keeps the plan state and shows how to retry.
Exit: subscribed, back on the plan with the gate lifted.
Route / screen: planned. Billing crosses the api boundary (section 5, B-6).
References:
- [Semrush: Upgrading a plan](https://mobbin.com/flows/336112e3-8d59-4359-a5de-141ae6379f6b) (ref05). Borrow the plan recommendation and the 7-day trial with a skip option; near-exact parallel to our flow.
- [Evernote: Subscribing to a plan](https://mobbin.com/flows/8be6375d-6615-4720-85b7-e3e5e255cdf3). Borrow the classic subscribe path.
- [beehiiv: Subscriptions](https://mobbin.com/flows/e5e8043a-75b5-41a1-8ade-28c5088ca7dc) and [View plan](https://mobbin.com/flows/c8533edf-f4ce-466a-a4d8-aa47af2dd428). Borrow the plan status and manage screens.
- Copy note: plain money talk, `{ en: "7 days free", th: "ทดลองฟรี 7 วัน" }`, `{ en: "$109 a year", th: "$109 ต่อปี" }`.

### F-11 Advisor workspace `outline` (phase 3)

Goal (outline only): an advisor manages several clients, each with their own plan and consent.
Outline: a client list, a client detail panel with the plan summary, an invite flow for client seats, and a per-client AI usage control. Plans always belong to the client. Nothing here starts until the white-label trigger fires ([prd-post-mlp.md](prd-post-mlp.md) section 3).
References:
- [QuickBooks: Customer hub](https://mobbin.com/flows/9c451ace-4365-4c25-b676-7035bba43a72). Borrow the client hub layout.
- [Copilot: Client detail](https://mobbin.com/flows/d2652c8f-f9ba-4b9b-9bc1-a19c39a42d4f). Borrow the client detail panel.
- [Time2book: Clients](https://mobbin.com/flows/35ea68d4-c9e9-49ff-accf-934bb34438bc). Borrow the client list pattern.

## 2. tax-webapp

### F-20 Open, language, country `[shipped]`

Goal: a visitor answers one question, how much income tax will I pay, live in the browser, without an account.
Entry: `/`. Single route.
Steps:
1. The header shows the brand lockup, the app name, and an EN / ไทย segmented toggle.
2. The hero states the question in one line and one sub-line.
3. A country switch offers Thailand and United States. Choosing US shows a placeholder banner and a placeholder badge.
States: empty, the form starts with empty money fields, visibly untouched, not zeroes. loading, a small query-status line confirms the engine sync. error, a validation problem zeroes the result and lists the warnings in the assumptions panel.
Exit: the visitor reads a number, or continues to more inputs.
Route / screen: `/` (`apps/tax-webapp/src/routes/index.tsx`).
References:
- [Oyster: Using salary insights tool](https://mobbin.com/flows/1370cef5-5f96-4089-9d8a-2f6f5116cb74). Borrow the number-forward tool framing.
- [Airbnb: Estimating earnings](https://mobbin.com/flows/623a1812-f435-4989-81d0-23a2644396ad). Borrow the income-to-number estimate framing for the hero.
- Copy note: hero `{ en: "How much income tax will you pay?", th: "คุณจะจ่ายภาษีเท่าไหร่?" }`, sub `{ en: "Estimate your individual income tax, live, in your browser.", th: "ประเมินภาษีเงินได้บุคคลธรรมดาแบบสด ๆ ในเบราว์เซอร์" }`.

### F-21 Enter income `[shipped]`

Goal: the visitor enters gross income per Thai income type, with expense deductions applied automatically.
Entry: the income card in the left column.
Steps:
1. One money field per income category from the engine config (employment first by default).
2. Typing shows live thousand separators and keeps the caret in place.
3. Leaving a field empty keeps it empty, not zero.
4. The result panel updates on each valid keystroke.
States: empty, fields are visibly empty. loading, none. error, half-typed text reverts on blur rather than committing junk.
Exit: move on to deductions.
Route / screen: `/`, `MoneyInput`, income card.
References:
- [YNAB: Adding an expected income](https://mobbin.com/flows/05580d79-3fd8-4765-83cd-5623a6cc232d). Borrow income entry rows; it mirrors Thai income-type complexity.
- [Quicken: Setting a custom amount](https://mobbin.com/flows/09202d2f-5c1d-407f-b9f9-36d302b8d802). Borrow the single amount-entry step.
- Copy note: hints short, `{ en: "Gross amounts per income type. Expense deductions are applied automatically.", th: "กรอกรายได้ขั้นต้นของแต่ละประเภท ระบบจะหักค่าใช้จ่ายให้อัตโนมัติ" }`.

### F-22 Deductions and household `[shipped]`

Goal: the visitor adds what they actually paid; caps apply themselves.
Entry: the deductions card and the allowances card.
Steps:
1. Deduction fields: insurance, mortgage interest, donations, then SSF, RMF, provident fund.
2. The household picker offers single, married, married with kids, with parents, and pre-fills the common setup.
3. Family allowance counters step up and down with clear limits.
4. The personal allowance is always included and shown as such.
5. Tax already paid: withheld at source and paid in advance.
States: empty, fields empty. loading, none. error, a value over a cap is counted at the cap and the savings panel marks it as capped.
Exit: read results.
Route / screen: `/`, `AllowanceSection`, `CountStepper`.
References:
- [Oyster: Using equity tax calculator](https://mobbin.com/flows/31f6a976-539f-4ece-bbad-a9ca5db1a9f0) (ref06). Borrow inputs-with-results and the methodology note; matches our honest-estimate posture.
- Copy note: deduction labels plain Thai, `{ en: "Insurance premiums", th: "เบี้ยประกันภัย" }`, `{ en: "Provident fund", th: "กองทุนสำรองเลี้ยงชีพ" }`.

### F-23 Read results `[shipped]`

Goal: the visitor sees net tax, what it is made of, and what the deductions saved, without spin.
Entry: the results column.
Steps:
1. Net tax headline, with a balance line: refund, to pay, or fully settled.
2. A metric list walks gross income, expense deductions, assessable income, itemized deductions, allowances, taxable income, tax liability, credits, effective rate, marginal rate.
3. A savings panel compares without deductions and with deductions, then lists the exact saving per line and marks capped lines.
4. A bracket table shows each bracket, rate, taxable amount, and tax; untouched brackets render as a dash.
5. An assumptions panel lists the engine's simplifications and any warnings.
States: empty, all-zero inputs give a zero result with the engine warnings listed. loading, none. error, validation problems are listed in the assumptions panel.
Exit: adjust inputs, or move to the webapp.
Route / screen: `/`, results column, `SavingsPanel`, `BracketRow`.
References:
- [Oyster: Using salary insights tool](https://mobbin.com/flows/1370cef5-5f96-4089-9d8a-2f6f5116cb74). Borrow the number-forward result list.
- [Quicken: Calculating retirement projections](https://mobbin.com/flows/16d37ef8-fe5c-4316-9b37-b36e375c532f) (ref04). Borrow the assumptions panel as a first-class result, not a footnote.
- Copy note: `{ en: "Net tax", th: "ภาษีที่ต้องชำระ" }`, `{ en: "You save", th: "คุณประหยัดได้" }`, `{ en: "Fully settled", th: "ชำระครบแล้ว" }`.

### F-24 Cross-link into webapp `[planned]`

Goal: a visitor who has outgrown the calculator continues in the webapp with their numbers carried over.
Entry: a quiet continue link under the results.
Steps:
1. The link hands the entered income and household values to the webapp's first-run path.
2. The visitor lands in the wizard or chart with those values prefilled, and can create an account from there.
States: empty, no entered values means the link just goes to the webapp start. loading, a light handoff. error, a failed handoff drops to the plain webapp start, never a dead end.
Exit: the visitor is in the webapp with a starting plan.
Route / screen: planned cross-app link from `/` to the webapp first-run.
References:
- [Airbnb: Estimating earnings](https://mobbin.com/flows/623a1812-f435-4989-81d0-23a2644396ad). Borrow the estimate-to-action handoff framing.
- No reference in the set covers a cross-app handoff. Stated, not forced.

## 3. tax-mobile

### F-30 Launch `[shipped: scaffold]`

Goal: the app opens fast to a single calculator, no account, no setup.
Entry: app launch, `/`.
Steps:
1. Splash, then the calculator. The about link sits in a corner.
States: empty, the calculator opens with an example gross income. loading, a short query-status check. error, a plain error line with retry.
Exit: type a number.
Route / screen: `/` (`apps/tax-mobile/src/routes/index.tsx`, Tauri v2 Android scaffold).
References:
- [Cash App: Taxes](https://mobbin.com/flows/bc295407-7f31-420e-b70f-1acd7e7fd8c0). Borrow the compact tax entry point.
- Copy note: keep it three words, `{ en: "How much tax?", th: "ภาษีเท่าไหร่?" }`.

### F-31 Calculator steps `[planned]`

Goal: a step-by-step tax estimate on a phone, help available at each step.
Entry: the open calculator.
Steps:
1. Income first, one field, big number pad.
2. Then optional deductions, one screen, skippable.
3. Then household, one screen, skippable.
4. A progress hint and a help affordance on each step.
States: empty, skippable steps default to TH values. loading, compute is local, so results appear without a spinner. error, invalid input blocks the next step with a reason.
Exit: results.
Route / screen: `/`, planned.
References:
- [Cash App: Estimating tax refund](https://mobbin.com/flows/96be6863-50d1-41b7-8151-d78322c5f2e3) (ref07). Borrow the step-by-step tax estimate on mobile, help landing into the estimate.
- [Origin: Tax](https://mobbin.com/flows/d37108b7-2e4e-4d9b-88d2-1c7783324a5c). Borrow the tax summary screens on mobile.

### F-32 Results `[planned]`

Goal: one screen, one number, plus what it is made of.
Entry: the end of the calculator steps.
Steps:
1. Net tax as the hero number.
2. Three or four supporting metrics below it.
3. A short assumptions note, collapsed by default.
States: empty, not reachable with no input. loading, none. error, inline note if validation fails.
Exit: share or restart.
Route / screen: `/`, planned.
References:
- [Origin: Tax](https://mobbin.com/flows/d37108b7-2e4e-4d9b-88d2-1c7783324a5c). Borrow the mobile tax summary.
- [Cash App: Estimating tax refund](https://mobbin.com/flows/96be6863-50d1-41b7-8151-d78322c5f2e3) (ref07). Borrow keeping the estimate shareable and calm.

## 4. landingpage

### F-40 First visit, hero `[shipped]`

Goal: a first-time visitor gets the one-line promise and one clear action.
Entry: `/`, the hero with the waitlist id.
Steps:
1. The nav pill links to what, perks, blog, docs, and a join button.
2. The hero headline is one promise, with a small eyebrow above it.
3. A hero graphic shows a projection with a goal chip and a reached chip.
4. Three perk chips sit under the sub-line: battle-tested math, AI native, data safe.
5. The waitlist form sits in the hero.
States: empty, not applicable. loading, none, it is static. error, none on the page itself.
Exit: join the waitlist, or scroll to the demo.
Route / screen: `/` (`apps/landingpage/src/pages/index.astro`).
References:
- [ISO Meet](https://mobbin.com/sites/sections/c494bf4c-177f-4b26-830f-1168406fd48f) (ref08). Borrow the waitlist section shape: one promise, one field, one button.
- [Base](https://mobbin.com/sites/sections/75fb9e38-9f05-494f-92ab-86ff2a2e5efd). Borrow waitlist section rhythm and spacing.
- Copy note: headline `{ en: "Plan the life you want to live", th: "วางแผนชีวิตที่คุณอยากใช้จริง" }`, sub `{ en: "Simulate your money and your plans before you live them. Tax, expenses, and life goals. Try everything free for 7 days.", th: "จำลองการเงินและแผนชีวิตก่อนใช้จริง ภาษี ค่าใช้จ่าย และเป้าหมายต่าง ๆ ทดลองใช้ฟรี 7 วัน" }`.
- Pricing-honesty note: the shipped hero still says "free for everyone". That copy is stale against [pricing.md](pricing.md) Revision 3, which gates the whole app and makes the 7-day trial the only free access. This doc states the trial framing; the landing page copy needs a matching fix in a later code PR (docs only here, so it is flagged, not changed).

### F-41 Demo `[shipped]`

Goal: the visitor sees the product move, not a promise.
Entry: the demo section, id demo.
Steps:
1. A desktop app frame with real screenshots cycles through a short sequence.
2. A typing overlay shows a number being entered and the chart reacting.
3. Three step labels under it: set your plan, check cash flow, read the verdict.
States: empty, not applicable. loading, images lazy-load with a tinted placeholder. error, if an image fails the frame still shows the step labels.
Exit: join the waitlist, or read what is it.
Route / screen: `/`, demo section, local demo webp set.
References:
- [Revolut: Total wealth](https://mobbin.com/flows/4d7d43ff-a7ed-4832-924b-877cbe5f4b42). Borrow the wealth chart as the visual hero of the demo.
- No reference in the set covers a screenshot carousel in a hero frame. Stated, not forced.
- Copy note: `{ en: "Type a number. Watch everything move.", th: "พิมพ์ตัวเลข แล้วดูทุกอย่างเคลื่อนที่" }`.

### F-42 Waitlist `[shipped]`

Goal: capture an email with one field and one button.
Entry: the hero form and the footer form (dark variant).
Steps:
1. The visitor types an email and submits.
2. Invalid email shows an inline message and stays in the field.
3. Sending shows a busy label.
4. Success replaces the form with a check and a confirmation.
5. Network failure still saves the email on the device, so nobody is lost, and shows a try-again-later message.
6. A hidden honeypot silently accepts bot submissions.
States: empty, the plain form plus the no-spam note. loading, the button reads joining. error, either the invalid-email line or the saved-on-device line.
Exit: success, with the founding-member framing.
Route / screen: `/`, `WaitlistForm` (posts to the n8n webhook; source is hero or footer).
References:
- [ISO Meet](https://mobbin.com/sites/sections/c494bf4c-177f-4b26-830f-1168406fd48f) (ref08). Borrow the minimal waitlist block.
- [Threads](https://mobbin.com/sites/sections/c8e9015d-f414-4f69-ba88-c0b7a4cae42c). Borrow the waitlist treatment in a footer at scale.
- Copy note: success `{ en: "You're on the list!", th: "อยู่ในลิสต์แล้ว!" }`, note `{ en: "No spam, one email at launch, that's it.", th: "ไม่สแปม ส่งแค่อีเมลตอนเปิดตัวครั้งเดียว" }`.

### F-43 Blog and docs `[shipped]`

Goal: a reader who wants depth finds articles and reference docs without leaving the brand.
Entry: the blog link and the docs link in the nav and footer.
Steps:
1. Blog index lists posts with a title and a short description.
2. A post page renders the article, with a slides variant and a generated OG image.
3. Docs render from content, starting with the index, privacy, and terms pages, with a docs nav and search.
States: empty, the blog index with no posts shows a simple list. loading, static. error, a missing slug shows the not-found path.
Exit: back to the site, or join the waitlist from the footer.
Route / screen: `/blog`, `/blog/[slug]`, `/docs/[...slug]`, `/og/*`, `/sitemap.xml`, `/api/search.json`.
References:
- No reference in the set covers an article or a docs reading flow. Stated, not forced. Article layout and the docs nav stay on our own design language.
- Copy note: keep article titles plain and concrete, no clickbait.

### F-44 Pricing page `[planned]` (outline) ([pricing.md](pricing.md) Revision 3)

Goal (outline only): a visitor reads what they get, what the trial includes, and what it costs, then starts the trial or signs up.
Outline: one plan card for the $109/year personal plan with the 7-day trial, a quieter Advisor tier card ($59/month or $599/year), and a short FAQ. No pricing page exists yet, so this is an outline.
States: empty and loading not applicable (static page). error, none on the page itself.
Exit: start the trial, or return to the hero.
Route / screen: `/pricing`, planned. The three pricing sections in the reference set land here.
References:
- [Mailchimp pricing section](https://mobbin.com/sites/sections/3eefd7ba-1398-453d-9c7b-0dac1d869c40). Borrow the plan-tier rhythm and the plain per-plan benefit list.
- [Framer pricing section](https://mobbin.com/sites/sections/7506bd76-c42f-431d-8478-8f477d4ba895). Borrow the clean two-tier contrast and the short FAQ below it.
- [Revolut pricing section](https://mobbin.com/sites/sections/cac16ee8-d037-4b22-8de1-5eedc7457b1a). Borrow the tiered-plan layout for the personal-plus-advisor pair.
- Copy note: plain money talk, `{ en: "$109 a year, 7 days free", th: "$109 ต่อปี ทดลองฟรี 7 วัน" }`.

## 5. api boundary (not user-facing)

The api is the single boundary every flow crosses (P3). Specced here so flows stay honest about what talks to what. No screen, no route.

- B-1 Auth. The webapp resolves the session server-side (WorkOS AuthKit) and forwards the user identity to the backend as `x-user-id` / `x-user-email` through the BFF proxy (`bff-proxy.ts`). Guests fall through to a default identity.
- B-2 Plan load and save. `GET /api/v1/plan` returns the plan for the user. `PUT /api/v1/plan` saves it. Flows F-02, F-04, F-05, F-06, F-07 all cross here. Persistence is D1 in the deployment, a local SQLite file in dev and test.
- B-3 Sim compute. `POST /api/v1/sim/monte-carlo` takes `{ plan, config? }` and returns bands. `POST /api/v1/sim/simulate` returns the deterministic run. The webapp falls back to the pure engines when the endpoint is unavailable, so the chart never blocks on the network.
- B-4 Settings. `GET` and `PUT /api/v1/settings` read and write the profile used by F-09.
- B-5 Trial activation. Planned. The trial start and days-left read cross here; flow F-10.
- B-6 Billing. Planned. Subscription state and the Advisor tier read and write cross here; flow F-10. Purchase at launch is manual PromptPay activation, so this boundary records state rather than taking a card.
- Health. `GET /health` confirms the service is up.

## 6. Post-MLP outlines without shipped flows

`outline` items only, kept short. Each becomes a full flow spec when its trigger fires ([prd-post-mlp.md](prd-post-mlp.md)).

- Mobile surface (trigger: MLP activated plus mobile demand). View and summarize: headline answers, chart, goal status. Minimal editing; serious planning stays on web.
- White-label for advisors (trigger: first advisor pilot). Branding, advisor dashboard, client management, export. Overlaps F-11.
- US tax expansion (trigger: TH proves out plus US demand). Makes the hidden US engine real in the wizard and tax tab. Until then, the US option in tax-webapp stays a marked placeholder.
- Corporate tax module (trigger: an advisor pilot asks).
- Per-goal wallets (trigger: users outgrow the shared goal wallet).
- Public API for your own AI (trigger: MLP live plus demand). One contract, several doors: MCP server plus OpenAPI plus docs. Writes stay proposal-based, applied only by web acceptance (the F-07 invariant).
- Real exit-tax modeling (trigger: live sheet plus users ask). Replaces the tax-free-exit assumption and shows early-withdrawal paths.

## 7. Reference index

Counts: 39 references linked across 24 flows. Two flows carry no reference from the set and say so instead of forcing one (F-09 settings, F-43 blog and docs). Four flows state that no reference fits one specific detail (F-01 sign-in form, F-06 sliders, F-24 cross-app handoff, F-41 screenshot carousel) and build that detail on our own design language.

Per flow:

| Flow | References |
| --- | --- |
| F-01 | Monarch Dashboard (ref01, ref02), Rocket Money Onboarding |
| F-02 | Rocket Money Onboarding, Rocket Money Setting up budgeting, YNAB Setting up account, YNAB Edit plan, Monarch Dashboard |
| F-03 | Monarch Dashboard (ref01, ref02), Revolut Total wealth, Rocket Money Net worth, YNAB Net worth, Fidelity Planning, Quicken Calculating retirement projections (ref04) |
| F-04 | Quicken Setting a custom amount, YNAB Edit plan, YNAB Adding an expected income |
| F-05 | Origin Creating a forecast (ref03), Quicken Planning tools |
| F-06 | Origin Creating a forecast (ref03), Origin Forecast |
| F-07 | Notion Accepting a suggestion, Notion variant, Contractbook Accepting a suggestion, Langdock Adding suggestion to edit, Google Health Chatting with Coach |
| F-08 | Quicken Planning tools, Quicken Calculating retirement projections (ref04), Oyster Using equity tax calculator (ref06) |
| F-09 | none in set (stated) |
| F-10 | Semrush Upgrading a plan (ref05), Evernote Subscribing to a plan, beehiiv Subscriptions, beehiiv View plan |
| F-11 | QuickBooks Customer hub, Copilot Client detail, Time2book Clients |
| F-20 | Oyster Using salary insights tool, Airbnb Estimating earnings |
| F-21 | YNAB Adding an expected income, Quicken Setting a custom amount |
| F-22 | Oyster Using equity tax calculator (ref06) |
| F-23 | Oyster Using salary insights tool, Quicken Calculating retirement projections (ref04) |
| F-24 | Airbnb Estimating earnings |
| F-30 | Cash App Taxes |
| F-31 | Cash App Estimating tax refund (ref07), Origin Tax |
| F-32 | Origin Tax, Cash App Estimating tax refund (ref07) |
| F-40 | ISO Meet (ref08), Base |
| F-41 | Revolut Total wealth |
| F-42 | ISO Meet (ref08), Threads |
| F-43 | none in set (stated) |
| F-44 | Mailchimp pricing, Framer pricing, Revolut pricing |

Notable picks: Semrush for the trial-to-subscription flow (ref05) is the closest single parallel in the set. Quicken Calculating retirement projections (ref04) carries the high / expected / low framing that our chart already uses. Oyster Using equity tax calculator (ref06) carries the methodology note that matches our honest-estimate posture. Origin Creating a forecast (ref03) is our closest desktop scenario analog.

## 8. Our ways: where we deviate from a reference

- References are study pointers, never copied. We take pacing, layout ideas, and framing, not pixels.
- Sign-in, sliders, the settings form, the cross-app handoff, and the screenshot carousel have no reference in the set. We build them on our own design language rather than force a borrow.
- Principles win on conflict: TH tax only user-facing (P6, P7), pure engines (P2), one backend boundary (P3), bilingual `{ en, th }` (P4), Astryx-first (P5). Where a reference shows a pattern that breaks one of these, we note the deviation and keep our way.
- Copy: ours stays short, spoken, and calm. No hype, no em-dashes in EN, no AI-isms.
- Honesty: estimates are labeled as estimates. Placeholder jurisdictions carry a visible placeholder banner. No reference's "bigger number" framing overrides our honest-estimate posture.
- Per-flow conflicts worth an audit line: F-10 borrows Semrush's trial-with-skip but we capture no card at launch (manual PromptPay, [pricing.md](pricing.md)). F-02 borrows YNAB's long setup for pacing only; ours stays 4 steps, not 20. F-08 borrows Quicken's assumptions panel, but the sheet stays the reference for our numbers. F-40 borrows the ISO Meet waitlist shape but drops its free-access claim for the 7-day trial framing ([pricing.md](pricing.md)).

## 9. Open questions for Prame

These do not block the flows; they are decisions the flows currently assume.

1. F-02 wizard step order. The brief says income, expenses, retirement, then goals (per US-101). Confirm this order vs goals before retirement.
2. F-05 and F-06 entry point. Scenario toggles and sliders could live above the chart, beside it, or in the left column. Confirm the placement so the chart stays the hero.
3. F-24 cross-app handoff. Carry tax-webapp inputs into the webapp first-run, or keep the two apps fully separate.
