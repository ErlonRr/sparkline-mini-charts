// define.js — Explicit, side-effect-free registration for every chart element.

import { MiniBarChart } from "./components/mini-bar-chart.js";
import { MiniHalfPieChart } from "./components/mini-half-pie-chart.js";
import { MiniLineChart } from "./components/mini-line-chart.js";
import { MiniAreaChart } from "./components/mini-area-chart.js";
import { MiniStackedAreaChart } from "./components/mini-stacked-area-chart.js";
import { MiniStreamChart } from "./components/mini-stream-chart.js";
import { MiniGaugeChart } from "./components/mini-gauge-chart.js";
import { MiniProgressChart } from "./components/mini-progress-chart.js";
import { MiniCandlestickChart } from "./components/mini-candlestick-chart.js";
import { MiniOhlcChart } from "./components/mini-ohlc-chart.js";
import { MiniComboChart } from "./components/mini-combo-chart.js";
import { MiniRadialBarChart } from "./components/mini-radial-bar-chart.js";
import { MiniPieChart } from "./components/mini-pie-chart.js";
import { MiniBulletChart } from "./components/mini-bullet-chart.js";
import { MiniWinLossChart } from "./components/mini-win-loss-chart.js";
import { MiniRangeBarChart } from "./components/mini-range-bar-chart.js";
import { MiniScatterChart } from "./components/mini-scatter-chart.js";
import { MiniHeatmapChart } from "./components/mini-heatmap-chart.js";
import { MiniStackedBarChart } from "./components/mini-stacked-bar-chart.js";
import { MiniWaterfallChart } from "./components/mini-waterfall-chart.js";
import { MiniFunnelChart } from "./components/mini-funnel-chart.js";
import { MiniBoxPlotChart } from "./components/mini-box-plot-chart.js";
import { MiniRadarChart } from "./components/mini-radar-chart.js";
import { MiniTreemapChart } from "./components/mini-treemap-chart.js";
import { configureMiniCharts, defineChartPreset } from "./core/config.js";
import { defineMiniChart } from "./core/registration.js";

/** @type {readonly [string, CustomElementConstructor][]} */
const componentDefinitions = Object.freeze([
  ["mini-line-chart", MiniLineChart],
  ["mini-area-chart", MiniAreaChart],
  ["mini-stacked-area-chart", MiniStackedAreaChart],
  ["mini-stream-chart", MiniStreamChart],
  ["mini-bar-chart", MiniBarChart],
  ["mini-gauge-chart", MiniGaugeChart],
  ["mini-progress-chart", MiniProgressChart],
  ["mini-candlestick-chart", MiniCandlestickChart],
  ["mini-ohlc-chart", MiniOhlcChart],
  ["mini-combo-chart", MiniComboChart],
  ["mini-radial-bar-chart", MiniRadialBarChart],
  ["mini-pie-chart", MiniPieChart],
  ["mini-half-pie-chart", MiniHalfPieChart],
  ["mini-bullet-chart", MiniBulletChart],
  ["mini-win-loss-chart", MiniWinLossChart],
  ["mini-range-bar-chart", MiniRangeBarChart],
  ["mini-scatter-chart", MiniScatterChart],
  ["mini-heatmap-chart", MiniHeatmapChart],
  ["mini-stacked-bar-chart", MiniStackedBarChart],
  ["mini-waterfall-chart", MiniWaterfallChart],
  ["mini-funnel-chart", MiniFunnelChart],
  ["mini-box-plot-chart", MiniBoxPlotChart],
  ["mini-radar-chart", MiniRadarChart],
  ["mini-treemap-chart", MiniTreemapChart],
]);

/**
 * Options of {@link defineMiniCharts}: where to register the charts, plus the
 * global defaults and presets (see {@link configureMiniCharts}).
 *
 * @typedef {import("./core/config.js").MiniChartsConfig & { registry?: CustomElementRegistry }} DefineMiniChartsOptions
 */

/**
 * Registers all chart elements that have not already been defined. Pass a
 * registry (the 1.x form), or an options object with `registry`, `defaults`,
 * `presets` and `reflectData`.
 *
 * @example
 * defineMiniCharts({
 *   defaults: { "*": { interactive: true }, "mini-line-chart": { curve: "smooth" } },
 *   presets: { dense: { "mini-bar-chart": { gap: 0.05 } } },
 * });
 *
 * @param {CustomElementRegistry | DefineMiniChartsOptions | undefined} [registryOrOptions] Registry to update, or the options.
 * @returns {void}
 */
export function defineMiniCharts(registryOrOptions = globalThis.customElements) {
  /** @type {CustomElementRegistry | undefined} */
  let registry = /** @type {CustomElementRegistry | undefined} */ (registryOrOptions);
  if (registryOrOptions && typeof (/** @type {{ define?: unknown }} */ (registryOrOptions)).define !== "function") {
    const { registry: target, defaults, presets, reflectData } = /** @type {DefineMiniChartsOptions} */ (registryOrOptions);
    registry = target ?? globalThis.customElements;
    if (defaults || presets || reflectData !== undefined) configureMiniCharts({ defaults, presets, reflectData });
  }

  for (const [tagName, component] of componentDefinitions) {
    defineMiniChart(tagName, component, registry);
  }
}

export { configureMiniCharts, defineChartPreset };
