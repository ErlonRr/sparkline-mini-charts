<!-- CHANGELOG.md — Keep a Changelog history for Sparkline Mini Charts releases. -->
# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-08-17

### Added

- **Modern Angular 22+ Signals Architecture**: 17 dedicated standalone signal directives (`MiniLineChartDirective`, `MiniGaugeChartDirective`, `MiniBulletChartDirective`, etc.) with native `input()`, `output()`, and `effect()` integration. Exported `SPARKLINE_DIRECTIVES` array for single-line imports.
- **Dedicated React 19+ Interfaces**: Specific TypeScript interfaces (`MiniLineChartProps`, `MiniGaugeChartProps`, etc.) with automatic camelCase prop conversion and event listener bindings (`onSparklineHover`, `onZoneChange`, etc.).
- **Gradients Studio & Multi-Stop Colors Lab**: Dedicated interactive workspace (`#/gradients`) in demo showcase with real-time continuous chromatic presets.

### Fixed

- Single-quote JSON parsing in `gradient` attributes across Gauge, Progress, Radial Bar, Bullet, and Area charts.
- CSS Shadow DOM fill and stroke precedence on bullet and progress chart gradients.
- Synchronized version badge in navbar header and framework documentation tabs.

## [1.3.1] - 2026-08-17

### Added

- **Multi-Stop & Continuous Gradients**: Added native multi-color `<linearGradient>` support to `<mini-gauge-chart>`, `<mini-progress-chart>`, `<mini-radial-bar-chart>`, `<mini-bullet-chart>`, and `<mini-area-chart>` via the `gradient` attribute (boolean, color array, or comma-separated string).
- **Universal Interactive Hover Support**: Implemented `interactive` attribute and `sparkline-hover` / `sparkline-leave` custom events across 100% of the 17 library components, bringing first-class interaction to Gauge and Progress meters.

### Fixed

- Corrected documentation and package homepage links to `https://sparkline-mini-charts.erlonrru.com`.

## [1.3.0] - 2026-08-15

### Added

- Interactive **Theming & Design Tokens Guide** (`#/theming`) with live real-time cascading theme lab.
- **Master Design Tokens Configuration Template** accordion with copyable drop-in CSS snippet for custom design system integration.
- Professional multi-hue color palettes across all 5 built-in themes (Ocean Tech, Emerald Fintech, Cyberpunk Neon, Sunset Horizon, Luxury Velvet) with authentic chromatic gradient synergy.
- Harmonized stage layout and centering for sparklines and standardized compact sizing for donut/pie charts.

### Fixed

- Visual contrast and alignment of sparklines and multi-layer pie distributions.
- Sharp, high-resolution vector NPM icon in the showcase header navigation.

## [1.2.1] - 2026-08-15

### Added

- SPA Client-Side Hash Router in showcase demo with dedicated pages for Overview, Live Streaming Studio, Component Detail Views, Sandbox Playground, and Framework Integrations.
- Native `sparkline-select` click event on interactive elements with detailed data payload.
- Brand SVG favicon asset and raw GitHub documentation previews.

### Fixed

- Eliminated mouse hover jitter and flickering (`show/hide`) across all charts by replacing disruptive SVG scale transforms with smooth brightness/opacity transitions.
- Hollow candlestick body hit area with solid `pointer-events: all`.
- Non-intercepting crosshair and active point pointer events in line charts.

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
