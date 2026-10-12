# Combo Chart (`<mini-combo-chart>`)

Bars and a line over the same time slots: each datum has one bar value and one line value, for example sales (bars) against a target (line). The line's vertices sit on the bar centers, and the last line value gets a marker.

## Data

A JSON array of objects with a numeric `bar` and a numeric `line`. A datum whose `bar` or `line` is missing or not a finite number is dropped whole, so later data move one slot left.

```json
[
  { "bar": 12, "line": 10 },
  { "bar": 18, "line": 14 },
  { "bar": 9, "line": 15 },
  { "bar": 22, "line": 19 }
]
```

The `data` property accepts the array directly (`chart.data = [{ bar: 12, line: 10 }]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `{ bar, line }[]` | `[]` | The data, one object per slot. |
| `label` | string | `"Combo chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `shared-domain` | boolean (on unless `"false"`) | on | On: bars and line share one value axis that includes `0`. `shared-domain="false"`: the bars keep a zero-based axis of their own, and the line is scaled to its own lowest and highest value. |
| `curve` | `linear` \| `smooth` | `linear` | `smooth` curves the line. Any other value, including `step`, draws straight segments. |
| `bar-gap` | number from `0` to `0.8` | `0.2` | Share of each slot left empty between bars. Values outside the range are clamped; a non-number gives `0.2`. |
| `interactive` | boolean (presence) | off | Shows a crosshair at the nearest slot, highlights the bar under the pointer and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`), formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

The chart has no `min` or `max` attribute.

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Since 1.5, every `sparkline-hover` and `sparkline-select` `detail` also carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` (the mark's computed color) and `clientX`/`clientY`, and a hover fires only when the hovered point changes.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, barValue, lineValue, x, y }` | The pointer moves over the chart. `index` is the nearest slot among the plotted data, `x` and `y` are the line vertex in viewBox units (100 × 30). |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a mark (or the chart, for the single-value meters). |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color` | `#2563eb` | Line stroke and last-point marker. |
| `--mini-chart-stroke-width` | `2` | Line thickness, in screen pixels (non-scaling stroke). |
| `--mini-chart-bar-color` | `rgba(128, 128, 128, 0.3)` | Bar fill. (`--mini-chart-fill` does not apply to this chart's bars.) |
| `--mini-chart-bar-color-hover` | `rgba(128, 128, 128, 0.6)` | Fill of the bar under the pointer (`interactive`). |
| `--mini-chart-crosshair-color` | `rgba(128, 128, 128, 0.5)` | Hover crosshair stroke. |
| `--mini-chart-crosshair-width` | `1` | Hover crosshair thickness. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `bars` | `<g>` | Container of the bars. |
| `bar` | `<rect>` | Every bar. |
| `line-group` | `<g>` | Clipped group that holds the line. |
| `line` | `<path>` | The line. |
| `points` | `<g>` | Container of the marker. |
| `point` | `<circle>` | Marker on the last line value. |
| `crosshair` | `<line>` | Vertical hover guide (`interactive`). |

## Example

```html
<mini-combo-chart
  data='[{"bar": 12, "line": 10}, {"bar": 18, "line": 14}, {"bar": 9, "line": 15}, {"bar": 22, "line": 19}]'
  curve="smooth"
  bar-gap="0.3"
  interactive
  label="Sales vs target"
  style="--mini-chart-bar-color: rgba(14, 165, 233, 0.35)"
></mini-combo-chart>
```

```css
mini-combo-chart::part(line) {
  stroke-dasharray: 3 2;
}
```
