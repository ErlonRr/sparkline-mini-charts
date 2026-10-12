# Gauge Chart (`<mini-gauge-chart>`)

A speedometer-style gauge: a needle points at one value on a semi-circular dial. The dial is split into colored zones (by default safe, warning and danger), or painted with one continuous gradient. The svg has `role="meter"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.

## Data

A positional JSON array `[value, min?, max?]`.

```json
[65]
```

```json
[65, 0, 120]
```

- `value` is clamped to the `min`–`max` range.
- The `min` and `max` attributes win over the positional `min` and `max`. Without either, the range is `0`–`100`.
- When `min` is not below `max`, `max` becomes `min + 1`.
- An entry that is not a finite number becomes `null` and keeps its position, so `[null, 0, 50]` still has the range `0`–`50`. A `null` `min` or `max` falls back to the attribute or to the default, never to the next entry.

Without a value (no `data`, `[]`, or a first entry that is not a finite number) the gauge still draws its dial, hides the needle, and removes `aria-valuenow` from the svg. With no `data` at all, `aria-valuemin` and `aria-valuemax` are removed too. The host element's own attributes are never touched.

The `data` property accepts the array directly (`chart.data = [65, 0, 120]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `[value, min?, max?]` | `[]` | The value, and optionally the range. |
| `label` | string | `"Gauge chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `min` | number | `data[1]`, then `0` | Value at the left end of the dial. Wins over `data[1]`. |
| `max` | number | `data[2]`, then `100` | Value at the right end of the dial. Wins over `data[2]`. |
| `zones` | JSON `{ upTo, color }[]` | three default bands | Colored bands of the dial. See [Zones](#zones). |
| `needle-type` | `triangle` \| `line` | `triangle` | Needle shape: a wide triangle or a thin line. Any other value draws the triangle. Changes apply on the next render. |
| `show-value` | boolean (presence) | off | **Deprecated, no effect** since 1.5. The gauge draws no value text: render the reading next to the chart. Still accepted for compatibility; outside production builds it logs one `console.warn`. |
| `gradient` | see [Gradient](#gradient) | off | Paints the whole dial with one continuous gradient instead of the zone bands. |
| `interactive` | boolean (presence) | off | Brightens the dial under the pointer and dispatches `sparkline-hover`, `sparkline-select` (a click anywhere on the chart, e.g. to navigate to a detail view) and `sparkline-leave`. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`), formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

## Zones

Without a `zones` attribute (or when none of its zones is valid) the dial has three bands of equal width:

1. up to one third of the range: `--mini-chart-safe-color`;
2. up to two thirds: `--mini-chart-warn-color`;
3. up to `max`: `--mini-chart-danger-color`.

Pass a JSON array to set your own thresholds, in absolute values:

```json
[
  { "upTo": 50, "color": "#10b981" },
  { "upTo": 80, "color": "#f59e0b" },
  { "upTo": 100, "color": "#ef4444" }
]
```

- Each band starts where the previous one ends; the first starts at `min`. Zones are sorted by `upTo`.
- `upTo` may be a number or a numeric string (`"50"`). A zone that reaches past `min` or `max` is cut at that end of the dial.
- A zone without a string `color` or a numeric `upTo` is skipped. When no zone is valid, the default 3-band split is used.
- The active zone is the first one whose `upTo` is at or above the value; a value above every `upTo` belongs to the last zone.

## Gradient

The `gradient` attribute is read by the shared parser in `src/core/gradient.js`:

- absent, `"false"`, `"0"`, `"none"`, `"off"` or `"no"`: no gradient, the dial shows the zone bands;
- `""` (bare `gradient`) or `"true"`: the default stops `#10b981`, `#84cc16`, `#eab308`, `#f59e0b`, `#f97316`, `#ef4444`;
- a JSON array (`'["#10b981", "#ef4444"]'`, single quotes accepted) or a comma-separated list (`#10b981, rgb(239, 68, 68)`): one evenly spaced stop per color. Commas inside `rgb()`, `hsl()`, `oklch()` or `var()` stay inside their color, and `var()` works in a stop. A single color is accepted.

Entries that are not CSS colors (checked with `CSS.supports("color", …)`; `var()` is always kept) are dropped, so a word like `auto` never paints a black stop. A value with no usable color turns the gradient off. With a gradient, the dial is one `track` path; the zones still decide the zone index reported by the events.

## Events

All events bubble and cross the shadow boundary (`composed`). Since 1.5, every `sparkline-hover` and `sparkline-select` `detail` also carries the uniform keys `chart`, `index` (`0`), `seriesIndex` (`0`), `value`, `datum`, `color` (the computed color of the mark) and `clientX`/`clientY`; a hover fires once per entry into the chart.

| Event | `detail` | When |
| --- | --- | --- |
| `zone-change` | `{ value, zoneIndex, zoneColor }` | The value moves into another zone. The first reading is silent, and so are re-renders that leave the value where it is (a change of `zones`, `min`, `max`, `gradient` or `label` alone). It does not need `interactive`. |
| `sparkline-hover` | `{ value, zoneIndex, zoneColor }` | The pointer moves over the chart (`interactive` only). `value` is the clamped value. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a mark (or the chart, for the single-value meters). |
| `sparkline-leave` | none | The pointer leaves the chart (`interactive` only). |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-safe-color` | `--mini-chart-bullish-color`, then `#10b981` | First default band. |
| `--mini-chart-warn-color` | `--mini-chart-warning-color`, then `#f59e0b` | Second default band. |
| `--mini-chart-warning-color` | `#f59e0b` | Alias of `--mini-chart-warn-color`, used only when that one is not set. |
| `--mini-chart-danger-color` | `--mini-chart-bearish-color`, then `#ef4444` | Third default band. |
| `--mini-chart-bullish-color` | `#10b981` | Fallback of the first default band. |
| `--mini-chart-bearish-color` | `#ef4444` | Fallback of the third default band. |
| `--mini-chart-needle-color` | `--mini-chart-color`, then `#2563eb` | Needle and pivot fill. |
| `--mini-chart-color` | `#2563eb` | Host color, the fallback of the needle. |
| `--mini-chart-stroke-width` | `14` | Dial thickness, in viewBox units (the viewBox is 100 × 50, the dial radius 40). |
| `--mini-chart-aspect-ratio` | `2 / 1` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root, with `role="meter"`. |
| `zones` | `<g>` | Container of the dial. |
| `track` | `<path>` | One band of the dial per zone, or the single gradient dial. |
| `needle` | `<path>` | The needle. It sweeps in from `min` on the first reading and rotates to each new value. |
| `pivot` | `<circle>` | The needle's hub. |

## Example

```html
<mini-gauge-chart
  data="[85, 0, 120]"
  zones='[{"upTo": 60, "color": "#10b981"}, {"upTo": 100, "color": "#f59e0b"}, {"upTo": 120, "color": "#ef4444"}]'
  needle-type="line"
  interactive
  label="Engine speed"
></mini-gauge-chart>
```

```js
const gauge = document.querySelector("mini-gauge-chart");
gauge.addEventListener("zone-change", (event) => {
  console.log(`Now in zone ${event.detail.zoneIndex}`);
});
// The chart stays minimal: a click takes the user to the detail view.
gauge.addEventListener("sparkline-select", () => {
  location.hash = "#engine";
});
```
