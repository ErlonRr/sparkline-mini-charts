// index.ts — React wrappers for the native Sparkline Mini Charts elements.

import { createElement, forwardRef, type HTMLAttributes } from "react";
import { MiniBarChart as MiniBarChartElement } from "../components/mini-bar-chart.js";
import { MiniHalfPieChart as MiniHalfPieChartElement } from "../components/mini-half-pie-chart.js";
import { MiniLineChart as MiniLineChartElement } from "../components/mini-line-chart.js";
import { MiniPieChart as MiniPieChartElement } from "../components/mini-pie-chart.js";
import { defineMiniChart } from "../core/registration.js";

/** Properties shared by every React sparkline wrapper. */
export interface MiniChartProps extends HTMLAttributes<HTMLElement> {
  data?: readonly number[];
  label?: string;
}

function createReactChart(tagName: string, component: CustomElementConstructor, displayName: string) {
  defineMiniChart(tagName, component);

  const Chart = forwardRef<HTMLElement, MiniChartProps>(function SparklineChart({ data = [], label, ...attributes }, ref) {
    return createElement(tagName, {
      ...attributes,
      ref,
      data: JSON.stringify(data),
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

/** React wrapper for `<mini-pie-chart>`. */
export const MiniPieChart = createReactChart("mini-pie-chart", MiniPieChartElement, "MiniPieChart");

/** React wrapper for `<mini-half-pie-chart>`. */
export const MiniHalfPieChart = createReactChart("mini-half-pie-chart", MiniHalfPieChartElement, "MiniHalfPieChart");
