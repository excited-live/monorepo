---
name: mobile_architecture
description: >-
  Clean Architecture, state management, UI patterns, and visual regression testing
  for native Tauri v2 mobile apps in excited.live (apps/biz-mobile). Use this skill
  when building or refactoring mobile screens, domain models, selectors, drawers,
  storage adapters, or writing Playwright component visual tests.
---

# Mobile Architecture Skill

This skill defines the technical standards, Clean Architecture layers, page/component folder conventions, state management rules, and visual regression test patterns for native mobile applications in `excited.live` (`apps/biz-mobile`).

> **Mandatory Reference for Feature Implementation**: Before creating or modifying any page, section, drawer, or component in `apps/biz-mobile`, read [`references/page_component_structure.md`](references/page_component_structure.md).

---

## 1. Clean Architecture & Page-Scoped Component Layout

`apps/biz-mobile` follows a strict four-layer Clean Architecture with page-colocated UI components and hooks:

```text
apps/biz-mobile/src/
├── domain/                    # DOMAIN LAYER: Pure types & view models (ZERO React / DOM)
│   ├── types.ts               # View model interfaces, session models, navigation types
│   └── selectors.ts           # Pure mathematical selectors (transitioning to @excited-live/accounting)
│
├── service/                   # SERVICE LAYER (I/O ONLY): Queries, mutations, API calls, Tauri bridge
│   ├── accounting/            # TanStack Query hooks & Hono RPC client (@excited-live/accounting)
│   ├── auth/                  # Better Auth session & token store (token-only, no domain caching)
│   └── catalog/               # Catalog autofill queries
│
├── app/                       # APPLICATION SHELL: Routing context, providers, locale
│   ├── providers.tsx          # QueryClientProvider + Astryx Theme
│   └── locale.tsx             # Bilingual locale provider
│
├── i18n/                      # LOCALIZATION: dictionary.ts ({ en, th }) + getTranslator/t on @excited-live/i18n
│
├── components/                # PRESENTATION (SHARED): Components used across 2+ pages
│   ├── Header/                # Each component has its own folder: <Name>.tsx, index.ts, <Name>.spec.tsx
│   ├── BottomDock/
│   ├── CurrencyInput/
│   ├── ModalImageSection/
│   ├── AddBusinessDrawer/
│   └── AddRevenueDrawer/
│
├── pages/                     # PRESENTATION (PAGES): Top-level screens + page-specific components & hooks
│   ├── home/
│   │   ├── Home.tsx           # Declarative page shell composing page sections & drawers
│   │   ├── Home.spec.tsx      # Full-page Playwright visual test
│   │   ├── hooks/             # Page-level hook (useHome.ts)
│   │   └── components/        # Page-scoped components (each in its own folder with .spec.tsx)
│   ├── management/
│   │   ├── Management.tsx
│   │   ├── Management.spec.tsx
│   │   ├── hooks/             # useManagement.ts
│   │   └── components/        # ManagementHeroSection, CapitalHeroCard, LedgerHeroCard, drawers, etc.
│   ├── settings/
│   │   ├── Settings.tsx
│   │   ├── Settings.spec.tsx
│   │   ├── hooks/             # useSettings.ts
│   │   └── components/        # SettingsProfileSection, SettingsLanguageSection, etc.
│   └── signin/
│       ├── Signin.tsx
│       ├── Signin.spec.tsx
│       ├── hooks/             # useSignIn.ts
│       └── components/        # GoogleIcon, etc.
│
└── routes/                    # ROUTING LAYER: TanStack Router file routes & search params
    ├── __root.tsx             # Root layout with Theme and QueryClientProvider
    └── index.tsx              # Tab and view coordination
```

### Layer & Component Rules
1. **Domain & Accounting Engine**: Business logic and math belong in `@excited-live/accounting`. Domain in the app only holds local view models.
2. **Strict I/O Boundary**: `src/service/` is the **ONLY** folder permitted to execute network requests, call `@tanstack/react-query`, or touch token storage. Components and page hooks consume typed queries/mutations.
3. **No Offline Domain Persistence**: Domain data is server-authoritative and managed via TanStack Query. No local SQLite/localStorage syncing of domain snapshots.
4. **Dedicated Folder per Component**: Every component (both in `src/components/` and `src/pages/<page>/components/`) must live in its own folder (`<ComponentName>/<ComponentName>.tsx`, `index.ts`, `<ComponentName>.spec.tsx`).
5. **Co-locate Page-Specific Components**: If a component or drawer is only used in one page, place it in `src/pages/<page>/components/<ComponentName>/`. Only place components in `src/components/` if they are shared across multiple pages.
6. **Thin Pages & Page Hooks**: Pages (`Home.tsx`, `Management.tsx`, `Settings.tsx`, `Signin.tsx`) must remain thin and declarative: extract state/selector orchestration into `src/pages/<page>/hooks/use<Page>.ts` and UI sections into `src/pages/<page>/components/<SectionName>/`.
7. **Localization**: All UI strings go through `@excited-live/i18n` via `src/i18n/dictionary.ts` (EN first, stable keys). In components use `const { t } = useT()` (`application/hooks/useT.ts`); never hardcode user-facing text or write a local `t()`. Locale state and persistence live in `UIProvider`. See the `i18n_platform` skill, section 8b.

---

## 2. Domain Selectors vs State Hazards

### The Cyclic State Hazard (Anti-Pattern)
Never use `useEffect` to watch raw state and immediately mutate derived properties in that same state. In mobile apps with rapid touch interactions, this triggers re-render loops and stale UI flickers.

**Bad:**
```tsx
// Anti-pattern: circular derivation inside state
useEffect(() => {
  setAccounts(accounts.map(acc => ({
    ...acc,
    cashReserve: calculateCurrentTreasury({ account: acc, hardware, transfers })
  })));
}, [accounts, hardware, transfers]);
```

**Good (Clean Architecture):**
```tsx
// Pure memoized derivation or selector
const accounts = useMemo(() => {
  return rawAccounts.map((acc) => ({
    ...acc,
    cashReserve: calculateCurrentTreasury({ account: acc, hardware, transfers })
  }));
}, [rawAccounts, hardware, transfers]);
```

### Pure Domain Selectors
All financial calculations, countdowns, and projections reside in `src/domain/selectors.ts`:
- `calculateEntityWealthMetrics(params)`: Computes current and end-of-month liquid, gear, liabilities, and net wealth.
- `calculateConsolidatedWealth(params)`: Aggregates personal and multi-business treasuries.
- `calculatePaydayCountdown(paydayDayOfMonth, now)`: Computes days remaining until the next payday.
- `calculateProjectionBalances(params)`: Walks historical and future cashflow balances month-by-month for waterfall charts.

---

## 3. Playwright Visual Component Testing

Visual regression testing in `apps/biz-mobile` uses Playwright native component testing via an in-memory gallery server (`playwright/gallery/main.tsx`).

### Direct Component Mounting (No `.story.tsx` or `TestScaffold`)
- **Do NOT create `.story.tsx` files or `TestScaffold.tsx` wrappers.**
- **Gallery Server**: `vite.config.ct.ts` runs on IPv4 port `5174` (`strictPort: true`).
- **Auto-Discovery & Providers**: `playwright/gallery/main.tsx` automatically globs all `*.tsx` components in `src/components/**` and `src/pages/**` (excluding `.spec.tsx`) and wraps every mounted component in `<Theme theme={mastercardTheme} mode="light">`, `<QueryClientProvider>` pre-hydrated with fixtures (`src/testing/fixtures.ts`), and `<UIProvider>`.
- **Tight Component Bounding Box**: `#root` is styled with `display: inline-block; width: 100%` so screenshots capture the exact height of the mounted component without empty viewport padding.

### Writing Component & Page Visual Tests

Every visual component and every page (`Home.tsx`, `Management.tsx`, `Settings.tsx`, `Signin.tsx`) has a co-located `<Name>.spec.tsx` that mounts the component directly and captures a screenshot:

```tsx
// Component test without props (uses default props / pre-seeded QueryClient fixtures)
import { test, expect } from "@playwright/test";

test.describe("Header Component Visual", () => {
	test("renders default mobile header and matches screenshot", async ({ mount }) => {
		const component = await mount("Header");
		await expect(component).toHaveScreenshot("header-default.png");
	});
});
```

```tsx
// Component test with explicit fixture props
import { test, expect } from "@playwright/test";
import { FIXTURE_ACCOUNTS } from "../../../../testing/fixtures";

test.describe("CapitalHeroCard Component Visual", () => {
	test("renders personal wealth hero card and matches screenshot", async ({ mount }) => {
		const component = await mount("CapitalHeroCard", {
			account: FIXTURE_ACCOUNTS[0]!,
		});
		await expect(component).toHaveScreenshot("capital-hero-card-personal.png");
	});
});
```

### Snapshot Governance
- **Canonical Baselines on CI Runner**: Screenshots are pixel-compared on Ubuntu. Because local font rendering and OS anti-aliasing differ across platforms, baselines are recorded on the CI runner via the GitHub Actions workflow (`workflow_dispatch -> update-snapshots=true`).
- **Local Commands**:
  - `pnpm test:visual:mobile`: Run visual tests locally.
  - `pnpm test:visual:mobile:update`: Update local snapshots.

---

## 4. Mobile Quality Control & High Velocity Framework

To maintain production reliability while maximizing feature velocity:

1. **Testing Pyramid Balance**:
   - **Domain Unit Tests (Instant / 100ms)**: Test pure math and selectors (`selectors.ts`) with zero DOM dependencies.
   - **Component & Page Visual Tests (Fast / 10s)**: Catch visual regressions, button truncation, and responsive shifts across devices.
   - **End-to-End Smoke Tests (Targeted / 60s)**: Verify core journeys (e.g. create business, inject capital).

2. **Server-Authoritative State & Zero Offline Storage**:
   - All network and accounting data operations go through `src/service/accounting/` using typed Hono RPC and TanStack Query mutations with optimistic UI updates. No local SQLite or offline storage sync loops.

3. **Tauri Native Boundary Protection**:
   - Shield native plugins (`@tauri-apps/api`, `@choochmeque/tauri-plugin-google-auth-api`) behind application service boundaries so the UI can run seamlessly in browser dev mode (`pnpm dev`) and Vite component test galleries.
