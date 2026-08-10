# Candlestick Chart (`<mini-candlestick-chart>`)

A financial chart that visualizes Open, High, Low, and Close (OHLC) data. It automatically colors candles green (bullish/rising) or red (bearish/falling) based on the close vs open price.

## Data Structure
Expects a 2D JSON array of numbers, where each sub-array must contain exactly 4 values in the order `[Open, High, Low, Close]`.

```json
[
  [100, 110, 90, 105], 
  [105, 120, 100, 115], 
  [115, 115, 80, 85]
]
```

## HTML Attributes
- **`data`** *(string)*: The JSON 2D array of OHLC values.
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
- `--mini-chart-bullish-color`: Color of rising candles (Close >= Open). Default: `#10b981`.
- `--mini-chart-bearish-color`: Color of falling candles (Close < Open). Default: `#ef4444`.

### Shadow Parts (`::part()`)
- `part="candle"`: Targets the `<g>` group containing both the wick and body.
- `part="wick"`: Targets the vertical line `<line>` representing the high-low range.
- `part="body"`: Targets the rectangle `<rect>` representing the open-close range.
- `part="bullish"`: Added to the `<g>` element if the candle is rising.
- `part="bearish"`: Added to the `<g>` element if the candle is falling.

## Usage Example

```html
<mini-candlestick-chart 
  data="[[100,110,90,105], [105,120,100,115], [115,115,80,85]]" 
  label="Stock ticker trend"
  style="--mini-chart-bullish-color: #3b82f6; --mini-chart-bearish-color: #f97316;">
</mini-candlestick-chart>
```
