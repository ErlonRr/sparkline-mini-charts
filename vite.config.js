// vite.config.js — Multi-entry ESM and CommonJS distribution build for the library.

import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

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
        math: fromRoot("src/core/geometry.js"),
        angular: fromRoot("src/angular.ts"),
        react: fromRoot("src/react.ts"),
        vue: fromRoot("src/vue.ts"),


      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    sourcemap: true,
    rolldownOptions: {
      external: ["@angular/core", "react", "vue"],
    },
  },
  plugins: [
    dts({
      include: ["src"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
});
