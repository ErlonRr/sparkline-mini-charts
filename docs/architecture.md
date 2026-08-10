# Architecture & Design

Sparkline Mini Charts is designed with a strict **"Zero Dependency, High Performance"** philosophy. The architecture relies purely on Vanilla Web Components and SVG to achieve maximum compatibility across all modern environments.

## 1. Custom Elements & Shadow DOM
Every chart in the library extends the native `HTMLElement`. This provides several benefits:
- **Framework Agnostic**: The charts work identically in React, Angular, Vue, Svelte, or plain HTML.
- **Isolated Styles (Shadow DOM)**: All styles are strictly encapsulated inside the Shadow DOM (using `mode: "open"`). This means your global CSS resets or styles will never accidentally break the SVGs inside the charts.
- **Micro-Footprint**: Because we use native browser APIs, there is zero framework overhead to bundle.

## 2. Geometry Decoupling
The math required to layout SVG coordinates is completely decoupled from the DOM.
- `src/core/geometry.js` is a collection of pure, functional JavaScript mathematical utilities (e.g. `createCartesianLayout`, `createRadialLayout`).
- These functions take raw data and output exact `x/y/radius/angle` coordinates.
- **Why?** This decoupling allows the complex math to be fully covered by unit tests (Vitest) without needing a headless browser or complex DOM mockings.

## 3. Data Reactivity
Reactivity is built directly on standard DOM attributes:
- **`static get observedAttributes()`**: The charts observe the `data` and `label` attributes.
- **`attributeChangedCallback()`**: Whenever these attributes change, a render is queued.
- **Micro-task Batching**: To prevent layout thrashing and performance spikes when multiple attributes change simultaneously, renders are debounced and executed asynchronously inside a `Promise.resolve().then(...)` microtask.

## 4. CSS Custom Properties and `::part`
Instead of passing dozens of configuration attributes (`color="red" stroke="2"`), we leverage CSS for styling.
- **CSS Variables**: Global styles like `--mini-chart-bullish-color` or `--mini-chart-stroke-width` allow you to theme all charts across your app simultaneously.
- **Parts API**: Elements inside the Shadow DOM are tagged with `part="line"`, `part="point"`, etc. This allows you to specifically target internal SVG elements from your global stylesheet using `mini-line-chart::part(line)`.

## 5. ViewBox and SVG Scaling
Sparklines do not use hardcoded pixel widths and heights. 
- They define a scalable internal `viewBox` (e.g., `viewBox="0 0 100 30"`).
- The CSS on the `:host` custom element forces the `svg` to `width: 100%; height: 100%`.
- This ensures the chart perfectly fills whatever HTML container you place it inside, responding to Flexbox, CSS Grid, or percentage widths.
