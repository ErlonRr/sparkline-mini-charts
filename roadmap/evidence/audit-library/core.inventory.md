## 1. Base class vs components: who uses what

Base class `MiniChartElement` (src/core/mini-chart-element.js):
- **Implements:** `observedAttributes = ["data","label"]` (l.14), `attachShadow` in the constructor (l.20), the `data` getter/setter with JSON round-trip (l.44-51), connected→`render()` (l.53-55), disconnected→`cleanup()` (l.57-59), attributeChanged→`requestRender()` microtask (l.61-74), a base `render()` that rebuilds the whole shadow DOM (l.83-92), `createDefaultLabel` (l.100-102) and an abstract `renderChart` (l.112-114).
- **Not exported** from src/index.js, so users can't extend it. `defineMiniCharts` isn't exported from the root either (only through `./define`).

Column key: **Own `get data`** = whether the class has its own `get data()`, and whether the inherited setter is lost. **gBCR** = getBoundingClientRect calls (forced layout). **rAF** = double-rAF scaffolding. **sTO** = setTimeout cleanup timers. **pF** = `parseFloat(getAttribute)` call sites.

| Component | LOC | Overrides render() | Own `get data` | "Built" flag | gBCR | rAF | sTO | Math.random ids | pF | Style text |
|---|---|---|---|---|---|---|---|---|---|---|
| line | 426 | yes l.91 | no | `#initialized` | 3 | yes | 1 | 1 | 3 | once |
| area | 543 | yes l.97 | no | `#initialized` | 3 | yes | 1 | 2 | 3 | once |
| bar | 251 | yes l.50 (+renderChart(svg,data,isInitial) l.142) | no | `querySelector("svg")` | 1 | – | 1 | 0 | 4 | **every render** l.73 |
| bullet | 332 | yes l.80 | **yes, setter lost** l.69 | `#initialized` + `dataset.rendered` | 0 | yes | 0 | 1 | 3 | once |
| candlestick | 347 | yes l.81 | **yes, setter lost** l.69 | `#initialized` | 1 | – | 1 | 0 | 3 | once, attrs interpolated |
| combo | 387 | yes l.95 | **yes, setter lost** l.79 | `#initialized` + `dataset.rendered` | 2 | yes | 1 | 1 | 1 | once |
| gauge | 417 | yes l.104 | no | `#initialized` + `dataset.rendered` | 1 (in pointermove) | yes | 0 | 1 | 2 | once |
| half-pie | 227 | yes l.56 (+renderChart l.162) | no | `querySelector("svg")` | 1 | – | 1 | 1 | 1 | **every render** l.94 |
| ohlc | 282 | yes l.73 | **yes, setter lost** l.61 | `#initialized` | 1 | – | 1 | 0 | 3 | once, attr interpolated |
| pie | 232 | yes l.58 (+renderChart l.164) | no | `querySelector("svg")` | 1 | – | 1 | 1 | 2 | **every render** l.96 |
| progress | 310 | yes l.74 | no | `#initialized` + `dataset.rendered` | 1 (in pointermove) | yes | 0 | 1 | 2 | once |
| radial-bar | 374 | yes l.92 | **yes, setter lost** l.78 | `#initialized` | 1 | – | 1 | 1 | 2 | once, attr interpolated |
| range-bar | 301 | yes l.78 | **yes, setter lost** l.68 | `#initialized` | 1 | – | 1 | 0 | 3 | once, attr interpolated |
| scatter | 286 | yes l.80 | **yes, setter lost** l.70 | `#initialized` | 1 | – | 1 | 0 | 5 | once |
| stacked-area | 303 | yes l.86 | **yes, setter lost** l.74 | `#initialized` | 0 | yes | 1 | 1 | 0 | once |
| stream | 299 | yes l.85 | **yes, setter lost** l.73 | `#initialized` | 0 | yes | 1 | 1 | 0 | once |
| win-loss | 270 | yes l.66 | no | `#initialized` | 1 | – | 1 | 0 | 1 | once, attr interpolated |

Totals:
- **render() overridden:** 17/17. The base `render()`/`renderChart()` are dead code.
- **Getter-only `data` accessor:** 9/17 (checked with `Object.getOwnPropertyDescriptor`: `set` is undefined, and assigning throws `TypeError: Cannot set property ... which has only a getter`).

## 2. Duplicated patterns (grep counts across src/components)

| Pattern | Call sites / files | Files | Approx. duplicated lines |
|---|---|---|---|
| `render()` wrapper (build-once flag + aria-label/`<title>` update) | 17/17 | all (14 use `#initialized`, bar/pie/half-pie query the svg) | ~285 |
| `cleanup()` + cancel rAF/timeout helpers | 26 clearTimeout, 14 cancelAnimationFrame | all | ~200 |
| `sparkline-leave` handler + setup/detach listener pairs | 17 | all | ~340 |
| `sparkline-hover`, nearest-x crosshair search | 3 | line, area, combo | ~115 |
| `sparkline-hover`, delegated `pointerover` hit-target | 11 | bar, bullet, candlestick, ohlc, pie, half-pie, radial, range-bar, scatter, stacked, stream, win-loss | ~250 |
| `document.createElement("style")` + `${chartStyles}` + aspect-ratio + `:host([interactive])` hover/dim (`:has()` in 11 files) | 17 | all | ~140 |
| Clip-path reveal (defs/clipPath/rect + double rAF + 850 ms timer) | 5 | line, area, combo, stacked, stream | ~160 |
| Stagger reveal (`transition:none` → forced reflow → staggered transition → cleanup timer) | 8 | bar, candlestick, combo, ohlc, radial, range-bar, scatter, win-loss | ~200 |
| Double-rAF single-element entrance | 3 | bullet, gauge, progress | ~45 |
| `parseFloat(this.getAttribute(...))` + isNaN fallback | 38 sites | 15 files | ~110 |
| Gradient attribute parser (`replace(/'/g,'"')` → JSON → comma split) + `<stop>` builder | 5 | area, bullet, gauge, progress, radial | ~125 |
| Custom `get data()` JSON.parse/try/filter | 9 | see table | ~90 |
| Element pool grow/hide-surplus | ~12 | bar, candlestick, ohlc, combo, pie, half-pie, radial, range-bar, scatter, stacked, stream, win-loss, line/area points | ~150 |
| Trend color (host inline style) | 2 | line, area | ~22 |
| Reference line (DOM + hard-coded y math) | 2 | line, area | ~40 |
| `points` mode + circle pooling | 2 | line, area | ~100 |
| `#buildPath` linear/smooth/step | 2 (+ partial in combo) | line, area | ~30 |
| Stacked `#buildPath` | 2 | stacked, stream | ~44 |
| `Math.random` ids | 12 sites | 11 files | – |

Measured: 2,097 of 4,810 non-empty component lines (excluding braces, comments and lines of 12 characters or fewer) appear verbatim in two or more component files.

Near-clone pairs (shared distinct lines):

| Pair | Shared lines | Overlap |
|---|---|---|
| line / area | 251 of 285 | 88% of line |
| pie / half-pie | 145 of 155-159 | 91-94% |
| stacked / stream | 178 of 186-190 | ~95% |
| gauge / progress | 146 of 208 | 70% of progress |
| candlestick / ohlc | 131 of 182 | 72% of ohlc |
| range-bar / win-loss | 104 of 176 | 59% |

## 3. Lifecycle walk-through

- **Parser/upgrade path** (the default when `register.js` loads after the HTML): during upgrade, attributeChangedCallback runs for each attribute while the element is already in the page, so `requestRender` queues a microtask. connectedCallback then calls `render()` synchronously. The microtask calls `render()` again. Result: **2 renders per element**. The second render's cancel-pending step kills the entrance animation in line, area, combo, stacked, stream, bullet, gauge and progress.
- **createElement → setAttribute → append** (React/Vue): attributes are set while disconnected, so `requestRender` returns early. Append triggers one render. Correct.
- **Disconnect → reconnect** (list reorder, portal, KeepAlive, drag-drop): `cleanup()` removes the listeners. On reconnect, `render()` sees the build-once flag or an existing svg, so it skips the DOM-creation step that attaches listeners. **Interactivity is lost in 17/17 components.** In-flight cleanup timers are also cancelled.
- **Property set before define:** an own `data` property on the not-yet-upgraded element shadows the prototype accessor permanently. There's no upgrade-property handling.
- **Data property cost:** the setter runs `JSON.stringify` and writes the attribute; attributeChangedCallback queues a microtask; the getter then runs `JSON.parse` and filters. Every access returns a new array, and the round trip isn't lossless (filtered and index-shifted).
- **observedAttributes:** each subclass restates the full list (`data` and `label` 17 times) instead of extending the base list.

## 4. Event contract (`sparkline-hover` detail shapes)

| Component | detail |
|---|---|
| line, area | `{index, value, x, y}` (viewBox units) |
| bar | `{index, value, isPositive, element}` |
| combo | `{index, barValue, lineValue, x, y}` |
| bullet | `{data, element}` |
| candlestick | `{index, open, high, low, close, isBullish, change, changePercent, element}` (+ `sparkline-select` on click) |
| ohlc | same as candlestick but without `element`, and no select event |
| gauge | `{value, zoneIndex, zoneColor}` (+ `zone-change`) |
| progress | `{value, progress}` (+ `progress-complete` on every render at max) |
| pie, half-pie | `{index, value, percentage, color(JS hex), element}` |
| radial-bar | `{trackIndex, value, color, element}` |
| range-bar, scatter | `{index, data, element}` |
| stacked, stream | `{layerIndex, seriesData, color(JS hex), element}` |
| win-loss | `{index, value, outcome, element}` |

The wrappers listen for `slice-select` (angular directive l.68, vue/index.ts l.41/52), which no component fires. `sparkline-select` and `progress-complete` aren't passed through by either.

## 5. CSS custom property collisions and leaks found in component styles

| Token | Meaning / default by component |
|---|---|
| `--mini-chart-stroke-width` | line stroke, default 2 (svg.js l.28); gauge track, 14 (gauge l.129); progress track/value, 12 (progress l.100/106) |
| `--mini-chart-range-color` | bullet background band, grey (bullet l.104); range-bar bar fill (range-bar l.104) |
| `--primary`, `--surface` (app-level, unprefixed) | bullet l.108-110; scatter l.104, l.111 |
| Default accent colour | `#2563eb` (svg.js l.7, combo l.124, gauge l.132) vs `#3b82f6` (bullet l.112, progress l.105, range-bar l.104, scatter l.110) |
| Segment colours | CSS `var(--mini-chart-color-N, hex)`, but event details report the JS hex from `getSegmentColor` (pie l.130, half-pie l.128, radial l.158, stacked l.156, stream l.155) |

## 6. Attribute anomalies

| Kind | Where |
|---|---|
| Read once at DOM creation (stale afterwards) | candlestick `hollow-bullish`/`wick-width` (l.102-103); ohlc `tick-width` (l.94); radial `round-caps` (l.112); range-bar `radius` (l.98); win-loss `radius` (l.86); gauge `needle-type` (l.172) |
| Observed but never implemented | pie `pad-angle` (l.19); radial-bar `min` (l.27); win-loss `win-color`/`loss-color`/`tie-color` (l.24-26, documented in docs/components/mini-win-loss-chart.md l.19-21) |
| Inconsistent boolean semantics | `hasAttribute` (interactive, show-value, normalize); `!== "false"` (hollow-bullish, round-caps, shared-domain); `gradient`: absent = ON in area (l.381) but OFF in bullet/gauge/progress/radial |