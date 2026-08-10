# Line Chart (`<mini-line-chart>`)

The Line Chart is the most traditional sparkline. It visualizes an array of numbers as a continuous line path, connecting the data points from left to right.

## Data Structure
Expects a 1D JSON array of numbers.
```json
[10, 25, 40, 15, 60, 45, 90]
```

## HTML Attributes
- **`data`** *(string)*: The JSON array of values.
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
- `--mini-chart-color-1`: Color of the line stroke (default: `#3b82f6` / blue).
- `--mini-chart-stroke-width`: Thickness of the line (default: `2`).

### Shadow Parts (`::part()`)
- `part="line"`: The actual `<path>` drawing the line.
- `part="point"`: The final dot/circle indicator at the end of the line.
- `part="mask-line"`: The mask used for the wiping entrance animation.

## Usage Example

```html
<mini-line-chart 
  data="[10, 25, 40, 15, 60]" 
  label="Revenue trend"
  style="--mini-chart-color-1: #10b981; --mini-chart-stroke-width: 3;">
</mini-line-chart>
```
