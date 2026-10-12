# Area Chart (`<mini-area-chart>`)

A line sparkline with the region between the line and the zero baseline filled, by default with a vertical gradient that fades out toward the baseline.

## Data

A JSON array of numbers. Entries that are not finite numbers (`null`, strings, `NaN`) are skipped, and the remaining values are spaced evenly. The value axis always includes `0`, so the fill reaches the zero baseline. A single value is drawn as one point, without line or fill.

```json
[18, 23, 20, 31, 27, 38, 44]
```

The `data` property accepts the array directly (`chart.data = [18, 23, 20]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `number[]` | `[]` | The values to plot. |
| `label` | string | `"Area chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `curve` | `linear` \| `smooth` \| `step` \| `step-after` \| `step-before` | `linear` | Interpolation of the line and of the top edge of the fill. `step` is the same as `step-after`. |
| `points` | `last` \| `all` \| `min-max` \| `none` | `none` | Which points get a marker. `min-max` marks the lowest and the highest value. Any other value (including `ends`, which the React types still accept) draws no marker. |
| `gradient` | see [Gradient](#gradient) | on | Fill of the area. Unlike the other charts with a `gradient` attribute, the area is filled with a gradient when the attribute is absent. |
| `min` | number | lowest value or `0` | Bottom of the value axis. Ignored when it is not below `max`. Values outside the range are not clamped. |
| `max` | number | highest value or `0` | Top of the value axis. Ignored when it is not above `min`. |
| `reference-value` | number | none | Draws a dashed horizontal `reference-line` at this value. It does not extend the value axis. |
| `trend-color` | `auto` | none | With `auto` and at least two values, colors the chart with `--mini-chart-bullish-color` when the last value is at or above the first, and `--mini-chart-bearish-color` otherwise. The chart marks its internal svg with `data-trend="up"` or `"down"`; it never writes the host's `style`. |
| `interactive` | boolean (presence) | off | Shows a crosshair and a highlighted point under the pointer and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`), formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

## Gradient

The `gradient` attribute is read by the shared parser in `src/core/gradient.js`:

| Value | Fill |
| --- | --- |
| absent, `""` or `"true"` | Default gradient: the chart color at 45% opacity at the top, fading to 2% at the baseline. |
| `"false"`, `"0"`, `"none"`, `"off"` or `"no"` | Flat fill: `--mini-chart-fill` (default: the chart color) at 20% opacity. |
| JSON array, e.g. `'["#8b5cf6", "#06b6d4"]'` (single quotes accepted) | One evenly spaced stop per color, top to bottom, at 55% opacity; the last stop is at 5%. A single color fades like the default gradient: 45% at the top, 2% at the baseline. |
| comma-separated list, e.g. `"#8b5cf6, rgb(6, 182, 212)"` | Same as a JSON array. Commas inside `rgb()`, `hsl()`, `oklch()` or `var()` stay inside their color, so `var(--brand)` works as a stop. |

Entries that are not CSS colors (checked with `CSS.supports("color", …)`; `var()` is always kept) are dropped. A value with no usable color (for example `"[]"` or `"auto"`) gives the flat fill.

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
| `--mini-chart-color` | `#2563eb` | Line, marker and default gradient color (the host's `color`). |
| `--mini-chart-stroke-width` | `2` | Line thickness, in screen pixels (non-scaling stroke). |
| `--mini-chart-fill` | the line color | Flat fill of the area when the gradient is off (`gradient="false"`). |
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
| `group` | `<g>` | Clipped group that holds the area and the line. |
| `area` | `<path>` | The filled region. |
| `line` | `<path>` | The top edge. |
| `points` | `<g>` | Container of the markers. |
| `point` | `<circle>` | Every marker. |
| `point-last`, `point-min`, `point-max` | `<circle>` | The marker of the last point (`points="last"`) or of the lowest and highest value (`points="min-max"`). With `points="all"` every marker also has the part `point-point`. |
| `reference-line` | `<line>` | Dashed line drawn by `reference-value`. |
| `crosshair` | `<line>` | Vertical hover guide (`interactive`). |
| `active-point` | `<circle>` | Highlighted point under the pointer (`interactive`). |

## Example

```html
<mini-area-chart
  data="[18, 23, 20, 31, 27, 38, 44]"
  curve="smooth"
  gradient="#8b5cf6, #06b6d4"
  points="last"
  trend-color="auto"
  interactive
  label="Monthly active users"
></mini-area-chart>
```

```css
mini-area-chart::part(area) {
  opacity: 0.8;
}
```
