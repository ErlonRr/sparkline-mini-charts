# Getting Started

Sparkline Mini Charts is a zero-dependency, ultra-lightweight library of SVG sparklines and mini-charts built as **Vanilla Web Components (Custom Elements v1)**. Because they are standard Custom Elements, they work in *any* framework (React, Angular, Vue, Svelte) or without one.

## Installation

```bash
npm install sparkline-mini-charts
# or
pnpm add sparkline-mini-charts
# or
yarn add sparkline-mini-charts
```

## Basic Usage (Vanilla HTML)

To use the charts, simply import the package in your entry point. The charts will self-register in the browser's `customElements` registry.

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Import the module to register the web components -->
    <script type="module">
      import "sparkline-mini-charts";
    </script>
  </head>
  <body>
    <!-- Use them as standard HTML tags! -->
    <mini-line-chart data="[10, 25, 40, 15, 60]"></mini-line-chart>
  </body>
</html>
```

## Framework Integrations

Because Web Components are native to the browser, they work seamlessly inside your favorite framework.

### React / Next.js
React 19 supports Web Components natively. For Next.js App Router, ensure you only import the web components on the client-side (`"use client"`).

```tsx
import { useEffect } from "react";
// Import the registration side-effect on the client
import "sparkline-mini-charts";

export function Dashboard() {
  return (
    <div>
      <mini-bar-chart data="[10, 25, -15, 40]" label="Revenue"></mini-bar-chart>
    </div>
  );
}
```

### Vue / Nuxt
In Vue, you can use the tags directly in your templates. Tell Vue to treat tags starting with `mini-` as Custom Elements in your `vite.config.js`:

```js
// vite.config.js
import vue from '@vitejs/plugin-vue';

export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('mini-')
        }
      }
    })
  ]
}
```

```vue
<template>
  <mini-pie-chart data="[40, 30, 20, 10]" label="Distribution"></mini-pie-chart>
</template>

<script setup>
import 'sparkline-mini-charts';
</script>
```

### Angular
Angular supports Custom Elements out of the box using `CUSTOM_ELEMENTS_SCHEMA`.

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'sparkline-mini-charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // <-- Required for Web Components
  template: `
    <mini-gauge-chart data="[65, 0, 100]" label="CPU Load"></mini-gauge-chart>
  `
})
export class DashboardComponent {}
```

## Styling

Mini charts are heavily encapsulated inside the **Shadow DOM**, which means your global CSS won't accidentally break them. 

To style them, use **CSS Custom Properties** or the `::part()` selector:

```css
mini-line-chart {
  /* Override variables */
  --mini-chart-color-1: #2563eb;
  --mini-chart-stroke-width: 4;
}

mini-line-chart::part(point) {
  /* Target internal parts directly */
  stroke: white;
  stroke-width: 2;
}
```
