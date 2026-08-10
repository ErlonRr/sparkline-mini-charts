# Stacked Area Chart (`<mini-stacked-area-chart>`)

The Stacked Area Chart visualizes multiple datasets by stacking their filled areas on top of one another, illustrating part-to-whole relationships over time.

## Data Structure
Expects a 2D JSON array of numbers, where each sub-array represents a separate series.
```json
[
  [10, 15, 20, 25], 
  [5,  10, 15, 20]
]
```

## HTML Attributes
- **`data`** *(string)*: The JSON 2D array.
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
The chart uses indexed color variables for each series:
- `--mini-chart-color-1`: Fill color for the first series (default: `#3b82f6`).
- `--mini-chart-color-2`: Fill color for the second series (default: `#10b981`).
- `--mini-chart-color-3`: Fill color for the third series (default: `#f59e0b`).
- *(Up to 6 default colors, then rotates or fallback).*

### Shadow Parts (`::part()`)
- `part="layer"`: The individual stacked SVG `<path>` elements. Use `:nth-child()` to target specific layers.

## Usage Example

```html
<mini-stacked-area-chart 
  data="[[5,10,15], [3,6,9], [1,2,3]]" 
  label="Resource Allocation"
  style="--mini-chart-color-1: red; --mini-chart-color-2: blue; --mini-chart-color-3: yellow;">
</mini-stacked-area-chart>
```
