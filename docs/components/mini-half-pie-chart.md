# Half Pie Chart (`<mini-half-pie-chart>`)

A variation of the Pie Chart that renders slices across a 180-degree half-circle (semi-circle). Perfect for dashboard headers where vertical space is constrained.

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
- `--mini-chart-color-1`: Fill color for the first slice (starting from the left).
- `--mini-chart-color-2`: Fill color for the second slice.
- `--mini-chart-color-3`: Fill color for the third slice.

### Shadow Parts (`::part()`)
- `part="slice"`: Targets every `<path>` slice of the half-pie. 

## Usage Example

```html
<mini-half-pie-chart 
  data="[40, 30, 20, 10]" 
  label="Browser usage">
</mini-half-pie-chart>
```
