# Demo Playground Guide

Sparkline Mini Charts includes a local development sandbox (`demo/`) that acts as both a visual test suite and an interactive playground.

## Running the Playground

To start the playground locally, run the following command from the root of the project:

```bash
pnpm dev
```

This will launch a Vite dev server (usually at `http://localhost:5173`). Vite handles the on-the-fly bundling of the custom elements and hot-module reloading.

## Playground Architecture

The playground consists of three main files:
- **`demo/index.html`**: The HTML entry point. It contains the layout, CSS, and instances of every `<mini-*-chart>` custom element.
- **`demo/app.js`**: The JavaScript logic for the playground. This file is responsible for populating the charts with simulated, realistic data arrays.
- **`vite.config.demo.js`**: The Vite configuration used specifically for serving the demo environment.

## Generating Mock Data
Inside `demo/app.js`, we use standard JavaScript arrays and mathematical generation (like Brownian motion logic) to supply realistic data for the sparklines. 

For example, when you see the fluid stream chart or the fluctuating candlestick chart, `app.js` is injecting large arrays of pre-calculated values into the DOM nodes:

```javascript
// Example from app.js
document.querySelectorAll("mini-candlestick-chart").forEach((chart) => {
  chart.setAttribute("data", JSON.stringify(generateOhlcData()));
});
```

## Adding new components to the demo
If you create a new chart type (e.g., `mini-radar-chart`):
1. Import it in `src/define.js`.
2. Add the `<article>` block in `demo/index.html`.
3. Feed it data in `demo/app.js`.
4. Open the browser and test it!
