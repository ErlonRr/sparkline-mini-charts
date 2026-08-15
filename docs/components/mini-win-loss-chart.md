# Win / Loss & Uptime Chart (`<mini-win-loss-chart>`)

The Win/Loss Chart implements Edward Tufte's binary sparkline design for discrete categorical outcomes: Win (`1`), Loss (`-1`), and Tie (`0`). It also features a continuous uptime strip mode (`mode="status"`) for system reliability tracking.

## Data Structure

Expects an array of numbers representing binary outcomes (`1` for Win/Up, `-1` for Loss/Down, `0` for Tie).

```json
[1, 1, -1, 1, 0, -1, 1, 1, 1, -1]
```

## HTML Attributes
- **`data`** *(string)*: JSON array of ternary numbers (`1`, `0`, `-1`).
- **`label`** *(string, optional)*: Accessible name applied to the rendered SVG.
- **`gap`** *(number, optional)*: Fractional gap between bars (default: `0.2`).
- **`radius`** *(number, optional)*: Corner rounding for each bar (default: `1`).
- **`mode`** *(string, optional)*: `"binary"` (default) or `"status"` (continuous full-height strip).
- **`win-color`** *(string, optional)*: Explicit win/up color override.
- **`loss-color`** *(string, optional)*: Explicit loss/down color override.
- **`tie-color`** *(string, optional)*: Explicit tie color override.

## CSS Styling

### Custom Properties
- `--mini-chart-bullish-color` or `--mini-chart-win-color`: Positive/Win bar color (default: `#10b981`).
- `--mini-chart-bearish-color` or `--mini-chart-loss-color`: Negative/Loss bar color (default: `#ef4444`).
- `--mini-chart-tie-color`: Neutral/Tie bar color (default: `#94a3b8`).

### Shadow Parts (`::part()`)
- `part="bar"`: Base selector for all outcome bars.
- `part="bar win"` / `part="bar loss"` / `part="bar tie"`: Status-specific part tokens.

## Usage Example

```html
<!-- Sports or Trading Win/Loss -->
<mini-win-loss-chart 
  data="[1, 1, -1, 1, 1, -1, 0, 1]" 
  label="Recent Match Outcomes">
</mini-win-loss-chart>

<!-- Server Uptime Status Strip -->
<mini-win-loss-chart 
  data="[1, 1, 1, 1, -1, 1, 1, 1, 1, 1]" 
  mode="status"
  label="API Uptime History">
</mini-win-loss-chart>
```
