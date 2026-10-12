# Line Chart (`<mini-line-chart>`)

The classic sparkline: an ordered series of numbers drawn as one line from left to right, with an optional marker on the last point.

## Data

A JSON array of numbers. Entries that are not finite numbers (`null`, strings, `NaN`) are skipped, and the remaining values are spaced evenly.

```json
[10, 25, 40, 15, 60, 45, 90]
```

The `data` property accepts the array directly (`chart.data = [10, 25, 40]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `number[]` | `[]` | The values to plot. |
| `label` | string | `"Line chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `curve` | `linear` \| `smooth` \| `step` \| `step-after` \| `step-before` | `linear` | Interpolation between points. `step` is the same as `step-after`. |
| `points` | `last` \| `all` \| `min-max` \| `none` | `last` | Which points get a marker. `min-max` marks the lowest and the highest value. Any other value (including `ends`, which the React types still accept) draws no marker. |
| `min` | number | lowest value | Bottom of the value axis. Ignored when it is not below `max`. Values outside the range are not clamped. |
| `max` | number | highest value | Top of the value axis. Ignored when it is not above `min`. |
| `reference-value` | number | none | Draws a dashed horizontal `reference-line` at this value. It does not extend the value axis. |
| `trend-color` | `auto` | none | With `auto` and at least two values, colors the chart with `--mini-chart-bullish-color` when the last value is at or above the first, and `--mini-chart-bearish-color` otherwise. The chart marks its internal svg with `data-trend="up"` or `"down"`; it never writes the host's `style`. |
| `interactive` | boolean (presence) | off | Shows a crosshair and a highlighted point under the pointer and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`), formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Since 1.5, every `sparkline-hover` and `sparkline-select` `detail` also carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` (the mark's computed color) and `clientX`/`clientY`, and a hover fires only when the hovered point changes.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, value, x, y }` | The pointer moves over the chart. `index` is the nearest point among the plotted values, `x` and `y` are in viewBox units (100 × 30). |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a mark (or the chart, for the single-value meters). |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color` | `#2563eb` | Line and marker color (the host's `color`). |
| `--mini-chart-stroke-width` | `2` | Line thickness, in screen pixels (non-scaling stroke). |
| `--mini-chart-point-fill` | the line color | Fill of the markers and of the hover `active-point`. |
| `--mini-chart-bullish-color` | `#10b981` | Chart color for a rising series with `trend-color="auto"`. |
| `--mini-chart-bearish-color` | `#ef4444` | Chart color for a falling series with `trend-color="auto"`. |
| `--mini-chart-ref-color` | `rgba(128, 128, 128, 0.45)` | `reference-line` stroke. |
| `--mini-chart-ref-width` | `1` | `reference-line` thickness. |
| `--mini-chart-crosshair-color` | `rgba(128, 128, 128, 0.5)` | Hover crosshair stroke. |
| `--mini-chart-crosshair-width` | `1` | Hover crosshair thickness. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `group` | `<g>` | Clipped group that holds the line. |
| `line` | `<path>` | The line itself. |
| `points` | `<g>` | Container of the markers. |
| `point` | `<circle>` | Every marker. |
| `point-last`, `point-min`, `point-max` | `<circle>` | The marker of the last point (`points="last"`) or of the lowest and highest value (`points="min-max"`). With `points="all"` every marker also has the part `point-point`. |
| `reference-line` | `<line>` | Dashed line drawn by `reference-value`. |
| `crosshair` | `<line>` | Vertical hover guide (`interactive`). |
| `active-point` | `<circle>` | Highlighted point under the pointer (`interactive`). |

## Example

```html
<mini-line-chart
  data="[10, 25, 40, 15, 60]"
  curve="smooth"
  points="min-max"
  trend-color="auto"
  interactive
  label="Revenue trend"
  style="--mini-chart-stroke-width: 3"
></mini-line-chart>
```

```css
mini-line-chart::part(point-last) {
  stroke: white;
  stroke-width: 1;
}
```
