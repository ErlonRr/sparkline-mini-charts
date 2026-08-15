# Range Bar Chart (`<mini-range-bar-chart>`)

The Range Bar Chart renders floating horizontal or vertical intervals between minimum and maximum bounds (e.g. daily high/low temperatures, salary brackets, or confidence intervals), with an optional indicator marker for the current value.

## Data Structure

Expects a 2D array of tuples `[min, max, currentVal?]` or an array of objects `{ min, max, value? }`.

```json
[
  [10, 30, 22],
  [15, 45, 38],
  [5, 25, 12],
  [20, 50, 42]
]
```

## HTML Attributes
- **`data`** *(string)*: JSON 2D array of interval tuples.
- **`label`** *(string, optional)*: Accessible name applied to the rendered SVG.
- **`gap`** *(number, optional)*: Spacing ratio between range bars (default: `0.2`).
- **`radius`** *(number, optional)*: Border radius (`rx`) for rounded bar ends (default: `3`).
- **`min`** *(number, optional)*: Fixed domain minimum.
- **`max`** *(number, optional)*: Fixed domain maximum.
- **`interactive`** *(boolean/string, optional)*: Enables hover events.

## CSS Styling

### Custom Properties
- `--mini-chart-color-1`: Default color for range bars.
- `--mini-chart-marker-color`: Fill color for the inner value marker dot.

### Shadow Parts (`::part()`)
- `part="range-group"`: Container group for each range item.
- `part="range-bar"`: The floating interval rectangle.
- `part="range-marker"`: The current value indicator circle.

## Usage Example

```html
<mini-range-bar-chart 
  data="[[12, 28, 20], [15, 35, 30], [8, 22, 14], [18, 40, 25]]" 
  label="Daily Temperature Ranges"
  style="--mini-chart-color-1: #6366f1;">
</mini-range-bar-chart>
```
