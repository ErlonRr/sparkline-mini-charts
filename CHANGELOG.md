<!-- CHANGELOG.md — Keep a Changelog history for Sparkline Mini Charts releases. -->
# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.1] - 2026-10-12

A patch release that fixes the critical bugs found in 1.4.0 without changing the public 1.x API. It also reverts the breaking changes that 1.4.0 shipped as a minor release; see [Breaking changes shipped in 1.4.0](#breaking-changes-shipped-in-140) below.

### Added

- React: `onSparklineSelect` and `onProgressComplete` event props, next to the existing `onSparklineHover`, `onSparklineLeave`, `onSliceSelect` and `onZoneChange`.
- Vue: the wrappers now emit `sparkline-select` and `progress-complete`. The `data` prop also accepts a number (for `<MiniBulletChart :data="42">`).
- `pnpm lint:package` ([publint](https://publint.dev) and [attw](https://github.com/arethetypeswrong/arethetypeswrong.github.io) on the packed tarball) runs in CI after the build.

### Changed

- Peer dependency ranges are now bounded to the tested majors: `react` `^18.3.0 || ^19.0.0` (was `>=18.0.0`), `vue` `^3.5.0` (was `>=3.5.0`) and `@angular/core` `^20.0.0 || ^21.0.0 || ^22.0.0` (was `>=20.0.0`). All three stay optional.
- `repository` and `bugs` in package.json now point to [github.com/ErlonRr/sparkline-mini-charts](https://github.com/ErlonRr/sparkline-mini-charts); the old `ErlonRru` URLs were broken. GitHub is the canonical repository and runs the CI that gates merges; the Forgejo instance is a mirror.
- Publishing is guarded: `prepack` runs `pnpm build`, and `prepublishOnly` runs the unit tests, the build, the package tests and the API report check (`pnpm api:check`), so a publish from a fresh clone can no longer ship a tarball without `dist/` or with an unreviewed change to the public types.
- React: only props that are attributes of that chart (its `observedAttributes`, in camelCase or kebab-case) are converted. Any other prop reaches React unchanged, as in 1.3.0, so for example `trendColor` on a bar chart is no longer written as `trend-color`. No chart reads such attributes, so nothing renders differently.
- TypeScript: the element `data` accessor is declared once on the base class, with a setter typed `unknown` and a getter typed `any`, instead of `any[]` and the per-chart `get data(): …` declarations. This only widens types.
- Invalid `data` entries now keep their position instead of being dropped or crashing (see Fixed). Visible effects on invalid input only: pie `[3, null, 1]` keeps 3 slices with an empty middle one; progress `["x", 50]` shows 0 instead of 50; gauge `[null, 0, 50]` exposes min 0 and max 50 but, like `[null]`, still hides the needle and reports no value.
- The `exports` map uses nested `import` and `require` conditions, each with its own `types`, and exposes `./package.json`.
- The Angular CommonJS declarations import the types of the ESM-only `@angular/core` with `resolution-mode: "import"`.
- **Win-loss `mode`:** `status` (alias `uptime`) draws a full-height status strip, and `binary` is an alias of the default `win-loss` mode. The React `mode` prop type accepts all four values.
- **Range-bar** accepts `{ low, high, value }` as aliases of `{ min, max, current }`; when both are present, `min`, `max` and `current` win.
- **React types:** `curve` accepts `step-before` and `step-after`, and `points` accepts `min-max`. `points="ends"` is still accepted for compatibility and documented as having no effect.
- **Documentation:** the 17 component pages are rewritten from the source. Each lists every attribute, event, CSS custom property and part, with corrected data shapes, defaults and `gradient` grammar. A shared table documents the theming tokens and the rule that an attribute wins over the matching token; `--mini-chart-stroke-width` also sets the arc width of gauge and progress.

### Fixed

- **`el.data = …` works on every chart.** In 1.4.0, 9 charts (stacked-area, stream, candlestick, ohlc, combo, radial-bar, bullet, range-bar and scatter) declared a getter-only `data` accessor, so assigning the property threw `TypeError` in strict-mode code, including inside React 19, Vue, Svelte and Angular bindings. The base class now owns the only `data` getter/setter, and charts override a `parseData()` hook.
- **Assigning a JSON string to `data` renders it.** The setter stored strings JSON-encoded a second time, so `el.data = "[1,2,3]"` (what the React and Vue wrappers did) rendered an empty chart. A string is now stored unchanged; `null` and `undefined` remove the attribute; any other value is stored as its JSON, so the attribute still reflects the property.
- **`data` set before the elements are registered survives the upgrade.** A value assigned to a not-yet-upgraded element used to hide the accessor; it is now re-applied through the setter when the element connects.
- **Null-safe parsing.** bullet accepts a plain number (`data="42" target="80"` renders 42 against the target, applying `target`/`min`/`max`/`ranges`) and renders `null` as empty; gauge and progress keep a null in its position, so `[null, 0, 50]` keeps min 0 and max 50, and a null value is labelled as empty instead of being reported as a reading of 0; pie and half-pie turn a null slice into 0 so colors stay aligned with their values; range-bar and scatter skip invalid items instead of throwing. Default labels are computed from the parsed data.
- **A chart that fails to render no longer breaks the page.** A render that throws logs one `console.error` per element and shows the chart's accessible empty state; the chart recovers on the next valid update, including the charts that keep and update their SVG nodes between renders.
- **Reduced motion no longer changes the data shown.** With `prefers-reduced-motion: reduce`, progress and radial-bar were drawn at 100% whatever their value; the reduced-motion rules now only change timing, and also zero the stagger delays.
- **`hidden` hides a chart.** `:host([hidden])` now sets `display: none`, which the charts' own `display` overrode.
- **React wrappers pass standard props through.** `style` (including `--mini-chart-*` custom properties), `className` (written as `class`), `id`, `slot`, `tabIndex`, `aria-*`, `data-*` and `children` reach the element untouched; in 1.4.0 `style` crashed React and `className` became `class-name`. Array and object options are passed as JSON, `data` included. Event props are attached with `addEventListener`, so they fire on React 18 and 19 (in 1.4.0 they were never attached). Default-on flags (`roundCaps`, `hollowBullish`, `sharedDomain`, area `gradient`) can be turned off with `false`, which writes `"false"`. `normalize` is always set as an attribute, so it never shadows `Node.prototype.normalize`, and server rendering writes it too. `hidden={false}` (and `inert={false}`) writes no attribute, because React 18 would write the string `"false"`, and the new `:host([hidden])` rule would then hide the chart. The forwarded ref is merged with the wrapper's own ref; a React 19 callback ref that returns a cleanup gets that cleanup called, not `null`. `dist/react.js` and `dist/react.cjs` start with `"use client"`, so the wrappers work when imported from React Server Components.
- **Vue wrappers serialize options and respect `false`.** Array and object options (`:zones`, `:ranges`, `:gradient`) are passed as JSON instead of `"[object Object]"`. `false` on a presence-only flag now omits the attribute instead of writing `"false"`. In 1.4.0 that string turned `show-value` on (progress and gauge), and `:gradient="false"` on progress and bullet matched their `:host([gradient])` styles and dropped the value color; `interactive` and `trend-line` already behaved. `normalize` is now always written as an attribute, also in SSR: in 1.4.0 Vue assigned it as a property, which shadowed `Node.prototype.normalize` and never reached the chart. `inheritAttrs` is `false` again, as in 1.3.0, so the converted values are the ones that reach the element.
- **Angular: `MiniChartDirective` works again in JIT apps, as in 1.3.0.** 1.4.0 rewrote it with signal `input()`/`output()`, which Angular cannot see when the package comes from `node_modules`, and dropped element registration, so following the README rendered nothing. It is back to the 1.3.0 form: `@Input()` setters, and the constructor registers all 17 tags (`defineMiniCharts()`). It keeps the 1.4.0 inputs (`data`, `label`, `curve`, `points`, `min`, `max`, `gradient`, `interactive`) and now has `@Output()`s for the events the charts really dispatch: `sparklineHover`, `sparklineLeave`, `sparklineSelect`, `zoneChange` and `progressComplete`. `sliceSelect` is still declared for compatibility, but no chart emits it. The outputs are now `EventEmitter`s, not `OutputEmitterRef`s, and the inputs are setters, not signals.
- **TypeScript types for the 17 component subpaths and `sparkline-mini-charts/math`.** Their `exports` `types` paths (`dist/mini-*.d.ts`, `dist/math.d.ts`) were never generated, so TypeScript reported "Could not find a declaration file" (TS7016). The build now writes those entry declarations.
- Docs and demo: framework snippets bind `data` as a property (`data={x}` in React and Svelte, `:data="x"` in Vue, `[data]="x"` in Angular) instead of `JSON.stringify`, which rendered empty charts. Svelte is described as working via custom elements, not as having native bindings. The demo's React snippet uses `onSparklineHover` and a JSX comment, and its Angular snippets use the AOT-safe recipe.
- **CommonJS TypeScript declarations.** Projects that `require()` the CommonJS build now get CommonJS declarations (`.d.cts`) for all 24 entries, instead of ESM declarations "masquerading as ESM".
- **Subpath types under `moduleResolution: "node"`.** TypeScript's legacy `node` (node10) resolution ignores `exports`, so `sparkline-mini-charts/react`, `/math` and the other subpaths had no types there. A `typesVersions` map now points each subpath at its declarations.
- **Candlestick and OHLC scale on open, high, low and close only.** Extra columns such as volume or a timestamp no longer flatten the candles or produce `NaN` coordinates.
- **Combo:** line points, the last-value marker and the hover crosshair sit on the bar centres.
- **Stacked-area and stream:** an invalid entry counts as 0 at its own index, so the series stay aligned column by column.
- **Large series:** extents are computed in one pass, so a million values no longer throw `RangeError`.
- **Crossed bounds:** when an explicit `min` is not below `max`, line, area, bar, candlestick, OHLC, range-bar and bullet fall back to the data extent instead of drawing an inverted or empty chart; so does scatter when `min-x`/`max-x` or `min-y`/`max-y` cross.
- **Gauge zones:** `upTo` is clamped to `min`/`max`, numeric strings are accepted, and when no zone is valid the default bands are drawn.
- **Radial-bar:** `sweep` is limited to (0, 360] (a non-positive value falls back to 270), and a `max` of 0 or less falls back to the data maximum.
- **Interaction events survive a reconnect.** Moving a chart in the DOM (disconnect, then connect again) no longer drops its hover, leave and select events, on all 17 charts.
- **Entrance animations play when an element is upgraded in place.** A chart already in the page when its tag is defined renders once, so its entrance animation is no longer skipped.
- **Progress arc** animates in again and no longer flickers or disappears near 100%: the easing no longer overshoots.
- **Bar, pie and half-pie** play their entrance animation when the first data arrives after an empty render.
- **`progress-complete` and `zone-change` fire only on transitions.** The gauge dispatches `zone-change` only when the value moves into another zone, and the progress dispatches `progress-complete` only when the value moves to `max`; changing `zones`, `min` or `max` alone fires neither.
- **Entrance stagger** is capped at 300 ms in total, so long series no longer take seconds to appear.
- **Line, area and combo hover follows the cursor** when the chart is letterboxed inside its box.
- **Charts never write the host's inline style.** `trend-color="auto"` used to set a color on the element's `style`, overwriting styles from the page or a framework binding; the trend is now exposed as `data-trend` on the internal svg and mapped by the shadow stylesheet.
- **`gradient="false"` and `gradient="0"` turn the gradient off** instead of painting the bullet measure black, hiding the progress arc or leaving the area without a fill. `"none"`, `"off"` and `"no"` turn it off too. `gradient=""` and `gradient="true"` keep the default gradient.
- **One `gradient` parser for area, bullet, gauge, progress and radial-bar.** Commas inside parentheses (`rgb(…)`, `hsl(…)`) no longer split a stop, a single color is accepted, and `var(--…)` works in stops. Entries that are not CSS colors are dropped instead of painting a black stop. On area, a single color fades like the default gradient instead of a single almost transparent stop.
- **Attribute values are no longer pasted into the shadow stylesheet.** Values of `radius`, `wick-width`, `tick-width`, `round-caps` and `needle-type` can no longer inject CSS, and units work (`radius="3px"`).
- **These attributes now update after the first render:** `radius` (range-bar, win-loss), `wick-width` and `hollow-bullish` (candlestick), `tick-width` (OHLC), `round-caps` (radial-bar) and `needle-type` (gauge).
- **An explicit attribute beats the inherited token.** `wick-width`, `tick-width` and `radius` set on the element win over the matching `--mini-chart-*` custom property inherited from the page.
- **Bullet bands and the scatter trend line no longer read app-level custom properties** (`--primary`, `--surface`). Bullet bands now follow `--mini-chart-color`.
- **Gauge empty state.** With no value, the gauge hides its value text, removes `aria-valuenow` from its meter (and, when the data is empty, `aria-valuemin` and `aria-valuemax` too), leaves the host attributes untouched, and still draws its track.
- **Radial-bar** removes the extra rings when the data gets shorter.
- **Bar, pie and half-pie** no longer rewrite their stylesheet on every render.
- **Trusted Types.** Charts clear their content with `replaceChildren()` instead of assigning `innerHTML`, which a Trusted Types CSP rejects.

### Known issues

- **Angular: what this release does not restore.** The 17 per-chart signal directives (`MiniLineChartDirective`, …) and `SPARKLINE_DIRECTIVES` still do not work from `node_modules`: AOT builds reject them (NG2012), and in JIT Angular sees none of their inputs or outputs. They stay exported, unchanged, so 1.4.0 code keeps compiling; they will work from the dedicated `@sparkline-mini-charts/angular` package, planned for 1.5. `MiniChartDirective` works in JIT only; AOT builds (the Angular CLI default) reject it too.
- **Angular AOT workaround**: `import "sparkline-mini-charts/register"`, add `CUSTOM_ELEMENTS_SCHEMA` to the component, and bind `[data]` on the raw tags (see the README).

## [1.4.0] - 2026-08-17

### Added

- **Modern Angular 22+ Signals Architecture**: 17 dedicated standalone signal directives (`MiniLineChartDirective`, `MiniGaugeChartDirective`, `MiniBulletChartDirective`, etc.) with native `input()`, `output()`, and `effect()` integration. Exported `SPARKLINE_DIRECTIVES` array for single-line imports.
- **Dedicated React 19+ Interfaces**: Specific TypeScript interfaces (`MiniLineChartProps`, `MiniGaugeChartProps`, etc.) with automatic camelCase prop conversion and event listener bindings (`onSparklineHover`, `onZoneChange`, etc.).
- **Gradients Studio & Multi-Stop Colors Lab**: Dedicated interactive workspace (`#/gradients`) in demo showcase with real-time continuous chromatic presets.

### Fixed

- Single-quote JSON parsing in `gradient` attributes across Gauge, Progress, Radial Bar, Bullet, and Area charts.
- CSS Shadow DOM fill and stroke precedence on bullet and progress chart gradients.
- Synchronized version badge in navbar header and framework documentation tabs.

### Breaking changes shipped in 1.4.0

1.4.0 was released as a minor version, but it changed the behavior of the framework adapters. These notes were added afterwards.

| Change in 1.4.0 | Who is affected | Status |
| :-- | :-- | :-- |
| Angular `MiniChartDirective` no longer registered the custom elements and switched from `@Input()` to signal `input()`, which Angular cannot read from `node_modules` | Apps that followed the 1.3.0 README: charts stopped rendering | **Reverted** in [1.4.1] (JIT apps); AOT apps use the documented `CUSTOM_ELEMENTS_SCHEMA` recipe |
| React wrappers converted every prop: objects to JSON and camelCase to kebab-case (`style` crashed React, `className` became `class-name`), and `false` dropped default-on flags | Any React app passing `style`, `className` or `false` flags | **Reverted** in [1.4.1]: only chart attributes are converted |
| The 17 per-chart Angular signal directives and `SPARKLINE_DIRECTIVES` were added but cannot work from `node_modules` | Angular apps adopting them | Not reverted: still exported, documented as a known issue until the dedicated Angular package |

React and Vue `data` forwarding was also broken in 1.4.0, but not because of a 1.4.0 change: since 1.0 the wrappers pass `data` as JSON text, React 19 and Vue assign it to the element's `data` property, and the setter encoded it a second time, so charts rendered empty (9 charts threw instead). It is **fixed** in [1.4.1], together with the 1.4.0 regressions above.

## [1.3.1] - 2026-08-17

> **Never published as a separate version.** The package went from 1.3.0 straight to 1.4.0, and the changes below were first released in [1.4.0].

### Added

- **Multi-Stop & Continuous Gradients**: Added native multi-color `<linearGradient>` support to `<mini-gauge-chart>`, `<mini-progress-chart>`, `<mini-radial-bar-chart>`, `<mini-bullet-chart>`, and `<mini-area-chart>` via the `gradient` attribute (boolean, color array, or comma-separated string).
- **Universal Interactive Hover Support**: Implemented `interactive` attribute and `sparkline-hover` / `sparkline-leave` custom events across 100% of the 17 library components, bringing first-class interaction to Gauge and Progress meters.

### Fixed

- Corrected documentation and package homepage links to `https://sparkline-mini-charts.erlonrru.com`.

## [1.3.0] - 2026-08-15

### Added

- Interactive **Theming & Design Tokens Guide** (`#/theming`) with live real-time cascading theme lab.
- **Master Design Tokens Configuration Template** accordion with copyable drop-in CSS snippet for custom design system integration.
- Professional multi-hue color palettes across all 5 built-in themes (Ocean Tech, Emerald Fintech, Cyberpunk Neon, Sunset Horizon, Luxury Velvet) with authentic chromatic gradient synergy.
- Harmonized stage layout and centering for sparklines and standardized compact sizing for donut/pie charts.

### Fixed

- Visual contrast and alignment of sparklines and multi-layer pie distributions.
- Sharp, high-resolution vector NPM icon in the showcase header navigation.

## [1.2.1] - 2026-08-15

### Added

- SPA Client-Side Hash Router in showcase demo with dedicated pages for Overview, Live Streaming Studio, Component Detail Views, Sandbox Playground, and Framework Integrations.
- Native `sparkline-select` click event on interactive elements with detailed data payload.
- Brand SVG favicon asset and raw GitHub documentation previews.

### Fixed

- Eliminated mouse hover jitter and flickering (`show/hide`) across all charts by replacing disruptive SVG scale transforms with smooth brightness/opacity transitions.
- Hollow candlestick body hit area with solid `pointer-events: all`.
- Non-intercepting crosshair and active point pointer events in line charts.

## [1.2.0] - 2026-08-15

### Added

- Adaptive Dark and Light theme token system (`--mini-chart-color-1..8`, `--mini-chart-safe/warn/danger-color`, `--mini-chart-track-color`) with instant CSS inheritance across all 17 components.
- Interactive showcase overhaul with real-time live streaming grid, 17-component gallery, and live playground sandbox.
- Native bilingual i18n support in showcase demo (English & Italiano).
- Authentic ThemeRiver organic streaming simulation with Byron & Wattenberg Last.fm dataset.
- Comprehensive product specification and component documentation in `docs/improve/`.

## [1.1.0] - 2026-08-14


### Added

- Native `<mini-bullet-chart>` Web Component for Stephen Few qualitative range intervals, performance measure, and target marker.
- Native `<mini-range-bar-chart>` Web Component for min-max floating interval spans with optional value indicator markers.
- Native `<mini-win-loss-chart>` Web Component with Edward Tufte binary sparklines and continuous uptime `mode="status"` strip.
- Native `<mini-scatter-chart>` Web Component for 2D Cartesian scatter plots with automatic linear regression trendlines (`trend-line="true"`).
- Pure geometric layout functions `createBulletLayout`, `createRangeBarLayout`, `createWinLossLayout`, and `createScatterLayout` in `geometry.js`.
- Angular directive, React wrapper, and Vue 3 wrapper bindings for all new chart components.
- Unit and snapshot test suites for new layout algorithms and element behaviors.

## [1.0.1] - 2026-08-14


### Fixed

- Candlestick & OHLC chart spacing and line width refinement (0.75px crisp stroke width).
- Gauge chart animation sweep, needle alignment, and semantic zone fallback colors.
- Progress chart typography, weight (700) and normalized semi-arc radius dimensions.
- Radial bar chart staggered fluid transitions and outer-to-inner ring stacking order.
- Pie and half-pie chart size harmony and dynamic multi-token `[part~="segment"]` CSS selectors.
- Real-time live data streaming interpolation and point tracking on line and area charts.

## [1.0.0] - 2026-08-11


### Added

- Comprehensive documentation for all 13 components in `docs/`.
- `mini-progress-chart` and `mini-radial-bar-chart` responsive scaling, colors, and robust `stroke-dashoffset` animations.
- Vite library builds with typed ESM, CJS, and source-map outputs in `dist/`.
- `pnpm dev`, `pnpm build`, `pnpm build:demo`, `pnpm preview`, and `pnpm typecheck` workflows.
- Optional `angular`, `react`, and `vue` framework adapter entry points with peer dependencies.
- Vite-powered interactive demo development and static distribution pipeline.

### Changed

- Package exports now resolve to generated distribution artifacts rather than source files.

## [0.1.0] - 2026-08-08

### Added

- Native `<mini-line-chart>`, `<mini-bar-chart>`, `<mini-pie-chart>`, and `<mini-half-pie-chart>` components.
- Shared data normalization plus Cartesian and radial SVG geometry utilities.
- Declarative `data` and accessible `label` APIs with Shadow DOM rendering.
- Pure ESM exports, explicit registration APIs, tree-shakeable component subpaths, and an intentional `/register` side-effect entry point.
- SSR-safe module evaluation, Node test coverage, an interactive demo, and project documentation.

[Unreleased]: https://github.com/ErlonRr/sparkline-mini-charts/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/ErlonRr/sparkline-mini-charts/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/ErlonRr/sparkline-mini-charts/compare/v1.3.0...v1.4.0
[1.3.1]: https://github.com/ErlonRr/sparkline-mini-charts/commit/5a9322d
[1.3.0]: https://github.com/ErlonRr/sparkline-mini-charts/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/ErlonRr/sparkline-mini-charts/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/ErlonRr/sparkline-mini-charts/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ErlonRr/sparkline-mini-charts/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/ErlonRr/sparkline-mini-charts/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/ErlonRr/sparkline-mini-charts/compare/168c7bb...v1.0.0
[0.1.0]: https://github.com/ErlonRr/sparkline-mini-charts/tree/168c7bb
