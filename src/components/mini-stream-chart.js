// mini-stream-chart.js — Responsive SVG streamgraph (ThemeRiver) sparkline Custom Element.

import { createStackedLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders multiple data series as a centered streamgraph.
 *
 * @extends MiniChartElement
 */
export class MiniStreamChart extends MiniChartElement {
  /** @type {boolean} */
  #initialized = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;

  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {SVGLineElement | null} */
  #maskLine = null;

  /** @type {SVGPathElement[]} */
  #layers = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Streamgraph";
  }

  /**
   * Overrides default data parser to support 2D arrays (array of series).
   * @returns {number[][]}
   */
  get data() {
    try {
      const parsed = JSON.parse(this.getAttribute("data") || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        item => Array.isArray(item) && item.every(Number.isFinite)
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
:host { 
  --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; 
  --mini-chart-color-1: hsl(262 83% 58%);
  --mini-chart-color-2: hsl(210 83% 58%);
  --mini-chart-color-3: hsl(150 83% 58%);
  --mini-chart-color-4: hsl(45 83% 58%);
}
[part="layer"] { 
  transition: d 0.4s ease-out; 
  stroke: var(--mini-chart-canvas, transparent);
  stroke-width: 0.5;
}
[part="layer"]:nth-child(1) { fill: var(--mini-chart-color-1); }
[part="layer"]:nth-child(2) { fill: var(--mini-chart-color-2); }
[part="layer"]:nth-child(3) { fill: var(--mini-chart-color-3); }
[part="layer"]:nth-child(4) { fill: var(--mini-chart-color-4); }`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    
    const maskId = `stream-mask-${Math.random().toString(36).slice(2)}`;
    const defs = createSvgElement("defs");
    const mask = createSvgElement("mask", { id: maskId });

    // Horizontal wipe mask that covers the entire chart viewBox
    this.#maskLine = /** @type {SVGLineElement} */ (createSvgElement("line", {
      part: "mask-line",
      x1: "0", y1: "15", x2: "100", y2: "15",
      stroke: "white", 
      "stroke-width": "100", // Thick enough to cover height
      pathLength: "1",
      "stroke-dasharray": "1", 
      "stroke-dashoffset": "1"
    }));
    mask.append(this.#maskLine);
    defs.append(mask);

    this.#container = createSvgElement("g", { mask: `url(#${maskId})`, part: "group" });
    
    this.#svg.append(defs, this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);
  }

  /**
   * Generates the SVG path data for a stacked area layer.
   * @param {{ x: number, y0: number, y1: number }[]} points 
   * @returns {string}
   */
  #buildAreaPath(points) {
    if (points.length === 0) return "";
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y1} L ${points[0].x} ${points[0].y0}`;
    }

    let d = `M ${points[0].x} ${points[0].y1}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y1}`;
    }

    for (let i = points.length - 1; i >= 0; i--) {
      d += ` L ${points[i].x} ${points[i].y0}`;
    }

    d += " Z";
    return d;
  }

  /**
   * Updates SVG attributes and triggers animations natively.
   * 
   * @param {number[][]} data Parsed array of series.
   */
  #updateChart(data) {
    if (!this.#container) return;

    const isInitial = this.#layers.length === 0;

    if (data.length === 0) {
      for (const layer of this.#layers) {
        layer.style.display = "none";
      }
      return;
    }

    const { layers } = createStackedLayout(data, { 
      width: this.chartWidth, 
      height: this.chartHeight,
      offset: "silhouette" // <--- The magic for ThemeRiver/Streamgraphs
    });

    while (this.#layers.length < layers.length) {
      const path = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "layer" }));
      this.#container.append(path);
      this.#layers.push(path);
    }

    this.#layers.forEach((path, index) => {
      if (index >= layers.length) {
        path.style.display = "none";
        return;
      }
      
      path.style.display = "";
      const geo = layers[index];
      const newD = this.#buildAreaPath(geo.points);
      
      const currentD = path.getAttribute("d");
      
      if (!currentD) {
        path.style.transition = "none";
        path.setAttribute("d", newD);
        path.getBoundingClientRect(); 
      } else {
        path.style.transition = "";
        path.setAttribute("d", newD);
      }
    });

    if (this.#maskLine && isInitial) {
      this.#maskLine.style.transition = "none";
      this.#maskLine.style.strokeDashoffset = "1";

      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!this.#maskLine) return;
            this.#maskLine.style.transition = `stroke-dashoffset 0.8s ease-out`;
            this.#maskLine.style.strokeDashoffset = "0";
          });
        });
      } else {
        this.#maskLine.style.transition = `stroke-dashoffset 0.8s ease-out`;
        this.#maskLine.style.strokeDashoffset = "0";
      }
    }
  }
}
