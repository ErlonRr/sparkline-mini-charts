# Range Bar Chart (`<mini-range-bar-chart>`)

Vertical floating bars, each spanning a low-to-high interval (a daily temperature range, a 52-week price range), with an optional marker for the current value.

## Data

A JSON array with one item per bar. Each item is either an array or an object:

- `[low, high]` or `[low, high, current]`;
- `{ "min": low, "max": high, "current": value }`. `low`, `high` and `value` are accepted as aliases of `min`, `max` and `current`; when both names are present, `min`, `max` and `current` win.

```json
[[10, 30, 22], [15, 35], { "low": 12, "high": 28, "value": 18 }]
```

Items that are neither arrays nor objects (numbers, `null`) are dropped. The two bounds may come in either order. A bound that is not a finite number becomes `0` (or the other bound, for the upper one). The marker is drawn only when the current value is a finite number. Every bar is at least 2 viewBox units tall.

The `data` property accepts the array directly and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON array | `[]` | The ranges to plot (see Data). |
| `label` | string | `"Range-bar chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `gap` | number | `0.25` | Share of each slot left empty between bars, clamped to `0`–`0.8`. |
| `radius` | number | `3` | Corner radius of each bar, in viewBox units (the chart is 100 × 30). `"3px"` is read as `3`. A negative or invalid value falls back to `--mini-chart-bar-radius`. An explicit attribute wins over the inherited token. |
| `min` | number | lowest bound or current value | Bottom of the value axis. Ignored when it is not below `max`. Values outside the range are not clamped. |
| `max` | number | highest bound or current value | Top of the value axis. Ignored when it is not above `min`. |
| `interactive` | boolean (presence) | off | Highlights the bar under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |

## Events

Dispatched only when `interactive` is set. Both bubble and cross the shadow boundary (`composed`).

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, data, element }` | The pointer enters a bar. `data` is the item exactly as given in `data` (array or object), `element` is its `range-group`. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-range-color` | `--mini-chart-color` | Bar fill. |
| `--mini-chart-color` | `#3b82f6` (on the bars) | Bar fill and marker stroke when the specific tokens are not set. |
| `--mini-chart-bar-radius` | `3px` | Bar corner radius when the `radius` attribute is not set. |
| `--mini-chart-marker-color` | `#ffffff` | Marker fill. |
| `--mini-chart-marker-stroke` | `--mini-chart-color` | Marker outline. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `bars` | `<g>` | Container of the ranges. |
| `range-group` | `<g>` | One range: its bar and its marker. |
| `range-bar` | `<rect>` | The low-to-high bar. |
| `marker` | `<circle>` | Current-value marker, hidden when the item has none. |

## Example

```html
<mini-range-bar-chart
  data='[[10, 30, 22], [15, 35, 30], {"low": 12, "high": 28, "value": 18}]'
  gap="0.3"
  radius="2"
  interactive
  label="52-week price range"
  style="--mini-chart-range-color: #94a3b8; --mini-chart-marker-stroke: #0f172a"
></mini-range-bar-chart>
```
