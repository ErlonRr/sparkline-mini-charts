# Radial Bar Chart (`<mini-radial-bar-chart>`)

Concentric rings ("activity rings"), one per value. Each ring is an arc that starts at 12 o'clock and runs clockwise; its length is the value's share of `max`. The rings fill in with a staggered animation the first time values arrive.

## Data

A JSON array with one entry per ring, from the innermost ring to the outermost. An entry is a number, or an object with a numeric `value` and an optional `color`:

```json
[85, 62, 40]
```

```json
[
  { "value": 85, "color": "#f43f5e" },
  { "value": 62, "color": "#84cc16" },
  40
]
```

Entries that are neither a finite number nor an object with a finite `value` are skipped. A ring is empty at `0` or below and full at `max` or above. A single value draws one ring at the outer radius. When the data shrinks, the surplus rings are removed.

The `data` property accepts the array directly and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `(number \| { value, color? })[]` | `[]` | The ring values. |
| `label` | string | `"Radial-bar chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `max` | number | highest value (at least `1`) | Value of a full ring. A value that is not positive is ignored. |
| `min` | number | none | Observed but not read: rings always start at `0`. |
| `sweep` | number (degrees) | `270` | Length of a full ring's arc, from `0` (exclusive) to `360`. A larger value draws a full circle; zero or a negative value keeps `270`. |
| `round-caps` | boolean | on | Rounded ends on the rings and their tracks. Only `round-caps="false"` turns them off. Changes apply after the first render too. |
| `gradient` | see [Gradient](#gradient) | off | Strokes the rings with linear gradients instead of flat colors. |
| `interactive` | boolean (presence) | off | Highlights the ring under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |

## Gradient

The `gradient` attribute is read by the shared parser of area, bullet, gauge, progress and radial-bar charts:

| Value | Result |
| --- | --- |
| absent, `"false"`, `"0"`, `"none"`, `"off"`, `"no"` | Off: each ring has its flat color. |
| `""` (bare attribute), `"true"` | On, with two default stops per ring: the ring's own color (its data `color`, or palette color `N`) and the palette color three places later. |
| JSON array of colors, e.g. `'["#10b981", "#3b82f6"]'` | The same stops on every ring. Single quotes are accepted (`['#10b981', '#3b82f6']`). |
| JSON array of arrays, e.g. `'[["#f43f5e", "#fb7185"], ["#84cc16", "#bef264"]]'` | One stop list per ring, in data order. A ring without its own list gets the plain colors of the array, if any, or else its flat color. |
| comma-separated list, e.g. `#10b981, rgb(59, 130, 246)` | The same stops on every ring. Commas inside `rgb()`, `hsl()`, `oklch()` or `var()` stay inside their color, so `var(--brand)` works as a stop. |

Entries that are not CSS colors (checked with `CSS.supports("color", …)`; `var()` is always kept) are dropped, so a word like `auto` never paints a black stop. A value with no usable color turns the gradient off.

## Events

Dispatched only when `interactive` is set. Both bubble and cross the shadow boundary (`composed`).

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ trackIndex, value, color, element }` | The pointer enters a ring. `trackIndex` is the ring's data index (`0` is innermost), `color` its data `color` or else the built-in palette color for that index (not a `--mini-chart-color-N` override), `element` the ring's `track-fg` path. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color-N` | built-in palette | Flat color of ring `N` (1-based: `--mini-chart-color-1` is the innermost ring), when the ring has no data `color` and no gradient. Without it, ring `N` takes color `N` of the 16-color built-in palette. |
| `--mini-chart-track-color` | `rgba(128, 128, 128, 0.15)` | Background track behind every ring. |
| `--mini-chart-track-bg` | `--mini-chart-track-color` | Background track, for radial bars only; wins over `--mini-chart-track-color`. |
| `--mini-chart-aspect-ratio` | `1 / 1` | Host aspect ratio when the host has no explicit height. |

A ring's color (data `color`, `--mini-chart-color-N` or a gradient) is set as an inline `stroke` on its `track-fg` path, so a `::part(track-fg)` rule needs `!important` to override it.

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `tracks` | `<g>` | Container of all rings. |
| `track` | `<g>` | One ring: its background and its value arc. |
| `track-bg` | `<path>` | The ring's full-length background track. |
| `track-fg` | `<path>` | The ring's value arc. |

## Example

```html
<mini-radial-bar-chart
  data="[85, 62, 40]"
  max="100"
  sweep="360"
  gradient
  interactive
  label="Activity goal rings"
></mini-radial-bar-chart>
```

```html
<mini-radial-bar-chart
  data='[{"value": 72, "color": "#f43f5e"}, {"value": 54, "color": "#84cc16"}]'
  round-caps="false"
  label="Two goals"
  style="--mini-chart-track-color: rgba(0, 0, 0, 0.08)"
></mini-radial-bar-chart>
```
