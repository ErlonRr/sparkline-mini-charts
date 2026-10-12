# Stacked Area Chart (`<mini-stacked-area-chart>`)

Several series stacked on top of each other, so the top edge shows the total and each band shows one series' share. With `normalize`, every column is scaled to 100%.

## Data

A JSON array of series, each an array of numbers (series-major: the first inner array is the bottom layer). An entry that is not a finite number counts as `0` at its own index, so every series stays aligned by column. A series shorter than the longest one is padded with `0`, and an entry that is not an array becomes an empty series.

```json
[
  [10, 20, 15, 30, 25],
  [8, 12, 10, 14, 18],
  [4, 6, 9, 7, 10]
]
```

The value axis starts at `0`. Negative values are not stacked separately: they are added to the running total like any other value, so layers can overlap.

The `data` property accepts the array directly (`chart.data = [[10, 20], [8, 12]]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `number[][]` | `[]` | The series to stack, bottom layer first. |
| `label` | string | `"Stacked-area chart with N values"` (N = number of series) | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `curve` | `linear` \| `smooth` | `linear` | `smooth` draws curved layer edges when a series has more than two values. Any other value, including `step`, draws straight segments. |
| `normalize` | boolean (presence) | off | Scales every column so the layers add up to 100% (a column whose sum is `0` stays empty). `normalize="false"` still enables it. |
| `interactive` | boolean (presence) | off | Highlights the layer under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`), formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Since 1.5, every `sparkline-hover` and `sparkline-select` `detail` also carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` (the mark's computed color) and `clientX`/`clientY`, and a hover fires only when the hovered point changes.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ layerIndex, seriesData, color, element }` | The pointer enters a layer. `layerIndex` is zero-based, `seriesData` is that series as parsed (invalid entries already `0`), `color` is the layer's built-in palette color (it does not reflect a `--mini-chart-color-N` override), and `element` is the layer's `<path>`. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a mark (or the chart, for the single-value meters). |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color-N` | built-in 16-color palette (`#84cc16`, `#f43f5e`, `#0ea5e9`, `#f59e0b`, …) | Fill of layer N, counting from 1 (`--mini-chart-color-1` is the bottom layer). The palette repeats after 16 layers. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `layers` | `<g>` | Clipped group that holds the layers. |
| `layer` | `<path>` | Every layer. |
| `layer-N` | `<path>` | Layer N, counting from 1 from the bottom (`layer-1`, `layer-2`, …). Use it to style one layer: `::part(layer-2)`. |

## Example

```html
<mini-stacked-area-chart
  data="[[10, 20, 15, 30, 25], [8, 12, 10, 14, 18], [4, 6, 9, 7, 10]]"
  curve="smooth"
  normalize
  interactive
  label="Resource distribution"
  style="--mini-chart-color-1: #0ea5e9; --mini-chart-color-2: #6366f1"
></mini-stacked-area-chart>
```

```css
mini-stacked-area-chart::part(layer-3) {
  opacity: 0.6;
}
```
