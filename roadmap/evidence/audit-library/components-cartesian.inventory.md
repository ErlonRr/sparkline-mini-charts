## Per-component inventory

### `<mini-line-chart>` — `MiniLineChart` (src/components/mini-line-chart.js, 426 LOC)
- **Data**: `number[]` via inherited base getter → `parseNumericData` (src/core/data.js:10-21). Non-number / non-finite entries are filtered out (x-axis compresses, no gaps).
- **Attributes** (observed L19-29):
  | attr | semantics | default |
  |---|---|---|
  | `data` | JSON number array | `[]` |
  | `label` | aria-label + `<title>` | `"Line chart with N values"` / `"Empty Line chart"` |
  | `curve` | `linear` / `smooth` (Catmull-Rom) / `step` (=step-after) / `step-after` / `step-before`; anything else → linear | `linear` |
  | `points` | `last` / `all` / `min-max` / `none`; unknown → none | `last` |
  | `min`, `max` | parseFloat; NaN → auto domain | auto |
  | `reference-value` | dashed horizontal line (same scale, duplicated formula L297-298) | hidden |
  | `trend-color` | `auto` → writes host inline `--mini-chart-color` = bullish/bearish var (needs ≥2 values); any other value **removes** host inline `--mini-chart-color` | off |
  | `interactive` | presence boolean | off |
- **CSS vars**: `--mini-chart-color` (#2563eb, via `:host{color}` → currentColor), `--mini-chart-stroke-width` (2), `--mini-chart-point-fill` (currentColor), `--mini-chart-bullish-color` (#10b981), `--mini-chart-bearish-color` (#ef4444), `--mini-chart-ref-color` (rgba(128,128,128,.45)), `--mini-chart-ref-width` (1), `--mini-chart-crosshair-color` (rgba(128,128,128,.5)), `--mini-chart-crosshair-width` (1), `--mini-chart-aspect-ratio` (falls back to 100/30).
- **Parts**: `svg`, `group`, `line`, `points`, `point` + one of `point-last` / `point-point` / `point-min` / `point-max`, `reference-line`, `crosshair`, `active-point`.
- **Events**: `sparkline-hover` `{index, value, x, y}` (x/y in viewBox units), fired on every pointermove; `sparkline-leave` (no detail). Both bubble and are composed.
- **Animation**: entry clip-rect wipe (2×rAF + 850 ms setTimeout, `width .8s`); CSS `d` transition 0.4s and cx/cy transitions; padded-path morph when length changes; forced reflow per point on the first render (L370).
- **Interaction**: `pointermove`/`pointerleave` on the svg, nearest point by x from getBoundingClientRect. No keyboard support, no touch-action, no pointercancel handling.
- **Render**: custom incremental (DOM built once in `#createDOM`, then mutated); base `render`/`renderChart` bypassed.

### `<mini-area-chart>` — `MiniAreaChart` (543 LOC)
- **Data**: same as line (base parser). The domain always includes zero (`includeZero:true`, L325).
- **Attributes**: everything line has (same semantics, but `points` defaults to `none`, L434) plus `gradient`:
  - absent or `"true"` → 2 stops of currentColor, opacity 0.45 → 0.02
  - `"false"` → `fill="var(--mini-chart-fill, currentColor)"` plus inline `opacity:.2`
  - JSON array, single-quoted array or comma-separated list → N stops at opacity .55, last stop .05 (L379-426)
- **CSS vars**: line's set plus `--mini-chart-fill` (only when `gradient="false"`).
- **Parts**: `svg`, `group`, `area`, `line`, `points`, `point*`, `reference-line`, `crosshair`, `active-point`.
- **Events / animation / interaction / render**: same as line, plus a `d` transition on the area and a padded area morph when the baseline changes.

### `<mini-stacked-area-chart>` — `MiniStackedAreaChart` (303 LOC)
- **Data**: `number[][]` through a custom getter (L74-84). Non-array rows become `[]`, and each row runs `filter(Number.isFinite)` (shifts indexes). Missing cells become `0` in `createStackedLayout` (geometry.js:382,393). A flat `number[]` renders nothing.
- **Attributes**:
  | attr | semantics | default |
  |---|---|---|
  | `data` | JSON 2D array | `[]` |
  | `label` | accessible name | `"Stacked-area chart with <series count> values"` |
  | `curve` | `smooth` only when >2 points; otherwise linear | `linear` |
  | `normalize` | presence → offset `expand` (0–100%) | off |
  | `interactive` | presence boolean | off |
- **CSS vars**: `--mini-chart-color-N` (inline `style.fill`, fallback `SEGMENT_COLORS[(N-1)%16]` from palette.js). Does **not** inject `--mini-chart-default-aspect-ratio` (L107-121).
- **Parts**: `svg`, `layers`, `layer` + `layer-N` (1-based).
- **Events**: `sparkline-hover` `{layerIndex, seriesData, color (palette default, not the themed value), element (internal shadow path)}` on `pointerover` of a layer; `sparkline-leave` on svg `pointerleave`.
- **Animation**: entry clip wipe (2×rAF + 850 ms timer); inline `d .4s` transition on updates; CSS hover opacity/filter.
- **Interaction**: CSS hover highlight (`:has()`, other layers dimmed to 0.45, brightness 1.18).
- **Render**: incremental pool of `<path>`s (surplus hidden, never removed).

### `<mini-stream-chart>` — `MiniStreamChart` (299 LOC)
- About 97% identical to stacked. Offset is fixed to `silhouette`, and there is no `normalize`.
- `curve` defaults to `smooth`, and **any value other than `"linear"`** is treated as smooth (L189), including `step`.
- Vars, parts, events, animation and render are the same as stacked.

### `<mini-combo-chart>` — `MiniComboChart` (387 LOC)
- **Data**: `{bar:number, line:number}[]` through a custom getter (L79-93). An item is dropped entirely unless both fields are finite.
- **Attributes**:
  | attr | semantics | default |
  |---|---|---|
  | `shared-domain` | anything other than the string `"false"` → one domain (with zero) for bars and line | true |
  | `curve` | `smooth`, otherwise linear (no step) | linear |
  | `bar-gap` | clamped to 0–0.8 | 0.2 |
  | `interactive` | presence boolean | off |
  | `data`, `label` | as in the base | — |
- **CSS vars**: `--mini-chart-bar-color` (rgba(128,128,128,.3)), `--mini-chart-bar-color-hover` (rgba(128,128,128,.6)), `--mini-chart-color` (#2563eb, used directly for line stroke and point fill, so the host `color` is ignored), `--mini-chart-stroke-width` (2), crosshair vars. `--mini-chart-point-fill` is overridden by the `[part="point"]` rule (L129-133).
- **Parts**: `svg`, `bars`, `bar`, `line-group`, `line`, `points`, `point`, `crosshair`.
- **Events**: `sparkline-hover` `{index, barValue, lineValue, x, y}`; `sparkline-leave`.
- **Animation**: staggered bar grow (`all .4s` + 30 ms × index delay, cleanup timer); line clip wipe (2×rAF, no timer); `d` transition on updates; the last point is recreated via innerHTML on every render, so it never transitions.
- **Interaction**: same pointer logic as line (crosshair only, no active point).
- **Render**: incremental bars (add/remove), recreated point; first-render detection stored in `linePath.dataset.rendered`.

### `<mini-scatter-chart>` — `MiniScatterChart` (286 LOC)
- **Data**: raw `JSON.parse` array with **no validation** (L70-78). Normalization happens in `createScatterLayout` (geometry.js:758-773): `[x,y,r?]`, `{x,y,r?}`, or a plain number (x = index). Invalid items become `(index, 0)`.
- **Attributes**:
  | attr | semantics | default |
  |---|---|---|
  | `point-radius` | radius in viewBox units | 3 |
  | `trend-line` | present and not `"false"` → least-squares regression line | off |
  | `min-x`, `max-x`, `min-y`, `max-y` | explicit bounds; if max ≤ min → [min, min+1] | auto |
  | `interactive` | presence boolean | off |
  | `data`, `label` | as in the base | — |
- **CSS vars**:
  - `--mini-chart-point-color`, then `--mini-chart-color`, then `#3b82f6`
  - `--mini-chart-point-stroke`, then **`--surface`**, then `#fff`
  - `--mini-chart-trend-color`, then `color-mix(**--primary** #3b82f6 40%)`
  - `--mini-chart-trend-width` (1.5px)
- **Parts**: `svg`, `trend-line`, `points`, `point`.
- **Events**: `sparkline-hover` `{index, data (raw datum), element}` on `pointerover`; `sparkline-leave`.
- **Animation**: staggered pop-in (r + opacity, overshoot cubic-bezier, 20 ms × index delay, cleanup timer); `transition: all .4s` on the trend line.
- **Render**: incremental circle pool (surplus hidden).

## Cross-component comparison

| concept | line | area | stacked | stream | combo | scatter |
|---|---|---|---|---|---|---|
| parser | base | base | custom 2D | custom 2D (copy) | custom objects | none (raw) |
| default curve | linear | linear | linear | smooth | linear | n/a |
| curve values | lin / smooth / step×3 | same | smooth / linear | non-linear = smooth | smooth / linear | n/a |
| point default | last | none | n/a | n/a | always last | always all |
| point radius | 1.75 (hard-coded) | 1.75 | n/a | n/a | 2 | `point-radius` = 3 |
| point color var | `--mini-chart-point-fill` | same | n/a | n/a | `--mini-chart-color` | `--mini-chart-point-color` |
| primary fallback | #2563eb | #2563eb | palette | palette | #2563eb | #3b82f6 |
| bounds attrs | min / max | min / max | none | none | none | min-x / max-x / min-y / max-y |
| gap attr | n/a | n/a | n/a | n/a | `bar-gap` (bar chart uses `gap`) | n/a |
| default-true flag | n/a | `gradient` ("false" disables) | n/a | n/a | `shared-domain` ("false" disables) | `trend-line` (presence, "false" disables) |
| hover detail | {index,value,x,y} | same | {layerIndex,seriesData,color,element} | same | {index,barValue,lineValue,x,y} | {index,data,element} |
| hover trigger | pointermove (every move) | same | pointerover | pointerover | pointermove | pointerover |
| random SVG ids | clip | grad + clip | clip | clip | clip | none |
| host inline style | yes (`--mini-chart-color`) | yes | no | no | no | no |

## Docs vs implementation drift

| component | documented but missing / wrong | implemented but undocumented |
|---|---|---|
| line (docs/components/mini-line-chart.md) | `--mini-chart-color-1` (L18, not consumed); default `#3b82f6` (actual #2563eb); part `mask-line` (L24, doesn't exist) | curve, points, min, max, reference-value, trend-color, interactive; parts svg/group/points/point-last/min/max/reference-line/crosshair/active-point; vars point-fill, bullish/bearish, ref-*, crosshair-*; events |
| area | `--mini-chart-color-1` (L18); "fill opacity controlled via CSS" (actually stop-opacity attributes / inline opacity) | gradient, curve, points (default none), min, max, reference-value, trend-color, interactive, `--mini-chart-fill`, events, zero baseline |
| stacked | palette defaults #3b82f6/#10b981/#f59e0b and "up to 6" (actual #84cc16/#f43f5e/#0ea5e9…, 16 colors); "use `:nth-child()`" with `::part` (not possible) | `layer-N` parts, curve, normalize, interactive, events |
| stream | same palette errors | curve (default smooth), interactive, events |
| combo | entire data model `[{type, values}]` and the "area" type (L6-28); `part="layer"` `<g>` containers; `--mini-chart-color-n` per series | real `{bar,line}[]` model, shared-domain, curve, bar-gap, interactive, `--mini-chart-bar-color(-hover)`, parts bars/bar/line-group/line/points/point/crosshair, events |
| scatter | `point-radius` default 2.5 (actual 3); `--mini-chart-color-1` (actual `--mini-chart-point-color`/`--mini-chart-color`); `--mini-chart-trendline-color` (actual `--mini-chart-trend-color`); parts `circle`/`trendline` (actual `point`/`trend-line`); "hover crosshairs" (none) | bubble third element / `r` field, plain-number data, `--mini-chart-trend-width`, `--mini-chart-point-stroke`, events |
| README.md:150, docs/getting-started.md:162 | README gives the `--mini-chart-color` default as `#0ea5e9`; getting-started themes `mini-line-chart` with `--mini-chart-color-1` (no effect) | — |

## Test coverage (test/components.test.js)
- Line: viewBox plus line path present (L256-263). Area: area part present. Stacked/stream: 2 layers each (L275-284). Combo: 2 bars plus line (L310-320). Scatter: 3 points (L322-334).
- The cleanup test only does `assert.ok(true)` (L336-346).
- The fake DOM makes `style.setProperty`/`removeProperty` no-ops (L10-13, L149-152), returns width 0 from `getBoundingClientRect`, doesn't record listeners, doesn't emulate `innerHTML`, and sets `isConnected` after attributes. None of the bugs below can be caught.
- The framework test imports `../dist/*.js` (L387-389) and fails without a build. It currently fails with ERR_MODULE_NOT_FOUND.
- Not tested at all: any attribute other than `data`, edge-case data, events, reconnect, the property setter, theming.