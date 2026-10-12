# Bar Chart (`<mini-bar-chart>`)

Vertical columns for an ordered series of numbers. Positive values rise from the zero baseline and negative values hang below it, each with its own color.

## Data

A JSON array of numbers. Entries that are not finite numbers (`null`, strings, `NaN`) are skipped, and the remaining values get one equal slot each.

```json
[10, 25, -15, 40, -5, 30]
```

The value axis always includes zero. A value of `0` counts as positive and draws a bar of zero height.

The `data` property accepts the array directly (`chart.data = [10, -5, 30]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `number[]` | `[]` | The values to plot. |
| `label` | string | `"Bar chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `gap` | number | `0.2` | Share of each slot left empty between bars, clamped to `0`–`0.8`. |
| `radius` | number | `0` | Corner radius of each bar, in viewBox units (the chart is 100 × 30). |
| `baseline` | — | — | Observed but has no effect: the bars always start at zero. |
| `min` | number | lowest value or `0` | Bottom of the value axis. Ignored when it is not below `max`. Values outside the range are not clamped. |
| `max` | number | highest value or `0` | Top of the value axis. Ignored when it is not above `min`. |
| `interactive` | boolean (presence) | off | Highlights the bar under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |

## Events

Dispatched only when `interactive` is set. Both bubble and cross the shadow boundary (`composed`).

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, value, isPositive, element }` | The pointer enters a bar. `index` is the position among the plotted values, `isPositive` is `value >= 0`, `element` is the bar's `<rect>`. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-positive-color` | `--mini-chart-color` | Fill of bars with a value of `0` or more. |
| `--mini-chart-color` | `#10b981` (on the bars) | Positive bar fill when `--mini-chart-positive-color` is not set. Without either token the positive bars are green. |
| `--mini-chart-negative-color` | `#ef4444` | Fill of bars with a negative value. |
| `--mini-chart-bar-opacity-inactive` | `0.45` | Opacity of the other bars while one is hovered (`interactive`). |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `bars` | `<g>` | Container of the bars. |
| `bar` | `<rect>` | Every bar. |
| `positive` | `<rect>` | Bars with a value of `0` or more (part list `bar positive`). |
| `negative` | `<rect>` | Bars with a negative value (part list `bar negative`). |

## Example

```html
<mini-bar-chart
  data="[10, 25, -15, 40, -5]"
  gap="0.3"
  radius="1"
  interactive
  label="Profit and loss"
  style="--mini-chart-positive-color: #0f766e; --mini-chart-negative-color: #b91c1c"
></mini-bar-chart>
```

```css
mini-bar-chart::part(negative) {
  opacity: 0.8;
}
```
