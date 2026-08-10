// mini-candlestick-chart.js — Responsive SVG candlestick sparkline Custom Element.

import { createCandlestickLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} CandleCache
 * @property {SVGGElement} group
 * @property {SVGLineElement} wick
 * @property {SVGRectElement} body
 */

/**
 * Renders OHLC data as a financial candlestick sparkline.
 *
 * @extends MiniChartElement
 */
export class MiniCandlestickChart extends MiniChartElement {
  /** @type {boolean} */
  #initialized = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;

  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {CandleCache[]} */
  #candles = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Candlestick";
  }

  /**
   * Overrides default data parser to support 2D arrays for OHLC.
   * @returns {number[][]}
   */
  get data() {
    try {
      const parsed = JSON.parse(this.getAttribute("data") || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        item => Array.isArray(item) && item.length >= 4 && item.slice(0, 4).every(Number.isFinite)
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

    this.#updateChart(data);
  }

  /**
   * Builds the static DOM structure exactly once.
   * @param {string} label 
   */
  #createDOM(label) {
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part="candle"] { transition: transform 0.4s ease-out; }
[part="wick"] { stroke: currentColor; stroke-width: 1.5; transition: all 0.4s ease-out; }
[part="body"] { stroke: currentColor; stroke-width: 1.5; transition: all 0.4s ease-out; }
[part="candle"][data-bullish] { color: var(--mini-chart-bullish-color, #10b981); fill: transparent; }
[part="candle"]:not([data-bullish]) { color: var(--mini-chart-bearish-color, #ef4444); fill: currentColor; }`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#container = createSvgElement("g");
    
    this.#svg.append(this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);
  }

  /**
   * Updates SVG attributes and triggers animations natively.
   * 
   * @param {number[][]} data Parsed OHLC chart values.
   */
  #updateChart(data) {
    if (!this.#container) return;

    if (data.length === 0) {
      for (const candle of this.#candles) {
        candle.group.style.display = "none";
      }
      return;
    }

    const { candles } = createCandlestickLayout(data, { 
      width: this.chartWidth, 
      height: this.chartHeight 
    });

    // Create new DOM elements if data length increased
    while (this.#candles.length < candles.length) {
      const group = /** @type {SVGGElement} */ (createSvgElement("g", { part: "candle" }));
      const wick = /** @type {SVGLineElement} */ (createSvgElement("line", { part: "wick" }));
      const body = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "body" }));
      
      group.append(wick, body);
      this.#container.append(group);
      
      this.#candles.push({ group, wick, body });
    }

    // Update geometry for all candles
    this.#candles.forEach((cache, index) => {
      const { group, wick, body } = cache;
      
      if (index >= candles.length) {
        group.style.display = "none";
        return;
      }
      
      group.style.display = "";
      const geo = candles[index];

      if (geo.isBullish) {
        group.setAttribute("data-bullish", "true");
      } else {
        group.removeAttribute("data-bullish");
      }

      wick.setAttribute("x1", String(geo.x + geo.bodyWidth / 2));
      wick.setAttribute("x2", String(geo.x + geo.bodyWidth / 2));
      wick.setAttribute("y1", String(geo.high));
      wick.setAttribute("y2", String(geo.low));

      body.setAttribute("x", String(geo.x));
      body.setAttribute("y", String(geo.bodyY));
      body.setAttribute("width", String(geo.bodyWidth));
      body.setAttribute("height", String(geo.bodyHeight));
    });
  }
}
