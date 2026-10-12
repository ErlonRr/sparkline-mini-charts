# Treemap Chart (`<mini-treemap-chart>`)

A flat treemap: one tile per positive value, with an area proportional to the value, packed by the squarified layout (Bruls, Huizing and van Wijk), so tiles stay close to squares. The tiles grow from their centers the first time values arrive, and move and resize on updates.

## Data

A JSON array of numbers, or of objects with a numeric `value` and an optional `label` and `color`:

```json
[42, 18, 12, 8, 5]
```

```json
[
  { "value": 42, "label": "Search", "color": "#0ea5e9" },
  { "value": 18, "label": "Social" },
  12
]
```

Entries without a finite value are ignored. Zero and negative values get no tile; the default label says how many were left out. A tile keeps its data index (in events, `part="tile-N"` and its palette color) whatever its place in the layout.

The `data` property accepts the array directly and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `(number \| { value, label?, color? })[]` | `[]` | The tile values. |
| `label` | string | `"Treemap chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `gap` | number | `1` | Space between neighbouring tiles, in viewBox units (the viewBox is 100 wide). Outer tiles still touch the edges. |
| `radius` | number | `--mini-chart-bar-radius`, else `1` | Corner radius of the tiles, in viewBox units. |
| `sort` | boolean | on | Lays out the largest value first (top left), which gives the squarest tiles. `sort="false"` keeps the data order. |
| `colors` | `series` \| `accent` | `series` | `series` gives tile `N` palette color `N`; `accent` uses the accent color for every tile, more transparent for smaller values. A data `color` wins in both. |
| `interactive` | boolean (presence) | off | Highlights the tile under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered tile as `value (percent%)`, prefixed with its `label`, in a small built-in tooltip (`part="tooltip"`) at the tile centre, formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws the entrance and data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). The arrow keys walk the tiles in layout order when the chart has focus.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ chart, index, seriesIndex, value, datum, color, percentage, label?, element }` | The pointer enters a tile. `index` is the data index, `datum` the entry with its `value` and `percent` of the total (`{ value, percent }` for a number), `percentage` that share rounded to one decimal, `element` the tile's `<rect>`. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a tile. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color-N` | built-in palette | Color of tile `N` (1-based data index) with `colors="series"`. |
| `--mini-chart-color` | accent blue | Tile color with `colors="accent"`. |
| `--mini-chart-bar-radius` | `1px` | Corner radius of the tiles, when `radius` is not set. |
| `--mini-chart-dim-opacity` | `0.45` | Opacity of the other tiles while one is hovered. |
| `--mini-chart-aspect-ratio` | `2 / 1` | Host aspect ratio. The tiles are laid out for this ratio (read when the chart renders), so they fill the box. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `tiles` | `<g>` | Container of the tiles. |
| `tile` / `tile-N` | `<rect>` | A tile; `N` is its 1-based data index. |

## Example

```html
<mini-treemap-chart
  data='[{"value": 42, "label": "Search"}, {"value": 18, "label": "Social"}, 12, 8, 5]'
  gap="1.5"
  tooltip
  label="Traffic by source"
  style="--mini-chart-aspect-ratio: 3 / 1"
></mini-treemap-chart>
```
