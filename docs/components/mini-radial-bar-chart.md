# Radial Bar Chart (`<mini-radial-bar-chart>`)

The Radial Bar Chart renders multiple data values as concentric circular arcs, all expanding outward. It supports per-segment color configuration and scales relative to a global maximum.

## Data Structure
Expects either a 1D JSON array of numbers, or an array of configuration objects for explicit color mapping.

**Basic Numbers:**
```json
[70, 50, 90]
```

**Custom Objects:**
```json
[
  {"value": 70, "color": "#8b5cf6"},
  {"value": 50, "color": "#3b82f6"}
]
```

## HTML Attributes
- **`data`** *(string)*: The JSON array of values/objects.
- **`min`** *(number, optional)*: Minimum scale value (default: `0`).
- **`max`** *(number, optional)*: Maximum scale value (default: highest value in the data array).
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
If not using explicit colors in the JSON data, the component falls back to CSS variables:
- `--mini-chart-color-1`: Color of the first, innermost track.
- `--mini-chart-color-2`: Color of the second track.

### Shadow Parts (`::part()`)
- `part="track"`: The foreground filled arc for each value.
- `part="track-bg"`: The background empty track (faded silhouette).

## Usage Example

```html
<mini-radial-bar-chart 
  data='[{"value": 70, "color": "#8b5cf6"}, {"value": 50, "color": "#3b82f6"}]' 
  max="100" 
  label="Activity rings">
</mini-radial-bar-chart>
```
