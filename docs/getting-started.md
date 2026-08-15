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
Use the standalone `MiniChartDirective` from `sparkline-mini-charts/angular`:

```typescript
import { Component } from '@angular/core';
import { MiniChartDirective } from 'sparkline-mini-charts/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MiniChartDirective],
  template: `
    <mini-line-chart [data]="revenue" label="Revenue"></mini-line-chart>
    <mini-gauge-chart [data]="[65, 0, 100]" label="CPU Load"></mini-gauge-chart>
  `
})
export class DashboardComponent {
  revenue = [12, 18, 15, 27, 34];
}
```

### Svelte
Svelte binds directly to native Web Components without wrappers:

```svelte
<script>
  import 'sparkline-mini-charts/register';
  let revenue = [10, 25, 40, 15, 60];
</script>

<mini-line-chart data={JSON.stringify(revenue)} label="Revenue"></mini-line-chart>
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
