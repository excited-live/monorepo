---
name: frontend_engineering
description: >-
  Architectural patterns, conventions, design system integration, and best practices for
  frontend engineering in the excited.live codebase. Use this skill when building or refactoring
  pages, components, layouts, dialogs, forms, tables, routing, or Astryx design system features.
---

# Frontend Engineering Skill

This skill defines the technical standards, directory conventions, design system integration rules, and component patterns for frontend development in the `excited.live` project.

---

## 1. Monorepo Architecture & Directory Conventions

The project is structured as a pnpm monorepo managed by Turborepo:

```
apps/
  webapp/                    # Main TanStack Start / Vite web application
    src/
      components/            # SHARED components across multiple routes or shell layouts
      hooks/                 # Application hooks and state contexts
      lib/                   # Utilities, dictionaries, formatting, API clients
      pages/                 # Domain page implementations
        home/
          home.tsx           # Home page entry component
          components/        # Subcomponents used ONLY on the home page
        settings/
          settings.tsx       # Settings page entry component
          components/        # Subcomponents used ONLY on the settings page
      routes/                # Thin routing layer (TanStack Router)
        _layout.tsx          # Shell layout (Topbar, ChatAssistant, Outlet)
        _layout/
          index.tsx          # Route mapping to lazy-loaded HomePage
          settings.tsx       # Route mapping to lazy-loaded SettingsPage
packages/
  design-system/             # Mastercard theme, brand/native primitives, icons
  sim/                       # Financial simulation & Monte Carlo calculation engine
  tax/                       # Thai and US tax computation models
  i18n/                      # Core internationalization tokens and dictionary types
```

### Component Placement Rules
1. **Shared Components** (`apps/webapp/src/components/`):
   - Components shared across multiple pages or rendered directly in layout shells (e.g. `Topbar.tsx`, `ChatAssistant.tsx`, `LocalePicker.tsx`).
   - Do **NOT** place single-page subcomponents into `src/components/`.
2. **Page-Scoped Components** (`apps/webapp/src/pages/<page>/components/`):
   - Any component that is only rendered by that specific page belongs inside that page's `components/` subdirectory.
   - Do not re-export from page subdirectories via barrels that pull from global shared directories.
3. **Route Files** (`apps/webapp/src/routes/`):
   - Route files should be thin wrappers that import the page lazily using TanStack Router's `lazyRouteComponent`.

---

## 2. Layout Shell & Routing Persistence

### Shell Layout (`_layout.tsx`)
- Persistent shell components (such as `Topbar` and `ChatAssistant`) must live in the parent layout (`_layout.tsx`).
- The `<Outlet />` must be wrapped in a `<Suspense>` boundary:
  ```tsx
  <div className="layout-content">
    <Suspense fallback={<div className="route-loading" />}>
      <Outlet />
    </Suspense>
  </div>
  ```
  This guarantees that navigating between routes (e.g. `/` and `/settings`) only swaps the inner page content, preserving the chat state and preventing the topbar from reloading or re-rendering.

### Clickable Brand Lockups & Links
- Any brand lockup or interactive logo must be an accessible, clickable navigation link:
  ```tsx
  <Link to="/" className="brand-lockup">
    ...
  </Link>
  ```
- In CSS, ensure `.brand-lockup` sets `cursor: pointer;` and `text-decoration: none;`.

---

## 3. Design System Integration (@excited-live/design-system)

The design system owns the Mastercard theme and zero-style primitives; app components are imported directly from `@astryxdesign/core/<Component>` and themed by it.

### Dialog & Modal Guidelines
1. **Modal Padding**:
   - The dialog container radius is `40px`.
   - `--astryx-dialog-padding` is configured in `packages/design-system/src/mastercardTheme.ts` under `dialog.base.padding: "28px 32px"`.
   - After updating theme tokens, always rebuild via `pnpm --filter @excited-live/design-system theme:build`.
2. **Dividers and Layout Spacing**:
   - Astryx `LayoutContent` collapses its top and bottom padding to 0 if the parent header and footer lack dividers.
   - Always specify `hasDivider` on `<DialogHeader>` and `<LayoutFooter>`, and set `defaultHasDividers` on `<Layout>`:
     ```tsx
     <Layout
       defaultHasDividers
       header={<DialogHeader title={title} hasDivider onOpenChange={onClose} />}
       content={
         <LayoutContent>
           {/* form controls */}
         </LayoutContent>
       }
       footer={
         <LayoutFooter hasDivider>
           {/* action buttons */}
         </LayoutFooter>
       }
     />
     ```
   - This ensures content maintains proper 28px/32px breathing room from the dialog borders and prevents elements from touching rounded corners.

### Form Inputs & Controls
- **Dropdowns / Single Select**: Use `<Selector>` from `@astryxdesign/core/Selector`. Supports `options`, `value`, `onChange`, `label`, and `isDisabled`.
- **Toggles / Segments**: Use `<SegmentedControl>` and `<SegmentedControlItem>`.
- **Numeric Fields**: Use `<NumberInput>` with `units` (e.g. `฿`, `%`) and `step`.

---

## 4. Table & Add Action Patterns

When displaying grouped items with expandable detail rows:
1. **Row Expansion**: Use `useTableRowExpansion` from `@astryxdesign/core/Table`.
2. **Bottom Row Action ("Add item")**:
   - Bottom row displays `+ {t("row.addItem")}`.
   - Clicking opens the dialog with `lockType: false`.
   - Inside the modal, the `<Selector>` is unlocked (`isDisabled={false}`), allowing the user to select any catalog category.
3. **Sub-row Action ("Add [Type]")**:
   - Inside an expanded group row, the action displays `+ {t("group.addItem", { label: t(`type.${typeId}`) })}`.
   - Clicking opens the dialog with `typeId` prefilled and `lockType: true`.
   - Inside the modal, `<Selector>` is locked with `isDisabled={true}`.

---

## 5. Internationalization (i18n)

- Never hardcode user-facing strings directly in components.
- Always use the `t(...)` function provided by `useLocale()`:
  ```tsx
  const { t } = useLocale()
  ```
- Define corresponding English (`en`) and Thai (`th`) translations in `apps/webapp/src/lib/dictionaries.ts`.

---

## 6. Pre-Commit Verification Workflow

Before submitting changes or opening a pull request, run the following commands:

```bash
# 1. Typecheck webapp
pnpm --filter @excited-live/webapp typecheck

# 2. Lint webapp
pnpm --filter @excited-live/webapp lint

# 3. Build design system & webapp
pnpm --filter @excited-live/design-system build
pnpm --filter @excited-live/webapp build

# 4. Run tests across workspace
pnpm test
```
