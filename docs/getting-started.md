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

The charts utilize the **Shadow DOM**, protecting them from global CSS leaks while exposing styling hooks via **CSS Custom Properties** and `::part()`:

```css
mini-line-chart {
  /* Dimensions */
  inline-size: 12rem;
  block-size: 3rem;

  /* Theme Tokens */
  --mini-chart-color-1: #10b981;
  --mini-chart-stroke-width: 2.5;
}

mini-line-chart::part(point) {
  stroke: white;
  stroke-width: 2;
}
```
