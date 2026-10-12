// mini-candlestick-chart.js — Responsive SVG candlestick sparkline Custom Element.

import { createCandlestickLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay, setLengthProperty } from "../core/svg.js";

/**
 * @typedef {Object} CandleCache
 * @property {SVGGElement} group
 * @property {SVGLineElement} wick
 * @property {SVGRectElement} body
 */

/**
 * Renders OHLC data as a financial candlestick sparkline with entrance animations and interactions.
 *
 * @extends MiniChartElement
 */
export class MiniCandlestickChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "hollow-bullish",
    "wick-width",
    "gap",
    "min",
    "max",
    "interactive",
  ];

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** @type {boolean} */
  #initialized = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {CandleCache[]} */
  #candles = [];

  /** @type {number[][]} */
  #currentData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Candlestick";
  }

  /**
   * Cancels pending timers and animation frames on disconnection. Interaction
   * listeners stay attached, so a moved element keeps emitting events.
   * @override
   */
  cleanup() {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
  }

  /**
   * Overrides the default data parser to support 2D arrays for OHLC.
   * @override
   * @param {string | null} raw JSON text of the `data` attribute.
   * @returns {number[][]}
   */
  parseData(raw) {
    try {
      const parsed = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) => Array.isArray(item) && item.length >= 4 && item.slice(0, 4).every(Number.isFinite)
      );
    } catch {
      return [];
    }
  }

  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data);

    if (!this.#initialized) {
      this.#createDOM(label);
      this.#initialized = true;
    } else if (this.#svg) {
      this.#svg.setAttribute("aria-label", label);
      const title = this.#svg.querySelector("title");
      if (title) title.textContent = label;
    }

    this.#applyOptions();
    this.#updateChart(data);
  }

  /**
   * Applies the styling attributes on every render, so changing them after the
   * first render takes effect. An explicit `wick-width` wins over the inherited
   * `--mini-chart-wick-width` token.
   */
  #applyOptions() {
    if (!this.#svg) return;
    if (this.getAttribute("hollow-bullish") === "false") {
      this.#svg.removeAttribute("data-hollow-bullish");
    } else {
      this.#svg.setAttribute("data-hollow-bullish", "");
    }
    setLengthProperty(this.#svg, "--_mc-wick", this.getAttribute("wick-width"));
  }

  /**
   * Builds the static DOM structure exactly once.
   * @param {string} label 
   */
  #createDOM(label) {
    // Static text: per-instance options live on the svg (see #applyOptions), never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --_mc-wick: initial; }
[part="candle"] { transition: opacity 0.2s ease, filter 0.2s ease; cursor: default; pointer-events: all; }
[part="wick"] { stroke: currentColor; stroke-width: var(--_mc-wick, var(--mini-chart-wick-width, 0.75)); transition: stroke-width 0.2s ease; stroke-linecap: square; pointer-events: none; }
[part="body"] { stroke: currentColor; stroke-width: var(--_mc-wick, var(--mini-chart-wick-width, 0.75)); pointer-events: all; }
[part="candle"][data-bullish] { color: var(--mini-chart-bullish-color, #10b981); fill: currentColor; }
svg[data-hollow-bullish] [part="candle"][data-bullish] { fill: transparent; }
[part="candle"]:not([data-bullish]) { color: var(--mini-chart-bearish-color, #ef4444); fill: currentColor; }
:host([interactive]) [part="candle"] { cursor: pointer; }
:host([interactive]) [part="candle"]:hover { opacity: 1 !important; filter: brightness(1.2); }
:host([interactive]) [part="candles"]:has([part="candle"]:hover) [part="candle"]:not(:hover) { opacity: 0.45; }`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "candles" }));
    
    this.#svg.append(this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    const group = target?.closest('[part~="candle"]');
    if (!group || !group.hasAttribute("data-index")) return;

    const index = parseInt(group.getAttribute("data-index") || "0", 10);
    const candleData = this.#currentData[index];
    if (!candleData) return;

    const [open, high, low, close] = candleData;
    const change = close - open;
    const changePercent = open !== 0 ? (change / open) * 100 : 0;
    const isBullish = close >= open;

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: {
        index,
        open,
        high,
        low,
        close,
        isBullish,
        change,
        changePercent: Number(changePercent.toFixed(2)),
        element: group,
      },
    }));
  };

  #onClick = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    const group = target?.closest('[part~="candle"]');
    if (!group || !group.hasAttribute("data-index")) return;

    const index = parseInt(group.getAttribute("data-index") || "0", 10);
    const candleData = this.#currentData[index];
    if (!candleData) return;

    const [open, high, low, close] = candleData;
    const change = close - open;
    const changePercent = open !== 0 ? (change / open) * 100 : 0;
    const isBullish = close >= open;

    this.dispatchEvent(new CustomEvent("sparkline-select", {
      bubbles: true,
      composed: true,
      detail: {
        index,
        open,
        high,
        low,
        close,
        change,
        changePercent: Number(changePercent.toFixed(2)),
        isBullish,
        element: group,
      },
    }));
  };

  #onPointerLeave = () => {
    if (!this.hasAttribute("interactive")) return;
    this.dispatchEvent(new CustomEvent("sparkline-leave", {
      bubbles: true,
      composed: true,
    }));
  };

  /**
   * Attaches the interaction listeners once. They sit on nodes of the element's
   * own shadow tree, so they cannot leak and stay attached when the element is
   * disconnected and reconnected (moved, reordered, teleported).
   */
  #setupInteractionListeners() {
    if (this.#listenersAttached) return;
    this.#listenersAttached = true;
    this.#container?.addEventListener("pointerover", this.#onPointerMove);
    this.#container?.addEventListener("click", this.#onClick);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * Updates SVG attributes and triggers animations natively.
   * 
   * @param {number[][]} data Parsed OHLC chart values.
   */
  #updateChart(data) {
    if (!this.#container || !this.#svg) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }

    this.#currentData = data;

    if (data.length === 0) {
      for (const candle of this.#candles) {
        candle.group.style.display = "none";
      }
      return;
    }

    const gapAttr = parseFloat(this.getAttribute("gap") || "0.2");
    const gapRatio = !isNaN(gapAttr) ? Math.max(0, Math.min(0.8, gapAttr)) : 0.2;

    const minAttr = parseFloat(this.getAttribute("min") || "");
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    const min = !isNaN(minAttr) ? minAttr : undefined;
    const max = !isNaN(maxAttr) ? maxAttr : undefined;

    const { candles } = createCandlestickLayout(data, { 
      width: this.chartWidth, 
      height: this.chartHeight,
      gapRatio,
      min,
      max,
    });

    const isInitial = this.#candles.length === 0;

    // Expand candle cache
    while (this.#candles.length < candles.length) {
      const group = /** @type {SVGGElement} */ (createSvgElement("g", { part: "candle" }));
      const wick = /** @type {SVGLineElement} */ (createSvgElement("line", { part: "wick" }));
      const body = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "body" }));
      
      group.append(wick, body);
      this.#container.append(group);
      
      this.#candles.push({ group, wick, body });
    }

    if (isInitial) {
      // Step 1: Set initial flat state (at Open price)
      candles.forEach((geo, index) => {
        const cache = this.#candles[index];
        cache.group.style.display = "";
        cache.group.setAttribute("data-index", String(index));
        if (geo.isBullish) {
          cache.group.setAttribute("data-bullish", "true");
        } else {
          cache.group.removeAttribute("data-bullish");
        }

        cache.wick.style.transition = "none";
        cache.body.style.transition = "none";

        cache.wick.setAttribute("x1", String(geo.x + geo.bodyWidth / 2));
        cache.wick.setAttribute("x2", String(geo.x + geo.bodyWidth / 2));
        cache.wick.setAttribute("y1", String(geo.open));
        cache.wick.setAttribute("y2", String(geo.open));

        cache.body.setAttribute("x", String(geo.x));
        cache.body.setAttribute("y", String(geo.open));
        cache.body.setAttribute("width", String(geo.bodyWidth));
        cache.body.setAttribute("height", "0");
      });

      // Step 2: Single batch reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Trigger staggered expansion; the whole stagger is capped, however many candles there are.
      candles.forEach((geo, index) => {
        const cache = this.#candles[index];
        const delay = entranceDelay(index, candles.length, 30);
        cache.wick.style.transition = `all 0.4s ease-out ${delay}ms`;
        cache.body.style.transition = `all 0.4s ease-out ${delay}ms`;

        cache.wick.setAttribute("y1", String(geo.high));
        cache.wick.setAttribute("y2", String(geo.low));

        cache.body.setAttribute("y", String(geo.bodyY));
        cache.body.setAttribute("height", String(geo.bodyHeight));
      });

      const maxDuration = 400 + entranceDelay(candles.length - 1, candles.length, 30) + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          this.#candles.forEach((c) => {
            if (c.group.isConnected) {
              c.wick.style.transition = "";
              c.body.style.transition = "";
            }
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Normal update
      this.#candles.forEach((cache, index) => {
        if (index >= candles.length) {
          cache.group.style.display = "none";
          return;
        }
        
        cache.group.style.display = "";
        cache.group.setAttribute("data-index", String(index));
        const geo = candles[index];

        if (geo.isBullish) {
          cache.group.setAttribute("data-bullish", "true");
        } else {
          cache.group.removeAttribute("data-bullish");
        }

        cache.wick.style.transition = "";
        cache.body.style.transition = "";

        cache.wick.setAttribute("x1", String(geo.x + geo.bodyWidth / 2));
        cache.wick.setAttribute("x2", String(geo.x + geo.bodyWidth / 2));
        cache.wick.setAttribute("y1", String(geo.high));
        cache.wick.setAttribute("y2", String(geo.low));

        cache.body.setAttribute("x", String(geo.x));
        cache.body.setAttribute("y", String(geo.bodyY));
        cache.body.setAttribute("width", String(geo.bodyWidth));
        cache.body.setAttribute("height", String(geo.bodyHeight));
      });
    }
  }
}
