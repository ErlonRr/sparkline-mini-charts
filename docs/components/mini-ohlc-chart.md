# OHLC Chart (`<mini-ohlc-chart>`)

A financial chart similar to the Candlestick Chart, but instead of filled bodies, it represents Open, High, Low, and Close data using vertical lines with short horizontal ticks for the open (left) and close (right) prices.

## Data Structure
Expects a 2D JSON array of numbers, where each sub-array must contain exactly 4 values in the order `[Open, High, Low, Close]`.

```json
[
  [100, 110, 90, 105], 
  [105, 120, 100, 115]
]
```

## HTML Attributes
- **`data`** *(string)*: The JSON 2D array of OHLC values.
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
Like the candlestick chart, colors automatically respond to the price movement:
- `--mini-chart-bullish-color`: Color of rising ticks (Close >= Open). Default: `#10b981`.
- `--mini-chart-bearish-color`: Color of falling ticks (Close < Open). Default: `#ef4444`.

### Shadow Parts (`::part()`)
- `part="tick"`: Targets the `<g>` group containing the vertical line and both horizontal branches.
- `part="wick"`: Targets the vertical line `<line>` representing the high-low range.
- `part="open"`: Targets the horizontal `<line>` pointing left.
- `part="close"`: Targets the horizontal `<line>` pointing right.
- `part="bullish"`: Added to the `<g>` element if the tick is rising.
- `part="bearish"`: Added to the `<g>` element if the tick is falling.

## Usage Example

```html
<mini-ohlc-chart 
  data="[[100,110,90,105], [105,120,100,115]]" 
  label="Stock ticker trend">
</mini-ohlc-chart>
```
