<!-- README.md — Overview, quick start, chart list, framework usage, configuration, events, live data, theming and accessibility of Sparkline Mini Charts. -->

# Sparkline Mini Charts

**24 tiny SVG charts as native Web Components.** Zero dependencies, themed with CSS variables, typed, and at home in any framework: from a 24px table row to a dashboard tile.

[![npm version](https://img.shields.io/npm/v/sparkline-mini-charts.svg?style=flat-square&color=0f766e)](https://www.npmjs.com/package/sparkline-mini-charts)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/sparkline-mini-charts?style=flat-square&label=minzip)](https://bundlephobia.com/package/sparkline-mini-charts)
[![dependencies: 0](https://img.shields.io/badge/dependencies-0-brightgreen.svg?style=flat-square)](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/packages/core/package.json)
[![TypeScript](https://img.shields.io/badge/types-included-3178c6.svg?style=flat-square)](https://www.npmjs.com/package/sparkline-mini-charts?activeTab=code)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/LICENSE)
[![Live demo](https://img.shields.io/badge/demo-live-7c3aed.svg?style=flat-square)](https://sparkline-mini-charts.erlonrru.com)

<a href="https://sparkline-mini-charts.erlonrru.com"><img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/main/assets/img/hero.png" width="100%" alt="The Sparkline Mini Charts demo home page: a headline, the install command and four KPI cards with a line, an area, a bullet and a progress chart" /></a>

**[Live demo and configurator](https://sparkline-mini-charts.erlonrru.com)** · [Getting started](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/getting-started.md) · [Chart reference](https://github.com/ErlonRr/sparkline-mini-charts/tree/main/docs/components) · [Changelog](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/packages/core/CHANGELOG.md)

## Why

- **24 charts, one API.** Lines, bars, areas, pies, gauges, heatmaps, funnels, waterfalls, candlesticks and more. Every chart takes `data`, `label` and the same events.
- **Zero dependencies.** Custom Elements and SVG paths: no canvas, no charting runtime, no stylesheet to import. Import only the charts you use.
- **Any framework.** Plain HTML tags, with typed wrappers for React and Vue, and recipes for Angular and Svelte. Importing on the server (Next.js, Nuxt, Astro, SvelteKit, Angular SSR) is safe.
- **Themed with CSS.** `--mini-chart-*` custom properties cross the Shadow DOM, so one rule on `:root` themes every chart. Dark mode follows `color-scheme`.
- **Typed and configurable.** Every attribute is also a typed property, with app-wide defaults and named presets. TypeScript declarations ship for ESM and CJS.
- **Accessible and live.** Labels and roles on every chart, keyboard navigation, reduced motion, and `appendData()` for streaming data that slides in place.

<img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/main/assets/img/data-table.png" width="100%" alt="A service health table with a 24px line, bar and status strip in every row" />

## Quick start

**1. Install**

```sh
npm install sparkline-mini-charts
# or: pnpm add sparkline-mini-charts / yarn add sparkline-mini-charts
```

**2. Register the elements** once, at startup:

```js
import "sparkline-mini-charts/register";
```

**3. Draw a chart:**

```html
<mini-line-chart data="[18, 23, 20, 31, 27, 38, 35, 44]" curve="smooth" label="Weekly revenue"></mini-line-chart>
```

**4. Update it from JavaScript.** Assign arrays and objects to the `data` property as they are; every attribute is also a camelCase property.

```js
const chart = document.querySelector("mini-line-chart");
chart.data = [18, 23, 20, 31, 27, 38, 35, 44, 52]; // redrawn with a smooth transition
chart.referenceValue = 30; // same as reference-value="30"
chart.setAttribute("trend-color", "auto"); // green when rising, red when falling
```

Size a chart with CSS (`inline-size`, `block-size`): it scales to its box and keeps its aspect ratio when only one side is set.

<details>
<summary><b>Smaller bundles: register only what you use</b></summary>

```js
// Every chart, when you choose (no side effect on import):
import { defineMiniCharts } from "sparkline-mini-charts/define";
defineMiniCharts();

// One chart: its own entry point and the registration helper.
import { MiniLineChart } from "sparkline-mini-charts/mini-line-chart";
import { defineMiniChart } from "sparkline-mini-charts";
defineMiniChart("mini-line-chart", MiniLineChart);
```

The package ships ESM and CJS builds with `.d.ts` / `.d.cts` declarations and one entry point per chart.

</details>

## The 24 charts

<a href="https://sparkline-mini-charts.erlonrru.com/#/charts"><img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/main/assets/img/charts-gallery.png" width="100%" alt="All 24 charts in a six-by-four grid, each card showing the chart, its name and its tag" /></a>

Each tag links to its reference page: attributes, data format, events, CSS tokens and parts. A [dark version](https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/main/assets/img/charts-gallery-dark.png) of this sheet is under [Theming](#theming-and-dark-mode).

| Element | Best for | Data |
| :-- | :-- | :-- |
| [`<mini-line-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-line-chart.md) | The classic sparkline: a trend | `number[]` |
| [`<mini-area-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-area-chart.md) | A trend with a filled, gradient area | `number[]` |
| [`<mini-stacked-area-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-stacked-area-chart.md) | A total and its layers over time | `number[][]`, one array per layer |
| [`<mini-stream-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-stream-chart.md) | Layers flowing around a center line | `number[][]`, one array per layer |
| [`<mini-combo-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-combo-chart.md) | Bars and a line, e.g. actual vs target | `{ bar, line }[]` |
| [`<mini-heatmap-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-heatmap-chart.md) | A matrix or an activity calendar | `number[][]`, or `number[]` + `columns` |
| [`<mini-bar-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-bar-chart.md) | Signed values from a baseline | `number[]` |
| [`<mini-win-loss-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-win-loss-chart.md) | Outcomes or a status strip | `number[]`, sign only (`1`, `0`, `-1`) |
| [`<mini-range-bar-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-range-bar-chart.md) | Floating low–high spans | `[low, high, current?][]` or objects |
| [`<mini-scatter-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-scatter-chart.md) | Two variables, with a trend line | `[x, y, r?][]` or `{ x, y, r? }[]` |
| [`<mini-waterfall-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-waterfall-chart.md) | A running total of signed steps | `number[]`, plus `{ total: true }` entries |
| [`<mini-box-plot-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-box-plot-chart.md) | A distribution: quartiles and outliers | samples, a summary, or one per box |
| [`<mini-radar-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-radar-chart.md) | Profiles over several axes | `number[]` or `number[][]` |
| [`<mini-pie-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-pie-chart.md) | Part-to-whole, as a pie or donut | `number[]` |
| [`<mini-half-pie-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-half-pie-chart.md) | Compact 180° shares | `number[]` |
| [`<mini-radial-bar-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-radial-bar-chart.md) | Concentric goal rings | `number[]` or `{ value, color? }[]` |
| [`<mini-stacked-bar-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-stacked-bar-chart.md) | One bar split into a total's parts | `number[]` or `{ value, label?, color? }[]` |
| [`<mini-treemap-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-treemap-chart.md) | Proportional area tiles | `number[]` or `{ value, label?, color? }[]` |
| [`<mini-progress-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-progress-chart.md) | One value filling a semicircle | `[value]` between `min` and `max` |
| [`<mini-gauge-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-gauge-chart.md) | A needle on colored zones | `[value, min?, max?]` |
| [`<mini-bullet-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-bullet-chart.md) | A KPI against a target and bands | `[value, target?, ...ranges]` or an object |
| [`<mini-funnel-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-funnel-chart.md) | Conversion steps and their drop-offs | `number[]` or `{ value, label? }[]` |
| [`<mini-candlestick-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-candlestick-chart.md) | Price candles with wicks | `[open, high, low, close][]` |
| [`<mini-ohlc-chart>`](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/components/mini-ohlc-chart.md) | Price tick bars | `[open, high, low, close][]` |

<img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/main/assets/img/dashboard.png" width="100%" alt="Nine dashboard tiles: a donut with a legend, a gauge, goal rings, a combo chart, candlesticks, an activity heatmap, a funnel, a waterfall and a stream chart" />

## Framework usage

Bind `data` as a **property**: arrays and objects go in as they are, with no `JSON.stringify`. Other options are attributes (or props with the wrappers), and events are plain DOM events. More in [Getting started](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/getting-started.md#-framework-integrations).

The React (`^18.3 || ^19`) and Vue (`^3.5`) wrappers are optional, typed entry points; the frameworks are optional peer dependencies.

### React

```tsx
"use client";

import { MiniLineChart } from "sparkline-mini-charts/react";

export function RevenueChart({ revenue }: { revenue: number[] }) {
  return (
    <MiniLineChart
      data={revenue}
      curve="smooth"
      label="Weekly revenue"
      onSparklineSelect={(event) => console.log(event.detail.value)}
    />
  );
}
```

### Vue 3

```vue
<script setup lang="ts">
import { MiniLineChart } from "sparkline-mini-charts/vue";

const revenue = [12, 18, 15, 27];
const onSelect = (event: CustomEvent) => console.log(event.detail.value);
</script>

<template>
  <MiniLineChart :data="revenue" curve="smooth" label="Weekly revenue" @sparkline-select="onSelect" />
</template>
```

### Angular

Register the elements once, allow custom elements, and bind `[data]` on the raw tags. This works with AOT builds (the Angular CLI default):

```ts
import "sparkline-mini-charts/register";
import { CUSTOM_ELEMENTS_SCHEMA, Component } from "@angular/core";

@Component({
  selector: "app-revenue-card",
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<mini-line-chart
    [data]="revenue"
    curve="smooth"
    label="Weekly revenue"
    (sparkline-select)="onSelect($event)"
  ></mini-line-chart>`,
})
export class RevenueCard {
  revenue = [12, 18, 15, 27];

  onSelect(event: Event) {
    console.log((event as CustomEvent).detail.value);
  }
}
```

Bind object options with `[attr.name]` and serialize them yourself (`[attr.zones]="zonesJson"`).

> [!WARNING]
> **Known limitation in 1.4.x.** The `sparkline-mini-charts/angular` entry is not compiled by the Angular compiler. Its 17 per-chart signal directives (`MiniLineChartDirective`, …, `SPARKLINE_DIRECTIVES`) do not work from `node_modules`; they stay exported so 1.4.0 code compiles, and will work from the dedicated `@sparkline-mini-charts/angular` package planned for 1.5. `MiniChartDirective` works in JIT apps only: AOT builds reject it with NG2012. Use the recipe above.

### Svelte

No wrapper needed: Svelte assigns `data={…}` to the element's property.

```svelte
<script>
  import "sparkline-mini-charts/register";
  let revenue = [12, 18, 15, 27];
</script>

<mini-line-chart data={revenue} curve="smooth" label="Weekly revenue"></mini-line-chart>
```

### Vanilla HTML

```html
<script type="module">
  import "sparkline-mini-charts/register";
</script>

<mini-bar-chart data="[-8, 12, 4, -3, 18]" tooltip label="Weekly variance"></mini-bar-chart>
```

## Configuration

Every option is an HTML attribute and a typed camelCase property. App-wide **defaults** and named **presets** keep markup short:

```js
import { defineMiniCharts, configureMiniCharts, defineChartPreset } from "sparkline-mini-charts/define";

defineMiniCharts({
  defaults: { "*": { interactive: true }, "mini-line-chart": { curve: "smooth" } },
  presets: { dense: { "mini-bar-chart": { gap: 0.05 } } },
});
defineChartPreset("rounded", { "mini-bar-chart": { radius: 2 } });
configureMiniCharts({ defaults: { "mini-bar-chart": { radius: 1 } } }); // re-renders connected charts

const chart = document.querySelector("mini-bar-chart");
chart.preset = "dense rounded"; // the rightmost preset wins
chart.options = { baseline: 10 }; // replaced as a whole, never written to attributes
chart.resolvedOptions(); // { gap: 0.05, radius: 2, baseline: 10, interactive: true, … }
```

Precedence, highest first: attribute or property › `options` › `preset` › tag defaults › `"*"` defaults › built-in default. The React and Vue wrappers take `options` and `preset` props too.

The [configurator](https://sparkline-mini-charts.erlonrru.com/#/charts/mini-line-chart) lists every option of every chart, previews it at three sizes and exports the code for HTML, JavaScript, React, Vue, Angular and Svelte:

<a href="https://sparkline-mini-charts.erlonrru.com/#/charts/mini-line-chart"><img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/main/assets/img/configurator.png" width="100%" alt="The line chart configurator: a large preview, the generated HTML code and the options panel" /></a>

## Events

With `interactive` (or `tooltip`), every chart dispatches the same events, which bubble and cross the Shadow DOM:

| Event | When | `detail` |
| :-- | :-- | :-- |
| `sparkline-hover` | The pointer or the keyboard reaches another point | `chart`, `index`, `seriesIndex`, `value`, `datum`, `color`, `clientX`, `clientY`, `pointerType` |
| `sparkline-select` | A point is clicked, or Enter / Space is pressed | same as `sparkline-hover` |
| `sparkline-leave` | The pointer or the focus leaves the chart | — |
| `zone-change` | `<mini-gauge-chart>`: the needle moves into another zone | `value`, `zoneIndex`, `zoneColor` |
| `progress-complete` | `<mini-progress-chart>`: the value reaches `max` | `value`, `max` |

```js
document.querySelector("mini-bar-chart").addEventListener("sparkline-select", (event) => {
  const { index, value, datum, color } = event.detail; // `color` is the mark's computed color
});
```

`detail` also keeps each chart's own keys from 1.x. Add `tooltip` for a built-in tooltip with the value formatted by `Intl.NumberFormat` (`locale="de-DE"` to pick the locale); style it with `::part(tooltip)`, `--mini-chart-tooltip-bg` and `--mini-chart-tooltip-color`.

<img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/main/assets/img/tooltip.png" width="560" alt="An area chart in a KPI card, showing the built-in tooltip next to a hovered point" />

## Live data

Every data change transitions the marks from where they were, with no chart recreated. For streams, `appendData()` adds points and slides the series left (line, area, bar, win-loss, combo and scatter); other charts take a new `data` array.

```js
import { configureMiniCharts } from "sparkline-mini-charts/define";

// Keep streamed values on the element only, instead of mirroring them to the `data` attribute.
configureMiniCharts({ reflectData: false });

const cpu = document.querySelector("mini-line-chart");
setInterval(() => cpu.appendData([readCpuUsage()], { maxLength: 60 }), 1000);
```

<a href="https://sparkline-mini-charts.erlonrru.com/#/live"><img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/main/assets/img/live.png" width="100%" alt="The live streaming board in dark mode: CPU, requests, net flow, price candles, health checks and a latency gauge updated every second" /></a>

## Theming and dark mode

Charts render in their own Shadow DOM. Theme them with `--mini-chart-*` custom properties, which inherit through the shadow boundary, on `:root`, a container or the chart itself, and reach single marks with `::part()`:

```css
:root {
  --mini-chart-color: #0f766e;
  --mini-chart-stroke-width: 2.5;
}

mini-pie-chart {
  inline-size: 6rem;
  --mini-chart-color-1: #7c3aed;
  --mini-chart-color-2: #0ea5e9;
}

mini-line-chart::part(line) {
  stroke-linecap: round;
}
```

| Token | Default | Styles |
| :-- | :-- | :-- |
| `--mini-chart-color` | `#2563eb` (`#60a5fa` dark) | The main color of every single-series chart |
| `--mini-chart-color-N` | 16-color palette | The Nth slice, layer or ring (pie, half-pie, stacked area, stream, radial bar) |
| `--mini-chart-stroke-width` | `2` | Line thickness; the arc thickness of gauge and progress |
| `--mini-chart-bullish-color` | `#10b981` | Rising values: candles, OHLC, wins, `trend-color="auto"` |
| `--mini-chart-bearish-color` | `#ef4444` | Falling values: candles, OHLC, losses, `trend-color="auto"` |
| `--mini-chart-surface` | `#ffffff` (`#0f172a` dark) | The background the marks sit on (halos, outlines) |
| `--mini-chart-tooltip-bg` | `#0f172a` (`#f8fafc` dark) | Tooltip background |
| `--mini-chart-tooltip-color` | `#f8fafc` (`#0f172a` dark) | Tooltip text |
| `--mini-chart-focus-ring` | `--mini-chart-color` | Outline of a focused interactive chart |
| `--mini-chart-dim-opacity` | `0.45` | Opacity of the other marks while one is active |
| `--mini-chart-aspect-ratio` | the chart's own | Host aspect ratio when only one side is sized |

The [Getting started theming table](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/getting-started.md#theming-tokens) lists every shared token; each chart's page lists its own tokens and parts. Where an attribute and a token set the same thing (`radius` and `--mini-chart-bar-radius`), the attribute wins.

**Dark mode is built in.** With `color-scheme: dark` on the page or a container, the default colors switch to dark-friendly ones through `light-dark()`. Your tokens always win.

```css
:root {
  color-scheme: light dark; /* follow the system, or set `dark` */
}
```

<img src="https://raw.githubusercontent.com/ErlonRr/sparkline-mini-charts/main/assets/img/charts-gallery-dark.png" width="100%" alt="The 24 charts with their default colors on a dark page" />

## Accessibility and keyboard

- Every chart renders an SVG with `role="img"` (`role="meter"` with `aria-valuenow` for gauge, progress and bullet), named by the `label` attribute and a `<title>`.
- An interactive chart is focusable. Arrow keys move the active point (`sparkline-hover` with `pointerType: "keyboard"`), Home and End jump to the ends, Enter and Space select, Escape leaves. The focus ring uses `--mini-chart-focus-ring`.
- Transitions are skipped with `prefers-reduced-motion: reduce`, or per chart with `motion="reduce"`.
- Strokes, points and labels stay readable at every size, from a table row to a full-width card.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari: the charts need Custom Elements, Shadow DOM and `color-mix()`. Built-in dark defaults need `light-dark()` (Chrome 123, Firefox 120, Safari 17.5); older browsers keep the light defaults. Charts draw in the browser only: importing the package during server rendering is safe, and the elements render once they are registered on the client.

## Links

- [Live demo](https://sparkline-mini-charts.erlonrru.com): gallery, configurator, live board, theming studio and framework guides
- [Getting started](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/docs/getting-started.md) and the [chart reference](https://github.com/ErlonRr/sparkline-mini-charts/tree/main/docs/components)
- [Changelog](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/packages/core/CHANGELOG.md), with the upgrade notes of 1.4.0
- [Contributing](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/CONTRIBUTING.md): the pnpm workspace, the checks and the release flow
- [Issues](https://github.com/ErlonRr/sparkline-mini-charts/issues)

## License

[MIT](https://github.com/ErlonRr/sparkline-mini-charts/blob/main/LICENSE) © 2026 [Erlon Rru](https://erlonrru.com)
