// index.ts — React wrappers for the native Sparkline Mini Charts elements.

import {
  createElement,
  forwardRef,
  type CSSProperties,
  type DOMAttributes,
  type ForwardRefExoticComponent,
  type HTMLAttributes,
  type RefAttributes,
} from "react";
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

/** Event map for Sparkline custom DOM events */
export interface SparklineEventHandlers {
  onSparklineHover?: (event: CustomEvent) => void;
  onSparklineLeave?: (event: CustomEvent) => void;
  onSliceSelect?: (event: CustomEvent) => void;
  onZoneChange?: (event: CustomEvent) => void;
}

/** Base attributes shared across every sparkline React component. */
export interface BaseSparklineProps extends Omit<HTMLAttributes<HTMLElement>, "data">, SparklineEventHandlers {
  data?: any;
  label?: string;
  interactive?: boolean;
}

// ---------------------------------------------------------------------------
// Per-Chart Props Interfaces
// ---------------------------------------------------------------------------

export interface MiniLineChartProps extends BaseSparklineProps {
  curve?: "linear" | "smooth" | "step";
  points?: "none" | "all" | "last" | "ends";
  min?: number;
  max?: number;
  "reference-value"?: number;
  referenceValue?: number;
  "trend-color"?: "auto" | "none";
  trendColor?: "auto" | "none";
}

export interface MiniBarChartProps extends BaseSparklineProps {
  gap?: number;
  radius?: number;
  baseline?: number;
  min?: number;
  max?: number;
}

export interface MiniAreaChartProps extends BaseSparklineProps {
  curve?: "linear" | "smooth" | "step";
  points?: "none" | "all" | "last" | "ends";
  gradient?: boolean | string | string[];
  min?: number;
  max?: number;
  "reference-value"?: number;
  referenceValue?: number;
  "trend-color"?: "auto" | "none";
  trendColor?: "auto" | "none";
}

export interface MiniStackedAreaChartProps extends BaseSparklineProps {
  curve?: "linear" | "smooth" | "step";
  normalize?: boolean;
}

export interface MiniStreamChartProps extends BaseSparklineProps {
  curve?: "linear" | "smooth" | "step";
}

export interface MiniPieChartProps extends BaseSparklineProps {
  "inner-radius"?: number;
  innerRadius?: number;
  donut?: number;
  "pad-angle"?: number;
  padAngle?: number;
  "start-angle"?: number;
  startAngle?: number;
}

export interface MiniHalfPieChartProps extends BaseSparklineProps {
  "inner-radius"?: number;
  innerRadius?: number;
  donut?: number;
}

export interface MiniRadialBarChartProps extends BaseSparklineProps {
  sweep?: number;
  "round-caps"?: boolean;
  roundCaps?: boolean;
  min?: number;
  max?: number;
  gradient?: boolean | string | string[] | string[][];
}

export interface MiniProgressChartProps extends BaseSparklineProps {
  min?: number;
  max?: number;
  "show-value"?: boolean;
  showValue?: boolean;
  unit?: string;
  gradient?: boolean | string | string[];
}

export interface MiniGaugeChartProps extends BaseSparklineProps {
  min?: number;
  max?: number;
  zones?: any;
  "needle-type"?: "triangle" | "line";
  needleType?: "triangle" | "line";
  "show-value"?: boolean;
  showValue?: boolean;
  gradient?: boolean | string | string[];
}

export interface MiniCandlestickChartProps extends BaseSparklineProps {
  "hollow-bullish"?: boolean;
  hollowBullish?: boolean;
  "wick-width"?: number;
  wickWidth?: number;
  gap?: number;
  min?: number;
  max?: number;
}

export interface MiniOhlcChartProps extends BaseSparklineProps {
  "tick-width"?: number;
  tickWidth?: number;
  gap?: number;
  min?: number;
  max?: number;
}

export interface MiniComboChartProps extends BaseSparklineProps {
  "shared-domain"?: boolean;
  sharedDomain?: boolean;
  curve?: "linear" | "smooth" | "step";
  "bar-gap"?: number;
  barGap?: number;
}

export interface MiniBulletChartProps extends BaseSparklineProps {
  target?: number;
  min?: number;
  max?: number;
  ranges?: any;
  gradient?: boolean | string | string[];
}

export interface MiniWinLossChartProps extends BaseSparklineProps {
  gap?: number;
  radius?: number;
  mode?: "win-loss" | "uptime";
  "win-color"?: string;
  winColor?: string;
  "loss-color"?: string;
  lossColor?: string;
  "tie-color"?: string;
  tieColor?: string;
}

export interface MiniRangeBarChartProps extends BaseSparklineProps {
  gap?: number;
  radius?: number;
  min?: number;
  max?: number;
}

export interface MiniScatterChartProps extends BaseSparklineProps {
  "point-radius"?: number;
  pointRadius?: number;
  "trend-line"?: boolean;
  trendLine?: boolean;
  "min-x"?: number;
  minX?: number;
  "max-x"?: number;
  maxX?: number;
  "min-y"?: number;
  minY?: number;
  "max-y"?: number;
  maxY?: number;
}

/** General backwards-compatible props interface. */
export interface MiniChartProps extends BaseSparklineProps {
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Component Factory
// ---------------------------------------------------------------------------

function createReactChart<P extends BaseSparklineProps>(
  tagName: string,
  component: CustomElementConstructor,
  displayName: string,
): ForwardRefExoticComponent<P & RefAttributes<HTMLElement>> {
  defineMiniChart(tagName, component);

  const Chart = forwardRef<HTMLElement, P>(function SparklineChart(props, ref) {
    const {
      data = [],
      label,
      interactive,
      onSparklineHover,
      onSparklineLeave,
      onSliceSelect,
      onZoneChange,
      ...rawProps
    } = props as any;

    const domAttributes: Record<string, any> = {
      ref,
      data: typeof data === "string" ? data : JSON.stringify(data),
      label,
    };

    if (interactive) {
      domAttributes.interactive = "";
    }

    // Convert camelCase props to kebab-case attributes
    for (const [key, val] of Object.entries(rawProps)) {
      if (val === undefined || val === null) continue;

      if (key === "onSparkline-hover" || key === "onSparkline-leave" || key === "onSlice-select" || key === "onZone-change") {
        domAttributes[key] = val;
        continue;
      }

      if (key.startsWith("on") && typeof val === "function") {
        domAttributes[key] = val;
        continue;
      }

      if (typeof val === "object") {
        const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        domAttributes[kebabKey] = JSON.stringify(val);
      } else if (typeof val === "boolean") {
        const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        if (val) domAttributes[kebabKey] = "";
      } else {
        const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        domAttributes[kebabKey] = val;
      }
    }

    return createElement(tagName, domAttributes);
  });

  Chart.displayName = displayName;
  return Chart as unknown as ForwardRefExoticComponent<P & RefAttributes<HTMLElement>>;
}

// ---------------------------------------------------------------------------
// Exported React Wrappers
// ---------------------------------------------------------------------------

/** React wrapper for `<mini-line-chart>`. */
export const MiniLineChart = createReactChart<MiniLineChartProps>("mini-line-chart", MiniLineChartElement, "MiniLineChart");

/** React wrapper for `<mini-bar-chart>`. */
export const MiniBarChart = createReactChart<MiniBarChartProps>("mini-bar-chart", MiniBarChartElement, "MiniBarChart");

/** React wrapper for `<mini-area-chart>`. */
export const MiniAreaChart = createReactChart<MiniAreaChartProps>("mini-area-chart", MiniAreaChartElement, "MiniAreaChart");

/** React wrapper for `<mini-stacked-area-chart>`. */
export const MiniStackedAreaChart = createReactChart<MiniStackedAreaChartProps>("mini-stacked-area-chart", MiniStackedAreaChartElement, "MiniStackedAreaChart");

/** React wrapper for `<mini-stream-chart>`. */
export const MiniStreamChart = createReactChart<MiniStreamChartProps>("mini-stream-chart", MiniStreamChartElement, "MiniStreamChart");

/** React wrapper for `<mini-pie-chart>`. */
export const MiniPieChart = createReactChart<MiniPieChartProps>("mini-pie-chart", MiniPieChartElement, "MiniPieChart");

/** React wrapper for `<mini-half-pie-chart>`. */
export const MiniHalfPieChart = createReactChart<MiniHalfPieChartProps>("mini-half-pie-chart", MiniHalfPieChartElement, "MiniHalfPieChart");

/** React wrapper for `<mini-radial-bar-chart>`. */
export const MiniRadialBarChart = createReactChart<MiniRadialBarChartProps>("mini-radial-bar-chart", MiniRadialBarChartElement, "MiniRadialBarChart");

/** React wrapper for `<mini-progress-chart>`. */
export const MiniProgressChart = createReactChart<MiniProgressChartProps>("mini-progress-chart", MiniProgressChartElement, "MiniProgressChart");

/** React wrapper for `<mini-gauge-chart>`. */
export const MiniGaugeChart = createReactChart<MiniGaugeChartProps>("mini-gauge-chart", MiniGaugeChartElement, "MiniGaugeChart");

/** React wrapper for `<mini-candlestick-chart>`. */
export const MiniCandlestickChart = createReactChart<MiniCandlestickChartProps>("mini-candlestick-chart", MiniCandlestickChartElement, "MiniCandlestickChart");

/** React wrapper for `<mini-ohlc-chart>`. */
export const MiniOhlcChart = createReactChart<MiniOhlcChartProps>("mini-ohlc-chart", MiniOhlcChartElement, "MiniOhlcChart");

/** React wrapper for `<mini-combo-chart>`. */
export const MiniComboChart = createReactChart<MiniComboChartProps>("mini-combo-chart", MiniComboChartElement, "MiniComboChart");

/** React wrapper for `<mini-bullet-chart>`. */
export const MiniBulletChart = createReactChart<MiniBulletChartProps>("mini-bullet-chart", MiniBulletChartElement, "MiniBulletChart");

/** React wrapper for `<mini-win-loss-chart>`. */
export const MiniWinLossChart = createReactChart<MiniWinLossChartProps>("mini-win-loss-chart", MiniWinLossChartElement, "MiniWinLossChart");

/** React wrapper for `<mini-range-bar-chart>`. */
export const MiniRangeBarChart = createReactChart<MiniRangeBarChartProps>("mini-range-bar-chart", MiniRangeBarChartElement, "MiniRangeBarChart");

/** React wrapper for `<mini-scatter-chart>`. */
export const MiniScatterChart = createReactChart<MiniScatterChartProps>("mini-scatter-chart", MiniScatterChartElement, "MiniScatterChart");
