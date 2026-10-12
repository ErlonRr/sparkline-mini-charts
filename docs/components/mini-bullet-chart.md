# Bullet Chart (`<mini-bullet-chart>`)

Stephen Few's bullet graph for a KPI: a measure bar for the current value, a target marker, and up to three (or more) qualitative bands behind them. The svg has `role="meter"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.

## Data

`data` takes one of three shapes:

- an array `[value, target?, ...ranges]`, for example `[85, 95, 60, 80, 100]`;
- an object `{ "value": 85, "target": 95, "ranges": [60, 80, 100], "min": 0, "max": 100 }`, where every key but `value` is optional;
- a single number, `85`, which is the same as `{ "value": 85 }`.

```json
{ "value": 85, "target": 95, "ranges": [60, 80, 100] }
```

A missing target equals the value. A value or target that is not a finite number becomes `0`; range entries that are not finite numbers are skipped. `null`, a string or invalid JSON give an empty chart (value and target `0`, default bands).

The scale runs from `min(0, value, target, ranges)` to `max(100, value, target, ranges)` unless `min` or `max` is set. Ranges are the upper bounds of the bands: they are sorted, clamped to the scale and each band starts where the previous one ends. Without ranges, three bands end at 60 %, 85 % and 100 % of the scale. The value and target are clamped to the scale.

The `data` property accepts the array, the object or the number directly and writes it to the attribute as JSON.

## Attributes

The `target`, `min`, `max` and `ranges` attributes win over the same fields in `data`.

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON array, object or number | `[]` | The KPI (see Data). |
| `label` | string | `"Bullet chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `target` | number | `data` target, else the value | Position of the target marker. |
| `min` | number | `min(0, …)` of the data | Start of the scale. Ignored when it is not below `max`. |
| `max` | number | `max(100, …)` of the data | End of the scale. Ignored when it is not above `min`. |
| `ranges` | JSON `number[]` | `data` ranges, else 60 % / 85 % / 100 % of the scale | Upper bounds of the bands. Invalid JSON is ignored. |
| `gradient` | see Gradient | off | Fills the measure bar with a horizontal gradient. |
| `interactive` | boolean (presence) | off | Brightens the measure bar under the pointer and dispatches the events below. `interactive="false"` still enables it. |

## Gradient

The `gradient` attribute is read by the parser shared with area, gauge, progress and radial-bar:

| Value | Result |
| --- | --- |
| absent, `"false"`, `"0"`, `"none"`, `"off"`, `"no"` | No gradient: the measure bar uses `--mini-chart-measure-color`. |
| `""` (bare attribute), `"true"` | Default stops `#3b82f6`, `#8b5cf6`, `#ec4899`. |
| JSON array, e.g. `'["#10b981", "#f59e0b"]'` | These stops, evenly spaced. Single quotes inside are accepted. |
| comma list, e.g. `"#10b981, rgb(245, 158, 11)"` | These stops. Commas inside `rgb()`, `hsl()`, `oklch()` or `var()` stay in their color. |

A single color is accepted. Entries that are not CSS colors (checked with `CSS.supports("color", …)`; `var()` is always kept) are dropped, so a word like `auto` never paints a black stop. A value with no usable color turns the gradient off.

## Events

Dispatched only when `interactive` is set. Both bubble and cross the shadow boundary (`composed`).

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ data, element }` | The pointer enters the measure bar. `data` is the parsed `data` value as given (the attribute overrides are not merged in), `element` is the `measure` rect. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

The bands follow `--mini-chart-color`: each default band color mixes it into a grey, so a themed chart gets matching bands.

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color` | `#3b82f6` (on the bars) | Measure bar fill and the tint of the default bands. |
| `--mini-chart-measure-color` | `--mini-chart-color` | Measure bar fill (without `gradient`). |
| `--mini-chart-range-1` | `color-mix()` of `--mini-chart-color` at 12 % into `rgba(128, 128, 128, 0.1)` | First (lowest) band. |
| `--mini-chart-range-2` | same mix at 24 % into `rgba(128, 128, 128, 0.16)` | Second band. |
| `--mini-chart-range-3` | same mix at 36 % into `rgba(128, 128, 128, 0.22)` | Third band. |
| `--mini-chart-range-color` | `rgba(128, 128, 128, 0.15)` | Fourth and later bands. |
| `--mini-chart-target-color` | `--mini-chart-danger-color` | Target marker stroke. |
| `--mini-chart-danger-color` | `#ef4444` | Target marker stroke when `--mini-chart-target-color` is not set. |
| `--mini-chart-target-width` | `2.5px` | Target marker thickness. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root (`role="meter"`). |
| `ranges` | `<g>` | Container of the bands. |
| `range` | `<rect>` | Every band. |
| `range-1`, `range-2`, `range-3`, `range-N` | `<rect>` | One band, numbered from 1 starting at the low end (part list `range range-1`, …). |
| `measure` | `<rect>` | The value bar. |
| `target` | `<line>` | The target marker. |

## Example

```html
<mini-bullet-chart
  data='{"value": 85, "target": 95, "ranges": [60, 80, 100]}'
  gradient="#10b981, #3b82f6"
  interactive
  label="Revenue vs target"
></mini-bullet-chart>

<!-- Array form with attribute overrides -->
<mini-bullet-chart
  data="[72]"
  target="90"
  ranges="[50, 75, 100]"
  max="120"
  label="Quota"
  style="--mini-chart-color: #7c3aed"
></mini-bullet-chart>
```
