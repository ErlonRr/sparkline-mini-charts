# Progress Chart (`<mini-progress-chart>`)

A semi-circular arc that represents a single percentage or progress value against a maximum threshold. It features a robust, bouncy entrance animation.

## Data Structure
Expects a 1D JSON array with a single number representing the current progress.
```json
[75]
```

## HTML Attributes
- **`data`** *(string)*: The JSON array containing the value.
- **`min`** *(number, optional)*: Minimum scale value (default: `0`).
- **`max`** *(number, optional)*: Maximum scale value (default: `100`).
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
- `--mini-chart-stroke-width`: Thickness of the progress arc (default: `10`).
- `--mini-chart-track-color`: Color of the background empty track (default: `rgba(128, 128, 128, 0.2)`).
*(The progress foreground color naturally inherits the current text `currentColor`!)*

### Shadow Parts (`::part()`)
- `part="track"`: The background track arc.
- `part="value"`: The animated foreground progress arc.

## Usage Example

```html
<mini-progress-chart 
  data="[75]" 
  max="100" 
  label="Server load percentage"
  style="color: #3b82f6;">
</mini-progress-chart>
```
