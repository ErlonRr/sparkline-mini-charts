<!-- CHANGELOG.md — Keep a Changelog history for Sparkline Mini Charts releases. -->
# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-08-15

### Added

- Adaptive Dark and Light theme token system (`--mini-chart-color-1..8`, `--mini-chart-safe/warn/danger-color`, `--mini-chart-track-color`) with instant CSS inheritance across all 17 components.
- Interactive showcase overhaul with real-time live streaming grid, 17-component gallery, and live playground sandbox.
- Native bilingual i18n support in showcase demo (English & Italiano).
- Authentic ThemeRiver organic streaming simulation with Byron & Wattenberg Last.fm dataset.
- Comprehensive product specification and component documentation in `docs/improve/`.

## [1.1.0] - 2026-08-14


### Added

- Native `<mini-bullet-chart>` Web Component for Stephen Few qualitative range intervals, performance measure, and target marker.
- Native `<mini-range-bar-chart>` Web Component for min-max floating interval spans with optional value indicator markers.
- Native `<mini-win-loss-chart>` Web Component with Edward Tufte binary sparklines and continuous uptime `mode="status"` strip.
- Native `<mini-scatter-chart>` Web Component for 2D Cartesian scatter plots with automatic linear regression trendlines (`trend-line="true"`).
- Pure geometric layout functions `createBulletLayout`, `createRangeBarLayout`, `createWinLossLayout`, and `createScatterLayout` in `geometry.js`.
- Angular directive, React wrapper, and Vue 3 wrapper bindings for all new chart components.
- Unit and snapshot test suites for new layout algorithms and element behaviors.

## [1.0.1] - 2026-08-14


### Fixed

- Candlestick & OHLC chart spacing and line width refinement (0.75px crisp stroke width).
- Gauge chart animation sweep, needle alignment, and semantic zone fallback colors.
- Progress chart typography, weight (700) and normalized semi-arc radius dimensions.
- Radial bar chart staggered fluid transitions and outer-to-inner ring stacking order.
- Pie and half-pie chart size harmony and dynamic multi-token `[part~="segment"]` CSS selectors.
- Real-time live data streaming interpolation and point tracking on line and area charts.

## [1.0.0] - 2026-08-11


### Added

- Comprehensive documentation for all 13 components in `docs/`.
- `mini-progress-chart` and `mini-radial-bar-chart` responsive scaling, colors, and robust `stroke-dashoffset` animations.
- Vite library builds with typed ESM, CJS, and source-map outputs in `dist/`.
- `pnpm dev`, `pnpm build`, `pnpm build:demo`, `pnpm preview`, and `pnpm typecheck` workflows.
- Optional `angular`, `react`, and `vue` framework adapter entry points with peer dependencies.
- Vite-powered interactive demo development and static distribution pipeline.

### Changed

- Package exports now resolve to generated distribution artifacts rather than source files.

## [0.1.0] - 2026-08-08

### Added

- Native `<mini-line-chart>`, `<mini-bar-chart>`, `<mini-pie-chart>`, and `<mini-half-pie-chart>` components.
- Shared data normalization plus Cartesian and radial SVG geometry utilities.
- Declarative `data` and accessible `label` APIs with Shadow DOM rendering.
- Pure ESM exports, explicit registration APIs, tree-shakeable component subpaths, and an intentional `/register` side-effect entry point.
- SSR-safe module evaluation, Node test coverage, an interactive demo, and project documentation.
