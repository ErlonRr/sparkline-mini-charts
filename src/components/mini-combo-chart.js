// mini-combo-chart.js — Responsive SVG combo (bar + line) sparkline Custom Element.

import { createCartesianLayout, createBarLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders a combo chart with bars in the background and a line in the foreground.
 *
 * @extends MiniChartElement
 */
export class MiniComboChart extends MiniChartElement {
  /** @type {any[]} */
  #prevLinePoints = [];

  /** @type {boolean} */
  #initialized = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;

  /** @type {SVGGElement | null} */
  #barsContainer = null;
  /** @type {SVGRectElement[]} */
  #bars = [];

  /** @type {SVGPathElement | null} */
  #linePath = null;
  /** @type {SVGPathElement | null} */
  #maskPath = null;
  /** @type {SVGCircleElement | null} */
  #point = null;

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Combo";
  }

  /**
   * Overrides default data parser to support object arrays for combo charts.
   * @returns {{ bar: number, line: number }[]}
   */
  get data() {
    try {
      const parsed = JSON.parse(this.getAttribute("data") || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        item => item && typeof item === "object" && Number.isFinite(item.bar) && Number.isFinite(item.line)
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
   * @param {string} label 
   */
  #createDOM(label) {
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part="bar"] { fill: var(--mini-chart-bar-color, rgba(128, 128, 128, 0.4)); transition: all 0.4s ease-out; transform-box: fill-box; }
[part="line"] { transition: d 0.4s ease-out; }
[part="point"] { transition: cx 0.4s ease-out, cy 0.4s ease-out, opacity 0.2s ease-out; }`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });

    // Bars layer (background)
    this.#barsContainer = createSvgElement("g");

    // Line layer (foreground)
    const maskId = `combo-mask-${Math.random().toString(36).slice(2)}`;
    const defs = createSvgElement("defs");
    const mask = createSvgElement("mask", { id: maskId });

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

    const lineGroup = createSvgElement("g", { mask: `url(#${maskId})`, part: "line-group" });
    this.#linePath = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "line" }));
    lineGroup.append(this.#linePath);

    this.#point = /** @type {SVGCircleElement} */ (createSvgElement("circle", { r: 1.75, part: "point" }));
    this.#point.style.opacity = "0";

    this.#svg.append(defs, this.#barsContainer, lineGroup, this.#point);

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
   * @param {{ bar: number, line: number }[]} data
   */
  #updateChart(data) {
    if (!this.#barsContainer || !this.#linePath || !this.#maskPath || !this.#point) return;

    if (data.length === 0) {
      this.#bars.forEach(b => { b.style.display = "none"; });
      this.#linePath.style.display = "none";
      this.#point.style.opacity = "0";
      this.#prevLinePoints = [];
      return;
    }

    const barData = data.map(d => d.bar);
    const lineData = data.map(d => d.line);

    // --- Update Bars ---
    const { bars: barGeometry, baseline: barBaseline } = createBarLayout(barData, { width: this.chartWidth, height: this.chartHeight });
    
    while (this.#bars.length < barGeometry.length) {
      const rect = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "bar" }));
      this.#barsContainer.append(rect);
      this.#bars.push(rect);
    }
    
    const isInitialBars = this.#bars.filter(b => b.style.display !== "none").length === 0;

    this.#bars.forEach((rect, index) => {
      if (index >= barGeometry.length) {
        rect.style.display = "none";
        return;
      }
      rect.style.display = "";
      const geo = barGeometry[index];

      if (isInitialBars) {
        rect.style.transition = "none";
        rect.setAttribute("x", String(geo.x));
        rect.setAttribute("y", String(barBaseline));
        rect.setAttribute("width", String(geo.width));
        rect.setAttribute("height", "0");
        
        rect.getBoundingClientRect();
        
        rect.style.transition = `all 0.4s ease-out ${index * 0.05}s`;
        rect.setAttribute("y", String(geo.y));
        rect.setAttribute("height", String(geo.height));
        
        setTimeout(() => {
          if (rect.isConnected) rect.style.transition = "";
        }, 400 + index * 50);
      } else {
        rect.style.transition = "";
        rect.setAttribute("x", String(geo.x));
        rect.setAttribute("y", String(geo.y));
        rect.setAttribute("width", String(geo.width));
        rect.setAttribute("height", String(geo.height));
      }
    });

    // --- Update Line ---
    const { points: lineGeometry } = createCartesianLayout(lineData, { width: this.chartWidth, height: this.chartHeight });
    
    if (lineGeometry.length === 1) {
      this.#linePath.style.display = "none";
      this.#point.setAttribute("cx", String(lineGeometry[0].x));
      this.#point.setAttribute("cy", String(lineGeometry[0].y));
      this.#point.style.opacity = "1";
      this.#prevLinePoints = [];
      return;
    }

    this.#linePath.style.display = "";
    this.#point.style.opacity = "0";

    const isInitialLine = this.#prevLinePoints.length === 0;
    const newLineD = this.#buildPathString(lineGeometry);

    if (isInitialLine) {
      this.#linePath.style.transition = "none";
      this.#linePath.setAttribute("d", newLineD);
      this.#maskPath.style.transition = "none";
      this.#maskPath.setAttribute("d", newLineD);
      this.#maskPath.style.strokeDashoffset = "1";

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
        this.#maskPath.style.transition = `stroke-dashoffset 0.8s ease-out`;
        this.#maskPath.style.strokeDashoffset = "0";
      }
    } else {
      if (this.#prevLinePoints.length !== lineGeometry.length) {
        let paddedD = `M ${this.#prevLinePoints[0].x} ${this.#prevLinePoints[0].y}`;
        const prevLen = this.#prevLinePoints.length;
        const targetLen = lineGeometry.length;
        
        for (let i = 1; i < targetLen; i++) {
          const p = i < prevLen ? this.#prevLinePoints[i] : this.#prevLinePoints[prevLen - 1];
          paddedD += ` L ${p.x} ${p.y}`;
        }
        
        this.#linePath.style.transition = "none";
        this.#maskPath.style.transition = "none";
        this.#linePath.setAttribute("d", paddedD);
        this.#maskPath.setAttribute("d", paddedD);
        
        this.#linePath.getBoundingClientRect(); 
      }

      this.#linePath.style.transition = ""; 
      this.#linePath.setAttribute("d", newLineD);
      this.#maskPath.style.transition = "";
      this.#maskPath.setAttribute("d", newLineD);
    }
    
    this.#prevLinePoints = lineGeometry;
  }
}
