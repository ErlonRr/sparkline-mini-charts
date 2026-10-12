# Demo Showcase & Interactive Playground Guide

Sparkline Mini Charts includes an interactive showcase and playground (`apps/demo/`) that acts as both a visual test harness and a live demonstration deployed at **[sparkline-mini-charts.erlonrru.com](https://sparkline-mini-charts.erlonrru.com)**.

---

## 🌐 Live Showcase Features

A single-page app with hash routes, light and dark themes (the toggle sets `color-scheme`, so the charts' dark defaults follow) and a layout that works from 320px:

- **Home** (`#/`): install command and the charts in real contexts: KPI cards, a data table with 24px sparklines, dashboard tiles.
- **Charts** (`#/charts`): the 24 charts by category, with a filter.
- **Configurator** (`#/charts/<tag>`): one live preview updated through its properties (never recreated); controls generated from `customElements.get(tag).props`, so new options appear by themselves; a JSON data editor with examples and random data; size presets and a resizable, light or dark stage; an Events log; HTML, JavaScript, React, Vue, Angular and Svelte export of the non-default options; the state is kept in the URL.
- **Live** (`#/live`): charts fed every second with `appendData()` when available, else `el.data`; paused with reduced motion and while the tab is hidden.
- **Theming** (`#/theming`) and **Frameworks** (`#/frameworks`): `--mini-chart-*` tokens with presets and CSS export; install and usage per framework.

---

## 💻 Running the Playground Locally

From the repository root:

```bash
# Build the library first: the demo imports it from packages/core/dist/, in dev and in the static build
pnpm build

# Launch the Vite dev server (rerun `pnpm build` after editing packages/core/src/)
pnpm dev

# Build the static showcase into apps/demo/dist/
pnpm build:demo

# Preview the built demo
pnpm preview

# Browser test of the built demo (routes, configurator, axe); the first run needs
# `pnpm --filter sparkline-mini-charts-demo exec playwright install chromium`
pnpm test:e2e
```

The Vite dev server starts at `http://localhost:5173`.

---

## 🏗️ Demo Architecture

The showcase is the private workspace package `sparkline-mini-charts-demo` in `apps/demo/`, with no framework and no build-time dependencies besides Vite:

- **`apps/demo/index.html`**: the page shell (header, navigation, theme toggle, footer).
- **`apps/demo/src/`**: `main.js` (registers the charts, theme, hash router), `styles.css` (design tokens and layout), `catalog.js` (charts, datasets), `snippets.js` (code generation, no DOM), `ui.js` and one lazily loaded module per page in `pages/`, each returning its cleanup. The first import is `sparkline-mini-charts/register`, resolved through the package `exports`, so the demo runs the built `packages/core/dist/`.
- **`apps/demo/favicon.svg`**: the site icon.
- **`apps/demo/vite.config.js`**: the Vite configuration for the demo. The library comes in through the `sparkline-mini-charts/register` import, bundled into the demo's own `index.js` by `pnpm build:demo` (output `apps/demo/dist/`, with no copy of the library's `dist/`). Both `pnpm dev` and `pnpm build:demo` stop with an explicit error when `packages/core/dist/` has not been built. The version badge and the GitHub links come from the library's `package.json`. The demo routes with the URL hash, so neither Vite nor `vercel.json` has a history fallback.
- **`apps/demo/playwright.config.ts`** and **`apps/demo/e2e/demo.spec.ts`**: the browser test, run against `vite preview` of `apps/demo/dist/`.

Vercel deploys the demo with the settings in `vercel.json`: a preview for every pull request and production from `main`. Demo changes are not part of the npm package and are not listed in `packages/core/CHANGELOG.md`.
