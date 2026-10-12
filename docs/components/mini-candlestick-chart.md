# Candlestick Chart (`<mini-candlestick-chart>`)

A financial sparkline of open, high, low and close prices. Each period is a candle: a wick from the high to the low and a body from the open to the close, colored by direction.

## Data

A JSON array of `[open, high, low, close]` tuples, one per period, oldest first.

```json
[
  [100, 110, 90, 105],
  [105, 120, 100, 115],
  [115, 115, 80, 85]
]
```

- A tuple may carry extra columns after the close (volume, a timestamp): they are ignored and do not affect the price scale. Only the four prices of every candle set the value axis.
- A tuple with fewer than four entries, or whose first four entries are not all finite numbers, is dropped, and the candles after it move one slot to the left.
- A candle is bullish when `close >= open`, bearish otherwise. High and low are not checked against the open and close.
- Bodies are at least 0.5 viewBox units tall, so a candle that opens and closes at the same price stays visible.

The `data` property accepts the array directly (`chart.data = [[100, 110, 90, 105]]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `[open, high, low, close][]` | `[]` | The candles to plot. |
| `label` | string | `"Candlestick chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `hollow-bullish` | boolean | on | Bullish bodies are drawn hollow (outline only). The chart is hollow whether the attribute is absent or present; only `hollow-bullish="false"` fills bullish bodies. Bearish bodies are always filled. |
| `wick-width` | number | `1` | Stroke width of the wick and of the body outline, in screen pixels: the stroke stays the same from a table row to a large card (before 1.5 it was in viewBox units and scaled with the chart). An explicit attribute wins over an inherited `--mini-chart-wick-width`; a negative or non-numeric value is ignored. |
| `gap` | number | `0.2` | Share of each slot left empty between candles, from `0` to `0.8`. Values outside that range are clamped; a non-numeric value keeps the default. |
| `min` | number | lowest price | Bottom of the price axis. Ignored when it is not below `max`, and the data extent is used instead. Prices outside the range are not clamped. |
| `max` | number | highest price | Top of the price axis. Ignored when it is not above `min`. |
| `interactive` | boolean (presence) | off | Highlights the candle under the pointer (the others fade to 0.45 opacity) and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`), formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Since 1.5, every `sparkline-hover` and `sparkline-select` `detail` also carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` (the mark's computed color) and `clientX`/`clientY`, and a hover fires only when the hovered point changes.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, open, high, low, close, isBullish, change, changePercent, element }` | The pointer enters a candle. `change` is `close - open`; `changePercent` is `change / open × 100` rounded to two decimals (`0` when `open` is `0`); `element` is the candle's `<g>`. `index` counts the plotted candles, after invalid tuples are dropped. |
| `sparkline-select` | same as `sparkline-hover` | A candle is clicked. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-bullish-color` | `#10b981` | Wick, outline and (with `hollow-bullish="false"`) body of rising candles. |
| `--mini-chart-bearish-color` | `#ef4444` | Wick, outline and body of falling candles. |
| `--mini-chart-wick-width` | `1` | Wick and body outline width, in screen pixels, when the `wick-width` attribute is absent. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

Direction is not a part. Bullish candles carry a `data-bullish` attribute on their `<g>`, which `::part()` cannot select, so color rising and falling candles through `--mini-chart-bullish-color` and `--mini-chart-bearish-color`.

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `candles` | `<g>` | Container of all candles. |
| `candle` | `<g>` | One candle: its wick and body. |
| `wick` | `<line>` | The high-low line. |
| `body` | `<rect>` | The open-close box. |

## Example

```html
<mini-candlestick-chart
  data="[[100, 110, 90, 105], [105, 120, 100, 115], [115, 115, 80, 85]]"
  hollow-bullish="false"
  wick-width="1"
  gap="0.3"
  interactive
  label="Stock price, last three sessions"
  style="--mini-chart-bullish-color: #3b82f6; --mini-chart-bearish-color: #f97316"
></mini-candlestick-chart>
```

```css
mini-candlestick-chart::part(body) {
  stroke-linejoin: round;
}
```
