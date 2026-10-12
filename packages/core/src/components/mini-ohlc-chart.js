// mini-ohlc-chart.js — Responsive SVG OHLC sparkline Custom Element.

import { createCandlestickLayout } from "../core/geometry.js";
import { readDataArray } from "../core/data.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { lerp, stopTween, tween } from "../core/motion.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay, pointerToViewBoxX, setLengthProperty } from "../core/svg.js";

/**
 * @typedef {Object} OhlcGeometry
 * @property {number} x Left edge.
 * @property {number} w Width.
 * @property {number} high y of the high.
 * @property {number} low y of the low.
 * @property {number} open y of the open.
 * @property {number} close y of the close.
 */

/**
 * The path of one OHLC tick: the high-low stem, the open tick on the left, the close tick on the right.
 *
 * @param {OhlcGeometry} geo Tick geometry.
 * @returns {string}
 */
function tickPath({ x, w, high, low, open, close }) {
  const cx = x + w / 2;
  return `M ${cx} ${high} L ${cx} ${low} M ${x} ${open} L ${cx} ${open} M ${cx} ${close} L ${x + w} ${close}`;
}

/**
 * Renders OHLC data as a financial OHLC tick sparkline with batch animations and interactions.
 *
 * @extends MiniChartElement
 */
export class MiniOhlcChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    tickWidth: { type: "number" },
    gap: { type: "number", default: 0.2 },
    min: { type: "number" },
    max: { type: "number" },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

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

  /** Geometry on screen per bar, mid-transition included. @type {(OhlcGeometry | null)[]} */
  #shown = [];

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
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {number[][]}
   */
  parseData(raw) {
    try {
      const parsed = readDataArray(raw);
      if (!parsed) return [];
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
    const tickWidth = this.option("tickWidth");
    setLengthProperty(this.#svg, "--_mc-tick", tickWidth === undefined ? null : String(tickWidth));
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
  stroke-width: var(--_mc-tick, var(--mini-chart-tick-width, 1.25)); 
  stroke-linecap: square;
  vector-effect: non-scaling-stroke;
  fill: none;
  transition: opacity 0.2s ease, filter 0.2s ease, stroke-width 0.2s ease; 
  cursor: default;
}
[part~="bar"][data-bullish] { stroke: var(--_mc-positive); }
[part~="bar"]:not([data-bullish]) { stroke: var(--_mc-negative); }
svg[data-interactive] [part~="bar"] { cursor: pointer; }
svg[data-interactive] [part~="bar"]:hover { opacity: 1 !important; filter: brightness(1.2); }
svg[data-interactive] [part="ticks"]:has([part~="bar"]:hover) [part~="bar"]:not(:hover) { opacity: var(--_mc-dim); }`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "ticks" }));
    
    this.#svg.append(this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => this.#onPointer(e, "sparkline-hover");
  #onClick = (/** @type {MouseEvent} */ e) => this.#onPointer(e, "sparkline-select");

  /**
   * @param {MouseEvent} e Pointer or click event.
   * @param {"sparkline-hover" | "sparkline-select"} type Event to dispatch.
   */
  #onPointer(e, type) {
    if (!this.option("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    // A tick is a thin stroke: off its line, the pointer picks the nearest column.
    const path = target?.closest('[part~="bar"]') ?? this.#nearestBar(e);
    if (!path || !path.hasAttribute("data-index")) return;

    const index = parseInt(path.getAttribute("data-index") || "0", 10);
    const candleData = this.#currentData[index];
    if (!candleData) return;

    const [open, high, low, close] = candleData;
    const change = close - open;
    const changePercent = open !== 0 ? (change / open) * 100 : 0;
    const isBullish = close >= open;

    this.dispatchPoint(type, {
      index,
      value: close,
      datum: candleData,
      mark: path,
      legacy: {
        index,
        open,
        high,
        low,
        close,
        isBullish,
        change,
        changePercent: Number(changePercent.toFixed(2)),
      },
    }, e);
  }

  /**
   * @param {MouseEvent} e Pointer event.
   * @returns {SVGPathElement | null} The bar of the column nearest to the pointer.
   */
  #nearestBar(e) {
    const x = this.#svg ? pointerToViewBoxX(this.#svg, e, this.chartWidth) : null;
    if (x === null) return null;
    let nearest = -1;
    let distance = Infinity;
    this.#shown.forEach((geo, index) => {
      if (!geo) return;
      const d = Math.abs(geo.x + geo.w / 2 - x);
      if (d < distance) {
        distance = d;
        nearest = index;
      }
    });
    return this.#bars[nearest] ?? null;
  }

  #onPointerLeave = () => {
    if (!this.option("interactive")) return;
    this.clearHover();
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
    this.#svg?.addEventListener("pointermove", this.#onPointerMove);
    this.#svg?.addEventListener("click", this.#onClick);
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
    stopTween(this);

    this.#currentData = data;

    if (data.length === 0) {
      for (const bar of this.#bars) {
        bar.style.display = "none";
      }
      return;
    }

    const gapRatio = Math.max(0, Math.min(0.8, this.option("gap")));

    const min = this.option("min");
    const max = this.option("max");

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

    const targets = candles.map((geo) => ({ x: geo.x, w: geo.bodyWidth, high: geo.high, low: geo.low, open: geo.open, close: geo.close }));

    if (isInitial) {
      this.#shown = targets;
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
      // Normal update: an rAF tween of each tick (a bar shown again opens flat at its open price).
      const from = this.#bars.map((path, index) => {
        const target = targets[index];
        if (!target) return null;
        const shown = path.style.display !== "none" ? this.#shown[index] : null;
        return shown ?? { ...target, high: target.open, low: target.open, close: target.open };
      });
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

        path.style.transition = "";
      });
      tween(this, (t) => {
        this.#shown = targets.map((end, index) => {
          const start = from[index] ?? end;
          /** @type {OhlcGeometry} */
          const geo = { x: lerp(start.x, end.x, t), w: lerp(start.w, end.w, t), high: lerp(start.high, end.high, t), low: lerp(start.low, end.low, t), open: lerp(start.open, end.open, t), close: lerp(start.close, end.close, t) };
          this.#bars[index].setAttribute("d", tickPath(geo));
          return geo;
        });
      });
    }
  }
}

acceptDataValues(MiniOhlcChart);
