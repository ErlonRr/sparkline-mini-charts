# Heatmap Chart (`<mini-heatmap-chart>`)

A grid of square cells whose color intensity follows the value: a matrix, a flat series wrapped into rows, or a contribution-style calendar. Each cell mixes the accent color into the empty color, and the cells fade in column by column the first time values arrive.

## Data

A JSON array of rows (`number[][]`), or a flat array of numbers (`number[]`) that wraps after `columns` cells:

```json
[[0, 2, 5, 1], [3, 8, 4, 0], [1, 6, 9, 2]]
```

```json
[0, 2, 5, 1, 3, 8, 4, 0, 1, 6, 9, 2, 7, 3]
```

An entry that is not a finite number (`null`, a string) is an empty cell that keeps its slot, so a calendar stays aligned. Rows of a `number[][]` may differ in length; the missing slots are empty cells. The cells are square and the grid is centered in the 100 × 30 viewBox.

The `data` property accepts the array directly and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `number[][]` \| `number[]` | `[]` | The cell values. |
| `label` | string | `"Heatmap chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. N counts the cells that hold a value. |
| `preset` | string | none | Space-separated names of presets registered with `defineChartPreset()` or `defineMiniCharts({ presets })`; the rightmost name wins. Explicit attributes and `options` beat presets. |
| `columns` | number | all values in one row (`7` with `layout="calendar"`) | Wrap length of a flat `number[]`: cells per row, or cells per column with `layout="calendar"`. Ignored for `number[][]`. |
| `layout` | `grid` \| `calendar` | `grid` | `grid` fills a flat `number[]` row by row; `calendar` fills it column by column, top to bottom, like a contribution calendar (`columns="7"`: one week per column). |
| `gap` | number | `0.15` | Share of each cell left empty around it, clamped to `0`–`0.9`. |
| `radius` | number | `0.2` | Corner radius as a share of the cell side, clamped to `0`–`0.5` (`0.5` draws circles). |
| `levels` | number | `5` | Number of color steps. The domain minimum is the first step (the empty color) and any larger value is at least the second. `0` maps values continuously. |
| `min` | number | lowest value or `0` | Bottom of the color domain; values below it draw the empty color. |
| `max` | number | highest value | Top of the color domain; values above it draw the full accent color. |
| `interactive` | boolean (presence) | off | Outlines the cell under the pointer, dims the others and dispatches the events below. Arrow keys move along a row, ArrowUp and ArrowDown between rows. |
| `tooltip` | boolean | off | Shows the hovered value in a small built-in tooltip (`part="tooltip"`) at the cell centre. Implies `interactive`. |
| `locale` | string | the page's | BCP 47 locale of the tooltip numbers, e.g. `de-DE`. |
| `motion` | `auto` \| `reduce` | `auto` | `reduce` skips the entrance and draws data updates at once. `prefers-reduced-motion: reduce` does the same for every chart. |

## Events

Dispatched only when `interactive` is set, for cells that hold a value. All bubble and cross the shadow boundary (`composed`). Every `detail` carries the uniform keys `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` and `clientX`/`clientY`.

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, seriesIndex, value, datum, row, column, level, element }` | The pointer enters a cell. For `number[][]`, `seriesIndex` is the row and `index` the column; for `number[]`, `index` is the position in the array. `row`/`column` give the grid position, `level` the color intensity (`0`–`1`). |
| `sparkline-select` | same as `sparkline-hover` | The pointer clicks a cell. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-color` | `#2563eb` (dark: `#60a5fa`) | Color of the most intense cells. |
| `--mini-chart-empty-color` | translucent slate | Color of empty cells and of the domain minimum; the other cells mix the accent into it. |
| `--mini-chart-cell-outline-color` | `currentColor` | Outline of the hovered (or keyboard-active) cell. |
| `--mini-chart-cell-outline-width` | `1.5` | Width of that outline, in pixels. |
| `--mini-chart-dim-opacity` | `0.45` | Opacity of the other cells while one is hovered. |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `cells` | `<g>` | Container of the cells. |
| `cell` | `<rect>` | Every cell. |
| `empty` | `<rect>` | Cells without a value (part list `cell empty`). |

## Example

```html
<mini-heatmap-chart
  data="[0, 2, 5, 1, 3, 8, 4, 0, 1, 6, 9, 2, 7, 3]"
  columns="7"
  layout="calendar"
  tooltip
  label="Commits in the last two weeks"
  style="--mini-chart-color: #16a34a"
></mini-heatmap-chart>
```

```css
mini-heatmap-chart::part(empty) {
  opacity: 0.5;
}
```
