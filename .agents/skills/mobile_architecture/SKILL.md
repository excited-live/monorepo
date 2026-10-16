---
name: mobile_architecture
description: >-
  Clean Architecture, state management, UI patterns, and visual regression testing
  for native Tauri v2 mobile apps in excited.live (apps/biz-mobile). Use this skill
  when building or refactoring mobile screens, domain models, selectors, drawers,
  storage adapters, or writing Playwright component visual tests.
---

# Mobile Architecture Skill

This skill defines the technical standards, Clean Architecture layers, state management rules, and visual regression test patterns for native mobile applications in `excited.live` (`apps/biz-mobile`).

---

## 1. Clean Architecture Layers

`apps/biz-mobile` follows a strict four-layer Clean Architecture:

```
apps/biz-mobile/src/
├── domain/                    # DOMAIN LAYER: Pure business logic & types (ZERO React / DOM)
│   ├── types.ts               # Core entity interfaces, session models, navigation enums
│   └── selectors.ts           # Pure mathematical selectors (wealth, countdown, projections)
│
├── application/               # APPLICATION LAYER: Use cases, storage adapters, state
│   ├── storage/
│   │   ├── storage.interface.ts   # IStorageAdapter contract
│   │   └── local-storage.adapter.ts # LocalStorage implementation with safe JSON parsing
│   ├── auth/                  # Authentication orchestration
│   └── context/
│       ├── BizContext.tsx     # Application state provider with useMemo derivation
│       └── useBiz.ts          # Typed consumer hook
│
├── presentation/              # PRESENTATION LAYER: UI components, views, drawers
│   ├── components/            # Atomic & molecular UI (Header, BottomDock, HeroCard, etc.)
│   ├── views/                 # Top-level screen views (HomeView, CapitalView, SettingsView)
│   ├── drawers/               # Modal sheets (AddBusiness, AddRevenue, CapitalInject)
│   └── hooks/                 # Presentation hooks (useModalBack, useHaptics)
│
└── infrastructure/            # INFRASTRUCTURE LAYER: External APIs & Tauri bridge
    ├── lib/api-client.ts      # Better Auth & snapshot sync HTTP client
    └── src-tauri/             # Tauri v2 native Android & iOS configuration
```

### Layer Dependency Rules
1. **Domain** never imports from Application, Presentation, or Infrastructure.
2. **Application** only imports from Domain and abstract Infrastructure contracts.
3. **Presentation** consumes Domain selectors and Application hooks (`useBiz()`).
4. **State Facade**: `src/state.tsx` re-exports Domain and Application layers to ensure clean backwards compatibility.

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
// Pure memoized derivation in BizContext.tsx
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

Visual regression testing in `apps/biz-mobile` uses Playwright 1.63 native component testing via an in-memory gallery server, exactly mirroring `apps/webapp`.

### Gallery Architecture
- **Gallery Server**: `vite.config.ct.ts` runs on IPv4 port `5174` (`strictPort: true`).
- **Mount Runtime**: `playwright/gallery/main.tsx` dynamically discovers all `*.story.tsx` files via `import.meta.glob("../../src/**/*.story.{tsx,jsx}")` and binds `window.mount` and `window.unmount`.
- **Test Scaffold**: `src/testing/TestScaffold.tsx` wraps components in:
  - `Theme` (Mastercard design tokens)
  - `BizProvider` (initialized with deterministic `FIXTURE_*` from `src/testing/fixtures.ts`)
  - In-memory `RouterProvider`
  - Mobile viewport wrapper (iPhone 14 / 390x844).

### Creating Component Visual Tests

1. Create `<Component>.story.tsx`:
```tsx
import React from "react";
import { Header } from "./Header";
import { TestScaffold } from "../testing/TestScaffold";

export const Default = () => (
  <TestScaffold>
    <Header />
  </TestScaffold>
);
```

2. Create `<Component>.spec.tsx`:
```tsx
import { test, expect } from "@playwright/test";

test.describe("Header Component Visual", () => {
  test("renders default mobile header and matches screenshot", async ({ mount }) => {
    const component = await mount("components/Header/Default");
    await expect(component).toHaveScreenshot("header-default.png");
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
   - **Component Visual Tests (Fast / 10s)**: Catch visual regressions, button truncation, and responsive shifts across devices.
   - **End-to-End Smoke Tests (Targeted / 60s)**: Verify core journeys (e.g. create business, inject capital).

2. **Storage Decoupling**:
   - Always access persistence through `IStorageAdapter`. This allows unit tests and visual test scaffolds to inject `MemoryStorageAdapter` without touching `localStorage` or disk.

3. **Tauri Native Boundary Protection**:
   - Shield native plugins (`@tauri-apps/api`, `@choochmeque/tauri-plugin-google-auth-api`) behind application service boundaries so the UI can run seamlessly in browser dev mode (`pnpm dev`) and Vite component test galleries.
