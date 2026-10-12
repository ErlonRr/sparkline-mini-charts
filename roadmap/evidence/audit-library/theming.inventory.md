## 1. `--mini-chart-*` token inventory (src / docs / README / demo)

Abbreviations: component files `src/components/mini-<name>-chart.js` → `<name>`; `svg` = src/core/svg.js; `el` = src/core/mini-chart-element.js; `idx` = demo/index.html; `app` = demo/app.js; `docs/x.md` = docs/components/mini-x-chart.md.

### 1a. Global / base
| Token | Default / fallback chain (as coded) | Consumed by (file:line) | Documented | Demo usage |
|---|---|---|---|---|
| `--mini-chart-color` | `#2563eb` (svg:7, combo:124,130, gauge:132,137); `#3b82f6` (bullet:112, progress:105, range-bar:104,112, scatter:110); `#10b981` (bar:82 via positive) | svg:7 (host `color` → currentColor for line/area/points/candles), bar:82, bullet:112, combo:124,130, gauge:132,137, progress:105, range-bar:104,112, scatter:110; **written inline on host** by line:285-291, area:337-343 | README:136,150 (states default `#0ea5e9`, which is wrong) | idx:73,122,2331,2647,2745,2807; app:1039,1055 |
| `--mini-chart-color-N` (docs say 1..8; code accepts any N) | `getSegmentColor(N-1)`: 16-color palette, palette.js:3-20, cycles at 16 | pie:213, half-pie:208, stacked-area:256, stream:253, radial-bar:297,358 (not used when gradient is on) | README:35,151; architecture.md:34; correct in pie/half-pie/radial/stacked/stream docs; **wrongly** in line.md:18,32, area.md:18,31, bar.md:18-19, bullet.md:25, combo.md:37-52, range-bar.md:30,44, scatter.md:32,46, getting-started.md:162 | idx:94-101,143-150,2657-2664,2816; app:706,1048,1066,1138,1169 |
| `--mini-chart-stroke-width` | `2` (svg:28 line, combo:125); **`14`** (gauge:129 arc); **`12`** (progress:100,106) | line, area, combo, gauge, progress | README:137,152 ("lines, wicks, and arcs"); getting-started:163; line.md:19; area.md:19; progress.md:20 (says 10) | idx:2391,2693,2850; app:1044,1057 (writes `px`) |
| `--mini-chart-aspect-ratio` | → `--mini-chart-default-aspect-ratio` → `10 / 3` | svg:9 | undocumented | idx:2650 |
| `--mini-chart-default-aspect-ratio` (internal) | 100/30; 2/1 (gauge, progress); 100/100 (pie, radial); 100/50 (half-pie) | el:89 + 13 component `:host` rules | internal (still overridable) | – |
| `--mini-chart-fill` | → `--mini-chart-segment-color` → currentColor | svg:34 (overridden by local rules in bar:81-86, pie:98-99, half-pie:96-97, combo:118-119, win-loss:102-104, ohlc:98-101); area:382 only when `gradient="false"` | README:142 (example on pie, which has **no effect**) | – |
| `--mini-chart-segment-color` | currentColor | svg:34, pie:99, half-pie:97; **always overwritten inline** per segment pie:213, half-pie:208 | undocumented | – |
| `--mini-chart-point-fill` | currentColor | svg:38 (line/area points), line:118, area:124 (active point); overridden in combo:130, scatter:110 | undocumented | idx:2347,2648,2822 (claims Scatter, which is wrong); app:1040,1056 |
| `--mini-chart-ref-color` / `-ref-width` | `rgba(128,128,128,.45)` / `1` | svg:43-44 (line, area) | undocumented | idx:80,129 |
| `--mini-chart-crosshair-color` / `-crosshair-width` | `rgba(128,128,128,.5)` / `1` | svg:49-50 (line, area, combo) | undocumented | idx:81,130 |

### 1b. Semantic / status
| Token | Default / chain | Consumed by | Documented | Demo |
|---|---|---|---|---|
| `--mini-chart-bullish-color` | `#10b981` | line:287, area:339, candlestick:110, ohlc:105, win-loss:102 (fallback of win), gauge:22 (fallback of safe) | README:153; candlestick.md:23,39; ohlc.md:23; win-loss.md:26 | idx:74,123,2359,2669,2746,2828; app:1041,1061 |
| `--mini-chart-bearish-color` | `#ef4444` | line:288, area:340, candlestick:111, ohlc:106, win-loss:103, gauge:24 | README:154; candlestick.md:24; ohlc.md:24; win-loss.md:27 | idx:75,124,2375,2670,2747,2836; app:1042,1062 |
| `--mini-chart-positive-color` | → `--mini-chart-color` → `#10b981` | bar:82 | undocumented | – |
| `--mini-chart-negative-color` | `#ef4444` | bar:85 | undocumented (bar.md:19 says `--mini-chart-color-2`) | – |
| `--mini-chart-win-color` / `-loss-color` | → bullish / bearish | win-loss:102 / 103 | win-loss.md:26-27 | idx:76-77,125-126 |
| `--mini-chart-tie-color` | → `--mini-chart-muted-color` → `#94a3b8` | win-loss:104 | win-loss.md:28 | idx:78,127,2671 |
| `--mini-chart-muted-color` | `#94a3b8` | win-loss:104 | undocumented | – |
| `--mini-chart-safe-color` | → bullish → `#10b981` | gauge:22 (default zones only; gradient mode ignores it, gauge:248) | README:35,155; architecture:34; gauge.md:36; bullet.md:26 (wrong: bullet ignores it) | idx:86,135 |
| `--mini-chart-warn-color` | → `--mini-chart-warning-color` → `#f59e0b` | gauge:23 | README:155; gauge.md:37; bullet.md:27 (wrong) | idx:87,136 |
| `--mini-chart-warning-color` | `#f59e0b` (alias) | gauge:23 | undocumented | – |
| `--mini-chart-danger-color` | → bearish → `#ef4444` (gauge:24); `#ef4444` (bullet:122, target fallback) | gauge, bullet | README:155; gauge.md:38; bullet.md:28 (calls it a band; it is the target) | idx:88,137 |

### 1c. Component-specific
| Token | Default / chain | Consumed by | Documented | Demo |
|---|---|---|---|---|
| `--mini-chart-track-color` | `rgba(128,128,128,.18)` progress:99; `.15` radial-bar:119 | progress, radial-bar (**not** gauge) | README:156 (default `rgba(0,0,0,.08)`, wrong); architecture:34; progress.md:21 (`.2`, wrong) | idx:79,128,2678,2844 (claims Gauge) |
| `--mini-chart-track-bg` | → track-color | radial-bar:119 | undocumented | – |
| `--mini-chart-value-color` | → color → `#3b82f6` | progress:105 | undocumented | – |
| `--mini-chart-text-color` | currentColor | gauge:140, progress:114 | undocumented | – |
| `--mini-chart-needle-color` | → color → `#2563eb` | gauge:132,137 | undocumented | idx:82,131 |
| `--mini-chart-measure-color` | → color → `#3b82f6` | bullet:112 | undocumented (bullet.md:25 says color-1) | idx:2679 |
| `--mini-chart-target-color` / `-target-width` | → danger → `#ef4444` / `2.5px` | bullet:122-123 | undocumented | idx:2680-2681; app:1043,1063 |
| `--mini-chart-range-color` | **bullet:104** `rgba(128,128,128,.15)` (band) vs **range-bar:104** → color → `#3b82f6` (bar fill) | bullet, range-bar (**collision**) | undocumented | idx:84,133 |
| `--mini-chart-range-1/2/3` | `color-mix(in srgb, var(--primary,#3b82f6) 12/24/36%, rgba(128,128,128,.10/.16/.22))` | bullet:108-110 | undocumented | idx:90-92,139-141,2682-2684 |
| `--mini-chart-bar-color` / `-bar-color-hover` | `rgba(128,128,128,.3)` / `.6` | combo:119 / 139 | undocumented | idx:89,138 |
| `--mini-chart-bar-opacity-inactive` | `.45` | bar:95 only | undocumented | – |
| `--mini-chart-bar-radius` | radius attr or `3px` (range-bar:105-106); `2px` (win-loss:97-98); **not** bar chart | range-bar, win-loss | undocumented | idx:2694 (claims bars) |
| `--mini-chart-baseline-color` | `rgba(128,128,128,.25)` | win-loss:92 | undocumented | – |
| `--mini-chart-gap-color` / `-gap-width` | `transparent` / `.5px` | pie:101-102, half-pie:99-100 | undocumented | – |
| `--mini-chart-wick-width` | `wick-width` attr or `.75` | candlestick:108-109 | undocumented | idx:2672 |
| `--mini-chart-tick-width` | `tick-width` attr or `.75` | ohlc:99 | undocumented | idx:2673 |
| `--mini-chart-marker-color` / `-marker-stroke` | `#ffffff` / → color → `#3b82f6` | range-bar:111-112 | range-bar.md:31 (marker-color only) | idx:85,134 |
| `--mini-chart-point-color` | → color → `#3b82f6` | scatter:110 | undocumented (scatter.md:32 says color-1) | idx:83,132 |
| `--mini-chart-point-stroke` | → `var(--surface, #ffffff)` | scatter:111 | undocumented | idx:2649 (claims active dots) |
| `--mini-chart-trend-color` / `-trend-width` | `color-mix(in srgb, var(--primary,#3b82f6) 40%, transparent)` / `1.5px` | scatter:104-105 | documented under wrong name `--mini-chart-trendline-color` (scatter.md:33) | – |

### 1d. Phantom / leaking names
| Name | Status | Where it appears |
|---|---|---|
| `--mini-chart-inactive-opacity` | **not consumed** | idx:2411 (slider), 2689, 2856; app:1045,1058 |
| `--mini-chart-hover-brightness` | **not consumed** | idx:2690 |
| `--mini-chart-transition-duration` | **not consumed** | idx:2691, 2785, 2864 |
| `--mini-chart-hover-duration` | **not consumed** | idx:2692, 2786 |
| `--mini-chart-trendline-color` | **not consumed** (real name: trend-color) | docs/scatter.md:33 |
| `--primary`, `--surface` (un-namespaced) | read by library fallbacks | bullet:108-110, scatter:104 (`--primary`); scatter:111 (`--surface`). The demo defines both (idx:63,68) |

Totals: about 51 consumed names (including the `color-N` family and the internal aspect token), 14 correctly documented, about 37 undocumented, 5 phantom.

## 2. Hard-coded colors that bypass tokens (no token at all)
- `stroke: white` active-point halo: line:118, area:124
- `fill: #ffffff` default range-bar marker: range-bar:111; scatter point stroke falls back to `#ffffff`: scatter:111
- Gradient defaults: bullet:197 `['#3b82f6','#8b5cf6','#ec4899']`; gauge:248 6-stop green→red (ignores safe/warn/danger); progress:209 `['#3b82f6','#06b6d4','#10b981']`; radial-bar:196 `[palette[i], palette[i+3]]` (ignores `--mini-chart-color-N`)
- Area default gradient stop-opacity `.45→.02` (area:144-149, 414-419) vs custom `.55→.05` (area:406); flat mode `opacity .2` (area:383)
- Candlestick hollow body `fill: transparent` (candlestick:110)
- Mask `stroke: white` (pie:77, half-pie:75): functional luminance mask, acceptable
- Inactive opacity `0.45` hard-coded: candlestick:114, ohlc:109, half-pie:113, pie:115, radial-bar:137, range-bar:124, scatter:125, stacked-area:120, stream:119, win-loss:113 (bar:95 is the only tokenized one)
- Hover brightness: 1.15 (bar:91, gauge:151), 1.18 (half-pie:109, pie:111, progress:125, radial:133, stacked:116, stream:115), 1.2 (bullet:132, candlestick:113, combo:140, ohlc:108, range-bar:120, win-loss:109), 1.25 (scatter:121)
- Font sizes: gauge:142 `11px/600`, progress:116 `12px/700`

## 3. How per-index series colors are applied
| Component | Mechanism | User override via `--mini-chart-color-N` | Per-index `::part` | Event `color` detail |
|---|---|---|---|---|
| pie / half-pie | inline `style.setProperty('--mini-chart-segment-color', 'var(--mini-chart-color-N, hex)')` (pie:213, half-pie:208) + CSS `fill: var(--mini-chart-segment-color)` | yes | `segment-N` | palette hex (pie:130, half-pie:128), ignores tokens |
| stacked-area / stream | inline `style.fill = var(--mini-chart-color-N, hex)` (stacked:256, stream:253) | yes | `layer-N` | palette hex (stacked:156, stream:155) |
| radial-bar | inline `style.stroke = item.color \|\| var(--mini-chart-color-N, hex)` (297,358); gradient mode uses raw hex (298,359) | yes, except gradient mode | none (`track`, `track-fg`) | `item.color \|\| palette hex` (158) |
| gauge zones | `stroke` **presentation attribute** containing `var(...)` strings (gauge:22-24, 368-372) | safe/warn/danger only | none (all `track`) | `zoneColor` = raw `var(...)` string |
| combo | `--mini-chart-bar-color` + `--mini-chart-color`; no series index | no (docs claim yes) | none | – |
| bullet ranges | CSS `range-1..3` | via `--mini-chart-range-N` | `range-N` (docs say `range-0..n`) | – |
Palette fallback cycles modulo 16 (palette.js:28-30); user tokens do not cycle, so `--mini-chart-color-9..16` fall back to the built-in palette.

## 4. `::part` inventory (actual code) vs docs
| Component | Parts in code | Parts claimed in docs that don't exist |
|---|---|---|
| all | `svg` (svg:92) | – |
| line | group, line, points, point + point-last/min/max/**point-point**, reference-line, crosshair, active-point | `mask-line` (line.md:24) |
| area | same as line + area | – |
| bar | bars, bar + positive/negative | – |
| combo | bars, bar, line-group, line, points, point, crosshair | `layer` (combo.md:43) |
| pie / half-pie | group, segment, segment-N | `slice` + `:nth-child` advice (pie.md:25, half-pie.md:24); `::part()` cannot take structural pseudo-classes |
| stacked / stream | layers, layer, layer-N | `:nth-child` advice (stacked.md:28) |
| radial-bar | tracks, track (a `<g>`), track-bg, track-fg | docs say `track` is the foreground arc (radial.md:35) |
| progress | track, value, text | – |
| gauge | zones, track (zone arcs), needle, pivot, text | `zone` (gauge.md:42) |
| bullet | ranges, range + range-N (1-based), measure, target | `range-0` (bullet.md:32) |
| candlestick | candles, candle, wick, body (state only via `data-bullish`) | `bullish`, `bearish` (candlestick.md:30-31) |
| ohlc | ticks, bar (stroked path) | `tick`, `wick`, `open`, `close`, `bullish`, `bearish` (ohlc.md:27-32) |
| win-loss | baseline, bars, bar + win/loss/tie | – |
| range-bar | bars, range-group, range-bar, marker | `range-marker` (range-bar.md:36) |
| scatter | trend-line, points, point | `circle`, `trendline` (scatter.md:36-37) |

## 5. Gradient implementation matrix (v1.3.1/1.4.0)
| Chart | Element / id | Direction | Applied via | Default when `gradient`/`"true"` | `"false"` behavior | Parser |
|---|---|---|---|---|---|---|
| area | per-instance `<linearGradient id="area-grad-<random>">` (area:128-151) | vertical | `fill` presentation attr `url(#id)` (area:424) | currentColor `.45→.02` (follows theme) | presentation attr `fill="var(--mini-chart-fill, currentColor)"` + inline opacity .2 (area:382-383) | area:385-395 |
| bullet | `bullet-grad-<random>` (bullet:139) | horizontal | inline `style.fill` (bullet:288) | hard-coded hex (bullet:197) | `:host([gradient]) [part=measure]{fill:unset}` → **black bar** (bullet:118-120) | bullet:193-208 |
| gauge | `gauge-grad-<random>` (gauge:158) | horizontal | `stroke` presentation attr (gauge:351-355) | hard-coded 6 hex (gauge:248) | discrete zones | gauge:243-259 |
| progress | `prog-grad-<random>` (progress:132) | horizontal | inline `style.stroke` (progress:272) | hard-coded hex (progress:209) | `:host([gradient]) [part=value]{stroke:unset}` → **invisible arc** (progress:110-112) | progress:205-220 |
| radial-bar | one per track `radial-grad-<i>-<random>` (radial:255) | diagonal | inline `style.stroke` (radial:306,367) | `[palette[i], palette[i+3]]` hex (radial:196) | flat color | radial:191-211 (also 2-D arrays) |
All parsers: `'`→`"` replace, then comma-split fallback that breaks `rgb()/hsl()/oklch()/var()` values that contain commas. Gradients cannot be set from CSS; the demo sets the attribute element by element (app:1230-1234).

## 6. Media-feature / mode support
| Feature | Status |
|---|---|
| `prefers-color-scheme`, `color-scheme`, `light-dark()` | none in src (grep) |
| `forced-colors` / `prefers-contrast` | none |
| `prefers-reduced-motion` | svg:55-62 blanket `*{… stroke-dashoffset:0 !important}`; transition-delay not neutralized |
| `@property` / `CSS.registerProperty` | none |
| Shipped CSS (presets/themes) in package `exports` | none (package.json exports JS only) |
| Theme JS API / types for tokens | none; only `SEGMENT_COLORS` frozen array exported (src/index.js:22) |

## 7. Default palette accessibility (computed)
Contrast against #fff: #84cc16 1.98, #eab308 1.92, #f59e0b 2.15, #06b6d4 2.43, #14b8a6 2.49, #10b981 2.54, #0ea5e9 2.77, #f97316 2.80. That is 8 of 16 below the 3:1 non-text minimum. Against #0f172a all are at least 3.75:1; primary #2563eb is 3.45:1 on dark. Near-duplicate pairs (CIELAB ΔE normal → deuteranopia): violet #8b5cf6 / indigo #6366f1 14.5 → 3.4; amber #f59e0b / gold #eab308 16.4 → 3.1; rose #f43f5e / red #ef4444 14.7 → 12.8. Series 1–2 are lime vs rose (126 → 36 under deuteranopia). Bullish/bearish #10b981/#ef4444: 119.5 → 31.9 (deutan) / 24.1 (protan).

## 8. Demo workarounds (what the library lacks)
- Full token set redefined twice for dark (idx:73-101) and light (idx:122-150), switched with `html.light` (app:323-333): no shipped dark/light defaults.
- Theme presets are demo-side JS objects (app:970-1021) pushed with `board.style.setProperty` (app:1039-1049). The palette is applied in 3 separate places (app:1048, 1137-1139, 1167-1171): no theme object, no presets, no apply API.
- Stroke slider writes `${stroke}px` to `--mini-chart-stroke-width` (app:1044), which would shrink gauge and progress arcs.
- Opacity slider drives `--mini-chart-inactive-opacity` (idx:2411, app:1045), which no component reads.
- Bearish picker does not reach bar-chart negatives (`--mini-chart-negative-color`) or the bullet target, so the demo must set 7 tokens to approximate one theme.
- Gradients Studio sets 5 differently formatted `gradient` strings element by element (app:1177-1234).
- "Zero-config currentColor" card (idx:2715-2729) and "transition-duration" card (idx:2783-2787) describe behavior that does not exist.
- The demo's `--primary` and `--surface` (idx:63,68) leak into scatter and bullet fallbacks, so charts look themed by accident.
- Theming board line chart uses a non-existent attribute `endpoint="last"` (idx:2447).