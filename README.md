<!-- README.md — Installation, API, architecture, and development guide for Sparkline Mini Charts. -->
# Sparkline Mini Charts

Framework-agnostic, zero-dependency sparklines built with native Custom Elements, Shadow DOM, and responsive SVG. Use them in any modern frontend application without Canvas or a charting runtime.

```html
<mini-line-chart data="[10, 20, 14, 28, 35]" label="Revenue over five periods"></mini-line-chart>
```

## Features

- Four native SVG components: line, bar, pie, and half-pie.
- Responsive `viewBox` rendering with no ResizeObserver or layout work in JavaScript.
- Declarative `data` and `label` attributes plus a JavaScript `data` property.
- Pure ESM exports for tree-shaking and separate, intentional registration entry points.
- Safe to evaluate during server-side rendering; Custom Elements register only where a browser registry is available.
- No runtime dependencies in the native Web Component core.
- Optional Angular, React, and Vue adapters that remain outside the core bundle.

## Installation

```sh
pnpm add sparkline-mini-charts
```

`npm install sparkline-mini-charts` and `yarn add sparkline-mini-charts` are also supported. The package publishes typed ESM and CJS distributions with source maps.

## Registration modes

Choose the smallest import that fits the application.

### Register every chart

Use the dedicated side-effect entry point once in browser startup code.

```js
import "sparkline-mini-charts/register";
```

### Register every chart explicitly

This entry point is side-effect free, which is useful when an application controls its initialization sequence.

```js
import { defineMiniCharts } from "sparkline-mini-charts/define";

defineMiniCharts();
```

### Register one chart only

Import a leaf module plus the small registration helper when bundle size matters.

```js
import { MiniLineChart } from "sparkline-mini-charts/mini-line-chart";
import { defineMiniChart } from "sparkline-mini-charts";

defineMiniChart("mini-line-chart", MiniLineChart);
```

The root import is intentionally side-effect free, so bundlers can remove unused component exports. Only the automatic registration and React wrapper entry points are marked as having side effects.

## Package exports

| Import path | Contents | Runtime dependency |
| --- | --- | --- |
| `sparkline-mini-charts` | Pure core exports and `defineMiniChart()` | None |
| `sparkline-mini-charts/define` | Explicit `defineMiniCharts()` registration | None |
| `sparkline-mini-charts/register` | Automatically registers every native chart | None |
| `sparkline-mini-charts/mini-line-chart` (and peers) | A single Custom Element class | None |
| `sparkline-mini-charts/math` | Shared geometry helpers | None |
| `sparkline-mini-charts/angular` | Standalone Angular directive | `@angular/core` |
| `sparkline-mini-charts/react` | React chart wrapper components | `react` |
| `sparkline-mini-charts/vue` | Vue 3 chart wrapper components | `vue` |

## Components

```html
<mini-line-chart data="[10, 20, 14, 28, 35]" label="Revenue trend"></mini-line-chart>
<mini-bar-chart data="[-8, 12, 4, -3, 18]" label="Monthly variance"></mini-bar-chart>
<mini-pie-chart data="[45, 30, 15, 10]" label="Traffic sources"></mini-pie-chart>
<mini-half-pie-chart data="[60, 25, 15]" label="Plan adoption"></mini-half-pie-chart>
```

| Element | Best for | Value behavior |
| --- | --- | --- |
| `<mini-line-chart>` | Ordered trends | Preserves positive and negative values. |
| `<mini-bar-chart>` | Signed comparison | Renders values from a shared zero baseline. |
| `<mini-pie-chart>` | Part-to-whole distribution | Treats negative values as zero. |
| `<mini-half-pie-chart>` | Compact part-to-whole distribution | Treats negative values as zero. |

## API

| Attribute/property | Type | Description |
| --- | --- | --- |
| `data` | JSON number array / `number[]` | The chart values. Invalid JSON and non-finite entries are ignored. |
| `label` | `string` | Accessible name applied to the rendered SVG. |

```js
const chart = document.querySelector("mini-line-chart");
chart.data = [12, 18, 15, 27];
chart.setAttribute("label", "Weekly revenue trend");
```

Empty, invalid, and zero-total radial data sets render an empty accessible SVG rather than throwing.

## Styling

Set an inline size on the host and the SVG scales to its natural chart ratio.

```css
mini-line-chart {
  inline-size: 12rem;
  --mini-chart-color: #0f766e;
  --mini-chart-stroke-width: 2.5;
}

mini-pie-chart {
  inline-size: 6rem;
  --mini-chart-fill: #7c3aed;
}
```

| Custom property | Effect |
| --- | --- |
| `--mini-chart-color` | Line, bar, and single-value default color. |
| `--mini-chart-fill` | Bar fill and all radial segment fills. Omit it for the default radial palette. |
| `--mini-chart-stroke-width` | Line stroke width. |
| `--mini-chart-aspect-ratio` | Overrides the component’s natural aspect ratio. |

The Shadow DOM exposes the `svg`, `line`, `point`, `bar`, and `segment` parts for `::part()` styling.

## Framework and SSR use

The core tags work in any framework. Purpose-built adapter entry points are provided for Angular, React, and Vue; Svelte consumes the native elements directly.

### Angular

Import the standalone directive to make `[data]` and `[label]` bindings available on every native chart tag.

```ts
import { Component } from "@angular/core";
import { MiniChartDirective } from "sparkline-mini-charts/angular";

@Component({
  standalone: true,
  imports: [MiniChartDirective],
  template: `<mini-line-chart [data]="revenue" label="Weekly revenue"></mini-line-chart>`,
})
export class RevenueCard {
  revenue = [12, 18, 15, 27];
}
```

### React

Use the React subpath from a client component. It registers the required native tags and accepts a number array directly.

```tsx
"use client";

import { MiniLineChart } from "sparkline-mini-charts/react";

export function RevenueChart() {
  return <MiniLineChart data={[12, 18, 15, 27]} label="Weekly revenue" />;
}
```

### Vue

Vue wrappers expose typed props while preserving native SVG rendering.

```vue
<script setup lang="ts">
import { MiniLineChart } from "sparkline-mini-charts/vue";

const revenue = [12, 18, 15, 27];
</script>

<template>
  <MiniLineChart :data="revenue" label="Weekly revenue" />
</template>
```

### Svelte and native HTML

Register the Custom Elements once in browser startup code, then use the HTML tags directly.

```ts
import "sparkline-mini-charts/register";
```

For server-rendered applications, all package entry points are safe to evaluate on the server. Register elements only in browser code.

## Accessibility

Each rendered SVG uses `role="img"` and receives its accessible name from `label`. Provide a concise label whenever the chart conveys information that is not already available in nearby text. The demo uses labels for every chart instance.

## Browser support

The library targets current evergreen browsers with ES modules, Custom Elements, Shadow DOM, and SVG support. It does not ship polyfills.

## Demo

The [interactive demo](demo/index.html) shows each component, validates user-supplied JSON, and generates declarative markup.

```sh
pnpm install
pnpm dev
```

Vite serves the demo from `demo/`. Use `pnpm build:demo` to create a deployable static site in `dist-demo/`.

## Project structure

```text
src/
├── angular/         # Angular standalone directive
├── components/      # One Custom Element class per chart
├── core/            # Shared parsing, geometry, SVG, palette, and registration code
├── react/           # React wrappers
├── vue/             # Vue 3 wrappers
├── define.js         # Explicit all-component registration function
├── index.js          # Side-effect-free public ESM exports
└── register.js       # Intentional side-effect entry point
demo/                 # Interactive static showcase
test/                 # Node test runner unit and integration coverage
vite.config.js        # ESM/CJS library distribution build
vite.config.demo.js   # Demo dev server and static build
CHANGELOG.md          # Version history
```

## Recent Releases

<details>
<summary>Click to view recent releases</summary>

### v1.1.0 (2026-08-14)
- Added 4 new chart components: `<mini-bullet-chart>`, `<mini-range-bar-chart>`, `<mini-win-loss-chart>`, and `<mini-scatter-chart>`.
- Integrated linear regression trendline computation and Stephen Few bullet charts.
- Added Angular, React, and Vue framework bindings for all new elements.

### v1.0.1 (2026-08-14)
- Refinements to candlestick, OHLC, gauge, and progress bar aesthetics and stroke proportions.
- Radial bar fluid staggered transitions and outer-to-inner ring stacking.
- Pie and half-pie shadow DOM styling and multi-token part selectors.


### v1.0.0 (2026-08-11)
- Initial release with 13 mini charts.
- Comprehensive documentation for all components.
- Native CSS animation and framework integrations.

</details>


## Development

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm build:demo
```

`pnpm build` writes typed ESM/CJS artifacts and source maps to `dist/`. The test suite covers shared data and geometry utilities, component rendering, registration behavior, package exports, and SSR-safe module evaluation.

## Release and license

Document user-visible changes in [CHANGELOG.md](CHANGELOG.md) using the Keep a Changelog format. Before publishing this project as open source, add an OSI-approved license with the correct copyright holder.
