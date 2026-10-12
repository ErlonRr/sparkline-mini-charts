# Progress Chart (`<mini-progress-chart>`)

A semi-circular arc that shows one value between a minimum and a maximum. The arc animates smoothly from empty to the value without overshooting, and the chart dispatches `progress-complete` when the value reaches the maximum. The svg has `role="meter"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.

## Data

A JSON array whose first entry is the value. Other entries are ignored.

```json
[75]
```

The value is clamped to the `min`–`max` range. A missing value (no `data`, `[]`, or a first entry that is not a finite number) renders as `0`, while the default label still reads "Empty Progress chart".

The `data` property accepts the array directly (`chart.data = [75]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `[value]` | `[]` | The value to show. |
| `label` | string | `"Progress chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `min` | number | `0` | Value of the empty arc. |
| `max` | number | `100` | Value of the full arc. A value that is not above `min` is ignored and `100` is used. |
| `show-value` | boolean (presence) | off | Shows the value, rounded to an integer, in the middle of the arc. |
| `unit` | string | none | Text appended to the shown value, e.g. `%`. Only used with `show-value`. |
| `gradient` | see [Gradient](#gradient) | off | Paints the value arc with a linear gradient instead of `--mini-chart-value-color`. |
| `interactive` | boolean (presence) | off | Brightens the value arc under the pointer and dispatches `sparkline-hover` / `sparkline-leave`. `interactive="false"` still enables it. |

## Gradient

The `gradient` attribute is read by the shared parser in `src/core/gradient.js`:

- absent, `"false"`, `"0"`, `"none"`, `"off"` or `"no"`: no gradient;
- `""` (bare `gradient`) or `"true"`: the default stops `#3b82f6`, `#06b6d4`, `#10b981`;
- a JSON array (`'["#10b981", "#ef4444"]'`, single quotes accepted) or a comma-separated list (`#10b981, rgb(239, 68, 68)`): one evenly spaced stop per color. Commas inside `rgb()`, `hsl()`, `oklch()` or `var()` stay inside their color, and `var()` works in a stop. A single color is accepted.

Entries that are not CSS colors (checked with `CSS.supports("color", …)`; `var()` is always kept) are dropped, so a word like `auto` never paints a black stop. A value with no usable color turns the gradient off.

## Events

All events bubble and cross the shadow boundary (`composed`).

| Event | `detail` | When |
| --- | --- | --- |
| `progress-complete` | `{ value, max }` | The value moves to `max` (or past it) after a render that was not complete. It fires once per transition, not on every render at `max`; a change of another attribute alone (for example a lower `max`) does not fire it. It fires on the first render too (synchronously on connect) when the chart starts complete. It does not need `interactive`. |
| `sparkline-hover` | `{ value, progress }` | The pointer moves over the chart (`interactive` only). `value` is the clamped value and `progress` its position between `min` and `max`, from `0` to `1`. |
| `sparkline-leave` | none | The pointer leaves the chart (`interactive` only). |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-value-color` | `--mini-chart-color`, then `#3b82f6` | Value arc stroke when there is no gradient. |
| `--mini-chart-color` | `#2563eb` (host color) | Host color, the fallback of the value arc and of the text. |
| `--mini-chart-track-color` | `rgba(128, 128, 128, 0.18)` | Background track arc. |
| `--mini-chart-stroke-width` | `12` | Thickness of the track and value arcs, in viewBox units (the viewBox is 100 × 50, the arc radius 40). |
| `--mini-chart-text-color` | the host color | Value text (`show-value`). |
| `--mini-chart-aspect-ratio` | `2 / 1` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root, with `role="meter"`. |
| `track` | `<path>` | Background arc. |
| `value` | `<path>` | Animated arc from `min` to the value. It is transparent when the value is at `min`. |
| `text` | `<text>` | Value text, shown with `show-value`. |

## Example

```html
<mini-progress-chart
  data="[75]"
  max="100"
  show-value
  unit="%"
  gradient
  label="Server load"
  style="--mini-chart-track-color: rgba(0, 0, 0, 0.08)"
></mini-progress-chart>
```

```js
document.querySelector("mini-progress-chart").addEventListener("progress-complete", (event) => {
  console.log(`Reached ${event.detail.max}`);
});
```
