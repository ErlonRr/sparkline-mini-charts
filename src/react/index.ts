// index.ts — React wrappers for the native Sparkline Mini Charts elements.

import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
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
import {
  attributeOnlyNames,
  createChartAttributes,
  toAttributeName,
  toDataAttribute,
} from "../core/framework-attributes.js";
import { defineMiniChart } from "../core/registration.js";

/** Event map for Sparkline custom DOM events */
export interface SparklineEventHandlers {
  /** `sparkline-hover`: the pointer is over a data point. */
  onSparklineHover?: (event: CustomEvent) => void;
  /** `sparkline-leave`: the pointer left the chart. */
  onSparklineLeave?: (event: CustomEvent) => void;
  /** `sparkline-select`: a candle was clicked (`<mini-candlestick-chart>`). */
  onSparklineSelect?: (event: CustomEvent) => void;
  /** `slice-select`: reserved; no chart dispatches it in 1.x. */
  onSliceSelect?: (event: CustomEvent) => void;
  /** `zone-change`: the needle moved into another zone (`<mini-gauge-chart>`). */
  onZoneChange?: (event: CustomEvent) => void;
  /** `progress-complete`: a render reached the maximum (`<mini-progress-chart>`). */
  onProgressComplete?: (event: CustomEvent) => void;
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
  /** `step` is `step-after`. */
  curve?: "linear" | "smooth" | "step" | "step-before" | "step-after";
  /** `ends` draws no markers; it is kept so existing code still compiles. */
  points?: "none" | "all" | "last" | "min-max" | "ends";
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
  /** `step` is `step-after`. */
  curve?: "linear" | "smooth" | "step" | "step-before" | "step-after";
  /** `ends` draws no markers; it is kept so existing code still compiles. */
  points?: "none" | "all" | "last" | "min-max" | "ends";
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
  /** `binary` is an alias of `win-loss`, and `uptime` of `status`. */
  mode?: "win-loss" | "binary" | "status" | "uptime";
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

type SparklineEventProp = keyof SparklineEventHandlers;

/** DOM event behind each event prop. Listeners are attached with `addEventListener`. */
const eventTypes: Readonly<Record<SparklineEventProp, string>> = {
  onSparklineHover: "sparkline-hover",
  onSparklineLeave: "sparkline-leave",
  onSparklineSelect: "sparkline-select",
  onSliceSelect: "slice-select",
  onZoneChange: "zone-change",
  onProgressComplete: "progress-complete",
};

const eventProps = Object.keys(eventTypes) as SparklineEventProp[];
const eventPropByType = new Map(eventProps.map((prop) => [eventTypes[prop], prop]));

function isEventProp(key: string): key is SparklineEventProp {
  return Object.hasOwn(eventTypes, key);
}

/** Whether the wrappers render on the server, where effects and refs never run. */
const isServer = typeof document === "undefined";

/**
 * Layout effects in the browser, plain effects on the server: neither runs
 * there, but React 18 warns about every layout effect during SSR.
 */
const useIsomorphicLayoutEffect = isServer ? useEffect : useLayoutEffect;

/**
 * Boolean HTML attributes passed through to the element. React 18 writes
 * `false` on a custom element as the string "false", which still turns the
 * attribute on, so `false` omits the prop instead.
 */
const booleanHtmlProps: ReadonlySet<string> = new Set(["hidden", "inert"]);

function createReactChart<P extends BaseSparklineProps>(
  tagName: string,
  component: CustomElementConstructor,
  displayName: string,
): ForwardRefExoticComponent<P & RefAttributes<HTMLElement>> {
  defineMiniChart(tagName, component);

  const observedAttributes: readonly string[] = (component as { observedAttributes?: string[] }).observedAttributes ?? [];
  const chartAttributes = createChartAttributes(tagName, observedAttributes);

  const Chart = forwardRef<HTMLElement, P>(function SparklineChart(props, forwardedRef) {
    const { data = [], className, ...rawProps } = props as Record<string, any>;
    const elementRef = useRef<HTMLElement | null>(null);
    const handlersRef = useRef<SparklineEventHandlers>({});

    const ref = useCallback(
      (element: HTMLElement | null) => {
        elementRef.current = element;
        if (typeof forwardedRef === "function") {
          const cleanup = (forwardedRef as (instance: HTMLElement | null) => unknown)(element);
          // React 19 runs a cleanup returned by the ref instead of calling it
          // with null, so a cleanup-returning callback ref keeps working.
          if (typeof cleanup === "function") {
            return () => {
              elementRef.current = null;
              cleanup();
            };
          }
        } else if (forwardedRef) {
          forwardedRef.current = element;
        }
        return undefined;
      },
      [forwardedRef],
    );

    // `data` is always JSON text: React 18 sets it as an attribute, React 19
    // through the element's `data` setter, and React 19 SSR drops objects.
    const domAttributes: Record<string, any> = { ref, data: toDataAttribute(data) };
    const handlers: SparklineEventHandlers = {};
    const attributeOnlyValues: Record<string, string | undefined> = {};

    // React 18 writes `className` as a literal `classname` attribute on custom elements.
    if (className !== undefined) domAttributes.class = className;

    for (const [key, val] of Object.entries(rawProps)) {
      if (isEventProp(key)) {
        if (typeof val === "function") handlers[key] = val;
        continue;
      }

      const attributeOnlyName = toAttributeName(key);
      if (attributeOnlyNames.includes(attributeOnlyName)) {
        attributeOnlyValues[attributeOnlyName] = chartAttributes.valueOf(attributeOnlyName, val);
        continue;
      }

      // Only the chart's observed attributes are converted. Everything else
      // (style, id, slot, tabIndex, aria-*, data-*, children…) reaches React untouched.
      const name = chartAttributes.nameOf(key);
      if (name === null) {
        if (!(val === false && booleanHtmlProps.has(key))) domAttributes[key] = val;
        continue;
      }

      const value = chartAttributes.valueOf(name, val);
      if (value !== undefined) domAttributes[name] = value;
    }

    // The server has no element to call `setAttribute()` on, so attribute-only
    // options are rendered as plain attributes there. The client sets them in
    // the effect below, and hydration must not report the server-only attribute.
    if (attributeOnlyNames.some((name) => attributeOnlyValues[name] !== undefined)) {
      if (isServer) Object.assign(domAttributes, attributeOnlyValues);
      else domAttributes.suppressHydrationWarning ??= true;
    }

    useIsomorphicLayoutEffect(() => {
      handlersRef.current = handlers;
    });

    // One listener per event that has a handler; it calls the latest handler,
    // so a new callback identity does not re-subscribe.
    const listenedTypes = eventProps.filter((prop) => handlers[prop]).map((prop) => eventTypes[prop]).join(" ");
    useIsomorphicLayoutEffect(() => {
      const element = elementRef.current;
      if (!element || listenedTypes === "") return;

      const types = listenedTypes.split(" ");
      const listener = (event: Event) => {
        const prop = eventPropByType.get(event.type);
        if (prop) handlersRef.current[prop]?.(event as CustomEvent);
      };

      for (const type of types) element.addEventListener(type, listener);
      return () => {
        for (const type of types) element.removeEventListener(type, listener);
      };
    }, [listenedTypes]);

    useIsomorphicLayoutEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      for (const name of attributeOnlyNames) {
        const value = attributeOnlyValues[name];
        if (value === undefined) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    }, attributeOnlyNames.map((name) => attributeOnlyValues[name]));

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
