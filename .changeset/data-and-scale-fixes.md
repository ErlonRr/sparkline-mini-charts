---
"sparkline-mini-charts": patch
---

### Fixed

- **Candlestick and OHLC scale on open, high, low and close only.** Extra columns such as volume or a timestamp no longer flatten the candles or produce `NaN` coordinates.
- **Combo:** line points, the last-value marker and the hover crosshair sit on the bar centres.
- **Stacked-area and stream:** an invalid entry counts as 0 at its own index, so the series stay aligned column by column.
- **Large series:** extents are computed in one pass, so a million values no longer throw `RangeError`.
- **Crossed bounds:** when an explicit `min` is not below `max`, line, area, bar, candlestick, OHLC, range-bar and bullet fall back to the data extent instead of drawing an inverted or empty chart; so does scatter when `min-x`/`max-x` or `min-y`/`max-y` cross.
- **Gauge zones:** `upTo` is clamped to `min`/`max`, numeric strings are accepted, and when no zone is valid the default bands are drawn.
- **Radial-bar:** `sweep` is limited to (0, 360] (a non-positive value falls back to 270), and a `max` of 0 or less falls back to the data maximum.

### Changed

- **Win-loss `mode`:** `status` (alias `uptime`) draws a full-height status strip, and `binary` is an alias of the default `win-loss` mode. The React `mode` prop type accepts all four values.
- **Range-bar** accepts `{ low, high, value }` as aliases of `{ min, max, current }`; when both are present, `min`, `max` and `current` win.
- **React types:** `curve` accepts `step-before` and `step-after`, and `points` accepts `min-max`. `points="ends"` is still accepted for compatibility and documented as having no effect.
