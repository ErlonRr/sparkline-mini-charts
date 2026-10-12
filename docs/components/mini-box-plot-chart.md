# Box Plot Chart (`<mini-box-plot-chart>`)

The distribution of a set of values (response times, prices, scores) as a box from the first to the third quartile, a median line, whiskers and outlier points. Several boxes sit side by side to compare distributions.

## Data

One of:

- an array of numbers: raw samples, summarized into one box;
- a summary object `{ "min", "q1", "median", "q3", "max", "outliers"? }`: one box, drawn as given (`q1`, `median` and `q3` are required; `min` and `max` default to the box);
- an array of sample arrays and/or summary objects: one box per item.

```json
[[12, 15, 17, 18, 21, 22, 48], { "min": 10, "q1": 14, "median": 16, "q3": 19, "max": 24, "outliers": [31] }]
```

Quartiles of raw samples interpolate between ranks (the R type 7 and NumPy default). Values that are not finite numbers are ignored; items without a usable value are dropped. The `data` property accepts the value directly and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON | `[]` | The distributions to plot (see Data). |
| `label` | string | `"Box-plot chart, median M, quartiles Q1 to Q3, whiskers A to B"` | Accessible name, used as the svg's `aria-label` and `<title>`. With several boxes it lists their medians. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `orientation` | `horizontal` \| `vertical` | `horizontal` | `horizontal` runs the values left to right and stacks the boxes top to bottom; `vertical` runs them bottom to top and lines the boxes up left to right. |
| `whisker` | `tukey` \| `minmax` | `tukey` | For raw samples: `tukey` stops the whiskers at the last sample within 1.5 × IQR of the box and marks the others as outliers; `minmax` reaches the lowest and highest samples. |
| `outliers` | boolean | `true` | Draws the outlier points. `outliers="false"` hides them. |
| `gap` | number | `0.4` | Share of each box's slot left empty, clamped to `0`–`0.9`: the box thickness is `1 - gap` of its slot. |
| `min` | number | lowest whisker or outlier | Start of the value axis. Ignored when it is not below `max`. Values outside are clamped to the edge. |
| `max` | number | highest whisker or outlier | End of the value axis. |
| `interactive` | boolean (presence) | off | Highlights the box or outlier under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |
| `tooltip` | boolean | off | Shows the hovered box as `median · q1–q3 · min–max` (an outlier: its value) in a small built-in tooltip (`part="tooltip"`) at the median. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` draws data updates at once, without the transition. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set. All bubble and cross the shadow boundary (`composed`). Every `sparkline-hover` and `sparkline-select` `detail` carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` and `clientX`/`clientY`. A box reports on `seriesIndex` `0` with its median as `value` and its summary `{ min, q1, median, q3, max, outliers }` as `datum` (`min` and `max` are the whisker ends). An outlier reports on `seriesIndex` `1`, with `index` counting the outliers of every box.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, summary, element }` for a box, `{ index, boxIndex, value, outlier: true, element }` for an outlier | The pointer enters a box (or its whiskers) or an outlier. |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a box or an outlier. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color` | `#2563eb` | Box outline, median, and the light box fill. |
| `--mini-chart-box-fill` | `--mini-chart-color` at 22% | Box fill. |
| `--mini-chart-box-stroke` | `--mini-chart-color` | Box outline. |
| `--mini-chart-median-color` | `--mini-chart-color` | Median line. |
| `--mini-chart-median-width` | `2px` | Median line width. |
| `--mini-chart-whisker-color` | `--mini-chart-muted-color` | Whiskers and their caps. |
| `--mini-chart-outlier-color` | `--mini-chart-color` (accent) | Outlier points, 3px radius. |
| `--mini-chart-muted-color` | `#94a3b8` | Whiskers and outliers when the specific tokens are not set. |
| `--mini-chart-dim-opacity` | `0.45` | Opacity of the other marks while one is hovered. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `boxes` | `<g>` | Container of the boxes. |
| `box-group` | `<g>` | One box with its whiskers and median. |
| `box` | `<rect>` | First to third quartile. |
| `median` | `<line>` | Median line. |
| `whisker` | `<line>` | Whisker; also `whisker-low` or `whisker-high`. |
| `cap` | `<line>` | Whisker end cap; also `cap-low` or `cap-high`. |
| `outliers` | `<g>` | Container of the outlier points. |
| `outlier` | `<circle>` | One outlier. |

## Example

```html
<mini-box-plot-chart
  data='[12, 15, 17, 18, 19, 21, 22, 23, 48]'
  interactive
  tooltip
  label="Response time distribution"
  style="--mini-chart-color: #0ea5e9"
></mini-box-plot-chart>
```
