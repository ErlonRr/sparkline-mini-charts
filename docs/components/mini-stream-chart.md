# Stream Chart (`<mini-stream-chart>`)

A streamgraph (ThemeRiver): several series stacked around a horizontal center line instead of a zero baseline, so the overall volume reads as a flowing band.

## Data

A JSON array of series, each an array of numbers (series-major: the first inner array is the bottom layer). An entry that is not a finite number counts as `0` at its own index, so every series stays aligned by column. A series shorter than the longest one is padded with `0`, and an entry that is not an array becomes an empty series.

```json
[
  [10, 15, 20, 18, 25],
  [5, 12, 8, 15, 10],
  [8, 6, 14, 10, 12]
]
```

Each column is centered on its total: the layers start at minus half the column sum.

The `data` property accepts the array directly (`chart.data = [[10, 15], [5, 12]]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `number[][]` | `[]` | The series to stack, bottom layer first. |
| `label` | string | `"Stream chart with N values"` (N = number of series) | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `curve` | `smooth` \| `linear` | `smooth` | `linear` draws straight segments. Any other value, including `step`, draws curved layer edges (when a series has more than two values). |
| `interactive` | boolean (presence) | off | Highlights the layer under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |

## Events

Dispatched only when `interactive` is set. Both bubble and cross the shadow boundary (`composed`).

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ layerIndex, seriesData, color, element }` | The pointer enters a layer. `layerIndex` is zero-based, `seriesData` is that series as parsed (invalid entries already `0`), `color` is the layer's built-in palette color (it does not reflect a `--mini-chart-color-N` override), and `element` is the layer's `<path>`. |
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
<mini-stream-chart
  data="[[10, 15, 20, 18, 25], [5, 12, 8, 15, 10], [8, 6, 14, 10, 12]]"
  interactive
  label="Organic stream flow"
  style="--mini-chart-color-1: #0ea5e9; --mini-chart-color-2: #8b5cf6; --mini-chart-color-3: #ec4899"
></mini-stream-chart>
```
