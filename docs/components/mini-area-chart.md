# Area Chart (`<mini-area-chart>`)

The Area Chart fills the region beneath the data curve, creating a solid or semi-transparent shape down to the zero baseline. It shares the wiping entrance animation of the Line Chart.

## Data Structure
Expects a 1D JSON array of numbers.
```json
[18, 23, 20, 31, 27, 38, 44]
```

## HTML Attributes
- **`data`** *(string)*: The JSON array of values.
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
- `--mini-chart-color-1`: Color of the top stroke and the area fill (default: `#3b82f6` / blue). The fill opacity is controlled via CSS in the shadow DOM, but you can override the fill completely using `::part`.
- `--mini-chart-stroke-width`: Thickness of the top edge line (default: `2`).

### Shadow Parts (`::part()`)
- `part="area"`: The filled area `<path>`.
- `part="line"`: The stroke `<path>` tracking the top edge.

## Usage Example

```html
<mini-area-chart 
  data="[18, 23, 20, 31, 27]" 
  label="Monthly active users"
  style="--mini-chart-color-1: #8b5cf6;">
</mini-area-chart>
```
