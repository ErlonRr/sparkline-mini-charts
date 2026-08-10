<!-- CHANGELOG.md — Keep a Changelog history for Sparkline Mini Charts releases. -->
# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
