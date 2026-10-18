# Component Inventory

Every public export of `packages/design-system/src/index.ts`, grouped, with when-to-use notes. If this file and `index.ts` disagree, `index.ts` wins. Astryx components are **not** listed here: they are imported directly from `@astryxdesign/core/<Component>` (see the last section).

## Zero-style primitives (no built-in styling; style from app CSS)

- `AppDocument`: root html/head/body shell for SSR apps. Props: `lang` (default `"en"`), `theme` (applied as `data-theme`, default `"dark"`; webapp passes `"light"`), `head`, `children`, `scripts`. The only place raw document elements live outside this package's own sources.
- `Img`: typed `<img>` so app code never writes a raw img element. All attributes pass through; styling stays in app CSS.
- `Link`: zero-style native anchor for real full-page navigations the router must not intercept (auth endpoints, external URLs).
- `PlainButton`: unstyled native button, `type` defaults to `"button"` so it never submits a form by accident. Use Astryx `Button`/`IconButton` when the designed look is wanted.
- `NativeInput`, `NativeSelect`, `NativeTextArea`: zero-style OS-native controls for when the native UX is the point (mobile date/month pickers, select sheets, numeric keyboards).
- SVG building blocks: `Svg`, `SvgLine`, `SvgPath`, `SvgCircle`, `SvgDefs`, `SvgGradientStop`, `SvgRect`. Used for charts and brand marks; no styling of their own.

## Icons

- `SvgIcon`: base icon wrapper (24px viewBox, `currentColor`, 1.7 stroke).
- Icon set: `FeyMark` (brand mark), `ChatIcon`, `MoonIcon`, `SunIcon`, `LinkIcon`, `CompassIcon`, `CalendarIcon`, `BookmarkIcon`, `ChartIcon`, `HomeIcon`, `WalletIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `TuneIcon`, `UserIcon`, `LedgerIcon`, `PresentationIcon`, `SettingsIcon`, `ArrowRightIcon`, `SendIcon`, `MinimizeIcon`.
- Add new icons in `src/icons.tsx` and export from `index.ts`.

## Theme

- `mastercardTheme`: the built theme object (exported from `./mastercard`). Applied with `<Theme theme={mastercardTheme} mode="light">` — `Theme` itself comes from `@astryxdesign/core/theme`.

## Astryx components (imported directly, not from this package)

Import by subpath; each subpath exports its props types too.

| Subpath | Exports |
| --- | --- |
| `@astryxdesign/core/Stack`, `/HStack`, `/Grid` | layout stacks and grid |
| `@astryxdesign/core/Text`, `/Heading` | text and headings (`HeadingLevel`) |
| `@astryxdesign/core/Card`, `/Badge`, `/Button`, `/IconButton` | surfaces, status, actions |
| `@astryxdesign/core/TextInput`, `/NumberInput`, `/DateInput`, `/CheckboxInput`, `/Switch`, `/TextArea` | form inputs |
| `@astryxdesign/core/Selector` | single-select dropdown (`SelectorOption` and types) |
| `@astryxdesign/core/SegmentedControl` | toggle groups (`SegmentedControlItem`) |
| `@astryxdesign/core/Dialog` | modal shell (`Dialog`, `DialogHeader`); pass `hasDivider` |
| `@astryxdesign/core/Layout` | dialog body scaffolding (`LayoutContent`, `LayoutFooter`); use `hasDivider`/`defaultHasDividers` |
| `@astryxdesign/core/Table` | `Table`, `proportional`, `pixel`, `useTableRowExpansion` |
| `@astryxdesign/core/TabList` | `TabList` + `Tab` |
| `@astryxdesign/core/Chat` | `ChatComposer`, `ChatMessage`, `ChatMessageBubble`, `ChatMessageList`, `ChatToolCalls`, `ChatLayout` |
| `@astryxdesign/core/BottomSheet`, `/Divider`, `/Spinner`, `/StatusDot`, `/Avatar` | overlays and small display pieces |
| `@astryxdesign/core/theme` | `Theme` provider, `defineTheme` |

## Adding a missing piece

New raw-element primitives belong in `packages/design-system/src/<Name>.tsx` with a typed props interface and an export in `index.ts`, following `Img` / `PlainButton` as models. New theme tokens belong in `src/mastercardTheme.ts` plus a `theme:build` run. Do not add Astryx re-exports here.
