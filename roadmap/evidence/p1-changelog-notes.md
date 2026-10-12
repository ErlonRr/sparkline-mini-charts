# CHANGELOG notes accumulated during P1 (1.4.2) — to be turned into changesets/CHANGELOG by P1-16

## Group 1 (P1-1..P1-3)
- Interaction events survive disconnect/reconnect on all 17 charts.
- Upgrading an element already in the page renders once, so entrance animations play.
- Progress arc animates in and no longer flickers/disappears near 100% (no-overshoot easing).
- Bar chart animates when its first data arrives after an empty render.
- `progress-complete` and `zone-change` fire only on transitions (gauge: only when the value moves into another zone; zones/min/max changes alone no longer fire).

## Group 2 (P1-4..P1-7, P1-13)
- `trend-color="auto"` no longer writes the host's inline style; trend is `data-trend` on the internal svg.
- `gradient="false"`/`"0"` no longer blacken bullet measure / hide progress arc / area flat fill. `""` and `"true"` = default gradient on.
- Shared `gradient` parser (area, bullet, gauge, progress, radial-bar): paren-aware commas, single colour accepted, `var()` works in stops.
- Radial-bar removes surplus rings when data shrinks.
- Bullet bands and scatter trend line/point stroke no longer read `--primary`/`--surface`; bullet bands now follow `--mini-chart-color`.
- Gauge empty state: value text hidden, aria-valuenow/min/max removed from the meter svg; host attributes untouched; empty-start gauge draws its track.
- `replaceChildren()` instead of `innerHTML` (Trusted Types safe).

## Open issues carried forward
- pie/half-pie: empty first render skips entrance (like bar did) — P1-12 territory.
- gauge/combo/bullet: re-render before entrance frames snaps to final state.
- bar still rewrites its stylesheet every render (components-bars-financial-17) — P1-8.
- progress-complete fires synchronously on first connect if starting complete.
- radial-bar round-caps and gauge needle still interpolated into CSS at creation — P1-8.
- Docs: gradient grammar, trend-color, --mini-chart-color tinting bullet bands — P1-14.
- gauge zones put var() in stroke presentation attribute (theming-14, later).
- progress renders empty data as 0 (components-radial-12, later).

## Group 3 (P1-8, P1-9, P1-11, P1-12)
- radius (range-bar, win-loss), wick-width + hollow-bullish (candlestick), tick-width (ohlc), round-caps (radial-bar), needle-type (gauge) now update after first render.
- Attribute values no longer pasted into the shadow stylesheet (no CSS injection; radius="3px" works).
- Explicit wick-width/tick-width/radius attribute beats inherited --mini-chart-* token.
- Bar, pie, half-pie no longer rewrite stylesheet every render.
- Win-loss mode="uptime" = status strip, mode="binary" = default; React mode type updated.
- Range-bar accepts {low, high, value} aliases of {min, max, current}.
- React types accept curve step-before/step-after and points="min-max" ("ends" kept, documented as no-op).
- Line/area/combo hover follows cursor under letterboxing (getScreenCTM).
- Entrance stagger capped at 300 ms total; pie/half-pie reveal after empty first render.
Open: happy-dom `initial` fallback needs browser test (P2); docs for mode values, range-bar aliases, precedence, "ends", stacked/stream/combo "step" (P1-14); range-bar markers fade up to ~900ms; radial-bar data colours via style.stroke.

## Group 4 (P1-10) — Fixed (visual)
- Candlestick/OHLC scale only o/h/l/c: volume/timestamp columns no longer flatten candles or produce NaN.
- Combo: line points, last marker and hover crosshair sit on bar centres.
- Stacked/stream: invalid entry counts as 0 at its own index (series stay column-aligned).
- Extents in one loop: 1e6 values no longer throw RangeError.
- Crossed explicit min/max (min >= max) fall back to data extent (line, area, bar, combo, candlestick, OHLC, range-bar, scatter, bullet).
- Gauge zones: upTo clamped to min/max, numeric strings accepted, no valid zone -> default bands.
- Radial-bar: sweep limited to (0,360] (non-positive -> 270), max <= 0 -> data max.
Open (later phases): clamping out-of-domain values (geometry-4 rest), negative stacking (geometry-5 rest), OHLC validation/objects, neutral gauge track, dev warning on bound fallback.

## Group 5a (P1-15)
- TypeScript projects that require() the CJS build now get CJS declarations (.d.cts) for every entry (no more "masquerading as ESM").
- Exports map uses nested import/require conditions with their own types, and exposes ./package.json.
- Angular CJS declarations reference ESM-only @angular/core with resolution-mode: "import".
Open: top-level "types" still pairs ESM types with CJS main (node10 only).

## Group 5b (P1-14 + esteso)
- Docs: 17 component pages rewritten from code (every attribute, event, CSS custom property, part; data shapes, defaults, gradient grammar corrected).
- Docs: shared theming-token table, attribute-over-token precedence, --mini-chart-stroke-width also sets gauge/progress arc width.
- Demo: false claims removed ("< 3 kB gzip", "SSR Safe", "LIVE WEBSOCKET", currentColor inheritance); endpoint="last" -> points="last"; 4 nonexistent tokens removed; opacity slider uses real --mini-chart-bar-opacity-inactive.
- Tooling: pnpm lint:docs (scripts/check-docs.mjs) checks docs+demo vs src in both directions, in CI and test:unit. lint:package runs publint --strict.
Documented-as-is, to fix later (mostly P3-3 / P7-P8): dead attrs (bar baseline, pie pad-angle, radial-bar min, win-loss colors); --mini-chart-fill/point-fill no-ops; inconsistent fallback blues; hover dim 0.45 hard-coded; interactive="false" enables; hover detail.color palette; bullet hover no index; progress-complete sync on connect; empty gauge hover reports last value; scatter bad y -> 0; combo drops datum; negative stacking; OHLC validation; bare donut; gauge zones var() in stroke attr; radial-bar inline stroke; stream step = smooth; progress min>=100.
