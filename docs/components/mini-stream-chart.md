# Stream Chart (`<mini-stream-chart>`)

A Stream Chart (or ThemeRiver) is a variation of a stacked area chart where the baseline is shifted to the center, creating an organic, flowing shape that emphasizes trends and volumes rather than exact baseline values.

## Data Structure
Expects a 2D JSON array of numbers, where each sub-array represents a separate flowing series. (Minimum 2 series recommended for the stream effect).
```json
[
  [14, 24, 32, 37],
  [8,  12, 19, 23],
  [5,  9,  14, 18]
]
```

## HTML Attributes
- **`data`** *(string)*: The JSON 2D array.
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
The chart uses indexed color variables for each flowing layer:
- `--mini-chart-color-1`: Fill color for the first layer (default: `#3b82f6`).
- `--mini-chart-color-2`: Fill color for the second layer (default: `#10b981`).
- `--mini-chart-color-3`: Fill color for the third layer (default: `#f59e0b`).

### Shadow Parts (`::part()`)
- `part="layer"`: The individual SVG `<path>` elements that make up the stream.

## Usage Example

```html
<mini-stream-chart 
  data="[[28,22,19,19,22], [14,24,32,37,37], [5,9,14,18,22]]" 
  label="Market Flow">
</mini-stream-chart>
```
