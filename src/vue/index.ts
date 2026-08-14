// index.ts — Vue 3 wrappers for the native Sparkline Mini Charts elements.

import { defineComponent, h, type PropType } from "vue";
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

function createVueChart(componentName: string, tagName: string, component: CustomElementConstructor) {
  return defineComponent({
    name: componentName,
    inheritAttrs: false,
    props: {
      data: {
        type: [Array, Object, String] as PropType<any>,
        default: () => [],
      },
      label: {
        type: String,
        default: undefined,
      },
    },
    setup(props, { attrs }) {
      defineMiniChart(tagName, component);

      return () =>
        h(tagName, {
          ...attrs,
          data: typeof props.data === "string" ? props.data : JSON.stringify(props.data),
          label: props.label,
        });
    },
  });
}

/** Vue wrapper for `<mini-line-chart>`. */
export const MiniLineChart = createVueChart("MiniLineChart", "mini-line-chart", MiniLineChartElement);

/** Vue wrapper for `<mini-bar-chart>`. */
export const MiniBarChart = createVueChart("MiniBarChart", "mini-bar-chart", MiniBarChartElement);

/** Vue wrapper for `<mini-area-chart>`. */
export const MiniAreaChart = createVueChart("MiniAreaChart", "mini-area-chart", MiniAreaChartElement);

/** Vue wrapper for `<mini-stacked-area-chart>`. */
export const MiniStackedAreaChart = createVueChart("MiniStackedAreaChart", "mini-stacked-area-chart", MiniStackedAreaChartElement);

/** Vue wrapper for `<mini-stream-chart>`. */
export const MiniStreamChart = createVueChart("MiniStreamChart", "mini-stream-chart", MiniStreamChartElement);

/** Vue wrapper for `<mini-pie-chart>`. */
export const MiniPieChart = createVueChart("MiniPieChart", "mini-pie-chart", MiniPieChartElement);

/** Vue wrapper for `<mini-half-pie-chart>`. */
export const MiniHalfPieChart = createVueChart("MiniHalfPieChart", "mini-half-pie-chart", MiniHalfPieChartElement);

/** Vue wrapper for `<mini-radial-bar-chart>`. */
export const MiniRadialBarChart = createVueChart("MiniRadialBarChart", "mini-radial-bar-chart", MiniRadialBarChartElement);

/** Vue wrapper for `<mini-progress-chart>`. */
export const MiniProgressChart = createVueChart("MiniProgressChart", "mini-progress-chart", MiniProgressChartElement);

/** Vue wrapper for `<mini-gauge-chart>`. */
export const MiniGaugeChart = createVueChart("MiniGaugeChart", "mini-gauge-chart", MiniGaugeChartElement);

/** Vue wrapper for `<mini-candlestick-chart>`. */
export const MiniCandlestickChart = createVueChart("MiniCandlestickChart", "mini-candlestick-chart", MiniCandlestickChartElement);

/** Vue wrapper for `<mini-ohlc-chart>`. */
export const MiniOhlcChart = createVueChart("MiniOhlcChart", "mini-ohlc-chart", MiniOhlcChartElement);

/** Vue wrapper for `<mini-combo-chart>`. */
export const MiniComboChart = createVueChart("MiniComboChart", "mini-combo-chart", MiniComboChartElement);

/** Vue wrapper for `<mini-bullet-chart>`. */
export const MiniBulletChart = createVueChart("MiniBulletChart", "mini-bullet-chart", MiniBulletChartElement);

/** Vue wrapper for `<mini-win-loss-chart>`. */
export const MiniWinLossChart = createVueChart("MiniWinLossChart", "mini-win-loss-chart", MiniWinLossChartElement);

/** Vue wrapper for `<mini-range-bar-chart>`. */
export const MiniRangeBarChart = createVueChart("MiniRangeBarChart", "mini-range-bar-chart", MiniRangeBarChartElement);

/** Vue wrapper for `<mini-scatter-chart>`. */
export const MiniScatterChart = createVueChart("MiniScatterChart", "mini-scatter-chart", MiniScatterChartElement);
