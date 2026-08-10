# Pie Chart (`<mini-pie-chart>`)

A traditional Sparkline Pie Chart. It visualizes an array of numerical values as proportional slices of a full 360-degree circle.

## Data Structure
Expects a 1D JSON array of numbers.
```json
[40, 30, 20, 10]
```

## HTML Attributes
- **`data`** *(string)*: The JSON array of values.
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
The slices rotate through the standard library color palette:
- `--mini-chart-color-1`: Fill color for the first slice.
- `--mini-chart-color-2`: Fill color for the second slice.
- `--mini-chart-color-3`: Fill color for the third slice.
*(And so on, up to 6 colors before repeating).*

### Shadow Parts (`::part()`)
- `part="slice"`: Targets every `<path>` slice of the pie. Use `:nth-child(n)` to target specific slices if needed.

## Usage Example

```html
<mini-pie-chart 
  data="[40, 30, 20, 10]" 
  label="Demographics">
</mini-pie-chart>
```
