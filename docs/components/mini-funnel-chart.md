# Funnel Chart (`<mini-funnel-chart>`)

Conversion steps (visits → sign-ups → trials → purchases) drawn as centred bars, widest first, joined by trapezoids that show the drop between steps.

## Data

A JSON array with one item per step, in funnel order. Each item is a number or a `{ "value": number, "label"?: string }` object.

```json
[1000, 620, { "value": 310, "label": "Trial" }, 120]
```

Items without a finite value are dropped. Each bar's length is its value over the largest value; negative values draw as empty bars. The `data` property accepts the array directly and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON array | `[]` | The steps to plot (see Data). |
| `label` | string | `"Funnel chart with N steps, from A to B (P% of the first)"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `orientation` | `horizontal` \| `vertical` | `horizontal` | `horizontal` stacks the steps top to bottom; `vertical` lines them up left to right. |
| `shape` | `trapezoid` \| `bars` | `trapezoid` | `trapezoid` joins consecutive steps with a connector; `bars` leaves the gaps empty. |
| `gap` | number | `0.25` | Share of each step's slot left between two bars, clamped to `0`–`0.9`. |
| `radius` | number | `0` | Corner radius of the bars, in viewBox units (the chart is 100 × 30), at most half the bar thickness. |
| `colors` | `accent` \| `series` | `accent` | `accent` shades `--mini-chart-color` lighter at each step; `series` gives step N the color `--mini-chart-color-N`. |
| `interactive` | boolean (presence) | off | Highlights the step under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered step as `value · percent% (conv. x% from previous)`, prefixed with its `label`, in a small built-in tooltip (`part="tooltip"`) at the end of the step, formatted with `Intl.NumberFormat`. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Every `sparkline-hover` and `sparkline-select` `detail` carries the uniform keys `chart`, `index`, `seriesIndex` (`0`), `value`, `datum`, `color` and `clientX`/`clientY`; `datum` is `{ value, label?, percent, conversion }`.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, value, label, percent, conversion, element }` | The pointer enters a step. `percent` is the value as a percentage of the first step, `conversion` as a percentage of the previous one (`null` for the first step). |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a step. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color` | `#2563eb` | Step fill in `colors="accent"`. |
| `--mini-chart-color-N` | built-in palette | Fill of step N (from 1) in `colors="series"`. |
| `--mini-chart-connector-color` | the step's color | Fill of the connectors. |
| `--mini-chart-connector-opacity` | `0.35` | Opacity of the connectors, relative to their step. |
| `--mini-chart-dim-opacity` | `0.45` | Opacity of the other steps while one is hovered. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `steps` | `<g>` | Container of the steps. |
| `step` | `<rect>` | One step. |
| `connectors` | `<g>` | Container of the connectors, hidden with `shape="bars"`. |
| `connector` | `<path>` | Trapezoid between two steps. |

## Example

```html
<mini-funnel-chart
  data='[1000, 620, 310, 120]'
  orientation="vertical"
  gap="0.3"
  interactive
  tooltip
  label="Checkout funnel"
></mini-funnel-chart>
```
