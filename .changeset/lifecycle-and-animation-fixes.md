---
"sparkline-mini-charts": patch
---

### Fixed

- **Interaction events survive a reconnect.** Moving a chart in the DOM (disconnect, then connect again) no longer drops its hover, leave and select events, on all 17 charts.
- **Entrance animations play when an element is upgraded in place.** A chart already in the page when its tag is defined renders once, so its entrance animation is no longer skipped.
- **Progress arc** animates in again and no longer flickers or disappears near 100%: the easing no longer overshoots.
- **Bar, pie and half-pie** play their entrance animation when the first data arrives after an empty render.
- **`progress-complete` and `zone-change` fire only on transitions.** The gauge dispatches `zone-change` only when the value moves into another zone, and the progress dispatches `progress-complete` only when the value moves to `max`; changing `zones`, `min` or `max` alone fires neither.
- **Entrance stagger** is capped at 300 ms in total, so long series no longer take seconds to appear.
- **Line, area and combo hover follows the cursor** when the chart is letterboxed inside its box.
