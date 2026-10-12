## 1. Data contract per chart (actual code vs docs)

| Chart | Data shape the code accepts | Docs say | Parser | What happens to invalid / edge input | Other value-like inputs |
|---|---|---|---|---|---|
| line | `number[]` | same | base `parseNumericData` (data.js:10-21) | non-numbers / NaN / Infinity / null dropped silently; x positions re-spaced; `sparkline-hover.detail.index` is the index in the filtered array, not the caller's | `min`, `max`, `reference-value` |
| area | `number[]` | same | base | same; domain always includes 0 (area:325) | `min`, `max`, `reference-value` |
| bar | `number[]` | same | base | same; hover value read back from the `data-value` DOM attribute (bar:107, 202) | `min`, `max`, `baseline` (dead) |
| win-loss | `number[]`, sign only (>0 win, <0 loss, 0 tie) | `1/0/-1` | base | magnitude ignored; invalid dropped | – |
| pie | `number[]` | same | base | negatives clamped to 0 silently (geometry.js:239); hover still reports the raw negative value (pie:127-129) | – |
| half-pie | `number[]` | same | base | same | – |
| progress | `[value]` (data[0], rest ignored) | `[75]` | base | empty → 0; clamped to [min,max]; max ≤ min → 100 (progress:235) | `min`=0, `max`=100 |
| gauge | `[value, min?, max?]` positional (gauge:301-303) | `[65]` only | base | min ≥ max → max=min+1 (gauge:305); value clamped | `min`, `max`, `zones` |
| bullet | `number` (broken) or `[value, target?, ...ranges]` or `{value, target?, ranges?, min?, max?}` | array or `{value,target,ranges}` | raw `JSON.parse`, falls back to `parseFloat` only when parsing fails (bullet:69-78) | `data="null"` → TypeError (bullet:82); `data="42"` → renders 0 and ignores target/min/max/ranges attributes (bullet:229-255); non-finite fields → 0 (geometry.js:485-497) | `target`, `min`, `max`, `ranges` |
| candlestick | `[o,h,l,c, ...extra][]` | "exactly 4 values" | custom filter: length ≥ 4 and first 4 finite (candlestick:69-79) | bad tuples dropped (index shift); extra elements enter the price domain (geometry.js:184); high/low invariants not checked | `min`, `max` |
| ohlc | same | same | copy of the candlestick parser (ohlc:61-71) | same | `min`, `max` |
| combo | `{bar:number, line:number}[]` | `[{type, values}]` series array, **wrong** | custom filter: both finite (combo:79-93) | the whole datum is dropped if either field is missing | none (no min/max) |
| radial-bar | `(number \| {value, color?})[]` | same | custom filter (radial:78-90) | `color` written to `style.stroke` unvalidated; negative → empty ring | `max`, `sweep` (`min` dead) |
| range-bar | `([lo,hi,current?] \| {min,max,current?})[]` | `{min,max,value?}`, **`value` is ignored** | raw `JSON.parse`, **no filtering** (range-bar:68-76) | a null datum → TypeError (range-bar:80); non-finite → 0 (geometry.js:663-673); lo/hi swapped silently | `min`, `max` |
| scatter | `([x,y,r?] \| {x,y,r?} \| number)[]` | `[x,y]` / `{x,y}` | raw `JSON.parse`, **no filtering** (scatter:70-78) | a null datum → TypeError (scatter:82); bad x → index, bad y → **0, a fabricated point** (geometry.js:760-767); `r` used raw in viewBox units (geometry.js:762, 795) | `min-x`, `max-x`, `min-y`, `max-y`, `point-radius` |
| stacked-area | `number[][]`, series-major | same | per-series `filter(Number.isFinite)` (stacked:74-84) | an invalid value is removed, so later values **shift left** (verified: `[10,null,30,40]` → `[10,30,40]`); ragged tails padded with 0 (geometry.js:382, 393) | `normalize` (expands to 0–100) |
| stream | same | same | copy of the stacked parser (stream:73-83) | same | – |

**2D orientation is inconsistent:** stacked and stream are series-major (inner array = one series); candlestick, ohlc, range-bar and scatter are datum-major (inner array = one datum); combo is datum-major objects but documented as series-major.

**Property surface:** `data` is the only property. 8 charts inherit getter+setter: the setter runs JSON.stringify into the attribute, and the getter re-parses on every access, so `el.data !== el.data`. 9 charts (bullet, candlestick, combo, ohlc, radial-bar, range-bar, scatter, stacked-area, stream) override only the getter, so **there is no setter**. `label` and all other options exist only as attributes. Serialization is lossy (verified in Node): Date → ISO string → dropped; NaN/Infinity → null → dropped; a string given as data is double-encoded → `[]`.

## 2. Every observed attribute (41 distinct), grouped by concept

**Scale / domain**
| Attribute | Charts | Parsing / default | Issue |
|---|---|---|---|
| `min` / `max` | line, area, bar, candlestick, ohlc, range-bar (domain override); bullet (overrides data.min/max); gauge (fallback data[1]/data[2] → 0/100); progress (0/100); radial-bar (`max` only) | `parseFloat(attr\|\|'')`, NaN = unset | radial `min` observed but never read; combo, stacked, stream and pie have no domain options; "min" means domain in some charts and scale range in others |
| `min-x` `max-x` `min-y` `max-y` | scatter | parseFloat | a different naming pattern from `min`/`max` |
| `shared-domain` | combo | on by default, only the string "false" turns it off | inverted boolean |
| `normalize` | stacked-area | presence | – |
| (includeZero) | implicit: area, bar and combo true, line false | not configurable | – |

**Geometry**
| Attribute | Charts | Default | Issue |
|---|---|---|---|
| `gap` | bar 0.2, candlestick 0.2, ohlc 0.2, range-bar 0.25, win-loss 0.2 | ratio clamped to 0–0.8 | docs say 0.2 for range-bar |
| `bar-gap` | combo | 0.2 | same concept as `gap`, different name |
| `radius` | bar (`rx` in viewBox units, reactive, default 0); range-bar (CSS px, default 3); win-loss (CSS px, default 2, docs 1) | – | one name, three meanings; range-bar and win-loss read it only on first render |
| `point-radius` | scatter | 3 (docs 2.5) | – |
| `inner-radius` / `donut` | pie, half-pie | ratio 0–0.9 | a ratio, not a radius; `donut` wins via `\|\|`; a bare `donut` attribute renders a solid pie |
| `pad-angle` | pie | – | **dead** |
| `start-angle` | pie | -90 (degrees) | the mask reveal ignores it |
| `sweep` | radial-bar | 270 (degrees) | start angle is fixed |
| `round-caps` | radial-bar | true, "false" turns it off | read only on first render |
| `wick-width` / `tick-width` | candlestick / ohlc | 0.75 | read only on first render; interpolated into the `<style>` text unsanitized |
| `hollow-bullish` | candlestick | true, "false" turns it off | read only on first render |
| `needle-type` | gauge | triangle \| line | read only on first render |

**Interpolation:** `curve` on line/area (linear\|smooth\|step\|step-after\|step-before, default linear); combo (smooth, anything else = linear); stacked (same as combo); stream (default smooth, anything except "linear" = smooth). The React type is `linear|smooth|step` for all of them.

**Color / trend**
| Attribute | Charts | Issue |
|---|---|---|
| `trend-color="auto"` | line, area | writes or removes `--mini-chart-color` in the host's **inline** style |
| `gradient` | area (**on by default**, "false" turns it off); bullet, gauge, progress (**off by default**, presence turns it on); radial-bar (off; per-track arrays) | opposite defaults; JSON or comma list; splitting on commas breaks `rgb(...)` |
| `win-color` `loss-color` `tie-color` | win-loss | **dead** (only the CSS variables work) |
| `mode` | win-loss: "status", anything else = win-loss | docs say "binary", the React type says "uptime" |
| per-datum `color` | radial-bar only (in data) | – |

**Reference lines / thresholds:** `reference-value` (line, area; not included in the domain); `target` and `ranges` (bullet); `zones` [{upTo,color}] (gauge, not clamped to [min,max]); `trend-line` (scatter, a regression line, presence unless "false", which collides with `trend-color`).

**Points / markers:** `points` on line (default last) and area (default none), values last\|all\|min-max\|none; the React type says none\|all\|last\|ends. Combo always draws the last point. The range-bar marker comes from data `current`.

**Labels / a11y / value display:** `label` (all charts; no property; `label=""` gives an empty name); `show-value` (gauge, progress; `Math.round`); `unit` (progress only, plain string concatenation). There is no formatter, locale or aria-valuetext.

**Interaction:** `interactive` on all 17 (`hasAttribute`, so `interactive="false"` still enables it).

**Animation:** nothing is configurable. Durations (0.35–0.8s) and staggers are hard-coded; the only control is a CSS `prefers-reduced-motion` override (svg.js).

**Dead attributes (6):** bar `baseline`, pie `pad-angle`, radial-bar `min`, win-loss `win-color`/`loss-color`/`tie-color`.
**Read only on first render (7):** candlestick `hollow-bullish` and `wick-width`, ohlc `tick-width`, gauge `needle-type`, radial `round-caps`, range-bar `radius`, win-loss `radius`.

### Three boolean conventions in use
| Convention | Attributes |
|---|---|
| presence = true (`hasAttribute`) | interactive, show-value, normalize |
| presence = true except the string "false" | trend-line, gradient (bullet/gauge/progress/radial) |
| default true, only "false" turns it off | hollow-bullish, round-caps, shared-domain, gradient (area) |

## 3. Event inventory
| Chart | Event | detail |
|---|---|---|
| line, area | sparkline-hover (pointermove) | {index, value, x, y} (viewBox coordinates) |
| bar | sparkline-hover (pointerover) | {index, value, isPositive, element} |
| combo | sparkline-hover (pointermove) | {index, barValue, lineValue, x, y} |
| candlestick | sparkline-hover, **sparkline-select** (click) | {index, open, high, low, close, isBullish, change, changePercent(toFixed 2), element} |
| ohlc | sparkline-hover | same without `element` |
| pie, half-pie | sparkline-hover | {index, value, percentage(toFixed 1), color (palette), element} |
| radial-bar | sparkline-hover | {**trackIndex**, value, color, element} |
| stacked, stream | sparkline-hover | {**layerIndex**, seriesData, color (palette), element} |
| win-loss | sparkline-hover | {index, value, outcome, element} |
| range-bar, scatter | sparkline-hover | {index, **data (raw, unvalidated)**, element} |
| bullet | sparkline-hover | {**data (raw, unmerged)**, element}, no index |
| gauge | sparkline-hover (pointermove), **zone-change** | {value(clamped), zoneIndex, zoneColor} |
| progress | sparkline-hover (pointermove), **progress-complete** (fires on every render while at max) | {value(clamped), progress} / {value, max} |
| all | sparkline-leave | no detail |
| wrappers | listen for **slice-select** | dispatched by no chart; React does not expose progress-complete or sparkline-select |

## 4. Docs vs code drift relevant to the contract
- combo: docs `[{type:'bar'\|'line'\|'area', values}]` vs code `{bar,line}[]`; 'area' type does not exist.
- range-bar: docs `{min,max,value?}` vs code `current`; docs part `range-marker` vs code `marker`.
- gauge: positional `[value,min,max]` undocumented; docs part `zone` vs code `track`.
- candlestick/ohlc: parts `bullish`/`bearish`/`tick`/`open`/`close` do not exist.
- pie/half-pie: part `slice` vs code `segment segment-N`; docs say 6 colors, palette has 16.
- scatter: `--mini-chart-trendline-color` vs code `--mini-chart-trend-color`; parts `circle`/`trendline` vs `point`/`trend-line`.
- line/area/bar/range-bar/scatter/bullet docs: `--mini-chart-color-1`, but code reads `--mini-chart-color` or chart-specific variables. Bar docs still contain the leftover sentence "Wait, typically negative is red" (docs/components/mini-bar-chart.md:19).
- line docs: part `mask-line` does not exist; curve, points, min, max, reference-value, trend-color and interactive are undocumented.