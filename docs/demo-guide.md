# Demo Showcase & Interactive Playground Guide

Sparkline Mini Charts includes an interactive showcase and playground (`demo/`) that acts as both a visual test harness and a live demonstration deployed at **[sparkline-mini-chart.erlonrru.com](https://sparkline-mini-chart.erlonrru.com)**.

---

## 🌐 Live Showcase Features

- **17-Component Interactive Gallery**: Live cards for every chart type showing declarative attributes, values, and copy-to-clipboard code snippets.
- **Real-Time Live Streaming Grid**: High-frequency streaming simulations demonstrating zero-allocation DOM diffing and smooth transitions.
- **Interactive Sandbox Playground**: Real-time JSON editor and parameter controls to test custom datasets and options.
- **Dark & Light Adaptive Theme**: Instant CSS design token cascading across all chart components.
- **Bilingual i18n**: English and Italiano localization toggle.

---

## 💻 Running the Playground Locally

```bash
# Launch Vite dev server
pnpm dev

# Build static showcase distribution
pnpm build:demo

# Preview the built demo
pnpm preview
```

The Vite dev server will start at `http://localhost:5173`.

---

## 🏗️ Demo Architecture

The showcase is organized in `demo/`:
- **`demo/index.html`**: Semantic HTML structure containing layout panels, navigation, and theme switches.
- **`demo/app.js`**: Core client application logic, real-time data generators, live streaming loops, and sandbox controls.
- **`demo/i18n.js`**: Bilingual dictionary and instant locale switching engine.
- **`demo/styles.css`**: Design tokens, glassmorphism UI, responsive grid layouts, and code formatting.
- **`vite.config.demo.js`**: Dedicated Vite configuration for demo bundling and static distribution (`dist-demo/`).
