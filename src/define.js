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
]);

/**
 * Registers all chart elements that have not already been defined.
 *
 * @param {CustomElementRegistry | undefined} [registry] Registry to update.
 * @returns {void}
 */
export function defineMiniCharts(registry = globalThis.customElements) {
  for (const [tagName, component] of componentDefinitions) {
    defineMiniChart(tagName, component, registry);
  }
}
