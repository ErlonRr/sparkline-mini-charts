// entries.cts — Type fixture: under Node16, a CommonJS module that require()s the package gets the .d.cts declarations.

import sparkline = require("sparkline-mini-charts");
import define = require("sparkline-mini-charts/define");
import register = require("sparkline-mini-charts/register");
import area = require("sparkline-mini-charts/mini-area-chart");
import bar = require("sparkline-mini-charts/mini-bar-chart");
import bullet = require("sparkline-mini-charts/mini-bullet-chart");
import candlestick = require("sparkline-mini-charts/mini-candlestick-chart");
import combo = require("sparkline-mini-charts/mini-combo-chart");
import gauge = require("sparkline-mini-charts/mini-gauge-chart");
import halfPie = require("sparkline-mini-charts/mini-half-pie-chart");
import line = require("sparkline-mini-charts/mini-line-chart");
import ohlc = require("sparkline-mini-charts/mini-ohlc-chart");
import pie = require("sparkline-mini-charts/mini-pie-chart");
import progress = require("sparkline-mini-charts/mini-progress-chart");
import radialBar = require("sparkline-mini-charts/mini-radial-bar-chart");
import rangeBar = require("sparkline-mini-charts/mini-range-bar-chart");
import scatter = require("sparkline-mini-charts/mini-scatter-chart");
import heatmap = require("sparkline-mini-charts/mini-heatmap-chart");
import stackedBar = require("sparkline-mini-charts/mini-stacked-bar-chart");
import waterfall = require("sparkline-mini-charts/mini-waterfall-chart");
import funnel = require("sparkline-mini-charts/mini-funnel-chart");
import boxPlot = require("sparkline-mini-charts/mini-box-plot-chart");
import radar = require("sparkline-mini-charts/mini-radar-chart");
import treemap = require("sparkline-mini-charts/mini-treemap-chart");
import stackedArea = require("sparkline-mini-charts/mini-stacked-area-chart");
import stream = require("sparkline-mini-charts/mini-stream-chart");
import winLoss = require("sparkline-mini-charts/mini-win-loss-chart");
import math = require("sparkline-mini-charts/math");
import angular = require("sparkline-mini-charts/angular");
import react = require("sparkline-mini-charts/react");
import vue = require("sparkline-mini-charts/vue");

/** Every component subpath exports a custom element class from its CommonJS build too. */
const elements: CustomElementConstructor[] = [
  area.MiniAreaChart,
  bar.MiniBarChart,
  sparkline.MiniBarChart,
  bullet.MiniBulletChart,
  candlestick.MiniCandlestickChart,
  combo.MiniComboChart,
  gauge.MiniGaugeChart,
  halfPie.MiniHalfPieChart,
  line.MiniLineChart,
  ohlc.MiniOhlcChart,
  pie.MiniPieChart,
  progress.MiniProgressChart,
  radialBar.MiniRadialBarChart,
  rangeBar.MiniRangeBarChart,
  scatter.MiniScatterChart,
  heatmap.MiniHeatmapChart,
  stackedBar.MiniStackedBarChart,
  waterfall.MiniWaterfallChart,
  funnel.MiniFunnelChart,
  boxPlot.MiniBoxPlotChart,
  radar.MiniRadarChart,
  treemap.MiniTreemapChart,
  stackedArea.MiniStackedAreaChart,
  stream.MiniStreamChart,
  winLoss.MiniWinLossChart,
];

sparkline.defineMiniChart("mini-line-chart", line.MiniLineChart);
define.defineMiniCharts();

const chart: InstanceType<typeof line.MiniLineChart> = new line.MiniLineChart();
chart.data = [1, 2, 3];

const domain: [number, number] = math.createDomain([1, 2, 3], { includeZero: true });
const x: number = math.createLinearScale(domain, [0, math.TAU]).project(2);

// @ts-expect-error The math entry is typed under require() as well.
math.createDomain("1,2,3");

/**
 * The framework entries resolve under require() too. The Angular declarations
 * import the ESM-only `@angular/core` with `resolution-mode: "import"`.
 */
const reactProps: react.MiniChartProps = { data: [1, 2, 3], interactive: true };
// @ts-expect-error React props are typed under require() as well.
const badReactProps: react.MiniChartProps = { interactive: 42 };
const frameworks = [react.MiniLineChart, vue.MiniLineChart, angular.MiniChartDirective, angular.MiniLineChartDirective, angular.SPARKLINE_DIRECTIVES.length] as const;

export = { badReactProps, elements, frameworks, reactProps, register, x };
