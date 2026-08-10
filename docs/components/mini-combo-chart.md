# Combo Chart (`<mini-combo-chart>`)

A highly versatile chart that lets you overlay multiple series of different types (Line, Bar, Area) on the same shared Cartesian axis. It calculates a unified coordinate scale so that all mixed series align perfectly.

## Data Structure
Expects a JSON array of configuration objects. Each object represents one series and defines the type of visualization and the array of values.

```json
[
  {
    "type": "bar",
    "values": [10, 15, 8, 20]
  },
  {
    "type": "area",
    "values": [5, 10, 12, 18]
  },
  {
    "type": "line",
    "values": [12, 18, 14, 25]
  }
]
```

### Supported Types
- `"line"`
- `"area"`
- `"bar"`

## HTML Attributes
- **`data`** *(string)*: The JSON configuration string described above.
- **`label`** *(string, optional)*: ARIA label and `<title>` for accessibility.

## CSS Styling

### Custom Properties
The chart uses indexed color variables. The `n`th series in your JSON array will automatically use `--mini-chart-color-n`:
- `--mini-chart-color-1`: Color for the first series.
- `--mini-chart-color-2`: Color for the second series.
- `--mini-chart-color-3`: Color for the third series.

### Shadow Parts (`::part()`)
- `part="layer"`: A `<g>` container enclosing a specific series. You can target specific layers via `:nth-child(n)`.
- Inside each layer, the standard parts of the respective chart type are available (e.g. `part="line"`, `part="area"`, `part="bar"`).

## Usage Example

```html
<mini-combo-chart 
  data='[{"type":"bar","values":[10,20,30]}, {"type":"line","values":[15,25,35]}]' 
  label="Revenue vs Target"
  style="--mini-chart-color-1: #6b7280; --mini-chart-color-2: #ef4444;">
</mini-combo-chart>
```
