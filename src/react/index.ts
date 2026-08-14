// index.ts — React wrappers for the native Sparkline Mini Charts elements.

import { createElement, forwardRef, type HTMLAttributes } from "react";
import { MiniAreaChart as MiniAreaChartElement } from "../components/mini-area-chart.js";
import { MiniBarChart as MiniBarChartElement } from "../components/mini-bar-chart.js";
import { MiniBulletChart as MiniBulletChartElement } from "../components/mini-bullet-chart.js";
import { MiniCandlestickChart as MiniCandlestickChartElement } from "../components/mini-candlestick-chart.js";
import { MiniComboChart as MiniComboChartElement } from "../components/mini-combo-chart.js";
import { MiniGaugeChart as MiniGaugeChartElement } from "../components/mini-gauge-chart.js";
import { MiniHalfPieChart as MiniHalfPieChartElement } from "../components/mini-half-pie-chart.js";
import { MiniLineChart as MiniLineChartElement } from "../components/mini-line-chart.js";
import { MiniOhlcChart as MiniOhlcChartElement } from "../components/mini-ohlc-chart.js";
import { MiniPieChart as MiniPieChartElement } from "../components/mini-pie-chart.js";
import { MiniProgressChart as MiniProgressChartElement } from "../components/mini-progress-chart.js";
import { MiniRadialBarChart as MiniRadialBarChartElement } from "../components/mini-radial-bar-chart.js";
import { MiniRangeBarChart as MiniRangeBarChartElement } from "../components/mini-range-bar-chart.js";
import { MiniScatterChart as MiniScatterChartElement } from "../components/mini-scatter-chart.js";
import { MiniStackedAreaChart as MiniStackedAreaChartElement } from "../components/mini-stacked-area-chart.js";
import { MiniStreamChart as MiniStreamChartElement } from "../components/mini-stream-chart.js";
import { MiniWinLossChart as MiniWinLossChartElement } from "../components/mini-win-loss-chart.js";
import { defineMiniChart } from "../core/registration.js";

/** Properties shared by every React sparkline wrapper. */
export interface MiniChartProps extends HTMLAttributes<HTMLElement> {
  data?: any;
  label?: string;
  [key: string]: any;
}

function createReactChart(tagName: string, component: CustomElementConstructor, displayName: string) {
  defineMiniChart(tagName, component);

  const Chart = forwardRef<HTMLElement, MiniChartProps>(function SparklineChart({ data = [], label, ...attributes }, ref) {
    return createElement(tagName, {
      ...attributes,
      ref,
      data: typeof data === "string" ? data : JSON.stringify(data),
      label,
    });
  });

  Chart.displayName = displayName;
  return Chart;
}

/** React wrapper for `<mini-line-chart>`. */
export const MiniLineChart = createReactChart("mini-line-chart", MiniLineChartElement, "MiniLineChart");

/** React wrapper for `<mini-bar-chart>`. */
export const MiniBarChart = createReactChart("mini-bar-chart", MiniBarChartElement, "MiniBarChart");

/** React wrapper for `<mini-area-chart>`. */
export const MiniAreaChart = createReactChart("mini-area-chart", MiniAreaChartElement, "MiniAreaChart");

/** React wrapper for `<mini-stacked-area-chart>`. */
export const MiniStackedAreaChart = createReactChart("mini-stacked-area-chart", MiniStackedAreaChartElement, "MiniStackedAreaChart");

/** React wrapper for `<mini-stream-chart>`. */
export const MiniStreamChart = createReactChart("mini-stream-chart", MiniStreamChartElement, "MiniStreamChart");

/** React wrapper for `<mini-pie-chart>`. */
export const MiniPieChart = createReactChart("mini-pie-chart", MiniPieChartElement, "MiniPieChart");

/** React wrapper for `<mini-half-pie-chart>`. */
export const MiniHalfPieChart = createReactChart("mini-half-pie-chart", MiniHalfPieChartElement, "MiniHalfPieChart");

/** React wrapper for `<mini-radial-bar-chart>`. */
export const MiniRadialBarChart = createReactChart("mini-radial-bar-chart", MiniRadialBarChartElement, "MiniRadialBarChart");

/** React wrapper for `<mini-progress-chart>`. */
export const MiniProgressChart = createReactChart("mini-progress-chart", MiniProgressChartElement, "MiniProgressChart");

/** React wrapper for `<mini-gauge-chart>`. */
export const MiniGaugeChart = createReactChart("mini-gauge-chart", MiniGaugeChartElement, "MiniGaugeChart");

/** React wrapper for `<mini-candlestick-chart>`. */
export const MiniCandlestickChart = createReactChart("mini-candlestick-chart", MiniCandlestickChartElement, "MiniCandlestickChart");

/** React wrapper for `<mini-ohlc-chart>`. */
export const MiniOhlcChart = createReactChart("mini-ohlc-chart", MiniOhlcChartElement, "MiniOhlcChart");

/** React wrapper for `<mini-combo-chart>`. */
export const MiniComboChart = createReactChart("mini-combo-chart", MiniComboChartElement, "MiniComboChart");

/** React wrapper for `<mini-bullet-chart>`. */
export const MiniBulletChart = createReactChart("mini-bullet-chart", MiniBulletChartElement, "MiniBulletChart");

/** React wrapper for `<mini-win-loss-chart>`. */
export const MiniWinLossChart = createReactChart("mini-win-loss-chart", MiniWinLossChartElement, "MiniWinLossChart");

/** React wrapper for `<mini-range-bar-chart>`. */
export const MiniRangeBarChart = createReactChart("mini-range-bar-chart", MiniRangeBarChartElement, "MiniRangeBarChart");

/** React wrapper for `<mini-scatter-chart>`. */
export const MiniScatterChart = createReactChart("mini-scatter-chart", MiniScatterChartElement, "MiniScatterChart");
