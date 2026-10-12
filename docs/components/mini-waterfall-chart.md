# Waterfall Chart (`<mini-waterfall-chart>`)

Floating bars that step a running total up and down: each bar starts where the previous one ended. Total bars show the running total from zero, and thin connectors join the bar ends. The bars drop in one after the other the first time values arrive.

## Data

A JSON array of deltas. An entry is a number, or an object with a numeric `value` and an optional `label`; `{ "total": true }` draws the running total so far from zero (its `value` is ignored):

```json
[120, -30, 45, -20, { "total": true, "label": "Net" }]
```

Entries that are neither a finite number, an object with a finite `value`, nor a total are skipped. The value axis always includes zero.

The `data` property accepts the array directly and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `(number \| { value?, total?, label? })[]` | `[]` | The deltas and totals. |
| `label` | string | `"Waterfall chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `gap` | number | `0.25` | Share of each slot left empty between bars, clamped to `0`–`0.8`. |
| `radius` | number | `0` | Corner radius of each bar, in viewBox units (the chart is 100 × 30). |
| `connectors` | boolean | on | Thin lines from the end of each bar to the start of the next. Only `connectors="false"` turns them off. |
| `interactive` | boolean (presence) | off | Highlights the bar under the pointer, dims the others and dispatches the events below. |
| `tooltip` | boolean | off | Shows the hovered bar as `+delta → running total` (a total bar: `total value`), prefixed with its `label`, in a small built-in tooltip (`part="tooltip"`) above the bar. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` skips the entrance and draws data updates at once. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Every `detail` carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` and `clientX`/`clientY`.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, value, datum: { value, runningTotal, isTotal, label? }, element }` | The pointer enters a bar. `value` is the delta, or the running total for a total bar; `runningTotal` is the total after the bar. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a bar. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-positive-color` | `#10b981` (dark: `#34d399`) | Fill of bars that raise the total. |
| `--mini-chart-negative-color` | `#ef4444` (dark: `#f87171`) | Fill of bars that lower the total. |
| `--mini-chart-total-color` | `--mini-chart-color` | Fill of total bars. |
| `--mini-chart-color` | `#2563eb` (dark: `#60a5fa`) | Accent, used by total bars when `--mini-chart-total-color` is not set. |
| `--mini-chart-connector-color` | translucent slate | Stroke of the connectors. |
| `--mini-chart-connector-width` | `1` | Stroke width of the connectors, in pixels. |
| `--mini-chart-dim-opacity` | `0.45` | Opacity of the other bars while one is hovered. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `connectors` | `<g>` | Container of the connectors. |
| `connector` | `<line>` | Every connector. |
| `bars` | `<g>` | Container of the bars. |
| `bar` | `<rect>` | Every bar. |
| `positive` | `<rect>` | Bars with a delta of `0` or more (part list `bar positive`). |
| `negative` | `<rect>` | Bars with a negative delta (part list `bar negative`). |
| `total` | `<rect>` | Total bars (part list `bar total`). |

## Example

```html
<mini-waterfall-chart
  data='[120, -30, 45, -20, {"total": true}]'
  radius="1"
  tooltip
  label="Cash flow"
  style="--mini-chart-total-color: #6366f1"
></mini-waterfall-chart>
```

```css
mini-waterfall-chart::part(connector) {
  stroke-dasharray: 2 2;
}
```
