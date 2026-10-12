# Pie Chart (`<mini-pie-chart>`)

A full-circle pie, or a donut with `donut` / `inner-radius`, that shows how a few values share a whole. The slices are revealed by a clockwise sweep the first time values arrive.

## Data

A JSON array of numbers, one per slice, in drawing order. An entry that is not a finite number (`null`, a string) becomes a zero-sized slice in its own slot, so slice `n` keeps color `n`. Negative values are drawn as `0`.

```json
[45, 30, 15, 10]
```

The `data` property accepts the array directly (`chart.data = [45, 30, 25]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `number[]` | `[]` | The slice values. |
| `label` | string | `"Pie chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `donut` | number (ratio) | `0` | Hole size as a fraction of the radius, clamped to `0`–`0.9`. When both are set, `donut` wins over `inner-radius`. A bare `donut` attribute (no value) draws a solid pie. |
| `inner-radius` | number (ratio) | `0` | Same as `donut`; used only when `donut` is absent or empty. |
| `start-angle` | number (degrees) | `-90` | Angle where the first slice starts, clockwise from 3 o'clock; `-90` is 12 o'clock. The entrance sweep always starts at 12 o'clock. |
| `pad-angle` | number (degrees) | `0` | Empty angle between two drawn slices, taken half from each side (at most 90% of a slice). A single slice is never padded. `--mini-chart-gap-width` still draws its stroke on top. |
| `interactive` | boolean (presence) | off | Highlights the slice under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`), formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Since 1.5, every `sparkline-hover` and `sparkline-select` `detail` also carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` (the mark's computed color) and `clientX`/`clientY`, and a hover fires only when the hovered point changes.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, value, percentage, color, element }` | The pointer enters a slice. `value` is the slice's data value, `percentage` its share of the total (one decimal), `color` the built-in palette color for that index (not a `--mini-chart-color-N` override), `element` the slice's `<path>`. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a mark (or the chart, for the single-value meters). |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color-N` | built-in palette | Color of slice `N` (1-based: `--mini-chart-color-1` is the first slice). Without it, slice `N` takes color `N` of the 16-color built-in palette, which repeats after 16. |
| `--mini-chart-segment-color` | `var(--mini-chart-color-N, palette color N)` | Fill of each slice. The chart sets it inline on every slice, so a value set on the host or a container is overridden; set `--mini-chart-color-N` instead. |
| `--mini-chart-gap-color` | `transparent` | Stroke drawn around each slice, which reads as a gap between slices when it matches the background. |
| `--mini-chart-gap-width` | `0.5px` | Width of that stroke. |
| `--mini-chart-aspect-ratio` | `1 / 1` | Host aspect ratio when the host has no explicit height. |

`--mini-chart-fill` has no effect on the slices: the slice fill comes from `--mini-chart-segment-color` only. To recolor slices, set `--mini-chart-color-N`, or style `::part(segment-N)`.

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `group` | `<g>` | Masked group that holds the slices (the mask plays the entrance sweep). |
| `segment` | `<path>` | Every slice. |
| `segment-N` | `<path>` | Slice `N`, 1-based (`segment-1` is the first value). |

## Example

```html
<mini-pie-chart
  data="[45, 30, 15, 10]"
  donut="0.6"
  interactive
  label="Traffic sources"
  style="--mini-chart-color-1: #0ea5e9; --mini-chart-gap-color: white; --mini-chart-gap-width: 1px"
></mini-pie-chart>
```

```css
mini-pie-chart::part(segment-1) {
  fill: #7c3aed;
}
```
