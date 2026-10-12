<!-- README.md — Installation, API, architecture, and development guide for Sparkline Mini Charts. -->

# Sparkline Mini Charts

[![npm version](https://img.shields.io/npm/v/sparkline-mini-charts.svg?style=flat-square&color=0f766e)](https://www.npmjs.com/package/sparkline-mini-charts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg?style=flat-square)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg?style=flat-square)](tsconfig.json)
[![Demo](https://img.shields.io/badge/Live-Showcase-7c3aed.svg?style=flat-square)](https://sparkline-mini-charts.erlonrru.com)

**Zero-dependency SVG sparkline Web Components with Shadow DOM, CSS theme tokens, responsive scaling, and typed adapters for React, Vue and Angular. Works in Svelte via custom elements.**

Use them in any modern frontend application without Canvas, heavy charting runtimes, or external stylesheets.

```html
<mini-line-chart
  data="[10, 20, 14, 28, 35]"
  label="Revenue over five periods"
></mini-line-chart>
```

👉 **[Explore the Live Interactive Showcase & Playground →](https://sparkline-mini-charts.erlonrru.com)**

<p align="center">
  <img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/refs/heads/main/assets/img/live-data-1.png" alt="Sparkline Mini Charts Live Streaming Studio" width="100%" />
</p>

---

## ⚡ Features

- **17 Native SVG Web Components**: Trend lines, bars, areas, radial gauges, financial candlestick/OHLC, bullet, win/loss, stream, and scatter plots.
- **Zero Runtime Dependencies**: Ultra-lightweight core built with pure Custom Elements v1 and SVG `<path>` geometry.
- **100% Shadow DOM Encapsulation**: Isolated styles with customizable CSS Custom Properties and `::part()` pseudo-elements.
- **CSS Theme Tokens**: `--mini-chart-*` custom properties inherit through the shadow boundary, so one declaration on `:root` or a container themes every chart (`--mini-chart-color`, `--mini-chart-color-N`, `--mini-chart-bullish-color`, …).
- **Responsive `viewBox` Scaling**: Automatically adapts to container dimensions with pure vector rendering.
- **Declarative & Reactive**: Every option is an HTML attribute and re-renders on change; the `data` property also accepts arrays and objects and writes them to the attribute as JSON.
- **Server-import safe**: Importing the package on the server (Next.js, Nuxt, Astro, SvelteKit, Angular SSR) does not touch the DOM. Charts are not rendered on the server: they draw in the browser once the elements are registered.
- **Framework Adapters**: Typed React and Vue wrappers as separate, tree-shakeable entry points. Angular uses the raw elements (see the known limitation below).

---

## 📦 Installation

```sh
pnpm add sparkline-mini-charts
```

```sh
npm install sparkline-mini-charts
# or
yarn add sparkline-mini-charts
```

The package publishes typed ESM and CJS distributions with source maps and TypeScript declarations: `.d.ts` for `import` and `.d.cts` for `require`.

---

## 🚀 Registration Modes

Choose the smallest import strategy that fits your architecture.

### 1. Register All 17 Components Automatically

Use the dedicated side-effect entry point once in your application startup:

```js
import "sparkline-mini-charts/register";
```

### 2. Register All Components Explicitly

Side-effect free entry point when you want to control execution timing:

```js
import { defineMiniCharts } from "sparkline-mini-charts/define";

defineMiniCharts();
```

### 3. Register Specific Leaf Components (Optimal Bundle Size)

Import only the individual Custom Element class and the lightweight registration helper:

```js
import { MiniLineChart } from "sparkline-mini-charts/mini-line-chart";
import { defineMiniChart } from "sparkline-mini-charts";

defineMiniChart("mini-line-chart", MiniLineChart);
```

---

## 📊 Complete Component Reference

| Web Component Element       | Category / Best for                  | Value & Data Input Format                     |
| :-------------------------- | :----------------------------------- | :-------------------------------------------- |
| `<mini-line-chart>`         | Ordered trend lines                  | `number[]` (e.g. `[10, 20, 14, 28, 35]`)      |
| `<mini-bar-chart>`          | Signed comparison from baseline      | `number[]` (e.g. `[-8, 12, 4, -3, 18]`)       |
| `<mini-area-chart>`         | Filled trend with gradient           | `number[]` (e.g. `[12, 18, 15, 27, 34]`)      |
| `<mini-stacked-area-chart>` | Cumulative multi-layer volume        | `number[][]`, one array per layer             |
| `<mini-stream-chart>`       | Organic ThemeRiver flow              | `number[][]`, one array per layer             |
| `<mini-pie-chart>`          | 360° Part-to-whole / Donut           | `number[]` (e.g. `[45, 30, 15, 10]`)          |
| `<mini-half-pie-chart>`     | 180° Semi-radial gauge distribution  | `number[]` (e.g. `[60, 25, 15]`)              |
| `<mini-radial-bar-chart>`   | Concentric activity rings            | `number[]` or `{ value, color }[]`            |
| `<mini-progress-chart>`     | Semi-radial progress meter           | `[value]` against `min`/`max` (0–100)         |
| `<mini-gauge-chart>`        | Speedometer gauge with needle        | `[value, min?, max?]` + `zones` JSON          |
| `<mini-candlestick-chart>`  | Financial OHLC candles with wicks    | `[open, high, low, close][]`                  |
| `<mini-ohlc-chart>`         | Financial tick bar charts            | `[open, high, low, close][]`                  |
| `<mini-combo-chart>`        | Hybrid Bar + Line trend              | `{ bar: number, line: number }[]`             |
| `<mini-bullet-chart>`       | Stephen Few KPI benchmark            | `[value, target?, ...ranges]` or an object    |
| `<mini-range-bar-chart>`    | Floating interval min-max spans      | `[low, high, current?][]` or objects          |
| `<mini-win-loss-chart>`     | Edward Tufte binary / status strip   | `number[]`, sign only (`1`, `0`, `-1`)        |
| `<mini-scatter-chart>`      | 2D Scatter plot with regression line | `[x, y, r?][]` or `{ x, y, r? }[]`            |

---

### 🛠️ Interactive Sandbox & Playground

Test datasets, tweak styling attributes, and preview responsive SVG rendering in real time:

<p align="center">
  <img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/refs/heads/main/assets/img/interactive-sandbox.png" alt="Interactive Sandbox & Playground" width="100%" />
</p>

---

## 🎨 Styling & CSS Custom Properties

Set dimensions on the host element and the SVG will automatically scale cleanly.

```css
mini-line-chart {
  inline-size: 12rem;
  block-size: 3rem;
  --mini-chart-color: #0f766e;
  --mini-chart-stroke-width: 2.5;
}

mini-pie-chart {
  inline-size: 6rem;
  --mini-chart-color-1: #7c3aed;
  --mini-chart-color-2: #0ea5e9;
}
```

### Global Design Tokens

| Custom Property                                                                     | Default                    | Description                                                                                       |
| :---------------------------------------------------------------------------------- | :------------------------- | :------------------------------------------------------------------------------------------------ |
| `--mini-chart-color`                                                                | `#2563eb`                  | Main color of every single-series chart. It becomes the host's `color`; inherited `color` is not used. |
| `--mini-chart-color-N`                                                              | built-in 16-color palette  | Color of the Nth slice, layer or ring (pie, half-pie, stacked area, stream, radial bar).          |
| `--mini-chart-stroke-width`                                                         | `2`                        | Line thickness (line, area, combo). Gauge (`14`) and progress (`12`) use it as arc thickness.     |
| `--mini-chart-bullish-color`                                                        | `#10b981`                  | Rising color: candlestick, OHLC, win-loss wins, `trend-color="auto"`.                             |
| `--mini-chart-bearish-color`                                                        | `#ef4444`                  | Falling color: candlestick, OHLC, win-loss losses, `trend-color="auto"`.                          |
| `--mini-chart-safe-color` / `--mini-chart-warn-color` / `--mini-chart-danger-color` | bullish, `#f59e0b`, bearish | The three default gauge zones.                                                                   |
| `--mini-chart-track-color`                                                          | `rgba(128, 128, 128, 0.18)` progress, `0.15` radial bar | Background track of progress and radial bar.                      |

Every chart-specific token (bands, needle, markers, wicks, …), attribute, event and `::part()` is listed in its page under [`docs/components/`](docs/components/), and the shared tokens in [Getting Started](docs/getting-started.md#theming-tokens). Where an attribute and a token set the same thing (`radius` / `--mini-chart-bar-radius`, `wick-width`, `tick-width`), the attribute wins.

---------------------------------------------------------------------------------- | :----------------- | :---------------------------------------------------- |
| `--mini-chart-color`                                                                | `#0ea5e9`          | Primary line, bar, and single-value accent color.     |
| `--mini-chart-color-1` ... `--mini-chart-color-8`                                   | Built-in Palette   | Theme colors for multi-layer/radial charts.           |
| `--mini-chart-stroke-width`                                                         | `2`                | Stroke width for lines, wicks, and arcs.              |
| `--mini-chart-bullish-color`                                                        | `#10b981`          | Bullish positive color for financial charts.          |
| `--mini-chart-bearish-color`                                                        | `#ef4444`          | Bearish negative color for financial charts.          |
| `--mini-chart-safe-color` / `--mini-chart-warn-color` / `--mini-chart-danger-color` | Semantic tones     | Status bands for gauges and bullets.                  |
| `--mini-chart-track-color`                                                          | `rgba(0,0,0,0.08)` | Background track color for progress and radial rings. |

---

## 🧩 Framework Integrations

Native Web Components work seamlessly in any ecosystem with first-class typed adapters. The adapters are optional peer dependencies and support React `^18.3 || ^19`, Vue `^3.5` and Angular `^20 || ^21 || ^22`:

<p align="center">
  <img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/refs/heads/main/assets/img/framework-integrations.png" alt="Framework Integrations for React, Vue, Angular, Svelte" width="100%" />
</p>

### Angular

Angular CLI apps compile ahead of time (AOT). Register the elements once and bind `[data]` straight to the raw tags:

```ts
import "sparkline-mini-charts/register";
import { CUSTOM_ELEMENTS_SCHEMA, Component } from "@angular/core";

@Component({
  selector: "app-revenue-card",
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<mini-line-chart
    [data]="revenue"
    label="Weekly revenue"
  ></mini-line-chart>`,
})
export class RevenueCard {
  revenue = [12, 18, 15, 27];
}
```

`[data]` sets the element's `data` property, so arrays and objects need no `JSON.stringify`. Bind other options as attributes (`curve="smooth"`, `[attr.zones]="zonesJson"`) and listen to the DOM events by name (`(sparkline-hover)="onHover($event)"`).

> [!WARNING]
> **Known limitation in 1.4.x.** `sparkline-mini-charts/angular` is not compiled by the Angular compiler, so:
>
> - The 17 per-chart signal directives (`MiniLineChartDirective`, …, `SPARKLINE_DIRECTIVES`) do not work from `node_modules`, in AOT or JIT builds. They remain exported only so 1.4.0 code keeps compiling. They will work from the dedicated `@sparkline-mini-charts/angular` package, planned for 1.5.
> - `MiniChartDirective` works in **JIT** apps only (no `CUSTOM_ELEMENTS_SCHEMA` needed). It registers all 17 tags and has the inputs `data`, `label`, `curve`, `points`, `min`, `max`, `gradient` and `interactive`, plus the outputs `sparklineHover`, `sparklineLeave`, `sparklineSelect`, `zoneChange` and `progressComplete`. Do not combine it with `SPARKLINE_DIRECTIVES`. AOT builds reject it with NG2012; use the recipe above instead.

### React

```tsx
"use client";

import { MiniLineChart } from "sparkline-mini-charts/react";

export function RevenueChart() {
  return <MiniLineChart data={[12, 18, 15, 27]} label="Weekly revenue" />;
}
```

### Vue 3

```vue
<script setup lang="ts">
import { MiniLineChart } from "sparkline-mini-charts/vue";

const revenue = [12, 18, 15, 27];
</script>

<template>
  <MiniLineChart :data="revenue" label="Weekly revenue" />
</template>
```

### Svelte

Works in Svelte via custom elements, with no wrapper. Svelte assigns `data={…}` to the element's `data` property, so pass arrays and objects as they are:

```svelte
<script>
  import "sparkline-mini-charts/register";
  let revenue = [12, 18, 15, 27];
</script>

<mini-line-chart data={revenue} label="Weekly revenue"></mini-line-chart>
```

### Vanilla HTML

```html
<script type="module">
  import "sparkline-mini-charts/register";
</script>

<mini-line-chart
  data="[12, 18, 15, 27]"
  label="Weekly revenue"
></mini-line-chart>
```

---

## ♿ Accessibility

Every component renders semantic SVG elements with `role="img"` (or `role="meter"` for gauge, progress and bullet) and binds accessible labels via the `label` attribute and internal `<title>` elements.

---

## 🕒 Releases

Release notes for every version live in the [CHANGELOG](CHANGELOG.md), including the upgrade notes for the breaking changes that shipped in 1.4.0.

---

## 🛠 Development & Testing

```sh
pnpm install
pnpm typecheck     # Validate TypeScript definitions
pnpm lint:source   # Forbidden patterns in src/
pnpm lint:docs     # README, docs/ and demo checked against src/
pnpm test:unit     # Unit tests on src/ with the Node test runner (`pnpm test` is an alias)
pnpm build         # Build typed ESM/CJS bundles in dist/
pnpm api:check     # Public API of every entry against api/*.api.md (run after build)
pnpm lint:package  # publint + attw on the packed tarball
pnpm test:package  # Test the built dist/ entry points (run after build)
pnpm dev           # Launch interactive showcase dev server (serves the built dist/)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full check sequence, the pull request workflow, changesets and releases.

---

## 📄 License

Crafted with precision & vibe coding by [Erlon Rru](https://erlonrru.com) · [MIT License](LICENSE) © 2026
