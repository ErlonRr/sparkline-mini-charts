// vite.config.js — Multi-entry ESM and CommonJS distribution build for the library.

import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

/** @param {string} path */
const fromRoot = (path) => resolve(import.meta.dirname, path);

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: fromRoot("src/index.js"),
        define: fromRoot("src/define.js"),
        register: fromRoot("src/register.js"),
        "mini-area-chart": fromRoot("src/components/mini-area-chart.js"),
        "mini-bar-chart": fromRoot("src/components/mini-bar-chart.js"),
        "mini-candlestick-chart": fromRoot("src/components/mini-candlestick-chart.js"),
        "mini-combo-chart": fromRoot("src/components/mini-combo-chart.js"),
        "mini-gauge-chart": fromRoot("src/components/mini-gauge-chart.js"),
        "mini-half-pie-chart": fromRoot("src/components/mini-half-pie-chart.js"),
        "mini-line-chart": fromRoot("src/components/mini-line-chart.js"),
        "mini-ohlc-chart": fromRoot("src/components/mini-ohlc-chart.js"),
        "mini-pie-chart": fromRoot("src/components/mini-pie-chart.js"),
        "mini-progress-chart": fromRoot("src/components/mini-progress-chart.js"),
        "mini-radial-bar-chart": fromRoot("src/components/mini-radial-bar-chart.js"),
        "mini-stacked-area-chart": fromRoot("src/components/mini-stacked-area-chart.js"),
        "mini-stream-chart": fromRoot("src/components/mini-stream-chart.js"),
        "mini-bullet-chart": fromRoot("src/components/mini-bullet-chart.js"),
        "mini-win-loss-chart": fromRoot("src/components/mini-win-loss-chart.js"),
        "mini-range-bar-chart": fromRoot("src/components/mini-range-bar-chart.js"),
        "mini-scatter-chart": fromRoot("src/components/mini-scatter-chart.js"),
        "mini-heatmap-chart": fromRoot("src/components/mini-heatmap-chart.js"),
        "mini-stacked-bar-chart": fromRoot("src/components/mini-stacked-bar-chart.js"),
        "mini-waterfall-chart": fromRoot("src/components/mini-waterfall-chart.js"),
        "mini-funnel-chart": fromRoot("src/components/mini-funnel-chart.js"),
        "mini-box-plot-chart": fromRoot("src/components/mini-box-plot-chart.js"),
        "mini-radar-chart": fromRoot("src/components/mini-radar-chart.js"),
        "mini-treemap-chart": fromRoot("src/components/mini-treemap-chart.js"),
        math: fromRoot("src/core/geometry.js"),
        angular: fromRoot("src/angular.ts"),
        react: fromRoot("src/react.ts"),
        vue: fromRoot("src/vue.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    // Explicit output syntax level (Vite's default follows its own Baseline target, which
    // moves with Vite upgrades). The browser floor is .browserslistrc, checked by `pnpm lint:compat`.
    target: "es2022",
    sourcemap: true,
    rolldownOptions: {
      external: ["@angular/core", "react", "vue"],
      output: {
        // The React wrappers use hooks and register elements in the browser, so
        // dist/react.js and dist/react.cjs open a React Server Components client boundary.
        banner: (chunk) => (chunk.isEntry && chunk.name === "react" ? '"use client";' : ""),
      },
    },
  },
  plugins: [
    dts({
      tsconfigPath: fromRoot("tsconfig.build.json"),
      include: ["src"],
      outDirs: "dist",
      bundleTypes: false,
    }),
  ],
});
