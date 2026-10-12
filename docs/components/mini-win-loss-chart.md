# Win / Loss Chart (`<mini-win-loss-chart>`)

Edward Tufte's win/loss sparkline: one block per outcome, above the baseline for a win, below it for a loss, and a thin mark on it for a tie. `mode="status"` turns it into a full-height status strip (for example, uptime per day).

## Data

A JSON array of numbers. Only the sign counts: a positive value is a win, a negative value a loss and `0` a tie, so `[3, -1, 0]` draws the same as `[1, -1, 0]`. Entries that are not finite numbers are skipped.

```json
[1, 1, -1, 1, 0, -1, 1, 1, 1, -1]
```

The `data` property accepts the array directly (`chart.data = [1, -1, 0]`) and writes it to the attribute as JSON.

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | JSON `number[]` | `[]` | The outcomes to plot. |
| `label` | string | `"Win-loss chart with N values"` | Accessible name, used as the svg's `aria-label` and `<title>`. |
| `gap` | number | `0.2` | Share of each slot left empty between blocks, clamped to `0`–`0.8`. |
| `radius` | number | `2` | Corner radius of each block, in viewBox units (the chart is 100 × 30). `"3px"` is read as `3`. A negative or invalid value falls back to `--mini-chart-bar-radius`. An explicit attribute wins over the inherited token. |
| `mode` | `win-loss` \| `binary` \| `status` \| `uptime` | `win-loss` | `win-loss` (alias `binary`) draws wins above and losses below a dashed baseline. `status` (alias `uptime`) draws every outcome as a full-height block and hides the baseline. Any other value is `win-loss`. |
| `win-color` | — | — | Observed but has no effect. Use `--mini-chart-win-color`. |
| `loss-color` | — | — | Observed but has no effect. Use `--mini-chart-loss-color`. |
| `tie-color` | — | — | Observed but has no effect. Use `--mini-chart-tie-color`. |
| `interactive` | boolean (presence) | off | Highlights the block under the pointer, dims the others and dispatches the events below. `interactive="false"` still enables it. |

## Events

Dispatched only when `interactive` is set. Both bubble and cross the shadow boundary (`composed`).

| Event | `detail` | When |
| --- | --- | --- |
| `sparkline-hover` | `{ index, value, outcome, element }` | The pointer enters a block. `outcome` is `"win"`, `"loss"` or `"tie"`, `element` is the block's `<rect>`. |
| `sparkline-leave` | none | The pointer leaves the chart. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| `--mini-chart-win-color` | `--mini-chart-bullish-color` | Win block fill. |
| `--mini-chart-bullish-color` | `#10b981` | Win block fill when `--mini-chart-win-color` is not set. |
| `--mini-chart-loss-color` | `--mini-chart-bearish-color` | Loss block fill. |
| `--mini-chart-bearish-color` | `#ef4444` | Loss block fill when `--mini-chart-loss-color` is not set. |
| `--mini-chart-tie-color` | `--mini-chart-muted-color` | Tie block fill. |
| `--mini-chart-muted-color` | `#94a3b8` | Tie block fill when `--mini-chart-tie-color` is not set. |
| `--mini-chart-bar-radius` | `2px` | Block corner radius when the `radius` attribute is not set. |
| `--mini-chart-baseline-color` | `rgba(128, 128, 128, 0.25)` | Dashed baseline stroke (`win-loss` mode). |
| `--mini-chart-aspect-ratio` | `10 / 3` | Host aspect ratio when the host has no explicit height. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| `svg` | `<svg>` | The chart root. |
| `baseline` | `<line>` | Dashed zero line, hidden in `status` mode. |
| `bars` | `<g>` | Container of the blocks. |
| `bar` | `<rect>` | Every block. |
| `win` | `<rect>` | Blocks with a positive value (part list `bar win`). |
| `loss` | `<rect>` | Blocks with a negative value (part list `bar loss`). |
| `tie` | `<rect>` | Blocks with a value of `0` (part list `bar tie`). |

## Example

```html
<!-- Match results -->
<mini-win-loss-chart
  data="[1, 1, -1, 1, 1, -1, 0, 1]"
  interactive
  label="Recent match outcomes"
></mini-win-loss-chart>

<!-- Uptime strip -->
<mini-win-loss-chart
  data="[1, 1, 1, 1, -1, 1, 1, 1, 1, 1]"
  mode="status"
  radius="0"
  label="API uptime, last 10 days"
  style="--mini-chart-win-color: #16a34a"
></mini-win-loss-chart>
```
