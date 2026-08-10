// mini-area-chart.js — Responsive SVG area sparkline Custom Element.

import { createCartesianLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders a numeric series as a filled area sparkline with animations.
 *
 * @extends MiniChartElement
 */
export class MiniAreaChart extends MiniChartElement {
  /** @type {any[]} */
  #prevPoints = [];
  /** @type {number} */
  #prevBaseline = 0;

  /** @type {boolean} */
  #initialized = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGPathElement | null} */
  #linePath = null;
  /** @type {SVGPathElement | null} */
  #areaPath = null;
  /** @type {SVGLineElement | null} */
  #maskLine = null;
  /** @type {SVGCircleElement | null} */
  #point = null;

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Area";
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
   * @param {string} label 
   */
  #createDOM(label) {
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part="line"] { transition: d 0.4s ease-out; }
[part="area"] { transition: d 0.4s ease-out; }
[part="point"] { transition: cx 0.4s ease-out, cy 0.4s ease-out, opacity 0.2s ease-out; }`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });

    const maskId = `area-mask-${Math.random().toString(36).slice(2)}`;
    const defs = createSvgElement("defs");
    const mask = createSvgElement("mask", { id: maskId });

    // Horizontal wipe mask that covers the entire chart viewBox (0 0 100 30)
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

    const group = createSvgElement("g", { mask: `url(#${maskId})`, part: "group" });
    
    this.#areaPath = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "area" }));
    this.#linePath = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "line" }));
    group.append(this.#areaPath, this.#linePath);

    this.#point = /** @type {SVGCircleElement} */ (createSvgElement("circle", { r: 1.75, part: "point" }));
    this.#point.style.opacity = "0";

    this.#svg.append(defs, group, this.#point);

    this.shadowRoot?.replaceChildren(style, this.#svg);
  }

  /**
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
   * @param {any[]} points 
   * @param {number} baseline 
   */
  #buildAreaString(points, baseline) {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${baseline}`;
    for (let i = 0; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    d += ` L ${points[points.length - 1].x} ${baseline} Z`;
    return d;
  }

  /**
   * @param {number[]} data 
   */
  #updateChart(data) {
    if (!this.#linePath || !this.#areaPath || !this.#point || !this.#maskLine) return;

    if (data.length === 0) {
      this.#linePath.style.display = "none";
      this.#areaPath.style.display = "none";
      this.#point.style.opacity = "0";
      this.#prevPoints = [];
      return;
    }

    const { points, baseline } = createCartesianLayout(data, { includeZero: true });

    if (points.length === 1) {
      this.#linePath.style.display = "none";
      this.#areaPath.style.display = "none";
      this.#point.setAttribute("cx", String(points[0].x));
      this.#point.setAttribute("cy", String(points[0].y));
      this.#point.style.opacity = "1";
      this.#prevPoints = [];
      return;
    }

    this.#linePath.style.display = "";
    this.#areaPath.style.display = "";
    this.#point.style.opacity = "0";

    const isInitial = this.#prevPoints.length === 0;
    const newLineD = this.#buildPathString(points);
    const newAreaD = this.#buildAreaString(points, baseline);

    if (isInitial) {
      this.#linePath.style.transition = "none";
      this.#linePath.setAttribute("d", newLineD);
      this.#areaPath.style.transition = "none";
      this.#areaPath.setAttribute("d", newAreaD);
      this.#maskLine.style.transition = "none";
      this.#maskLine.style.strokeDashoffset = "1";

      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!this.#maskLine) return;
            this.#maskLine.style.transition = `stroke-dashoffset 0.8s ease-out`;
            this.#maskLine.style.strokeDashoffset = "0";

            setTimeout(() => {
              if (this.isConnected && this.#maskLine) {
                this.#maskLine.style.transition = "none";
              }
            }, 850);
          });
        });
      } else {
        this.#maskLine.style.transition = `stroke-dashoffset 0.8s ease-out`;
        this.#maskLine.style.strokeDashoffset = "0";
      }
    } else {
      if (this.#prevPoints.length !== points.length || this.#prevBaseline !== baseline) {
        let paddedLineD = `M ${this.#prevPoints[0].x} ${this.#prevPoints[0].y}`;
        let paddedAreaD = `M ${this.#prevPoints[0].x} ${this.#prevBaseline}`;
        
        const prevLen = this.#prevPoints.length;
        const targetLen = points.length;
        
        for (let i = 0; i < targetLen; i++) {
          const p = i < prevLen ? this.#prevPoints[i] : this.#prevPoints[prevLen - 1];
          if (i > 0) paddedLineD += ` L ${p.x} ${p.y}`;
          paddedAreaD += ` L ${p.x} ${p.y}`;
        }
        
        const endP = targetLen <= prevLen ? this.#prevPoints[targetLen - 1] : this.#prevPoints[prevLen - 1];
        paddedAreaD += ` L ${endP.x} ${this.#prevBaseline} Z`;

        this.#linePath.style.transition = "none";
        this.#areaPath.style.transition = "none";
        this.#linePath.setAttribute("d", paddedLineD);
        this.#areaPath.setAttribute("d", paddedAreaD);
        
        this.#linePath.getBoundingClientRect(); 
      }

      this.#linePath.style.transition = ""; 
      this.#linePath.setAttribute("d", newLineD);
      this.#areaPath.style.transition = ""; 
      this.#areaPath.setAttribute("d", newAreaD);
    }
    
    this.#prevPoints = points;
    this.#prevBaseline = baseline;
  }
}
