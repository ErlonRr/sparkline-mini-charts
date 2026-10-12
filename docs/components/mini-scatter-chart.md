# Scatter & Bubble Chart (`<mini-scatter-chart>`)

Plots `(x, y)` points to show distributions, clusters and correlations. A third value per point sets its radius, which turns it into a bubble chart, and `trend-line` adds a least-squares regression line.

## Data

A JSON array of points. Each point can be:

- `[x, y]` or `[x, y, r]`;
- `{ "x": …, "y": …, "r": … }` (`r` optional);
- a bare number, plotted as `[index, value]`.

```json
[
  [5, 12],
  [10, 18, 4],
  { "x": 15, "y": 14 },
  22
]
```

- `r` is a radius in viewBox units (the viewBox is 100 × 30); without it the point uses `point-radius`.
- Entries that are neither an array, an object nor a finite number (`null`, strings, booleans) are dropped, and `index` then counts the remaining points.
- Inside a kept point, a missing or non-finite `x` becomes the point's index and a missing or non-finite `y` becomes `0`, so a malformed object such as `{}` still draws a point at `y = 0`. A one-element array `[v]` is plotted at `x = v, y = v`.

The `data` property accepts the array directly (`chart.data = [[5, 12], [10, 18]]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON array of points | `[]` | The points to plot. |
| `label` | string | `"Scatter chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `point-radius` | number | `3` | Radius of points without their own `r`, in viewBox units. A non-numeric value keeps the default. |
| `trend-line` | boolean | off | Draws a dashed least-squares regression line across the x range. On when the attribute is present with any value except `"false"`. Needs at least two points with different `x`. |
| `min-x` | number | lowest `x` | Left end of the x axis. |
| `max-x` | number | highest `x` | Right end of the x axis. |
| `min-y` | number | lowest `y` | Bottom of the y axis. |
| `max-y` | number | highest `y` | Top of the y axis. |
| `interactive` | boolean (presence) | off | Highlights the point under the pointer (the others fade to 0.45 opacity) and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`), formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

For each axis, a minimum that is not below its maximum is ignored and the data extent is used instead. Points outside an explicit range are not clamped.

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Since 1.5, every `sparkline-hover` and `sparkline-select` `detail` also carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` (the mark's computed color) and `clientX`/`clientY`, and a hover fires only when the hovered point changes.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, data, element }` | The pointer enters a point. `data` is the entry as written in `data` (an array, an object or a number), `element` is its `<circle>`. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a mark (or the chart, for the single-value meters). |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-point-color` | `--mini-chart-color` | Point fill. |
| `--mini-chart-color` | `#3b82f6` | Point fill when `--mini-chart-point-color` is not set, and base of the default trend line color. |
| `--mini-chart-point-stroke` | `#ffffff` | Point outline (1px; 2.5px on hover). |
| `--mini-chart-trend-color` | `--mini-chart-color` at 40% opacity | Trend line stroke. |
| `--mini-chart-trend-width` | `1.5px` | Trend line thickness. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `points` | `<g>` | Container of the points. |
| `point` | `<circle>` | One point. |
| `trend-line` | `<line>` | The regression line (`trend-line`). |

## Example

```html
<mini-scatter-chart
  data="[[5, 10], [12, 18], [20, 24, 5], [28, 22], [35, 38], [50, 48]]"
  trend-line
  point-radius="2.5"
  interactive
  label="Latency vs throughput"
  style="--mini-chart-point-color: #8b5cf6; --mini-chart-trend-color: #a78bfa"
></mini-scatter-chart>
```

```css
mini-scatter-chart::part(trend-line) {
  stroke-dasharray: none;
}
```
