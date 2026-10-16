---
"sparkline-mini-charts": patch
---

### Changed

- Charts fed by a steady stream (`appendData()` on a timer) now move at a constant speed. From the third update in a row less than 1.5 s apart, a transition lasts as long as the gap since the previous update and is linear, so each one starts at the speed the last one ended with. Before, every update rushed in and then stalled. A single update still eases out in 400 ms.
