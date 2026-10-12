# OHLC Chart (`<mini-ohlc-chart>`)

A financial sparkline of open, high, low and close prices drawn as OHLC bars: a vertical line from the high to the low, a short tick to the left at the open and a short tick to the right at the close, colored by direction.

## Data

A JSON array of `[open, high, low, close]` tuples, one per period, oldest first.

```json
[
  [100, 110, 90, 105],
  [105, 120, 100, 115],
  [115, 115, 80, 85]
]
```

- A tuple may carry extra columns after the close (volume, a timestamp): they are ignored and do not affect the price scale. Only the four prices of every bar set the value axis.
- A tuple with fewer than four entries, or whose first four entries are not all finite numbers, is dropped, and the bars after it move one slot to the left.
- A bar is bullish when `close >= open`, bearish otherwise. High and low are not checked against the open and close.

The `data` property accepts the array directly (`chart.data = [[100, 110, 90, 105]]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `[open, high, low, close][]` | `[]` | The bars to plot. |
| `label` | string | `"OHLC chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `tick-width` | number | `1.25` | Stroke width of each bar (vertical line and both ticks), in screen pixels: the stroke stays the same from a table row to a large card (before 1.5 it was in viewBox units and scaled with the chart). An explicit attribute wins over an inherited `--mini-chart-tick-width`; a negative or non-numeric value is ignored. |
| `gap` | number | `0.2` | Share of each slot left empty between bars, from `0` to `0.8`. Values outside that range are clamped; a non-numeric value keeps the default. The ticks span the rest of the slot. |
| `min` | number | lowest price | Bottom of the price axis. Ignored when it is not below `max`, and the data extent is used instead. Prices outside the range are not clamped. |
| `max` | number | highest price | Top of the price axis. Ignored when it is not above `min`. |
| `interactive` | boolean (presence) | off | Highlights the bar under the pointer (the others fade to 0.45 opacity) and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`), formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Since 1.5, every `sparkline-hover` and `sparkline-select` `detail` also carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` (the mark's computed color) and `clientX`/`clientY`, and a hover fires only when the hovered point changes.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, open, high, low, close, isBullish, change, changePercent }` | The pointer moves over the chart: the bar under it, or the nearest column (a tick is a thin stroke, so the whole column is its hit area). `change` is `close - open`; `changePercent` is `change / open × 100` rounded to two decimals (`0` when `open` is `0`). `index` counts the plotted bars, after invalid tuples are dropped. Unlike the candlestick chart, there is no `element`. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks the chart; the bar is picked the same way. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-bullish-color` | `#10b981` | Stroke of rising bars. |
| `--mini-chart-bearish-color` | `#ef4444` | Stroke of falling bars. |
| `--mini-chart-tick-width` | `1.25` | Bar stroke width, in screen pixels, when the `tick-width` attribute is absent. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

Each period is a single `<path>`; there are no separate parts for the open and close ticks. Direction is not a part either: bullish bars carry a `data-bullish` attribute, which `::part()` cannot select, so color rising and falling bars through `--mini-chart-bullish-color` and `--mini-chart-bearish-color`.

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `ticks` | `<g>` | Container of all bars. |
| `bar` | `<path>` | One period: the high-low line, the open tick and the close tick. |

## Example

```html
<mini-ohlc-chart
  data="[[100, 110, 90, 105], [105, 120, 100, 115], [115, 115, 80, 85]]"
  tick-width="1"
  gap="0.3"
  interactive
  label="Asset price, last three sessions"
></mini-ohlc-chart>
```

```css
mini-ohlc-chart::part(bar) {
  stroke-linecap: round;
}
```
