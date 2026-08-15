# Scatter & Bubble Chart (`<mini-scatter-chart>`)

The Scatter Chart plots 2D coordinates `(x, y)` to visualize distributions, clusters, and correlations. It supports automatic linear regression computation (`trend-line="true"`) to draw a best-fit trendline across points.

## Data Structure

Expects a 2D array of coordinate pairs `[x, y][]` or an array of objects `{ x: number, y: number }[]`.

```json
[
  [5, 12],
  [10, 18],
  [15, 14],
  [22, 28],
  [30, 35],
  [42, 38]
]
```

## HTML Attributes
- **`data`** *(string)*: JSON 2D array of coordinate points.
- **`label`** *(string, optional)*: Accessible name applied to the rendered SVG.
- **`trend-line`** *(boolean/string, optional)*: `"true"` computes and draws an ordinary least-squares regression line.
- **`point-radius`** *(number, optional)*: Radius in SVG viewBox units for each scatter dot (default: `2.5`).
- **`min-x`** / **`max-x`**: Explicit bounds for horizontal X axis.
- **`min-y`** / **`max-y`**: Explicit bounds for vertical Y axis.
- **`interactive`** *(boolean/string, optional)*: Enables point hover crosshairs and events.

## CSS Styling

### Custom Properties
- `--mini-chart-color-1`: Point circle color (default: `#0ea5e9`).
- `--mini-chart-trendline-color`: Regression trendline stroke color.

### Shadow Parts (`::part()`)
- `part="circle"`: Individual scatter coordinate circle dots.
- `part="trendline"`: The linear regression trendline.

## Usage Example

```html
<mini-scatter-chart 
  data="[[5, 10], [12, 18], [20, 24], [28, 22], [35, 38], [50, 48]]" 
  trend-line="true"
  label="Correlation Analysis"
  style="--mini-chart-color-1: #8b5cf6;">
</mini-scatter-chart>
```
