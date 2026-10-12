// mini-ohlc-chart.js — Responsive SVG OHLC sparkline Custom Element.

import { createCandlestickLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay, setLengthProperty } from "../core/svg.js";

/**
 * Renders OHLC data as a financial OHLC tick sparkline with batch animations and interactions.
 *
 * @extends MiniChartElement
 */
export class MiniOhlcChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "tick-width",
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

  /** @type {SVGPathElement[]} */
  #bars = [];

  /** @type {number[][]} */
  #currentData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "OHLC";
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
   * first render takes effect. An explicit `tick-width` wins over the inherited
   * `--mini-chart-tick-width` token.
   */
  #applyOptions() {
    if (!this.#svg) return;
    setLengthProperty(this.#svg, "--_mc-tick", this.getAttribute("tick-width"));
  }

  /**
   * Builds the static DOM structure exactly once.
   * @param {string} label 
   */
  #createDOM(label) {
    // Static text: per-instance options live on the svg (see #applyOptions), never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --_mc-tick: initial; }
[part~="bar"] { 
  stroke-width: var(--_mc-tick, var(--mini-chart-tick-width, 0.75)); 
  stroke-linecap: square;
  fill: none;
  transition: opacity 0.2s ease, filter 0.2s ease, stroke-width 0.2s ease; 
  cursor: default;
}
[part~="bar"][data-bullish] { stroke: var(--mini-chart-bullish-color, #10b981); }
[part~="bar"]:not([data-bullish]) { stroke: var(--mini-chart-bearish-color, #ef4444); }
:host([interactive]) [part~="bar"] { cursor: pointer; }
:host([interactive]) [part~="bar"]:hover { opacity: 1 !important; filter: brightness(1.2); }
:host([interactive]) [part="ticks"]:has([part~="bar"]:hover) [part~="bar"]:not(:hover) { opacity: 0.45; }`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "ticks" }));
    
    this.#svg.append(this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    const path = target?.closest('[part~="bar"]');
    if (!path || !path.hasAttribute("data-index")) return;

    const index = parseInt(path.getAttribute("data-index") || "0", 10);
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
      for (const bar of this.#bars) {
        bar.style.display = "none";
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

    const isInitial = this.#bars.length === 0;

    while (this.#bars.length < candles.length) {
      const path = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "bar" }));
      this.#container.append(path);
      this.#bars.push(path);
    }

    if (isInitial) {
      // Step 1: Set flat paths at Open price
      candles.forEach((geo, index) => {
        const path = this.#bars[index];
        path.style.display = "";
        path.setAttribute("data-index", String(index));
        if (geo.isBullish) {
          path.setAttribute("data-bullish", "true");
        } else {
          path.removeAttribute("data-bullish");
        }

        const cx = geo.x + geo.bodyWidth / 2;
        const flatD = `M ${cx} ${geo.open} L ${cx} ${geo.open} M ${geo.x} ${geo.open} L ${cx} ${geo.open} M ${cx} ${geo.open} L ${geo.x + geo.bodyWidth} ${geo.open}`;
        
        path.style.transition = "none";
        path.setAttribute("d", flatD);
      });

      // Step 2: Batch single reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Staggered expansion; the whole stagger is capped, however many bars there are.
      candles.forEach((geo, index) => {
        const path = this.#bars[index];
        const cx = geo.x + geo.bodyWidth / 2;
        const d = `M ${cx} ${geo.high} L ${cx} ${geo.low} M ${geo.x} ${geo.open} L ${cx} ${geo.open} M ${cx} ${geo.close} L ${geo.x + geo.bodyWidth} ${geo.close}`;

        path.style.transition = `d 0.4s ease-out ${entranceDelay(index, candles.length, 30)}ms`;
        path.setAttribute("d", d);
      });

      // Step 4: Clear inline transition delay after animation completes
      const maxDuration = 400 + entranceDelay(candles.length - 1, candles.length, 30) + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          this.#bars.forEach((b) => {
            if (b.isConnected) b.style.transition = "";
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Normal update
      this.#bars.forEach((path, index) => {
        if (index >= candles.length) {
          path.style.display = "none";
          return;
        }
        
        path.style.display = "";
        path.setAttribute("data-index", String(index));
        const geo = candles[index];

        if (geo.isBullish) {
          path.setAttribute("data-bullish", "true");
        } else {
          path.removeAttribute("data-bullish");
        }

        const cx = geo.x + geo.bodyWidth / 2;
        const d = `M ${cx} ${geo.high} L ${cx} ${geo.low} M ${geo.x} ${geo.open} L ${cx} ${geo.open} M ${cx} ${geo.close} L ${geo.x + geo.bodyWidth} ${geo.close}`;

        path.style.transition = "";
        path.setAttribute("d", d);
      });
    }
  }
}
