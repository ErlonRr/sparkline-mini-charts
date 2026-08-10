# Gauge Chart (`<mini-gauge-chart>`)

A speedometer-style Gauge Chart. It displays a value via an animated needle pointing across a semi-circular track. The track is divided into colored zones (e.g., Safe, Warning, Danger) based on numerical thresholds.

## Data Structure
Expects a 1D JSON array with a single number representing the needle's current value.
```json
[65]
```

## HTML Attributes
- **`data`** *(string)*: The JSON array containing the value.
- **`min`** *(number, optional)*: Minimum scale value (default: `0`).
- **`max`** *(number, optional)*: Maximum scale value (default: `100`).
- **`zones`** *(string, optional)*: A JSON string defining custom color bands (see below).
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## Zones Configuration
If you don't provide the `zones` attribute, it defaults to a 3-band split:
1. Green (up to 33% of max)
2. Yellow (up to 66% of max)
3. Red (up to max)

You can pass a custom JSON array to define your own thresholds (absolute values).
```json
[
  {"upTo": 50, "color": "#10b981"},
  {"upTo": 80, "color": "#f59e0b"},
  {"upTo": 100, "color": "#ef4444"}
]
```

## CSS Styling

### Custom Properties (When using default zones)
- `--mini-chart-safe-color`: Default first band color (`#10b981`).
- `--mini-chart-warn-color`: Default second band color (`#f59e0b`).
- `--mini-chart-danger-color`: Default third band color (`#ef4444`).

### Shadow Parts (`::part()`)
- `part="needle"`: The animated line pointing to the current value.
- `part="zone"`: The individual colored arc segments.

## Usage Example

```html
<mini-gauge-chart 
  data="[85]" 
  min="0" 
  max="100" 
  zones='[{"upTo": 60, "color": "green"}, {"upTo": 90, "color": "yellow"}, {"upTo": 100, "color": "red"}]'
  label="Speedometer gauge">
</mini-gauge-chart>
```
