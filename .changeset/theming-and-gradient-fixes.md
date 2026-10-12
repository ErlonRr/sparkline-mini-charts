---
"sparkline-mini-charts": patch
---

### Fixed

- **Charts never write the host's inline style.** `trend-color="auto"` used to set a color on the element's `style`, overwriting styles from the page or a framework binding; the trend is now exposed as `data-trend` on the internal svg and mapped by the shadow stylesheet.
- **`gradient="false"` and `gradient="0"` turn the gradient off** instead of painting the bullet measure black, hiding the progress arc or leaving the area without a fill. `"none"`, `"off"` and `"no"` turn it off too. `gradient=""` and `gradient="true"` keep the default gradient.
- **One `gradient` parser for area, bullet, gauge, progress and radial-bar.** Commas inside parentheses (`rgb(…)`, `hsl(…)`) no longer split a stop, a single color is accepted, and `var(--…)` works in stops. Entries that are not CSS colors are dropped instead of painting a black stop. On area, a single color fades like the default gradient instead of a single almost transparent stop.
- **Attribute values are no longer pasted into the shadow stylesheet.** Values of `radius`, `wick-width`, `tick-width`, `round-caps` and `needle-type` can no longer inject CSS, and units work (`radius="3px"`).
- **These attributes now update after the first render:** `radius` (range-bar, win-loss), `wick-width` and `hollow-bullish` (candlestick), `tick-width` (OHLC), `round-caps` (radial-bar) and `needle-type` (gauge).
- **An explicit attribute beats the inherited token.** `wick-width`, `tick-width` and `radius` set on the element win over the matching `--mini-chart-*` custom property inherited from the page.
- **Bullet bands and the scatter trend line no longer read app-level custom properties** (`--primary`, `--surface`). Bullet bands now follow `--mini-chart-color`.
- **Gauge empty state.** With no value, the gauge hides its value text, removes `aria-valuenow` from its meter (and, when the data is empty, `aria-valuemin` and `aria-valuemax` too), leaves the host attributes untouched, and still draws its track.
- **Radial-bar** removes the extra rings when the data gets shorter.
- **Bar, pie and half-pie** no longer rewrite their stylesheet on every render.
- **Trusted Types.** Charts clear their content with `replaceChildren()` instead of assigning `innerHTML`, which a Trusted Types CSP rejects.
