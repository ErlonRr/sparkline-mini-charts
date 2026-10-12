// index.js — Public entry point for shared sparkline utilities and components.

export { MiniBarChart } from "./components/mini-bar-chart.js";
export { MiniHalfPieChart } from "./components/mini-half-pie-chart.js";
export { MiniLineChart } from "./components/mini-line-chart.js";
export { MiniAreaChart } from "./components/mini-area-chart.js";
export { MiniStackedAreaChart } from "./components/mini-stacked-area-chart.js";
export { MiniStreamChart } from "./components/mini-stream-chart.js";
export { MiniGaugeChart } from "./components/mini-gauge-chart.js";
export { MiniProgressChart } from "./components/mini-progress-chart.js";
export { MiniCandlestickChart } from "./components/mini-candlestick-chart.js";
export { MiniOhlcChart } from "./components/mini-ohlc-chart.js";
export { MiniComboChart } from "./components/mini-combo-chart.js";
export { MiniRadialBarChart } from "./components/mini-radial-bar-chart.js";
export { MiniPieChart } from "./components/mini-pie-chart.js";
export { MiniBulletChart } from "./components/mini-bullet-chart.js";
export { MiniWinLossChart } from "./components/mini-win-loss-chart.js";
export { MiniRangeBarChart } from "./components/mini-range-bar-chart.js";
export { MiniScatterChart } from "./components/mini-scatter-chart.js";
export { MiniHeatmapChart } from "./components/mini-heatmap-chart.js";
export { MiniStackedBarChart } from "./components/mini-stacked-bar-chart.js";
export { MiniWaterfallChart } from "./components/mini-waterfall-chart.js";
export { MiniFunnelChart } from "./components/mini-funnel-chart.js";
export { MiniBoxPlotChart } from "./components/mini-box-plot-chart.js";
export { MiniRadarChart } from "./components/mini-radar-chart.js";
export { MiniTreemapChart } from "./components/mini-treemap-chart.js";

export { configureMiniCharts, defineChartPreset } from "./core/config.js";

/** @typedef {import("./core/mini-chart-element.js").SparklinePointDetail} SparklinePointDetail */
/** @typedef {import("./core/mini-chart-element.js").OptionDescriptor} OptionDescriptor */
/** @typedef {import("./core/config.js").MiniChartsConfig} MiniChartsConfig */
export { parseNumericData } from "./core/data.js";
export { defineMiniChart } from "./core/registration.js";
export { SEGMENT_COLORS, getSegmentColor } from "./core/palette.js";
export {
  TAU,
  createBarLayout,
  createBulletLayout,
  createCartesianLayout,
  createCandlestickLayout,
  createDomain,
  createLinearScale,
  createRadialLayout,
  createRadialBarLayout,
  createRangeBarLayout,
  createScatterLayout,
  createSmoothPath,
  createSmoothAreaPath,
  createStepPath,
  createStackedLayout,
  createWinLossLayout,
  describePieSector,
  describeArc,
  polarToCartesian,
} from "./core/geometry.js";
