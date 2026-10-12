// entries.ts — Type fixture: the published entry points resolve to declarations through package.json exports.

import { defineMiniChart, MiniBarChart } from "sparkline-mini-charts";
import { defineMiniCharts } from "sparkline-mini-charts/define";
import "sparkline-mini-charts/register";
import { MiniAreaChart } from "sparkline-mini-charts/mini-area-chart";
import { MiniBarChart as MiniBarChartLeaf } from "sparkline-mini-charts/mini-bar-chart";
import { MiniBulletChart } from "sparkline-mini-charts/mini-bullet-chart";
import { MiniCandlestickChart } from "sparkline-mini-charts/mini-candlestick-chart";
import { MiniComboChart } from "sparkline-mini-charts/mini-combo-chart";
import { MiniGaugeChart } from "sparkline-mini-charts/mini-gauge-chart";
import { MiniHalfPieChart } from "sparkline-mini-charts/mini-half-pie-chart";
import { MiniLineChart } from "sparkline-mini-charts/mini-line-chart";
import { MiniOhlcChart } from "sparkline-mini-charts/mini-ohlc-chart";
import { MiniPieChart } from "sparkline-mini-charts/mini-pie-chart";
import { MiniProgressChart } from "sparkline-mini-charts/mini-progress-chart";
import { MiniRadialBarChart } from "sparkline-mini-charts/mini-radial-bar-chart";
import { MiniRangeBarChart } from "sparkline-mini-charts/mini-range-bar-chart";
import { MiniScatterChart } from "sparkline-mini-charts/mini-scatter-chart";
import { MiniHeatmapChart } from "sparkline-mini-charts/mini-heatmap-chart";
import { MiniStackedBarChart } from "sparkline-mini-charts/mini-stacked-bar-chart";
import { MiniWaterfallChart } from "sparkline-mini-charts/mini-waterfall-chart";
import { MiniFunnelChart } from "sparkline-mini-charts/mini-funnel-chart";
import { MiniBoxPlotChart } from "sparkline-mini-charts/mini-box-plot-chart";
import { MiniRadarChart } from "sparkline-mini-charts/mini-radar-chart";
import { MiniTreemapChart } from "sparkline-mini-charts/mini-treemap-chart";
import { MiniStackedAreaChart } from "sparkline-mini-charts/mini-stacked-area-chart";
import { MiniStreamChart } from "sparkline-mini-charts/mini-stream-chart";
import { MiniWinLossChart } from "sparkline-mini-charts/mini-win-loss-chart";
import { createDomain, createLinearScale, TAU } from "sparkline-mini-charts/math";
import { MiniChartDirective, MiniLineChartDirective, SPARKLINE_DIRECTIVES } from "sparkline-mini-charts/angular";
import { MiniLineChart as ReactLineChart, type MiniChartProps } from "sparkline-mini-charts/react";
import { MiniLineChart as VueLineChart } from "sparkline-mini-charts/vue";

/** Every component subpath exports a custom element class. */
const elements: CustomElementConstructor[] = [
  MiniAreaChart,
  MiniBarChart,
  MiniBarChartLeaf,
  MiniBulletChart,
  MiniCandlestickChart,
  MiniComboChart,
  MiniGaugeChart,
  MiniHalfPieChart,
  MiniLineChart,
  MiniOhlcChart,
  MiniPieChart,
  MiniProgressChart,
  MiniRadialBarChart,
  MiniRangeBarChart,
  MiniScatterChart,
  MiniHeatmapChart,
  MiniStackedBarChart,
  MiniWaterfallChart,
  MiniFunnelChart,
  MiniBoxPlotChart,
  MiniRadarChart,
  MiniTreemapChart,
  MiniStackedAreaChart,
  MiniStreamChart,
  MiniWinLossChart,
];

defineMiniChart("mini-line-chart", MiniLineChart);
defineMiniCharts();

const line: MiniLineChart = new MiniLineChart();
line.data = [1, 2, 3];
const parsed: unknown = line.data;

const domain: [number, number] = createDomain([1, 2, 3], { includeZero: true });
const x: number = createLinearScale(domain, [0, TAU]).project(2);

// @ts-expect-error The math entry is typed: createDomain takes an array of numbers.
createDomain("1,2,3");

/** The framework entries resolve to typed declarations, not `any`. */
const reactProps: MiniChartProps = { data: [1, 2, 3], interactive: true };
// @ts-expect-error React props are typed: `interactive` is a boolean.
const badReactProps: MiniChartProps = { interactive: 42 };
const frameworks = [ReactLineChart, VueLineChart, MiniChartDirective, MiniLineChartDirective, SPARKLINE_DIRECTIVES.length] as const;

export { badReactProps, elements, frameworks, parsed, reactProps, x };
