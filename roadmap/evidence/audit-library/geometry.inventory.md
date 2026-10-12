## Exported symbols of src/core/geometry.js

All 19 symbols are re-exported from `src/index.js:23-44` (root entry ".") **and** published as the whole file under `"./math"` (`vite.config.js:33`, package.json `exports["./math"]`). So all of them are public API, frozen under semver. Private: `EPSILON` (l.5), `formatNumber` (l.354).

| # | Export (line) | Signature | Output | Component consumers | Internal callers | Unit-tested? |
|---|---|---|---|---|---|---|
| 0 | `TAU` (3) | const = 2π | number | none | createRadialLayout default, full-circle checks | n/a |
| 1 | `createLinearScale` (14) | `(domain:[n,n], range:[n,n])` | frozen `{project(v)}` (no invert/clamp/ticks) | none directly | cartesian, candlestick, stacked, range-bar, scatter | yes, basic (test:38) |
| 2 | `createDomain` (31) | `(values:number[], {includeZero,min,max})` | `[min,max]`; equal values padded by ±10% or ±1; **no min<max check** | mini-combo-chart.js:273 | cartesian, candlestick | yes (test:31) |
| 3 | `createCartesianLayout` (55) | `(values, {width=100,height=30,padding=2,includeZero,min,max})` | `{domain, points:{x,y}[], baseline}`; x = index | line:271, area:322, combo:275/278 | createBarLayout | single-point only (test:46) |
| 4 | `createSmoothPath` (80) | `(points:{x,y}[])` | `d` string (uniform Catmull-Rom → cubic Bézier) | line:236, area:266, combo:349, stacked-area:194-195, stream:193-194 | createSmoothAreaPath | prefix only (test:80) |
| 5 | `createSmoothAreaPath` (111) | `(points, baseline)` | closed `d` | area:284 | none | closure only (test:87) |
| 6 | `createStepPath` (126) | `(points, "step-after"\|"step-before"\|"step-middle")` | `d` | line:238, area:268/286 | none | step-after only (test:94) |
| 7 | `createBarLayout` (153) | `(values, {width,height,padding=2,gapRatio=0.2,min,max})` | `{bars:{x,y,width,height}[], baseline}`; band slots | bar:158, combo:274/277 | none | yes (test:53) |
| 8 | `createCandlestickLayout` (180) | `(values:number[][], {width,height,padding=2,gapRatio=0.2,min,max})` | `{candles:{x,open,high,low,close (pixel y!),isBullish,bodyY,bodyHeight,bodyWidth}[]}` | candlestick:238, ohlc:198 | none | **no** |
| 9 | `polarToCartesian` (224) | `(cx,cy,r,angle)` positional | `{x,y}` | none | describePieSector, describeArc | **no** |
| 10 | `createRadialLayout` (238) | `(values, {startAngle=-π/2, sweep=TAU})` | `{total, slices:{value,startAngle,endAngle}[]}` | pie:182, half-pie:177 | none | yes (test:62) |
| 11 | `describePieSector` (265) | `(cx,cy,r,start,end,inner=0)` positional | `d` (sweep flag always 1) | pie:196, half-pie:191 | none | partial (test:70) |
| 12 | `describeArc` (331) | `(cx,cy,r,start,end)` positional | `d` (sweep flag always 1; full circle starts at 12 o'clock) | gauge:349/366, radial-bar:286/343 | none | **no** |
| 13 | `createStackedLayout` (366) | `(series:number[][], {width,height,padding=2,offset:"none"\|"silhouette"\|"expand"})` | `{layers:{points:{x,y0,y1}[]}[]}` | stacked-area:237, stream:234 | none | lengths only (test:100) |
| 14 | `createRadialBarLayout` (430) | `(values, {width,height (unused), maxRadius=40, innerRadius=10, maxDomain, startAngle=0, endAngle=1.5π})` | `{tracks:{value,radius,startAngle,endAngle(=value angle)}[]}` | radial-bar:242 | none | **no** |
| 15 | `createBulletLayout` (471) | `(data: number[] \| {value,target,ranges,min,max}, {width,height,padding=3})` | `{value,target,min,max,ranges[],measure,targetMarker}` | bullet:257 | none | object path only (test:107) |
| 16 | `createWinLossLayout` (584) | `(values, {width,height,padding=3,gapRatio=0.2,mode})` | `{items:{value,type,x,y,width,height}[], baselineY, mode}` | win-loss:193 | none | yes (test:116) |
| 17 | `createRangeBarLayout` (654) | `(items: number[][] \| {min,max,current}[], {width,height,padding=4,gapRatio=0.25,min,max})` | `{bars:{min,max,current,x,y,width,height,marker}[]}` | range-bar:197 | none | arrays only (test:129) |
| 18 | `createScatterLayout` (749) | `(data: tuples\|objects\|numbers, {width,height,padding=4,pointRadius=3,minX,maxX,minY,maxY})` | `{points:{x,y,r,rawX,rawY}[], trendLine, domainX, domainY}` | scatter:202 | none | trend exists only (test:138) |

`mini-progress-chart.js` imports nothing from geometry. It hard-codes the arc `"M 10 50 A 40 40 0 0 1 90 50"` at lines 144 and 149.

## Option/default inconsistencies at a glance

| Concern | Values seen |
|---|---|
| default `padding` | 2 (cartesian/bar/candle/stacked), 3 (bullet/win-loss), 4 (range-bar/scatter) |
| default `gapRatio` | 0.2 (bar/candle/win-loss), 0.25 (range-bar); clamped only in win-loss (599) and range-bar (692) |
| domain option names | `min/max`, `minX/maxX/minY/maxY`, `maxDomain`, `data.min/data.max` |
| angle options | `startAngle+sweep` (radial) vs `startAngle+endAngle` (radial-bar); default start −π/2 vs 0 |
| baseline key | `baseline` (cartesian/bar) vs `baselineY` (win-loss) |
| collection key | `points`, `bars`, `candles`, `slices`, `layers`, `tracks`, `items` |
| equal-domain policy | ±10%/±1 (createDomain:40), +1 (scatter:784, bullet:507), none / scale `||1` (range-bar, linear:17) |
| single-point x | centred (cartesian:67, stacked:415) vs left edge (scatter) |

## Bugs I reproduced with `node -e` (read-only)

| Repro | Result |
|---|---|
| `createSmoothPath(createCartesianLayout([0,0,0,10,10,10],{includeZero:true}).points)` | control points y=32.333 / −2.333; sampled curve y∈[0.07, 29.93], but the plotting band is [2,28] and the baseline is 28 |
| `createCartesianLayout([1,2,3],{min:5})` | domain `[5,3]`, y = `[-24,-11,2]` (inverted, off-canvas) |
| `createBarLayout([2,8],{min:5})` | bar 0 drawn from y=28 to 54 (viewBox height 30) |
| `createDomain([1,NaN,3])` | `[NaN,NaN]` → path `"M 2 NaN C 10 NaN…"` |
| `createDomain(130000 values)` | `RangeError: Maximum call stack size exceeded` (120k ok) |
| `describePieSector` for `createRadialLayout([1e6,1])` slice 0 | `"M 50 50 L 50 2 A 48 48 0 1 1 50 2 Z"`: arc endpoints are identical, so the arc is dropped |
| combo, n=5 | bar centres `[11.6,30.8,50,69.2,88.4]` vs line x `[2,26,50,74,98]` |
| `createCandlestickLayout([[10,12,9,11,5000],…])` | all high/low ≈ 27.99–28 (squashed) |
| `createCandlestickLayout([[10,12,9,11,"2024-01-01"]])` | open/high/low/close/bodyY = NaN |
| scatter, 60 points, ms timestamps 1 s apart | `trendLine: null`; at 1 min apart the error is about 0.01 units |
| `createStackedLayout([[5,-4],[5,4]])` | column 1: layer0 y 20.57→28 and layer1 28→20.57 (overlap) |
| `createStackedLayout([[5,-3],[5,2]],{offset:"expand"})` | column 1 gives −150% / +100% |
| `describeArc(50,50,40,0,-π/2)` | `"M 90 50 A 40 40 0 0 1 50 10"` (bulges on the mirrored circle) |
| `describeArc(50,50,40,0,2π)` | starts at `M 50 10`, ignoring startAngle=0 |
| `createBulletLayout([0.7,0.8])` | max=100, measure width 0.658 of 94 |
| `createBarLayout([1,2],{gapRatio:1.5})` | bar width −24 |
| `createScatterLayout([[7],[9]])` | raw points (7,7),(9,9) instead of (0,7),(1,9) |
| linear path built the way the components do it, 1000 points | 38,540 chars with values like `2.096096096096096 26.133805753667005` |

## Test coverage per function (test/geometry.test.js)
- **Not tested:** createCandlestickLayout, describeArc, createRadialBarLayout, polarToCartesian.
- **Weak:** createStackedLayout (lengths only), createSmoothPath (prefix/endpoint only), createStepPath (step-after only), createScatterLayout (slope not checked), createCartesianLayout (single point only), createBulletLayout (array input and defaults not covered).
- **Missing everywhere:** NaN/Infinity input, empty input, min>max, values outside an explicit domain, negative stacking, curve bounds, large n, full donut ring, near-full slices, reversed angles.
- `parseNumericData` is tested inside the geometry test file (test:26), which is the wrong place.