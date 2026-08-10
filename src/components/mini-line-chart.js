// mini-line-chart.js — Responsive SVG line sparkline Custom Element.

import { createCartesianLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders a numeric series as a compact line sparkline with animations.
 *
 * @extends MiniChartElement
 */
export class MiniLineChart extends MiniChartElement {
  /** @type {any[]} */
  #prevPoints = [];

  /** @type {boolean} */
  #initialized = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGPathElement | null} */
  #linePath = null;
  /** @type {SVGPathElement | null} */
  #maskPath = null;
  /** @type {SVGCircleElement | null} */
  #point = null;

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Line";
  }

  /** Renders the element's complete Shadow DOM tree, preserving SVG for animations. */
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
[part="line"] { transition: d 0.4s ease-out; }
[part="mask-line"] { transition: d 0.4s ease-out; }
[part="point"] { transition: cx 0.4s ease-out, cy 0.4s ease-out, opacity 0.2s ease-out; }`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });

    const maskId = `line-mask`;
    const defs = createSvgElement("defs");
    const mask = createSvgElement("mask", { id: maskId });

    // A mask path that traces the chart without non-scaling-stroke
    this.#maskPath = /** @type {SVGPathElement} */ (createSvgElement("path", {
      part: "mask-line",
      stroke: "white", 
      fill: "none",
      "stroke-width": "10",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      pathLength: "1",
      "stroke-dasharray": "1", 
      "stroke-dashoffset": "1"
    }));
    mask.append(this.#maskPath);
    defs.append(mask);

    const group = createSvgElement("g", { mask: `url(#${maskId})`, part: "group" });
    
    this.#linePath = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "line" }));
    group.append(this.#linePath);

    // Point is outside the mask group, preventing it from being accidentally masked
    this.#point = /** @type {SVGCircleElement} */ (createSvgElement("circle", { r: 1.75, part: "point" }));
    this.#point.style.opacity = "0";

    this.#svg.append(defs, group, this.#point);

    this.shadowRoot?.replaceChildren(style, this.#svg);
  }

  /**
   * Helper to construct d attribute string without intermediate arrays
   * @param {any[]} points 
   */
  #buildPathString(points) {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  /**
   * Updates SVG attributes and triggers animations natively.
   * 
   * @param {number[]} data Parsed chart values.
   */
  #updateChart(data) {
    if (!this.#linePath || !this.#point || !this.#maskPath) return;

    if (data.length === 0) {
      this.#linePath.style.display = "none";
      this.#point.style.opacity = "0";
      this.#prevPoints = [];
      return;
    }

    const { points } = createCartesianLayout(data);

    // Single point edge case
    if (points.length === 1) {
      this.#linePath.style.display = "none";
      this.#point.setAttribute("cx", String(points[0].x));
      this.#point.setAttribute("cy", String(points[0].y));
      this.#point.style.opacity = "1";
      this.#prevPoints = [];
      return;
    }

    // Multiple points
    this.#linePath.style.display = "";
    this.#point.style.opacity = "0";

    const isInitial = this.#prevPoints.length === 0;
    const newD = this.#buildPathString(points);

    if (isInitial) {
      this.#linePath.style.transition = "none";
      this.#linePath.setAttribute("d", newD);
      this.#maskPath.style.transition = "none";
      this.#maskPath.setAttribute("d", newD);
      this.#maskPath.style.strokeDashoffset = "1";

      // Entrance animation: draw along the path using the mask
      // requestAnimationFrame prevents forced synchronous reflow blocks
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!this.#maskPath) return;
            this.#maskPath.style.transition = `stroke-dashoffset 0.8s ease-out`;
            this.#maskPath.style.strokeDashoffset = "0";

            setTimeout(() => {
              if (this.isConnected && this.#maskPath) {
                this.#maskPath.style.transition = "none";
              }
            }, 850);
          });
        });
      } else {
        // Fallback for test environments without rAF
        this.#maskPath.style.transition = `stroke-dashoffset 0.8s ease-out`;
        this.#maskPath.style.strokeDashoffset = "0";
      }
    } else {
      // Update animation (smooth up/down and morphing)
      if (this.#prevPoints.length !== points.length) {
        let paddedD = `M ${this.#prevPoints[0].x} ${this.#prevPoints[0].y}`;
        const prevLen = this.#prevPoints.length;
        const targetLen = points.length;
        
        // Match lengths to ensure CSS path interpolation functions properly
        for (let i = 1; i < targetLen; i++) {
          const p = i < prevLen ? this.#prevPoints[i] : this.#prevPoints[prevLen - 1];
          paddedD += ` L ${p.x} ${p.y}`;
        }
        
        this.#linePath.style.transition = "none";
        this.#maskPath.style.transition = "none";
        this.#linePath.setAttribute("d", paddedD);
        this.#maskPath.setAttribute("d", paddedD);
        
        // Forced reflow required here to establish the starting frame of the CSS morph transition
        this.#linePath.getBoundingClientRect(); 
      }

      this.#linePath.style.transition = ""; // restore CSS transition
      this.#linePath.setAttribute("d", newD);
      this.#maskPath.style.transition = "";
      this.#maskPath.setAttribute("d", newD);
    }
    
    this.#prevPoints = points;
  }
}
