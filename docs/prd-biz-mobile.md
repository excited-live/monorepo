# Excited.Biz Mobile — PRD, Mobile Architecture & UI Specification

> **Status**: Approved for Day One Full Mobile App (updated 2026-10-13)  
> **Target Package**: [`apps/biz-mobile`](file:///home/prame/Project/excited.live/apps/biz-mobile)  
> **Core Engine**: [`packages/biz`](file:///home/prame/Project/excited.live/packages/biz) (Pure TypeScript math engine + Python recompute gate)  
> **Design Tokens**: Canonical Mastercard Design System ([`DESIGN.md`](file:///home/prame/Project/excited.live/DESIGN.md) & [`@excited-live/design-system`](file:///home/prame/Project/excited.live/packages/design-system))  
> **Native Framework**: Tauri v2 Mobile (Android first, iOS ready — identical pattern to [`apps/tax-mobile`](file:///home/prame/Project/excited.live/apps/tax-mobile))

---

## 1. Executive Summary & Product Vision

**Excited.Biz Mobile** is a luxury, privacy-first mobile spend, revenue, and asset depreciation companion designed for solopreneurs, side-hustlers, and solo operators managing both personal finances and multiple ventures.

### The Problem
Traditional accounting software (FlowAccount, ERPNext, QuickBooks) is bloated with compliance overhead (tax invoices, VAT filing, WHT certificates, general ledgers) that personal creators and solo founders do not need for day-to-day burn awareness. On the other hand, Google Sheets is clunky on mobile, brittle to maintain, and requires constant manual formula adjustments.

### The Solution: Multi-Entity Solopreneur Engine
Instead of starting with a web app and migrating later, **Excited.Biz launches directly as a native mobile application from Day One** (`apps/biz-mobile` powered by Tauri v2 and React 19). It models 3 distinct solopreneur account types:
1. **Personal**: Core living cash reserve, subscriptions, hardware register, and burn runway.
2. **Fulltime Job**: Salary/cashflow stream with an **"UNTIL"** countdown metric (until next payday, or until solopreneur runway target) instead of a burn runway.
3. **Business (Multi-Business Support)**: Multiple independent side-hustles/ventures (e.g. `FromSukong`), each with its own cash reserve, revenue stream (fixed or Stripe-ready), SaaS subscriptions, hardware register, and independent runway.
4. **Capital Injection**: Instant transfer from Personal to any Business entity, immediately reflecting on both entities' cash reserves and runway calculations.

---

## 2. Core Baseline Targets (Verifiable Seed Data)

The engine and UI must reproduce the verified baseline numbers from Prame's live setup:

### A. Recurring Subscriptions & Regular Bills
| Item | Cycle | Amount (THB) | Monthly Equivalent | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **BTS SkyTrain** | Monthly | ฿1,400.00 | ฿1,400.00 | Transit pass |
| **AIS Fibre** | Monthly | ฿540.00 | ฿540.00 | Home internet |
| **Opencode Go** | Monthly | ฿360.00 | ฿360.00 | Dev tool |
| **Mobile Internet** | Monthly | ฿170.00 | ฿170.00 | Cellular plan |
| **Make (Integromat)** | Monthly | ฿57.50 | ฿57.50 | Automation |
| **Domain Name** | Yearly | ฿360.00 | ฿30.00 | ฿30/mo amortised |
| **Phone Line** | Monthly | ฿20.00 | ฿20.00 | Backup SIM |
| **Total Recurring** | — | — | **฿2,577.50 / mo** | Baseline Target |

### B. Owned Gear & Straight-Line Depreciation Register
Straight-line formula: $\text{Depreciation/mo} = \frac{\text{Purchase Price} - \text{Salvage (0)}}{\text{Lifespan Months}}$  
Items fully depreciated floor at ฿0.

| Device / Hardware | Cost (THB) | Lifespan | Purchase Date | Monthly Rate | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Workstation PC** | ฿30,000 | 5 yrs (60 mo) | Historical | ฿0.00 | **Fully depreciated** (฿0) |
| **iPad Gen 9** | ฿10,900 | 5 yrs (60 mo) | 2021-09 | ฿181.67 | Finishes Oct 2026 → ฿0 in Nov |
| **Nothing Phone 2a** | ฿10,000 | 5 yrs (60 mo) | 2024-03 | ฿166.67 | Active |
| **SoundCore Space 1** | ฿2,800 | 3 yrs (36 mo) | 2024-03 | ฿77.78 | Active |
| **SoundCore Open-Ear**| ฿1,000 | 3 yrs (36 mo) | 2026-05 | ฿27.78 | Active |
| **Amazfit Active Edge**| ฿3,000 | 3 yrs (36 mo) | 2025-08 | ฿83.33 | Active |
| **Total Depreciation** | — | — | — | **≈ ฿537.23 / mo** | Drops to **≈ ฿355.56** in Nov 2026 |

### C. Unified Headline Burn
- **October 2026 Baseline**: ฿2,577.50 (recurring) + ฿537.23 (depreciation) = **≈ ฿3,114.73 / month**
- **November 2026 Run-rate**: ฿2,577.50 (recurring) + ฿355.56 (depreciation) = **≈ ฿2,933.06 / month**

---

## 3. Visual & Mobile Ergonomics Specification

The mobile UI follows the luxury, paper-like minimalism of the **Mastercard Design System** and ergonomic mobile benchmarks (Google Pay hero wallet / Revolut / `apps/tax-mobile`):

### 3.1 Design Tokens
- **Canvas Cream (`#F3F0EE`)**: Page background, zero harsh digital white, zero neon gradients.
- **Lifted Cream (`#FCFBFA`)**: Elevated cards with authentic paper-on-paper depth.
- **Ink Black (`#141413`)**: Primary typography and high-contrast hero balance card.
- **Signal Orange (`#CF4500` / `#F37338`)**: Single brand focus accent for dots, primary indicators, and active badges.
- **Border Subtle (`rgba(20, 20, 19, 0.08)`)**: Crisp 1px hairline dividers.

### 3.2 Mobile Information Architecture & Screen Flow

```mermaid
graph TD
    AppLaunch[Mobile App Launch] --> AccountSelector[Top Account Switcher: Personal / Fulltime Job / FromSukong / + Add]
    
    AccountSelector --> HeroCard[Google Pay Style Ink Black Hero Card]
    HeroCard -->|Personal / Business| RunwayView[Cash Left + Runway in Months + Monthly Net Burn]
    HeroCard -->|Fulltime Job| UntilView[Monthly Salary + UNTIL Payday / Freedom Target]
    
    HeroCard --> QuickShortcuts[4 Action Squircles: + Expense / Inject Biz / + Gear / Due 30D]
    
    QuickShortcuts -->|+ Expense| AddCostSheet[Slide-Up Add Expense Drawer]
    QuickShortcuts -->|Inject Biz| CapitalTransferSheet[Slide-Up Transfer from Personal to Business]
    QuickShortcuts -->|+ Gear| AddGearSheet[Slide-Up Add Hardware Asset Drawer]
    QuickShortcuts -->|Due 30D| DueCalendar[Upcoming Bills Timeline]
    
    subgraph Persistent Dock (Zero Charts)
        BottomDock[Floating Minimalist Bottom Dock: Home / Items / Forecast / Settings]
    end
```

---

## 4. User Stories & Acceptance Criteria

### US-BIZ-001: Mobile Recurring Subscriptions Tracker
**Description:** As a user on my phone, I want to view, add, and manage my regular bills and software subscriptions in under 30 seconds.  
**Acceptance Criteria:**
- [ ] Add/Edit modal drawer with auto-focusing `MoneyInput` (caret preserved, native numeric keypad).
- [ ] Billing cycles supported: `Weekly`, `Monthly`, `Quarterly`, `Semi-Annual`, `Yearly`.
- [ ] Auto-calculation of normalized monthly cost ($cycle \to monthly$).
- [ ] Next charge date selector with pre-computed "days until renewal".
- [ ] Overdue or imminent charges (≤ 7 days) highlighted with Signal Orange badges.
- [ ] Soft deletion: Cancelled subscriptions remain in history with active spend set to ฿0.

### US-BIZ-002: Gear & Straight-Line Depreciation Register
**Description:** As a user, I want my physical tech devices tracked with straight-line depreciation so my equipment costs appear as a transparent monthly burn rather than sporadic lump sums.  
**Acceptance Criteria:**
- [ ] Add asset modal: name, purchase price, purchase month, useful lifespan (months or years), category, account ID.
- [ ] Automatic straight-line calculation: $\text{monthly} = \frac{\text{price}}{\text{lifespan}}$.
- [ ] Automatic elapsed-months computation clamped to lifespan.
- [ ] When elapsed months $\ge$ lifespan, status flags `fullyDepreciated: true` and monthly contribution becomes ฿0.00.
- [ ] Displays remaining book value: $\max(0, \text{price} - \text{elapsed} \times \text{monthly})$.
- [ ] Reproduces iPad depreciation dropping off at month 60 (Nov 2026).

### US-BIZ-003: Headline Burn & Dual-Perspective Outflow
**Description:** As a user, I want to toggle between cash outflow and smoothed run-rate so I can plan both cash flow and long-term spending.  
**Acceptance Criteria:**
- [ ] **Smoothed View (Default)**: Normalizes annual/quarterly costs into a 1/12 monthly average plus monthly depreciation.
- [ ] **Cash View**: Shows only subscriptions and bills whose renewal dates fall inside the current active calendar month, plus monthly depreciation.
- [ ] View selection persists across app launches via local storage.

### US-BIZ-004: Multi-Entity Solopreneur Architecture & Accounts
**Description:** As an independent creator, I want to separate my personal living expenses, my day job salary, and multiple businesses/side-hustles without having to manage separate apps.  
**Acceptance Criteria:**
- [ ] Support 3 distinct entity types: `personal`, `fulltime_job`, and `business`.
- [ ] Users can create multiple business accounts (e.g. `FromSukong`, `Excited.Biz`).
- [ ] Top bar switcher switches between entities seamlessly with an option to `+ Add Business`.

### US-BIZ-005: Capital Transfer / Seed Injections
**Description:** As a founder, I want to transfer capital from my Personal reserve into my Business, and see the immediate impact on both runways.  
**Acceptance Criteria:**
- [ ] Capital transfer drawer allows specifying source account (`Personal`), target business, and amount.
- [ ] Live preview displays: Personal runway impact (e.g., 40.1 mos → 33.7 mos) and Business runway extension (e.g., 18.2 mos → 26.3 mos).
- [ ] Transaction log tracks capital injections chronologically.

### US-BIZ-006: Fulltime Job "UNTIL" Metric & Income Streams
**Description:** As a side-hustler with a day job, I want my salary tracked with an "UNTIL" countdown rather than an irrelevant burn runway.  
**Acceptance Criteria:**
- [ ] Fulltime Job hero card shows monthly salary amount and **"UNTIL"** metrics:
  - Days until next payday (e.g. `14 Days until Payday: ฿75,000`).
  - Target solopreneur freedom milestone (e.g. `Until Target Runway: 6 Months`).
- [ ] Business accounts support Revenue/Income entry (fixed now, Stripe-ready schema).
- [ ] Net Burn calculation: $\text{Net Burn} = \text{OpEx} + \text{Depreciation} - \text{Revenue}$. If positive, flags as `Default Alive`.

### US-BIZ-007: Pure Math Package & Verification Gate
**Description:** As an engineer, I want all financial computations encapsulated in a zero-dependency pure TypeScript package verified by golden tests and an independent Python script.  
**Acceptance Criteria:**
- [ ] Package [`packages/biz`](file:///home/prame/Project/excited.live/packages/biz) contains zero DOM, zero network, and zero UI dependencies.
- [ ] Pure exports: `calculateMonthlyEquivalent()`, `calculateAssetDepreciation()`, `calculateSummary()`, `simulateCapitalTransfer()`.
- [ ] Golden unit test suite validates exact baseline numbers: ฿2,577.50 / ฿537.23 / ฿3,114.73.
- [ ] Python independent validation script [`scripts/recompute-biz.py`](file:///home/prame/Project/excited.live/scripts/recompute-biz.py) calculates identical outputs to 2 decimal places.

### US-BIZ-008: First-Run Onboarding Journey
**Description:** As a new user opening Excited.Biz for the first time, I want to replace the example data with my own in under three minutes so the hero card shows my cash and my runway, not someone else's numbers. Flows: F-50 to F-55 in [prd-flows.md](prd-flows.md).  
**Acceptance Criteria:**
- [ ] Fresh install opens with labeled example data and a start affordance; the example state is never presented as the user's own data.
- [ ] One screen picks the first entity: personal, fulltime job, or business, with starting cash (or salary + payday for fulltime job).
- [ ] Recurring bills capture supports up to six common TH rows plus a custom slot, each skippable, with live monthly equivalent.
- [ ] Gear capture is optional and skippable; skipping leaves the hardware register empty with its add affordance.
- [ ] On finish, onboarding data replaces the example state and Home shows the hero card with the user's numbers.
- [ ] A get-started checklist card tracks anything skipped (add gear, add a business, sign in) and dismisses when done.
- [ ] Sign-in is offered after data entry, never before, and never blocks the local-first path.
- [ ] All onboarding copy is bilingual `{ en, th }`, EN first.

---

## 5. Technical Architecture & Workspace Placement

```
excited.live/
├── apps/
│   ├── biz-mobile/               # Day One Native Mobile App (Tauri v2 + Vite + React 19)
│   │   ├── src/                  # TanStack Router screens, Astryx UI, Mastercard theme
│   │   ├── src-tauri/            # Rust native wrapper, Android / iOS manifest, permissions
│   │   └── package.json          # @excited-live/biz-mobile
│   └── tax-mobile/               # Reference Tauri v2 mobile app
├── packages/
│   ├── biz/                      # Pure Business Math & Multi-Entity Engine
│   │   ├── src/index.ts          # Pure functions, multi-entity types, validation
│   │   └── tests/golden.test.ts  # Verification suite
│   └── design-system/            # Mastercard Design System & Astryx components
└── scripts/
    └── recompute-biz.py          # Independent Python math verification gate
```

### Dependency Stack
- **Native Shell**: Tauri v2 (`@tauri-apps/api ^2.3.0`, `@tauri-apps/cli ^2.3.0`)
- **UI Framework**: React 19, Vite 8, `@tanstack/react-router`, `@tanstack/react-query`
- **Component Primitives**: `@astryxdesign/core`, `@excited-live/design-system`
- **Pure Engine**: `@excited-live/biz` (workspace reference)
- **Localization**: Bilingual EN/TH via `@excited-live/i18n` (EN default)

---

## 6. Non-Goals (Strictly Out of Scope)
- ❌ **No Heavy Mobile Charts**: Zero fussy SVGs or line graphs. Information is presented through editorial typography, status pills, and milestone countdown cards.
- ❌ **No Tax Compliance & Accounting Books**: No VAT 7% filing, e-Tax invoices, 50 Tawi certificates, or general ledger (FlowAccount remains the tool if formal Thai corporate compliance is needed).
- ❌ **No Invoicing & Quotations**: This is strictly a spend and burn monitor.
- ❌ **No Automatic Bank Sync / Open Banking**: All costs are recurring agreements or gear logs; zero third-party banking credentials needed.
- ❌ **No Ads, No Third-Party Tracking**: Completely private, on-device data.
