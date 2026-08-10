// mini-ohlc-chart.js — Responsive SVG OHLC sparkline Custom Element.

import { createCandlestickLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders OHLC data as a financial OHLC tick sparkline.
 *
 * @extends MiniChartElement
 */
export class MiniOhlcChart extends MiniChartElement {
  /** @type {boolean} */
  #initialized = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;

  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {SVGPathElement[]} */
  #bars = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "OHLC";
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
[part="bar"] { 
  stroke-width: 1.5; 
  stroke-linecap: square;
  fill: none;
  transition: d 0.4s ease-out; 
}
[part="bar"][data-bullish] { stroke: var(--mini-chart-bullish-color, #10b981); }
[part="bar"]:not([data-bullish]) { stroke: var(--mini-chart-bearish-color, #ef4444); }`;

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
      for (const bar of this.#bars) {
        bar.style.display = "none";
      }
      return;
    }

    const { candles } = createCandlestickLayout(data, { 
      width: this.chartWidth, 
      height: this.chartHeight 
    });

    while (this.#bars.length < candles.length) {
      const path = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "bar" }));
      this.#container.append(path);
      this.#bars.push(path);
    }

    this.#bars.forEach((path, index) => {
      if (index >= candles.length) {
        path.style.display = "none";
        return;
      }
      
      path.style.display = "";
      const geo = candles[index];

      if (geo.isBullish) {
        path.setAttribute("data-bullish", "true");
      } else {
        path.removeAttribute("data-bullish");
      }

      const cx = geo.x + geo.bodyWidth / 2;
      const d = `M ${cx} ${geo.high} L ${cx} ${geo.low} M ${geo.x} ${geo.open} L ${cx} ${geo.open} M ${cx} ${geo.close} L ${geo.x + geo.bodyWidth} ${geo.close}`;

      const currentD = path.getAttribute("d");
      
      if (!currentD) {
        path.style.transition = "none";
        
        // Entrance from baseline
        const flatD = `M ${cx} ${geo.bodyY} L ${cx} ${geo.bodyY} M ${geo.x} ${geo.bodyY} L ${cx} ${geo.bodyY} M ${cx} ${geo.bodyY} L ${geo.x + geo.bodyWidth} ${geo.bodyY}`;
        path.setAttribute("d", flatD);
        
        path.getBoundingClientRect(); // force layout
        
        path.style.transition = `d 0.4s ease-out ${index * 0.05}s`;
        path.setAttribute("d", d);
      } else {
        path.style.transition = "";
        path.setAttribute("d", d);
      }
    });
  }
}
