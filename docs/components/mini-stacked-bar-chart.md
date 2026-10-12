# Stacked Bar Chart (`<mini-stacked-bar-chart>`)

A single bar split into colored segments, one per value: the composition of a total (budget split, disk usage, traffic sources). The segments grow in from the start of the bar the first time values arrive.

## Data

A JSON array with one entry per segment, in order. An entry is a number, or an object with a numeric `value` and an optional `label` and `color`:

```json
[45, 30, 15, 10]
```

```json
[
  { "value": 45, "label": "Rent", "color": "#f43f5e" },
  { "value": 30, "label": "Food" },
  25
]
```

Negative, zero and invalid values draw no segment but keep their slot, so segment `n` keeps color `n`. A `color` that is not a valid CSS color is ignored.

The `data` property accepts the array directly and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `(number \| { value, label?, color? })[]` | `[]` | The segment values. |
| `label` | string | `"Stacked bar chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `max` | number | none | Value of a full bar. When set, the segments fill `sum / max` of the bar and the track shows the rest; otherwise they fill the whole bar. A value that is not positive is ignored. |
| `gap` | number | `1` | Space between two segments, in viewBox units (the bar is 100 long). |
| `radius` | number | `0` | Corner radius of each segment and of the track, in viewBox units. |
| `orientation` | `horizontal` \| `vertical` | `horizontal` | `vertical` stacks the segments from the bottom up in a 20 × 100 viewBox. The `orientation` attribute also flips the default aspect ratio to `1 / 5`; set `--mini-chart-aspect-ratio` when it comes from `options` or a preset. |
| `interactive` | boolean (presence) | off | Highlights the segment under the pointer, dims the others and dispatches the events below. |
| `tooltip` | boolean | off | Shows the hovered segment as `value (percent%)`, prefixed with its `label`, in a small built-in tooltip (`part="tooltip"`) above the segment. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` skips the entrance and draws data updates at once. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Every `detail` carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` and `clientX`/`clientY`.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, value, datum: { value, percent, label? }, percentage, element }` | The pointer enters a segment. `percent` (also `percentage`) is the segment's share of the total, with one decimal. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a segment. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color-N` | the built-in palette | Fill of segment N (1-based), unless the entry has its own `color`. |
| `--mini-chart-track-color` | translucent slate | The unfilled rest of the bar (with `max`), or the whole bar when every value is zero. |
| `--mini-chart-dim-opacity` | `0.45` | Opacity of the other segments while one is hovered. |
| `--mini-chart-aspect-ratio` | `5 / 1` (`1 / 5` vertical) | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `track` | `<rect>` | The unfilled rest of the bar. |
| `segments` | `<g>` | Container of the segments. |
| `segment` | `<rect>` | Every segment. |
| `segment-N` | `<rect>` | Segment N, 1-based (part list `segment segment-N`). |

## Example

```html
<mini-stacked-bar-chart
  data="[45, 30, 15]"
  max="120"
  gap="1.5"
  radius="2"
  tooltip
  label="Disk usage"
  style="--mini-chart-color-1: #0ea5e9"
></mini-stacked-bar-chart>
```

```css
mini-stacked-bar-chart::part(track) {
  opacity: 0.6;
}
```
