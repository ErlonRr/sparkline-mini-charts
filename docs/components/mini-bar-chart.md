# Bar Chart (`<mini-bar-chart>`)

A traditional Sparkline Bar Chart. It visualizes an array of values as vertical columns, perfectly handling both positive and negative values originating from a zero baseline.

## Data Structure
Expects a 1D JSON array of numbers.
```json
[10, 25, -15, 40, -5, 30]
```

## HTML Attributes
- **`data`** *(string)*: The JSON array of values.
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
- `--mini-chart-color-1`: Color of positive bars (default: `#3b82f6` / blue).
- `--mini-chart-color-2`: Color of negative bars (default: `#10b981` / green). Wait, typically negative is red. You can override it using `::part(bar negative)`.
*(By default, all bars use color-1, but the `negative` part allows distinct coloring).*

### Shadow Parts (`::part()`)
- `part="bar"`: Targets every `<rect>` bar.
- `part="bar positive"`: Targets only bars representing values >= 0.
- `part="bar negative"`: Targets only bars representing values < 0.

## Usage Example

```html
<style>
  .custom-bars::part(positive) { fill: #10b981; }
  .custom-bars::part(negative) { fill: #ef4444; }
</style>

<mini-bar-chart 
  class="custom-bars"
  data="[10, 25, -15, 40, -5]" 
  label="Profit/Loss">
</mini-bar-chart>
```
