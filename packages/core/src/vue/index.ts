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
import { MiniHeatmapChart as MiniHeatmapChartElement } from "../components/mini-heatmap-chart.js";
import { MiniStackedBarChart as MiniStackedBarChartElement } from "../components/mini-stacked-bar-chart.js";
import { MiniWaterfallChart as MiniWaterfallChartElement } from "../components/mini-waterfall-chart.js";
import { MiniFunnelChart as MiniFunnelChartElement } from "../components/mini-funnel-chart.js";
import { MiniBoxPlotChart as MiniBoxPlotChartElement } from "../components/mini-box-plot-chart.js";
import { MiniRadarChart as MiniRadarChartElement } from "../components/mini-radar-chart.js";
import { MiniTreemapChart as MiniTreemapChartElement } from "../components/mini-treemap-chart.js";
import {
  attributeOnlyNames,
  createChartAttributes,
  toAttributeName,
  toDataAttribute,
} from "../core/framework-attributes.js";
import { defineMiniChart } from "../core/registration.js";

function createVueChart(componentName: string, tagName: string, component: CustomElementConstructor) {
  const observedAttributes: readonly string[] = (component as { observedAttributes?: string[] }).observedAttributes ?? [];
  const chartAttributes = createChartAttributes(tagName, observedAttributes);

  return defineComponent({
    name: componentName,
    // Attributes are converted and spread below; inheriting them as well would apply them twice.
    inheritAttrs: false,
    props: {
      data: {
        // Number: `<mini-bullet-chart>` accepts a bare value.
        type: [Array, Object, String, Number] as PropType<any>,
        default: () => [],
      },
      label: {
        type: String,
        default: undefined,
      },
      interactive: {
        type: [Boolean, String] as PropType<boolean | string>,
        default: undefined,
      },
      /** Instance options (camelCase names), set as the element's `options` property. */
      options: {
        type: Object as PropType<Readonly<Record<string, unknown>>>,
        default: undefined,
      },
      /** Space-separated preset names; the rightmost wins. */
      preset: {
        type: String,
        default: undefined,
      },
    },
    emits: ["sparkline-hover", "sparkline-leave", "sparkline-select", "slice-select", "zone-change", "progress-complete"],
    setup(props, { attrs, emit }) {
      defineMiniChart(tagName, component);

      return () => {
        const domAttrs: Record<string, any> = {};

        for (const [key, val] of Object.entries(attrs)) {
          // `^` makes Vue call setAttribute() instead of assigning a property
          // that would shadow `Node.prototype.normalize()`; SSR drops the prefix.
          const attributeOnlyName = toAttributeName(key);
          if (attributeOnlyNames.includes(attributeOnlyName)) {
            domAttrs[`^${attributeOnlyName}`] = chartAttributes.valueOf(attributeOnlyName, val);
            continue;
          }

          // Only the chart's observed attributes are converted; class, style,
          // id, aria-*, data-* and listeners reach the element untouched.
          const name = chartAttributes.nameOf(key);
          if (name === null) domAttrs[key] = val;
          else domAttrs[name] = chartAttributes.valueOf(name, val);
        }

        // `data` stays JSON text: Vue assigns it through the element's `data`
        // setter, which stores a string unchanged, and SSR drops non-primitive values.
        domAttrs.data = toDataAttribute(props.data);
        domAttrs.label = props.label;
        domAttrs.preset = props.preset;
        // `.` makes Vue assign the property; SSR drops it, since an object has no attribute form.
        domAttrs[".options"] = props.options;
        domAttrs["onSparkline-hover"] = (e: CustomEvent) => emit("sparkline-hover", e);
        domAttrs["onSparkline-leave"] = (e: CustomEvent) => emit("sparkline-leave", e);
        domAttrs["onSparkline-select"] = (e: CustomEvent) => emit("sparkline-select", e);
        domAttrs["onSlice-select"] = (e: CustomEvent) => emit("slice-select", e);
        domAttrs["onZone-change"] = (e: CustomEvent) => emit("zone-change", e);
        domAttrs["onProgress-complete"] = (e: CustomEvent) => emit("progress-complete", e);

        if (props.interactive === true || props.interactive === "" || props.interactive === "true") {
          domAttrs.interactive = "";
        }

        return h(tagName, domAttrs);
      };
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

/** Vue wrapper for `<mini-heatmap-chart>`. */
export const MiniHeatmapChart = createVueChart("MiniHeatmapChart", "mini-heatmap-chart", MiniHeatmapChartElement);

/** Vue wrapper for `<mini-stacked-bar-chart>`. */
export const MiniStackedBarChart = createVueChart("MiniStackedBarChart", "mini-stacked-bar-chart", MiniStackedBarChartElement);

/** Vue wrapper for `<mini-waterfall-chart>`. */
export const MiniWaterfallChart = createVueChart("MiniWaterfallChart", "mini-waterfall-chart", MiniWaterfallChartElement);

/** Vue wrapper for `<mini-funnel-chart>`. */
export const MiniFunnelChart = createVueChart("MiniFunnelChart", "mini-funnel-chart", MiniFunnelChartElement);

/** Vue wrapper for `<mini-box-plot-chart>`. */
export const MiniBoxPlotChart = createVueChart("MiniBoxPlotChart", "mini-box-plot-chart", MiniBoxPlotChartElement);

/** Vue wrapper for `<mini-radar-chart>`. */
export const MiniRadarChart = createVueChart("MiniRadarChart", "mini-radar-chart", MiniRadarChartElement);

/** Vue wrapper for `<mini-treemap-chart>`. */
export const MiniTreemapChart = createVueChart("MiniTreemapChart", "mini-treemap-chart", MiniTreemapChartElement);
