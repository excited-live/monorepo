# @excited-live/design-system

Brand layer for excited.live app UIs. Apps (`webapp`, `biz-mobile`) must render
**zero raw HTML elements** (enforced by ESLint): every element comes from Astryx
(`@astryxdesign/core`), this package, or a local component composed from them.

## What lives here

1. **Mastercard theme** — `mastercardTheme.ts` plus the generated
   `mastercard-theme.css` / `mastercard.js` / `mastercard.d.ts`. Applied with
   `<Theme theme={mastercardTheme}>` imported from `@astryxdesign/core/theme`.
2. **Zero-style primitives** — typed wrappers with *no* built-in styling so app
   stylesheets keep full control:
   - `AppDocument` — SSR document shell (`html`/`head`/`body`)
   - `Img` — typed `<img>`
   - `Link` — unstyled `<a>` for router-external navigations
   - `PlainButton` — unstyled `<button>`, defaults `type="button"`
   - `NativeInput`, `NativeSelect`, `NativeTextArea` — OS-native form controls
   - `Svg`, `SvgLine`, `SvgPath`, `SvgCircle`, `SvgDefs`, `SvgGradientStop`,
     `SvgRect` — inline-SVG building blocks (charts, marks)
3. **Icons** — `SvgIcon` base plus the stroke icon set and `FeyMark`.
4. **Astryx `TextInput` type widening** — `astryxAugment.ts` adds
   `autoComplete` / `minLength` / `required` to Astryx's props.

## What does not live here

Astryx components (`Stack`, `Text`, `Button`, `Dialog`, `Table`, …) are **not**
re-exported. App code imports them directly from
`@astryxdesign/core/<Component>`. This package never wraps them.

## Rule for new UI

Use an Astryx component first. If the design needs a raw element no Astryx
component replaces, add a small typed primitive here (models: `Img`,
`PlainButton`) and export it from `index.ts`. Raw elements live only inside this
package's primitives.

## Theme changes

Edit `src/mastercardTheme.ts`, then run
`pnpm --filter @excited-live/design-system theme:build` and commit the three
generated files together. `theme:check` verifies they are in sync.
