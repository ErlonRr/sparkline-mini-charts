# Demo Showcase & Interactive Playground Guide

Sparkline Mini Charts includes an interactive showcase and playground (`demo/`) that acts as both a visual test harness and a live demonstration deployed at **[sparkline-mini-charts.erlonrru.com](https://sparkline-mini-charts.erlonrru.com)**.

---

## 🌐 Live Showcase Features

The demo is a single-page app with hash routes:

- **Overview** (`#/overview`): introduction, package highlights and install commands.
- **Components** (`#/components`): a card for each of the 17 charts with its attributes and copy-to-clipboard snippets for HTML, React, Vue and Angular, plus a detail page per chart.
- **Streaming** (`#/streaming`): all 17 charts fed with simulated data generated in the browser on a timer (there is no network feed), to show how updates animate. The timer runs only on this view and while the tab is visible, and starts by itself only when the system does not ask for reduced motion; the LIVE/PAUSED badge shows its state.
- **Playground** (`#/playground`): pick a chart, edit its data as JSON and its label, see the result live and copy the generated snippet.
- **Theming** (`#/theming`): set `--mini-chart-*` tokens on a preview board and copy the generated CSS.
- **Gradients** (`#/gradients`): try `gradient` presets on the area, bullet, gauge, progress and radial-bar charts.
- **Frameworks** (`#/frameworks`): integration snippets for React, Vue, Angular and Svelte.
- **Light and dark theme, English and Italian** text, switched from the header.

---

## 💻 Running the Playground Locally

```bash
# Build the library first: the demo loads it from dist/, in dev and in the static build
pnpm build

# Launch the Vite dev server (it serves dist/ under /lib/; rerun `pnpm build` after editing src/)
pnpm dev

# Build the static showcase into dist-demo/
pnpm build:demo

# Preview the built demo
pnpm preview

# Browser tests of the built demo (smoke and accessibility); the first run needs
# `pnpm exec playwright install chromium`
pnpm test:e2e
```

The Vite dev server starts at `http://localhost:5173`.

---

## 🏗️ Demo Architecture

The showcase lives in `demo/`, with no framework and no build-time dependencies besides Vite:

- **`demo/index.html`**: the markup of every view, the navigation and the page styles (inline `<style>`).
- **`demo/app.js`**: the hash router, the English/Italian translations, the theme switch, the component catalog and snippet generator, the playground, the theming and gradient labs, and the streaming loops. It does not import the library: the page loads `./lib/register.js` first, so the demo runs the built `dist/` in development and in production.
- **`demo/favicon.svg`**: the site icon.
- **`vite.config.demo.js`**: the Vite configuration for the demo. It injects `./lib/register.js` into the page before `app.js`. The dev server serves `/lib/` from `dist/`, and `pnpm build:demo` writes `dist-demo/` and copies `dist/` to `dist-demo/lib/` (it fails if `dist/` has not been built). A missing `/lib/` file is a 404, never the page: the demo routes with the URL hash, so neither Vite nor `vercel.json` has a history fallback.

The demo is frozen for new features until it is replaced; it only receives fixes.

Vercel deploys the demo with the settings in `vercel.json`: a preview for every pull request and production from `main`. Demo changes are not part of the npm package and are not listed in `CHANGELOG.md`.
