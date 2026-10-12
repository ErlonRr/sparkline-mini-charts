# Getting Started

Sparkline Mini Charts is a zero-dependency, ultra-lightweight library of 17 SVG sparklines and mini-charts built as **Vanilla Web Components (Custom Elements v1)** with Shadow DOM and adaptive CSS design tokens.

Because they are standard Custom Elements, they work in *any* frontend framework (Angular, React, Vue, Svelte) or without any framework at all.

---

## 📦 Installation

```bash
pnpm add sparkline-mini-charts
# or
npm install sparkline-mini-charts
# or
yarn add sparkline-mini-charts
```

---

## 🚀 Registration & Import Options

### 1. Automatic Side-Effect Registration (Easiest)
Import the `/register` entry point once in your application setup to register all 17 elements automatically:

```js
import "sparkline-mini-charts/register";
```

### 2. Explicit Registration (Clean & Controlled)
```js
import { defineMiniCharts } from "sparkline-mini-charts/define";

defineMiniCharts();
```

### 3. Individual Component Registration (Optimal Tree-Shaking)
Import only the components you need:

```js
import { MiniLineChart } from "sparkline-mini-charts/mini-line-chart";
import { defineMiniChart } from "sparkline-mini-charts";

defineMiniChart("mini-line-chart", MiniLineChart);
```

---

## 🌐 Basic HTML Usage

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sparkline Demo</title>
    <script type="module">
      import "sparkline-mini-charts/register";
    </script>
  </head>
  <body>
    <!-- Use them directly as standard HTML elements -->
    <mini-line-chart data="[10, 25, 40, 15, 60]" label="Revenue"></mini-line-chart>
    <mini-bar-chart data="[-5, 12, 18, -8, 24]" label="Variance"></mini-bar-chart>
    <mini-bullet-chart data="[85, 95, 60, 80, 100]" label="Performance vs Target"></mini-bullet-chart>
  </body>
</html>
```

---

## 🧩 Framework Integrations

### React / Next.js
The library provides first-class typed React wrapper components:

```tsx
"use client";

import { 
  MiniLineChart, 
  MiniBarChart, 
  MiniBulletChart 
} from "sparkline-mini-charts/react";

export function Dashboard() {
  return (
    <div className="flex gap-4">
      <MiniLineChart data={[10, 25, 40, 15, 60]} label="Weekly Trend" />
      <MiniBarChart data={[-8, 12, 4, -3, 18]} label="Variance" />
      <MiniBulletChart data={[85, 90, 50, 75, 100]} label="KPI" />
    </div>
  );
}
```

### Vue 3 / Nuxt
Use the Vue 3 component wrappers:

```vue
<template>
  <div class="chart-container">
    <MiniLineChart :data="revenue" label="Revenue Trend" />
    <MiniPieChart :data="traffic" label="Traffic Sources" />
  </div>
</template>

<script setup lang="ts">
import { MiniLineChart, MiniPieChart } from 'sparkline-mini-charts/vue';

const revenue = [10, 25, 40, 15, 60];
const traffic = [40, 30, 20, 10];
</script>
```

### Angular
Angular CLI apps compile ahead of time (AOT). Import the registration entry once, allow custom elements with `CUSTOM_ELEMENTS_SCHEMA`, and bind `[data]` as a property on the raw tags:

```typescript
import 'sparkline-mini-charts/register';
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <mini-line-chart [data]="revenue" label="Revenue"></mini-line-chart>
    <mini-gauge-chart [data]="[65, 0, 100]" label="CPU Load" (zone-change)="onZone($event)"></mini-gauge-chart>
  `
})
export class DashboardComponent {
  revenue = [12, 18, 15, 27, 34];

  onZone(event: Event) {
    console.log((event as CustomEvent).detail);
  }
}
```

`[data]` assigns the element's `data` property, so pass arrays and objects as they are. Other options are attributes: write them literally (`curve="smooth"`) or bind them with `[attr.name]`, serializing objects yourself (`[attr.zones]="zonesJson"`). Events are plain DOM events, so bind them by their kebab-case name.

**Known limitation in 1.4.x.** The `sparkline-mini-charts/angular` entry is built without the Angular compiler, so it ships no compiled Angular metadata:

- The 17 per-chart signal directives (`MiniLineChartDirective`, …) and `SPARKLINE_DIRECTIVES` do not work when imported from `node_modules`, in AOT or JIT builds. They stay exported so that 1.4.0 code still compiles, and will work from the dedicated `@sparkline-mini-charts/angular` package, planned for 1.5.
- `MiniChartDirective` (the 1.3.0 catch-all directive, restored in 1.4.1) works in JIT apps only. It registers all 17 tags itself and needs no `CUSTOM_ELEMENTS_SCHEMA`. Inputs: `data`, `label`, `curve`, `points`, `min`, `max`, `gradient`, `interactive`. Outputs: `sparklineHover`, `sparklineLeave`, `sparklineSelect`, `zoneChange`, `progressComplete` (`sliceSelect` is declared but never emits). Do not import it together with `SPARKLINE_DIRECTIVES`, or every output fires twice. AOT builds reject it with error NG2012.

### Svelte
Works in Svelte via custom elements, with no wrapper. Svelte assigns `data={…}` to the element's `data` property, so pass arrays and objects as they are:

```svelte
<script>
  import 'sparkline-mini-charts/register';
  let revenue = [10, 25, 40, 15, 60];
</script>

<mini-line-chart data={revenue} label="Revenue"></mini-line-chart>
```

---

## 🎨 Styling & Theming

Each chart renders inside its own Shadow DOM, so page CSS cannot reach the SVG by accident. Style it through `--mini-chart-*` custom properties, which inherit through the shadow boundary, and through `::part()`:

```css
mini-line-chart {
  /* Dimensions */
  inline-size: 12rem;
  block-size: 3rem;

  /* Theme tokens */
  --mini-chart-color: #10b981;
  --mini-chart-stroke-width: 2.5;
}

mini-line-chart::part(point) {
  stroke: white;
  stroke-width: 2;
}
```

Set tokens on `:root`, on a container or on the chart itself. They follow the normal CSS cascade, so the closest declaration wins. Where a chart has both an attribute and a token for the same setting (`radius` and `--mini-chart-bar-radius`, `wick-width` and `--mini-chart-wick-width`, `tick-width` and `--mini-chart-tick-width`), an explicit attribute wins over the inherited token. Charts read only `--mini-*` custom properties, never your app's own variables (such as `--primary`), and never write the host's `style` attribute, so an inline `style="--mini-chart-color: …"` survives every render.

The chart's color comes from `--mini-chart-color`, not from the inherited CSS `color`: each chart sets its host's `color` to `var(--mini-chart-color, #2563eb)`.

### Theming tokens

These tokens are read by the stylesheet every chart shares. Chart-specific tokens (track, needle, bands, wicks, markers, …) are listed in each chart's page under [`docs/components/`](components/).

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color` | `#2563eb` | The chart's main color: lines, single-series bars and areas, progress arcs. It becomes the host's `color`, so `currentColor` inside the chart is this value. |
| `--mini-chart-aspect-ratio` | the chart's own ratio | Host aspect ratio when only one dimension is set: `10 / 3` for most charts, `1 / 1` for pie and radial bar, `2 / 1` for half-pie, gauge and progress. |
| `--mini-chart-default-aspect-ratio` | set by each chart | The chart's own ratio, used when `--mini-chart-aspect-ratio` is not set. Set `--mini-chart-aspect-ratio` instead. |
| `--mini-chart-stroke-width` | `2` | Thickness of `line` parts (line, area, combo), in screen pixels. Gauge (default `14`) and progress (default `12`) read it as their arc thickness in viewBox units, so a small value set on `:root` also thins their arcs. |
| `--mini-chart-fill` | the segment color, then `currentColor` | Fill of `bar` and `segment` parts. Pie and half-pie segments ignore it (use `--mini-chart-color-N`), and charts with their own bar colors (bar, combo, win-loss, OHLC) override it. |
| `--mini-chart-segment-color` | `currentColor` | Per-segment color. Pie and half-pie set it inline on every segment from `--mini-chart-color-N`, so setting it yourself has no effect there. |
| `--mini-chart-point-fill` | `currentColor` | Fill of `point` parts (line, area, combo markers) and of the hover `active-point`. Scatter uses `--mini-chart-point-color` instead. |
| `--mini-chart-ref-color` | `rgba(128, 128, 128, 0.45)` | `reference-line` stroke (line, area). |
| `--mini-chart-ref-width` | `1` | `reference-line` thickness. |
| `--mini-chart-crosshair-color` | `rgba(128, 128, 128, 0.5)` | Hover `crosshair` stroke (line, area, combo). |
| `--mini-chart-crosshair-width` | `1` | Hover `crosshair` thickness. |
| `--mini-chart-bullish-color` | `#10b981` | Rising color for `trend-color="auto"` (line, area), and the rising/win color of the financial and win-loss charts. |
| `--mini-chart-bearish-color` | `#ef4444` | Falling color for `trend-color="auto"`, and the falling/loss color of the financial and win-loss charts. |
| `--mini-chart-color-N` | built-in 16-color palette | Color of the Nth slice, layer or ring (N starts at 1) in pie, half-pie, stacked area, stream and radial bar. A missing N falls back to the palette. |

### Gradients

Area, bullet, gauge, progress and radial-bar accept a `gradient` attribute, parsed the same way by all five:

| Value | Meaning |
| --- | --- |
| absent | Off, except on the area chart, whose gradient fill is on by default. |
| `"false"`, `"0"` | Off (what Angular and Vue write for `false`). |
| `""` (bare `gradient`), `"true"` | On, with the chart's default stops. |
| JSON array, e.g. `'["#10b981", "#f59e0b"]'` | On, one evenly spaced stop per color. Single quotes inside the JSON are accepted. Radial bar also takes one array per ring. |
| comma list, e.g. `"#10b981, rgb(0, 0, 0), var(--brand)"` | On, one stop per color. Commas inside `rgb()`, `hsl()`, `oklch()` or `var()` stay inside their color. |

A value with no usable color turns the gradient off.

### Reduced motion

Entrance and update transitions become instant when the user asks for reduced motion (`prefers-reduced-motion: reduce`). Only timing changes: the plotted geometry is the same. There are no tokens for animation timing.
