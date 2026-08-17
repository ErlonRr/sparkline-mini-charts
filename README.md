<!-- README.md — Installation, API, architecture, and development guide for Sparkline Mini Charts. -->

# Sparkline Mini Charts

[![npm version](https://img.shields.io/npm/v/sparkline-mini-charts.svg?style=flat-square&color=0f766e)](https://www.npmjs.com/package/sparkline-mini-charts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg?style=flat-square)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg?style=flat-square)](tsconfig.json)
[![Demo](https://img.shields.io/badge/Live-Showcase-7c3aed.svg?style=flat-square)](https://sparkline-mini-charts.erlonrru.com)

**Zero-dependency SVG sparkline Web Components with Shadow DOM, CSS theme tokens, responsive scaling, and native framework bindings (Angular, React, Vue, Svelte).**

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
- **Adaptive Dark & Light Theming**: Built-in design token inheritance across all charts (`--mini-chart-color-1..8`, `--mini-chart-safe/warn/danger-color`).
- **Responsive `viewBox` Scaling**: Automatically adapts to container dimensions with pure vector rendering.
- **Declarative & Reactive**: Synchronized HTML `data` / `label` attributes and JavaScript properties.
- **SSR-Safe**: Safe for server-side evaluation (Next.js, Nuxt, Astro, SvelteKit, Angular SSR).
- **Framework Adapters**: First-class bindings for Angular, React, and Vue included as separate, tree-shakeable entry points.

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

The package publishes typed ESM and CJS distributions with source maps and TypeScript definitions (`.d.ts`).

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
| `<mini-stacked-area-chart>` | Cumulative multi-layer volume        | `number[][]` (e.g. `[[10, 20], [15, 25]]`)    |
| `<mini-stream-chart>`       | Organic ThemeRiver flow              | `number[][]` (e.g. multi-layer stream series) |
| `<mini-pie-chart>`          | 360° Part-to-whole / Donut           | `number[]` (e.g. `[45, 30, 15, 10]`)          |
| `<mini-half-pie-chart>`     | 180° Semi-radial gauge distribution  | `number[]` (e.g. `[60, 25, 15]`)              |
| `<mini-radial-bar-chart>`   | Concentric activity rings            | `number[]` or `{ value, color }[]`            |
| `<mini-progress-chart>`     | Semi-radial progress meter           | `number[]` (e.g. `[75]`, single percentage)   |
| `<mini-gauge-chart>`        | Speedometer gauge with needle        | `[value, min, max]` + `zones` JSON            |
| `<mini-candlestick-chart>`  | Financial OHLC candles with wicks    | `[Open, High, Low, Close][]`                  |
| `<mini-ohlc-chart>`         | Financial tick bar charts            | `[Open, High, Low, Close][]`                  |
| `<mini-combo-chart>`        | Hybrid Bar + Line trend              | `{ bar: number, line: number }[]`             |
| `<mini-bullet-chart>`       | Stephen Few KPI benchmark            | `[val, target, r1, r2, r3]`                   |
| `<mini-range-bar-chart>`    | Floating interval min-max spans      | `[min, max, val?][]`                          |
| `<mini-win-loss-chart>`     | Edward Tufte binary / status strip   | `(1 \| 0 \| -1)[]`                            |
| `<mini-scatter-chart>`      | 2D Scatter plot with regression line | `[x, y][]`                                    |

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
  --mini-chart-fill: #7c3aed;
}
```

### Global Design Tokens

| Custom Property                                                                     | Default            | Description                                           |
| :---------------------------------------------------------------------------------- | :----------------- | :---------------------------------------------------- |
| `--mini-chart-color`                                                                | `#0ea5e9`          | Primary line, bar, and single-value accent color.     |
| `--mini-chart-color-1` ... `--mini-chart-color-8`                                   | Built-in Palette   | Theme colors for multi-layer/radial charts.           |
| `--mini-chart-stroke-width`                                                         | `2`                | Stroke width for lines, wicks, and arcs.              |
| `--mini-chart-bullish-color`                                                        | `#10b981`          | Bullish positive color for financial charts.          |
| `--mini-chart-bearish-color`                                                        | `#ef4444`          | Bearish negative color for financial charts.          |
| `--mini-chart-safe-color` / `--mini-chart-warn-color` / `--mini-chart-danger-color` | Semantic tones     | Status bands for gauges and bullets.                  |
| `--mini-chart-track-color`                                                          | `rgba(0,0,0,0.08)` | Background track color for progress and radial rings. |

---

## 🧩 Framework Integrations

Native Web Components work seamlessly in any ecosystem with first-class typed adapters:

<p align="center">
  <img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/refs/heads/main/assets/img/framework-integrations.png" alt="Framework Integrations for React, Vue, Angular, Svelte" width="100%" />
</p>

### Angular

```ts
import { Component } from "@angular/core";
import { MiniChartDirective } from "sparkline-mini-charts/angular";

@Component({
  standalone: true,
  imports: [MiniChartDirective],
  template: `<mini-line-chart
    [data]="revenue"
    label="Weekly revenue"
  ></mini-line-chart>`,
})
export class RevenueCard {
  revenue = [12, 18, 15, 27];
}
```

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

### Svelte & Vanilla HTML

```html
<script>
  import "sparkline-mini-charts/register";
</script>

<mini-line-chart
  data="[12, 18, 15, 27]"
  label="Weekly revenue"
></mini-line-chart>
```

---

## ♿ Accessibility

Every component renders semantic SVG elements with `role="img"` (or `role="meter"` for gauge/progress) and binds accessible labels via the `label` attribute and internal `<title>` elements.

---

## 🕒 Recent Releases

<details>
<summary><b>Click to view recent releases (Last 3)</b></summary>

<br/>

### [v1.4.0] - 2026-08-17

- **Modern Angular 22+ Signals Architecture**: 17 dedicated standalone signal directives (`MiniLineChartDirective`, `MiniGaugeChartDirective`, etc.) with native `input()`, `output()`, and `effect()`, plus `SPARKLINE_DIRECTIVES` array.
- **Dedicated React 19+ Interfaces**: Per-component TypeScript interfaces with automatic camelCase prop normalization and event callbacks.
- **Gradients Studio**: Dedicated interactive lab (`#/gradients`) for multi-stop SVG linear gradients.
- **Single-Quote JSON Parsing**: Fixed `gradient` attribute parsing across all supported charts.

### [v1.3.1] - 2026-08-17

- **Multi-Stop Gradients**: Added native multi-color `<linearGradient>` support to Gauge, Progress, Radial Bar, Bullet, and Area charts.
- **Universal Interactive Coverage**: 100% of the 17 sparkline components now support `interactive` with `sparkline-hover` and `sparkline-leave` events.
- **Showcase Link Fix**: Corrected live showcase homepage URL to `https://sparkline-mini-charts.erlonrru.com`.

### [v1.3.0] - 2026-08-15

- **Theming & Tokens Studio**: Added dedicated Theming & Design Tokens Guide (`#/theming`) with real-time interactive cascading theme lab.
- **Master Design Tokens Template**: Drop-in CSS variables accordion for seamless design system integration.
- **Harmonious Multi-Hue Themes**: Real gradient spectrum synergy across Ocean Tech, Emerald Fintech, Cyberpunk Neon, Sunset Horizon, and Luxury Velvet.
- **Sparkline Centering & Sizing**: Symmetrical stage centering and standardized compact donut/pie proportions.

---

👉 _For older releases and full details, see the [Full CHANGELOG](CHANGELOG.md)._

</details>

---

## 🛠 Development & Testing

```sh
pnpm install
pnpm test          # Run Vitest/Node test runner
pnpm typecheck     # Validate TypeScript definitions
pnpm build         # Build typed ESM/CJS bundles in dist/
pnpm dev           # Launch interactive showcase dev server
```

---

## 📄 License

Crafted with precision & vibe coding by [Erlon Rru](https://erlonrru.com) · [MIT License](LICENSE) © 2026
