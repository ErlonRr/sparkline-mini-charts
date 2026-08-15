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
- **High Testability**: Decoupling allows every mathematical calculation and edge case (`NaN`, empty datasets, negative baselines, regression fits) to be tested with Vitest without a headless browser.

---

## 3. Data Reactivity & Lifecycle Management
Reactivity is built directly on native Custom Element lifecycle hooks:
- **`static get observedAttributes()`**: Observes `data`, `label`, `min`, `max`, `gap`, `radius`, `interactive`, etc.
- **`attributeChangedCallback()`**: Batches changes and triggers microtask renders.
- **Microtask Batching**: Renders are queued using `Promise.resolve().then(...)` / `queueMicrotask` to eliminate layout thrashing when multiple attributes change in the same event loop tick.
- **Memory Leak Safety**: All active timer instances (`setTimeout`, `requestAnimationFrame`) and event listeners are systematically disconnected in `disconnectedCallback()` / `cleanup()`.

---

## 4. Adaptive Design Tokens & `::part`
Charts support modern CSS architecture:
- **Global Theme Tokens**: Custom CSS properties (`--mini-chart-color-1..8`, `--mini-chart-safe/warn/danger-color`, `--mini-chart-track-color`) allow instantaneous cascading across entire dashboards and dark/light themes.
- **Shadow Parts (`::part()`)**: Internal SVG elements are exposed via `part="line"`, `part="bar"`, `part="point"`, `part="range"`, `part="marker"` etc., allowing precise external CSS styling.

---

## 5. Responsive SVG `viewBox` Scaling
Sparklines do not depend on JavaScript resize observers:
- Elements define a proportionate internal `viewBox` (e.g. `0 0 100 30` for wide sparklines, `0 0 100 100` for radial charts).
- The host CSS forces the SVG to `inline-size: 100%; block-size: 100%`.
- The chart automatically adapts to CSS Flexbox, Grid, or container queries.
