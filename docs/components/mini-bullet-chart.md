# Bullet Chart (`<mini-bullet-chart>`)

The Bullet Chart is a Stephen Few specification designed to replace clumsy gauges and meters in executive dashboards. It displays a primary performance measure against comparative target markers and qualitative performance ranges (e.g., poor, satisfactory, good).

## Data Structure

Expects an array representing `[value, target, range1, range2, range3, ...]` or a configuration object `{ value, target, ranges }`.

```json
[85, 95, 60, 80, 100]
```

## HTML Attributes
- **`data`** *(string)*: JSON array or config object.
- **`label`** *(string, optional)*: Accessible name applied to the rendered SVG.
- **`target`** *(number, optional)*: Explicit target value override.
- **`min`** *(number, optional)*: Minimum axis scale bound (default: 0).
- **`max`** *(number, optional)*: Maximum axis scale bound.
- **`ranges`** *(string, optional)*: JSON array of qualitative threshold bounds (e.g. `"[60, 80, 100]"`).
- **`interactive`** *(boolean/string, optional)*: Enables hover events.

## CSS Styling

### Custom Properties
- `--mini-chart-color-1`: Color of the primary performance measure bar (default: `#0ea5e9`).
- `--mini-chart-safe-color`: Good qualitative threshold band.
- `--mini-chart-warn-color`: Satisfactory qualitative threshold band.
- `--mini-chart-danger-color`: Poor qualitative threshold band.

### Shadow Parts (`::part()`)
- `part="range"`: The background qualitative range bands.
- `part="range range-0"` ... `part="range range-n"`: Specific threshold layers.
- `part="measure"`: The central performance measure bar.
- `part="target"`: The vertical comparative target marker line.

## Usage Example

```html
<mini-bullet-chart 
  data="[85, 90, 50, 75, 100]" 
  label="Quarterly Revenue vs Target">
</mini-bullet-chart>
```
