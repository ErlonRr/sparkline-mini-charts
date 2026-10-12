---
"sparkline-mini-charts": patch
---

### Changed

- **Documentation:** the 17 component pages are rewritten from the source. Each lists every attribute, event, CSS custom property and part, with corrected data shapes, defaults and `gradient` grammar. A shared table documents the theming tokens and the rule that an attribute wins over the matching token; `--mini-chart-stroke-width` also sets the arc width of gauge and progress.
- **Releases are published from GitHub Actions** with npm trusted publishing, so each version carries a provenance attestation that links it to the commit and workflow that built it.
