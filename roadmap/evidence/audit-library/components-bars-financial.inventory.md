## Per-component inventory (bar family + financial)

Common to all six: they extend `MiniChartElement` (src/core/mini-chart-element.js) but **override `render()`**. The base full-`replaceChildren` render and `renderChart()` are never used, except that bar overrides `renderChart` with an extra third parameter. Shared base styles come from `chartStyles` (src/core/svg.js:5-63). Every component exposes `part="svg"` (svg.js:92). Events bubble and are composed. "Interactive" means the `interactive` attribute is checked at dispatch time, plus `:host([interactive])` CSS. All listeners are `pointerover` on the marks container plus `pointerleave` on the svg. **None** has keyboard, focus or tabindex support.

### `<mini-bar-chart>` — `MiniBarChart` — src/components/mini-bar-chart.js — 251 LOC
| Aspect | Detail |
|---|---|
| Data | Base `parseNumericData` (data.js:10-21): keeps only finite numbers and silently drops others, so indices shift |
| Attributes | `data`; `label` (default: "Bar chart with N values"); `gap` (0.2, clamped 0..0.8, L148-149); `radius` (0, sets the `rx`/`ry` attributes, L150-151/193-199); `min`/`max` (auto, includeZero, not clamped, L153-156); `interactive`; **`baseline` observed (L18) but never read** |
| CSS vars | `--mini-chart-positive-color` → `--mini-chart-color` → `#10b981` (L82); `--mini-chart-negative-color` → `#ef4444` (L85); `--mini-chart-bar-opacity-inactive` 0.45 (L95). `--mini-chart-fill` from chartStyles is shadowed by the positive/negative rules |
| Parts | `bars` (g), `bar positive` / `bar negative` (rect) |
| Events | `sparkline-hover` {index, value (parseFloat of data-value), isPositive, element}; `sparkline-leave` (no detail) |
| Animation | First render only, keyed on whether the svg exists (L55): inline `transition: all .4s ease-out ${i*0.03}s`, a forced reflow via `getBoundingClientRect` (L206), and a setTimeout cleanup after 400+30n+50 ms. Later updates use the CSS transition on x/y/width/height (.35s) |
| Render | Persistent svg. The `<style>` text is rebuilt on every render (L73). Rects are diffed: created or removed |

### `<mini-win-loss-chart>` — `MiniWinLossChart` — mini-win-loss-chart.js — 270 LOC
| Aspect | Detail |
|---|---|
| Data | Base `parseNumericData`. >0 = win, <0 = loss, 0 = tie |
| Attributes | `gap` (0.2, clamped in geometry.js:599); `radius` (default 2, **read once** in #createDOM L86, interpolated into CSS); `mode` ("status", anything else means "win-loss", L183-185); **`win-color`/`loss-color`/`tie-color` observed (L24-26) but never read**; `interactive`; `label` |
| CSS vars | `--mini-chart-baseline-color` rgba(128,128,128,.25); `--mini-chart-bar-radius` (beats the attribute); `--mini-chart-win-color` → `--mini-chart-bullish-color` → #10b981; `--mini-chart-loss-color` → `--mini-chart-bearish-color` → #ef4444; `--mini-chart-tie-color` → `--mini-chart-muted-color` → #94a3b8. Inactive opacity hard-coded at 0.45 |
| Parts | `baseline` (line), `bars` (g), `bar win` / `bar loss` / `bar tie` |
| Events | hover {index, value, outcome: "win"/"loss"/"tie", element}; leave |
| Animation | First non-empty render (cache empty): inline y/height .35s, stagger 0.025s·i, forced reflow (L230), timer 350+25n+50 |
| Render | #createDOM once (style frozen), then #updateChart with a node cache. Surplus nodes get `display:none` and are never removed |

### `<mini-range-bar-chart>` — `MiniRangeBarChart` — mini-range-bar-chart.js — 301 LOC
| Aspect | Detail |
|---|---|
| Data | **Custom getter (L68-76): the raw JSON array, no validation.** Normalized later in geometry `createRangeBarLayout` (geometry.js:661-682): `[a,b,cur?]` or `{min,max,current}`. min/max are swapped if reversed. Anything else, including strings, becomes `{0,0}`. `null` crashes the label (L80) |
| Attributes | `gap` (0.25; docs say 0.2); `radius` (default 3, **read once** L98); `min`/`max` (not clamped); `interactive`; `label` |
| CSS vars | `--mini-chart-range-color` → `--mini-chart-color` → #3b82f6; `--mini-chart-bar-radius`; `--mini-chart-marker-color` #ffffff; `--mini-chart-marker-stroke` → `--mini-chart-color` → #3b82f6. Marker r=2.5 hard-coded (L211) |
| Parts | `bars`, `range-group` (g), `range-bar` (rect), `marker` (circle; the docs say `range-marker`) |
| Events | hover {index, data: the **raw un-normalized item**, element}; leave |
| Animation | Bars grow from their midline: y/height .4s, stagger .03s. Marker opacity fades in with an extra +.2s delay. Forced reflow and a timer |
| Render | createDOM once plus a cache. Surplus groups are hidden |

### `<mini-bullet-chart>` — `MiniBulletChart` — mini-bullet-chart.js — 332 LOC
| Aspect | Detail |
|---|---|
| Data | **Custom getter (L69-78): `JSON.parse` of anything; `parseFloat` only if JSON parsing fails.** Arrays are `[value, target, ...ranges]`; objects are `{value,target,ranges,min,max}`. Attributes are merged in (L222-255) and geometry normalizes the result (geometry.js:484-498). A JSON scalar such as "75" renders 0; "null" crashes |
| Attributes | `target`, `min` (auto `min(0,…)`), `max` (auto `max(100,…)`), `ranges` (JSON), `gradient` (absent/"false" = off; ""/"true" = default 3 stops; a JSON array or a comma list = custom stops), `interactive`, `label` |
| CSS vars | `--mini-chart-range-color` rgba(128,128,128,.15) (bands 4+ only); `--mini-chart-range-1/2/3` → `color-mix(var(--primary,#3b82f6) 12/24/36%, gray)`; `--mini-chart-measure-color` → `--mini-chart-color` → #3b82f6; `--mini-chart-target-color` → `--mini-chart-danger-color` → #ef4444; `--mini-chart-target-width` 2.5px; **`--primary` (not namespaced)**. Measure rx is hard-coded at 2px |
| Parts | `ranges` (g), `range range-N` (N is 1-based), `measure`, `target` |
| Events | hover {data: the raw parsed data *before* attribute merge, element}. Only the measure triggers it, because the target has `pointer-events:none`. leave |
| Animation | First render: width 0→value via a double rAF, .6s. Updates: inline .4s transitions. `role="meter"` plus aria-valuenow/min/max |
| Render | createDOM once. Range rects and gradient stops are rebuilt with `innerHTML=""` on every update; the measure and target update incrementally. The gradient id uses `Math.random` (L139) |

### `<mini-candlestick-chart>` — `MiniCandlestickChart` — mini-candlestick-chart.js — 347 LOC
| Aspect | Detail |
|---|---|
| Data | **Custom getter (L69-79):** keeps rows that are arrays with length ≥4 and 4 finite leading numbers. Objects are dropped. Extra columns are kept and pollute the domain (geometry.js:184) |
| Attributes | `hollow-bullish` (**hollow unless the value is literally "false"; read once**, L102); `wick-width` (0.75 viewBox units, read once, L103); `gap` (0.2, clamped 0..0.8); `min`/`max`; `interactive`; `label` |
| CSS vars | `--mini-chart-wick-width`; `--mini-chart-bullish-color` #10b981; `--mini-chart-bearish-color` #ef4444 |
| Parts | `candles` (g), `candle` (g), `wick` (line), `body` (rect). Direction is exposed only as the `data-bullish` attribute, **not as a part** |
| Events | hover {index, open, high, low, close, isBullish, change, changePercent (2dp), element}; **`sparkline-select` on click** (same detail); leave |
| Animation | Grows from the open price: `all .4s` with stagger .03s, forced reflow and a timer |
| Render | createDOM once plus a cache. Surplus groups are hidden |

### `<mini-ohlc-chart>` — `MiniOhlcChart` — mini-ohlc-chart.js — 282 LOC
| Aspect | Detail |
|---|---|
| Data | Same getter as candlestick, copy-pasted (L61-71). Uses `createCandlestickLayout` |
| Attributes | `tick-width` (0.75, read once, L94); `gap` (0.2, clamped); `min`/`max`; `interactive`; `label` |
| CSS vars | `--mini-chart-tick-width`; `--mini-chart-bullish-color`; `--mini-chart-bearish-color` |
| Parts | `ticks` (g), `bar` (one `<path>` per OHLC row, made of three subpaths). Direction via `data-bullish` only |
| Events | hover {index, open, high, low, close, isBullish, change, changePercent}, **no element**; leave. No select event |
| Animation | CSS transition on `d` (.4s, stagger .03s). Not supported in Safari |
| Render | createDOM once plus a cache. Surplus paths are hidden |

## Cross-component inconsistency matrix
| Concept | bar | win-loss | range-bar | bullet | candlestick | ohlc |
|---|---|---|---|---|---|---|
| Positive color var | `--mini-chart-positive-color` | `--mini-chart-win-color`→bullish | – | – | `--mini-chart-bullish-color` | `--mini-chart-bullish-color` |
| Default accent | #10b981 (green!) | #10b981 | #3b82f6 | #3b82f6 | #10b981 | #10b981 |
| Radius | attr → `rx` attribute, default 0, live | attr → CSS var fallback, default 2, frozen | attr → CSS var fallback, default 3, frozen | hard-coded 2px | – | – |
| gap default / where clamped | 0.2 / component | 0.2 / geometry | 0.25 / geometry | – | 0.2 / component | 0.2 / component |
| Layout padding | 2 | 3 | 4 | 3 | 2 | 2 |
| Data parser | base | base | raw `JSON.parse` | raw `JSON.parse` + parseFloat | custom filter | copy of the candlestick filter |
| `data` setter works | yes | yes | **throws** | **throws** | **throws** | **throws** |
| Entrance animation trigger | first render ever | first non-empty | first non-empty | first render | first non-empty | first non-empty |
| Surplus nodes | removed | hidden | hidden | rebuilt | hidden | hidden |
| Inactive opacity | var, 0.45 | 0.45 hard-coded | 0.45 | – | 0.45 | 0.45 |
| Hover detail | index, value, isPositive, element | index, value, outcome, element | index, data (raw), element | data (raw), element | index, OHLC, change, element | index, OHLC, change |

Library-wide token clashes: `--mini-chart-range-color` (bullet background band vs range-bar bar fill); `--mini-chart-danger-color` (gauge danger zone, mini-gauge-chart.js:24, vs bullet target fallback); `--primary` (bullet L108-110, scatter L104). `--mini-chart-color-1..8` and safe/warn colors are advertised in README.md:35,151,155, docs/architecture.md:34, demo/app.js:706 and the bar/range/bullet docs, but there are **zero consumers in src/**.

## Verified via inline probes (no files written)
- `el.data = [1,2]` on bullet, range-bar, candlestick and OHLC throws `Cannot set property data ... which has only a getter`.
- `bar.data = "[1,2,3]"` sets the attribute to `"\"[1,2,3]\""`, which parses to `[]`.
- range-bar `data="[[1,2],null]"` throws; bullet `data="null"` throws; bullet `data="75"` gives aria-valuenow 0; `data="75%"` gives 75.
- Listener count after disconnect+reconnect drops to 0 in all six components.
- Win-loss `radius` changed from 2 to 8: the CSS stays at 2px. Candlestick `hollow-bullish="false"` after the first render: the fill stays transparent.
- OHLCV rows `[o,h,l,c,vol]`: body height 0.5 and wick length about 0, i.e. a flat chart.
- Range object `{min,max,value}`: marker is undefined.
- Bar `min=50` with data [10,20]: y = -6.67 (inverted, above the viewBox).
- Bullet value 0.85: measure width 0.8 of 94 units (the domain is forced to include 100).
- `createDomain` with 200k values: RangeError.
- `node --test test/components.test.js`: 11 pass, 1 fail (the `dist/` import).