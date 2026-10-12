## Component overview

| Tag | Class | LOC | Data shape & parser | Render strategy | Animations | Interactions |
|---|---|---|---|---|---|---|
| `mini-pie-chart` | `MiniPieChart` | 232 | `number[]` through the base `parseNumericData` (data.js:17 silently drops non-finite and non-number entries). Negatives are clamped to 0 in `createRadialLayout` (geometry.js:239) | Custom incremental `render()` (pie:58-119). Style and svg are created once; segments are diffed by count; `d`, `part`, `data-index` and the colour var are reassigned on every render; `style.textContent` is rewritten on every render | Initial only: a CSS transition on the mask circle's `stroke-dashoffset` (0.8s ease-out), started by a forced reflow (`getBoundingClientRect`, pie:220) plus a `setTimeout(850)` that then sets transition to none (pie:223). Hover opacity/filter transition 0.2s. Data updates snap with no tween | `pointerover` on the group and `pointerleave` on the svg (pie:147-150). CSS `:hover` brightness and `:has()` dimming. No keyboard support |
| `mini-half-pie-chart` | `MiniHalfPieChart` | 227 | Same as pie | Same as pie, about 85% identical code (39 diff lines) | Same as pie (mask with dasharray `78.54 157.1`, rotate -180) | Same as pie |
| `mini-gauge-chart` | `MiniGaugeChart` | 417 | Base parser, read positionally as `[value, min?, max?]` (gauge:301-303) | Custom. DOM is created once behind `#initialized` (gauge:108). Zones are rebuilt with `innerHTML=""` only when the signature changes (gauge:330-334). Needle, text and aria are updated in place | Needle CSS `transform` transition 0.8s `cubic-bezier(0.34,1.56,0.64,1)` (overshoot). Initial: double rAF starting from -90deg (gauge:396-412). Updates re-apply the inline transition | `pointermove` and `pointerleave` on the svg (gauge:230-231). No keyboard support |
| `mini-progress-chart` | `MiniProgressChart` | 310 | Base parser; only `data[0]` is used, and empty data becomes 0 (progress:237) | Custom. DOM is created once; updates happen in place; gradient stops are rebuilt on every render (progress:262) | `stroke-dashoffset` transition 0.8s with overshoot, on `pathLength=100`. The initial double-rAF branch can never run (progress:277) | `pointermove` and `pointerleave` on the svg. No keyboard support |
| `mini-radial-bar-chart` | `MiniRadialBarChart` | 374 | Own getter (radial:78-90) accepting `number` or `{value:number,color?:string}` items; anything else is dropped | Custom. DOM is created once. The track cache only ever grows (radial:253-276); arcs, stroke and gradients are rewritten on every update | Initial: staggered `stroke-dashoffset` 0.8s `cubic-bezier(0.16,1,0.3,1)` with a delay of 0.1s per index, a forced reflow (radial:313) and `setTimeout(800+100n+50)` to reset. Updates: inline `0.4s ease-out` | `pointerover` on the container and `pointerleave` on the svg. No keyboard support |

## Attributes (observed), with semantics and defaults

**mini-pie-chart** (observed list at pie:14-22)
- `data`: JSON number array.
- `label`: accessible name; defaults to `"Pie chart with N values"` or `"Empty Pie chart"`.
- `donut`: inner-radius ratio, parsed with `parseFloat` and clamped to [0, 0.9]. Default 0. It takes precedence over `inner-radius`. A bare `donut` attribute (empty string) falls through to `inner-radius` and has no effect (pie:177-178).
- `inner-radius`: synonym for `donut`.
- `pad-angle`: observed, but **the code never reads it**.
- `start-angle`: degrees, default -90 (12 o'clock); NaN falls back to -90 (pie:174-175).
- `interactive`: presence attribute (`hasAttribute`).
- Fixed geometry: viewBox 100×100, outer radius 48.

**mini-half-pie-chart** (observed list at half:14-20)
- `data`, `label`, `donut`, `inner-radius`, `interactive`, with the same semantics as pie.
- No `start-angle` or `pad-angle`. Fixed start at π with a sweep of π (half:177).
- Fixed geometry: viewBox 100×50, radius 46.

**mini-gauge-chart** (observed list at gauge:34-44)
- `data`: `[value, min?, max?]`.
- `min`: default `data[1] ?? 0`.
- `max`: default `data[2] ?? 100`. If `min >= max`, then `max = min + 1` (gauge:305).
- `zones`: JSON `[{upTo:number,color:string}]` in absolute values. Invalid entries are filtered out and the rest sorted. If the attribute is missing, three default bands are used at 33.3%, 66.6% and 100% of the span (gauge:19-26).
- `needle-type`: `triangle` (default) or `line`. **Only read on the first render** (gauge:172).
- `show-value`: presence attribute. Shows `Math.round(clamped)` (gauge:320).
- `gradient`: absent or `"false"` turns it off. `""` or `"true"` gives a hard-coded 6-stop green-to-red ramp. A JSON array or a CSV list of colours is also accepted. When a gradient is on, zones are not drawn but are still used for `zone-change` (gauge:243-259, 336-357).
- `interactive`.
- Fixed geometry: viewBox 100×50, aspect `2 / 1`, track radius 40.

**mini-progress-chart** (observed list at progress:12-21)
- `data`: `[value]`.
- `min`: default 0.
- `max`: default 100. If `max <= min`, max becomes **100**, not min+1 (progress:232-235).
- `show-value`: presence attribute. Shows `${Math.round(clamped)}${unit}`.
- `unit`: string, default `""`.
- `gradient`: same parser as gauge. Default is a 3-stop blue-cyan-green ramp (progress:209).
- `interactive`.
- Fixed geometry: hard-coded arc path `M 10 50 A 40 40 0 0 1 90 50`. Progress doesn't use the geometry module.

**mini-radial-bar-chart** (observed list at radial:22-31)
- `data`: `number[]` or `{value,color?}[]`.
- `sweep`: degrees, default 270, no clamping (radial:236-238).
- `round-caps`: **on by default**; only the literal `"false"` turns it off. **Only read once**, when the DOM is created (radial:112).
- `min`: observed, but **the code never reads it**.
- `max`: default `max(...values, 1)` (geometry.js:434).
- `gradient`: absent or `"false"` turns it off. `""` or `"true"` gives each track `[baseColor, palette[i+3]]`. A JSON colour array is shared by all tracks; an array of arrays is per track. A CSV list needs at least 2 colours (radial:191-211).
- `interactive`.
- Track layout: index 0 is innermost (r=16) and the last index is outermost (r=44). With a single value, r=44. Ring width is `clamp(36/n, 2, 10)` px, set inline (radial:247-251).

## CSS custom properties consumed (defaults)

| Component | Variables |
|---|---|
| all (from svg.js `chartStyles`) | `--mini-chart-color` (#2563eb, host `color`), `--mini-chart-aspect-ratio`, `--mini-chart-default-aspect-ratio`, `--mini-chart-fill`/`--mini-chart-segment-color` (segment fill, svg.js:34), `--mini-chart-stroke-width` (2, line), ref/crosshair vars (unused here) |
| pie / half-pie | `--mini-chart-color-N` (fallback `SEGMENT_COLORS[(N-1)%16]`), `--mini-chart-segment-color` (**set inline per segment**, so an outside value is ignored), `--mini-chart-gap-color` (transparent), `--mini-chart-gap-width` (0.5px). `--mini-chart-fill` is overridden by pie:99 and has no effect |
| gauge | `--mini-chart-stroke-width` (**14**), `--mini-chart-needle-color` (falls back to `--mini-chart-color`, then #2563eb), `--mini-chart-text-color` (currentColor), `--mini-chart-safe-color` (falls back to `--mini-chart-bullish-color`, then #10b981), `--mini-chart-warn-color` (falls back to `--mini-chart-warning-color`, then #f59e0b), `--mini-chart-danger-color` (falls back to `--mini-chart-bearish-color`, then #ef4444). Gradient stops are hex values that no token can change |
| progress | `--mini-chart-track-color` (rgba(128,128,128,0.18)), `--mini-chart-stroke-width` (**12**, used for both track and value), `--mini-chart-value-color` (falls back to `--mini-chart-color`, then **#3b82f6**), `--mini-chart-text-color` (currentColor) |
| radial-bar | `--mini-chart-track-bg` (falls back to `--mini-chart-track-color`, then rgba(128,128,128,0.15)), `--mini-chart-color-N` (only for numeric items without a gradient). Stroke width is set inline in px and can't be themed |

## ::part names

| Component | Parts |
|---|---|
| pie / half-pie | `svg`, `group`, `segment` plus `segment-N` (1-based) |
| gauge | `svg`, `zones`, `track` (every zone arc, or the single gradient arc, all sharing the same name), `needle`, `pivot`, `text` |
| progress | `svg`, `track`, `value`, `text` |
| radial-bar | `svg`, `tracks` (container), `track` (the `<g>` for each ring), `track-bg`, `track-fg` |

## Events (all bubble and are composed)

| Component | Event | Detail |
|---|---|---|
| pie / half-pie | `sparkline-hover` (on pointerover of a segment) | `{index, value (raw), percentage (0–100, 1 decimal), color (palette hex, ignores theme), element}` |
| pie / half-pie | `sparkline-leave` | none |
| gauge | `sparkline-hover` (on **every** pointermove) | `{value (clamped), zoneIndex, zoneColor (raw CSS string, e.g. "var(--mini-chart-safe-color, …)")}` |
| gauge | `zone-change` (when the active zone index changes; not on the first render) | `{value, zoneIndex, zoneColor}` |
| progress | `sparkline-hover` (on every pointermove) | `{value (clamped), progress (0–1)}` |
| progress | `progress-complete` (on **every render** while value ≥ max) | `{value, max}` |
| radial-bar | `sparkline-hover` (pointerover) | `{trackIndex, value, color (item.color or palette hex), element}` |
| all | `sparkline-leave` | none |

Wrappers declare a `slice-select` event that **no component ever dispatches**: angular:302, 342; vue:41, 52; react:35. No wrapper surfaces `progress-complete`.

## Core helpers used by these components

- **geometry.js:** `createRadialLayout` (pie, half-pie), `describePieSector` (pie, half-pie), `describeArc` (gauge, radial-bar), `createRadialBarLayout` (radial-bar). Progress uses no geometry.
- **svg.js:** `createSvgElement`, `createChartSvg`, `chartStyles` (all five).
- **palette.js:** `getSegmentColor` with 16 hex colours (pie, half-pie, radial-bar).
- **data.js:** `parseNumericData` (pie, half-pie, gauge and progress, through the base getter).
- **Random ids:** `Math.random` ids at pie:70, half:68, gauge:158, progress:132, radial:255.
- **Host element:** none of the five mutates the host's inline style. Gauge calls `this.removeAttribute("aria-valuenow")` on the host (gauge:293), but the aria attributes actually live on the svg.

## The same concept across the five components

| Concept | pie | half-pie | gauge | progress | radial-bar |
|---|---|---|---|---|---|
| Value range | n/a (sum) | n/a | data[1..2] or `min`/`max` attributes, default 0..100 | `min`/`max` attributes only, default 0..100 | `max` only (`min` ignored), default max(data) |
| `min >= max` policy | – | – | max = min+1 | max = 100 | – |
| Start/sweep config | `start-angle` (deg) | fixed | fixed 180° | fixed 180° | `sweep` (deg), start fixed at -90 |
| Colour delivery | inline `--mini-chart-segment-color` var plus stylesheet fill | same | `stroke` presentation attribute | stylesheet var; inline in gradient mode | inline `style.stroke` |
| Track/stroke width | – | – | `--mini-chart-stroke-width` 14 | `--mini-chart-stroke-width` 12 | inline px `clamp(36/n,2,10)` |
| Track colour default | – | – | none (zones only) | 0.18 alpha | 0.15 alpha (README says 0.08, progress docs say 0.2) |
| Value text | – | – | `show-value`, 11px/600, `y=48` | `show-value` plus `unit`, 12px/700, `y=42` | – |
| Default gradient | – | – | 6 hex stops | 3 hex stops | `[palette[i], palette[i+3]]` |
| Hover index key | `index` | `index` | `zoneIndex` | – | `trackIndex` |
| Percent scale | 0–100 | 0–100 | – | 0–1 | – |
| Initial animation | mask plus setTimeout | mask plus setTimeout | double rAF | double rAF (dead code) | reflow plus setTimeout |

## Docs vs implementation

- **Pie / half-pie:** docs say `part="slice"` (pie.md:25, half.md:24), but the code uses `segment`/`segment-N`. Pie docs say there are 6 colours (pie.md:22); the palette has 16 and the README says 1..8. None of `donut`, `inner-radius`, `start-angle`, `interactive`, the gap vars or the events are documented.
- **Gauge:** docs say the data is a single number (gauge.md:6-9), but README:107 and getting-started:129 say `[value,min,max]`. Docs list `part="zone"` (gauge.md:42); the code uses `track`. `needle-type`, `show-value`, `gradient`, `interactive`, `zone-change`, the needle/text vars and the stroke-width var are undocumented.
- **Progress:** docs give a stroke-width default of 10 (actual 12) and a track default of 0.2 alpha (actual 0.18). The docs claim the arc inherits `currentColor` (progress.md:22, 35); it actually uses `--mini-chart-value-color` falling back to `--mini-chart-color` and then #3b82f6. `show-value`, `unit`, `gradient`, `progress-complete` and `part="text"` are undocumented.
- **Radial-bar:** `min` is documented (radial.md:23) but does nothing. The docs describe `part="track"` as the foreground arc (radial.md:35); in the code it is the group, and the foreground arc is `track-fg`. `sweep`, `round-caps` and `gradient` are undocumented.
- **README:** the `mini-pie-chart { --mini-chart-fill }` example (README:140-143) has no effect. The README gives `--mini-chart-color` a default of #0ea5e9; the code uses #2563eb (svg.js:7).

## Tests touching this area

`test/components.test.js` covers these components in 4 assertions: viewBox and path count (265-273), role and aria-valuenow (286-294), the radial track count (310-320), and that a gradient `<linearGradient>` exists (348-384). The mock DOM's `style` is a plain object and `getBoundingClientRect` returns zeros, so none of these are exercised: events, reconnect, data shrink, boolean "false", empty or negative data, and animation. The disconnect test is just `assert.ok(true)` (336-346). The wrapper test imports `dist/` and fails when no build exists (386-389): running `node --test test/components.test.js` gives 11 passing and 1 failing with ERR_MODULE_NOT_FOUND for dist/react.js.