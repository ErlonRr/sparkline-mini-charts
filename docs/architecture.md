# Architecture & Design

Sparkline Mini Charts is designed with a strict **"Zero Dependency, High Performance"** philosophy. The architecture relies purely on Vanilla Web Components and SVG to achieve maximum compatibility, fast initial paint, and isolation.

---

## 1. Custom Elements & Shadow DOM
Every chart in the library extends the base class `MiniChartElement`, which in turn extends the native browser `HTMLElement`:
- **Framework Agnostic**: Works identically in React, Angular, Vue, Svelte, or vanilla HTML.
- **100% Isolated Styles (Shadow DOM)**: All styling is strictly encapsulated inside the Shadow DOM (`mode: "open"`). Global CSS resets or page stylesheets cannot pollute the chart SVGs.
- **Zero Runtime Overhead**: No external charting libraries, D3 dependencies, or Canvas contexts are shipped.

---

## 2. Geometry Decoupling & Pure Algorithms
The mathematics required to lay out SVG coordinates are completely decoupled from DOM rendering:
- `src/core/geometry.js` is a suite of pure mathematical layout algorithms (e.g. `createCartesianLayout`, `createRadialLayout`, `createStackedLayout`, `createBulletLayout`, `createWinLossLayout`, `createRangeBarLayout`, `createScatterLayout`).
- These functions take raw dataset numbers and output pure geometric coordinates (`x`, `y`, `radius`, `angle`, `path`).
- **High Testability**: Decoupling allows every mathematical calculation and edge case (`NaN`, empty datasets, negative baselines, regression fits) to be tested with the built-in Node.js test runner (`node:test`) without a headless browser. The same pure functions are published as the `sparkline-mini-charts/math` entry.

---

## 3. Data Reactivity & Lifecycle Management
Reactivity is built directly on native Custom Element lifecycle hooks:
- **`static observedAttributes`**: A static class field on each chart lists the attributes it reacts to (`data`, `label`, and the chart's own options such as `min`, `max`, `gap`, `radius`, `interactive`). Each chart's page under [`components/`](components/) lists them; `pnpm lint:docs` fails when a page and the field disagree.
- **`attributeChangedCallback()`**: Batches changes and triggers microtask renders.
- **Microtask Batching**: Renders are queued with `queueMicrotask`, so several attribute changes in the same task produce one render.
- **Single render per batch**: A synchronous render (for example `connectedCallback()` during an upgrade) makes any microtask render already queued a no-op, so an element upgraded in place renders once and keeps its entrance animation.
- **Disconnect cleanup**: `disconnectedCallback()` calls `cleanup()`, which cancels pending timers and animation frames (`setTimeout`, `requestAnimationFrame`). Interaction listeners are not removed: they sit on nodes of the element's own shadow tree, so they cannot leak, and a moved element (keyed list reorder, portal, drag and drop) keeps emitting `sparkline-hover`, `sparkline-leave` and `sparkline-select`.

---

## 4. Adaptive Design Tokens & `::part`
Charts support modern CSS architecture:
- **Global Theme Tokens**: `--mini-chart-*` custom properties inherit into every shadow root, so one declaration on `:root` or a container themes a whole dashboard (`--mini-chart-color`, `--mini-chart-color-N`, `--mini-chart-bullish-color`, `--mini-chart-track-color`, …). The shared tokens are listed in [Getting Started](getting-started.md#theming-tokens), the chart-specific ones in each component page. Where an attribute and a token set the same value (`radius` / `--mini-chart-bar-radius`, `wick-width` / `--mini-chart-wick-width`, `tick-width` / `--mini-chart-tick-width`), the attribute wins.
- **Shadow Parts (`::part()`)**: Internal SVG elements are exposed via `part="line"`, `part="bar"`, `part="point"`, `part="segment"`, `part="marker"` etc., allowing precise external CSS styling. Indexed parts (`segment-2`, `layer-3`, `range-1`) target one mark, since `::part()` cannot be combined with `:nth-child()`.
- **The host's style belongs to the page**: a chart never writes its own `style` attribute, so an inline `--mini-chart-color` (or a React/Vue/Angular style binding) survives every render. Chart state lives on internal nodes instead: `trend-color="auto"` sets `data-trend="up|down"` on the internal svg, and the shadow stylesheet maps it to `--mini-chart-bullish-color` / `--mini-chart-bearish-color`.
- **Only `--mini-*` tokens**: shadow stylesheets never read an app's own variables (such as `--primary`), which inherit into the shadow root. `pnpm lint:source` (`scripts/check-source.mjs`) enforces this, together with the two rules above and below: no `this.style.` and no HTML string sinks (`innerHTML`), so rendering also works under a Trusted Types CSP.
- **One `gradient` parser**: area, bullet, gauge, progress and radial-bar read the `gradient` attribute through `src/core/gradient.js`. `"false"`, `"0"`, `"none"`, `"off"` and `"no"` turn the gradient off (absent also turns it off, except on area, where the gradient is the default fill), `""` and `"true"` select the chart's default stops, and a JSON array or a comma-separated list gives the colors; commas inside `rgb()`, `hsl()`, `oklch()` or `var()` stay inside their color. Entries that `CSS.supports("color", …)` rejects are dropped (`var()` is always kept), because an invalid `stop-color` paints black.

---

## 5. Responsive SVG `viewBox` Scaling
Sparklines do not depend on JavaScript resize observers:
- Elements define a proportionate internal `viewBox` (e.g. `0 0 100 30` for wide sparklines, `0 0 100 100` for radial charts).
- The host CSS forces the SVG to `inline-size: 100%; block-size: 100%`.
- The chart automatically adapts to CSS Flexbox, Grid, or container queries.
