# Radar Chart (`<mini-radar-chart>`)

One or more series drawn as closed polygons on radial axes (a radar or spider chart), over a grid of spokes and rings. Axis `i` points from the center at 12 o'clock and the next axes follow clockwise; a value sits at its share of `max` along its axis. The polygons grow from the center the first time values arrive, and move to their new shape on updates.

## Data

A JSON array of numbers (one series, one value per axis), or an array of such arrays (several series, overlaid in order, the last on top). At least 3 axes are needed:

```json
[4, 3, 5, 2, 4]
```

```json
[
  [4, 3, 5, 2, 4],
  [2, 5, 3, 4, 3]
]
```

An entry that is not a finite number becomes `0` in its slot, so every value keeps its axis. Shorter series are padded with `0` to the longest one, and a series without any finite number is dropped. Values below `0` are drawn at the center and values above `max` at the outer ring. Fewer than 3 axes, or no usable series, draws an empty chart.

The `data` property accepts the array directly and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `number[] \| number[][]` | `[]` | The series values. |
| `label` | string | `"Radar chart with N axes"` (`"… with S series over N axes"`) | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `max` | number | highest value (at least `1`) | Value at the outer ring. A value that is not positive is ignored. |
| `levels` | number | `3` | Number of concentric grid rings; `0` draws the spokes only. |
| `grid` | boolean | on | Draws the spokes and rings. Only `grid="false"` turns them off. |
| `fill` | boolean | on | Fills each polygon with a translucent tint of its color. Only `fill="false"` turns it off. |
| `points` | boolean | off | Draws a marker on every vertex. The hovered vertex is marked either way. |
| `interactive` | boolean (presence) | off | Marks the vertex nearest to the pointer, dims the other series and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`) at its vertex, formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws the entrance and data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). The arrow keys walk the vertices when the chart has focus: ArrowLeft and ArrowRight move along the axes, ArrowUp and ArrowDown change series.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ chart, index, seriesIndex, value, datum, color, clientX, clientY }` | The pointer moves to another vertex: the one nearest to it, anywhere over the chart. `index` is the axis, `seriesIndex` the series, `value` (and `datum`) the vertex's value. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks the chart. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color` | accent blue | Color of a single series. |
| `--mini-chart-color-N` | built-in palette | Color of series `N` (1-based) when there are several. |
| `--mini-chart-track-color` | translucent slate | Spokes and rings of the grid. |
| `--mini-chart-stroke-width` | `1.5` | Outline width of the polygons, in CSS pixels. |
| `--mini-chart-point-fill` | the series color | Fill of the vertex markers. |
| `--mini-chart-dim-opacity` | `0.45` | Opacity of the other series while one is hovered. |
| `--mini-chart-aspect-ratio` | `1 / 1` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `grid` | `<path>` | Spokes and rings. |
| `plot` | `<g>` | Container of the series. |
| `series` / `series-N` | `<g>` | One series: its polygon and vertex markers. |
| `area` / `area-N` | `<path>` | The series polygon (fill and outline). |
| `point` | `<circle>` | A vertex marker. |

## Example

```html
<mini-radar-chart
  data="[[4, 3, 5, 2, 4], [2, 5, 3, 4, 3]]"
  max="5"
  levels="4"
  points
  interactive
  label="Skills compared"
></mini-radar-chart>
```
