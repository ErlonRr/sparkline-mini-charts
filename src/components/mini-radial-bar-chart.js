// mini-radial-bar-chart.js — Responsive SVG radial bar sparkline Custom Element.

import { createRadialBarLayout, describeArc, TAU } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders multiple data values as concentric radial bars.
 *
 * @extends MiniChartElement
 */
export class MiniRadialBarChart extends MiniChartElement {
  /** @type {boolean} */
  #initialized = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;

  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {SVGPathElement[]} */
  #tracks = [];

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return 100;
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Radial Bar";
  }

  /**
   * Overrides default data parser to support custom colors per bar.
   * @returns {{ value: number, color: string | null }[]}
   */
  get data() {
    try {
      const parsed = JSON.parse(this.getAttribute("data") || "[]");
      if (!Array.isArray(parsed)) return [];
      return /** @type {{ value: number, color: string | null }[]} */ (parsed.map(item => {
        if (typeof item === "number" && Number.isFinite(item)) {
          return { value: item, color: null };
        }
        if (item && typeof item === "object" && typeof item.value === "number" && Number.isFinite(item.value)) {
          return { value: item.value, color: item.color || null };
        }
        return null;
      }).filter(v => v !== null));
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
[part="track"] { 
  fill: none;
  stroke-linecap: round;
  transition: d 0.4s ease-out; 
}
[part="track-bg"] {
  fill: none;
  stroke: var(--mini-chart-surface, rgba(128, 128, 128, 0.15));
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#container = createSvgElement("g");
    
    this.#svg.append(this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);
  }

  /**
   * Updates SVG attributes and triggers animations natively.
   * 
   * @param {{ value: number, color: string | null }[]} data Parsed values.
   */
  #updateChart(data) {
    if (!this.#container) return;

    if (data.length === 0) {
      this.#container.innerHTML = "";
      this.#tracks = [];
      return;
    }

    const values = data.map(d => d.value);

    // Global min and max
    const minAttr = parseFloat(this.getAttribute("min") || "0");
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    const min = isNaN(minAttr) ? 0 : minAttr;
    const maxDomain = !isNaN(maxAttr) ? maxAttr : Math.max(...values, 1);

    const span = maxDomain - min || 1;
    const shiftedValues = values.map(v => Math.max(0, v - min));
    
    const { tracks } = createRadialBarLayout(shiftedValues, { 
      width: this.chartWidth, 
      height: this.chartHeight,
      maxRadius: 45,
      innerRadius: 15,
      maxDomain: span,
      startAngle: Math.PI,
      endAngle: Math.PI + TAU * 0.75 // 270 degree sweep
    });

    // We completely rebuild tracks if length changes to maintain correct z-index/order
    // But ideally we'd cache them. Let's cache them using a single container.
    while (this.#tracks.length < tracks.length) {
      const g = createSvgElement("g");
      const bg = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "track-bg" }));
      const fg = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "track" }));
      g.append(bg, fg);
      this.#container.append(g);
      this.#tracks.push(fg); // We only need to animate fg and resize bg
    }
    
    // Hide extra tracks
    Array.from(this.#container.children).forEach((child, index) => {
      /** @type {HTMLElement | SVGElement} */ (child).style.display = index >= tracks.length ? "none" : "";
    });

    this.#tracks.forEach((fg, index) => {
      if (index >= tracks.length) return;
      
      const geo = tracks[index];
      const bg = /** @type {SVGPathElement} */ (fg.previousElementSibling);
      
      const strokeWidth = tracks.length > 1 ? 30 / tracks.length : 15;
      bg.setAttribute("stroke-width", String(strokeWidth));
      fg.setAttribute("stroke-width", String(strokeWidth));
      
      const bgPath = describeArc(50, 50, geo.radius, geo.startAngle, Math.PI + TAU * 0.75);
      if (bgPath) bg.setAttribute("d", bgPath);

      const fgPath = describeArc(50, 50, geo.radius, geo.startAngle, geo.endAngle);
      const currentD = fg.getAttribute("d");

      if (!currentD) {
        // Entrance animation using stroke-dashoffset
        fg.style.transition = "none";
        if (fgPath) fg.setAttribute("d", fgPath);
        
        fg.setAttribute("pathLength", "1");
        fg.style.strokeDasharray = "1";
        fg.style.strokeDashoffset = "1";
        
        fg.getBoundingClientRect(); // force reflow
        
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              fg.style.transition = `stroke-dashoffset 0.6s ease-out ${index * 80}ms`;
              fg.style.strokeDashoffset = "0";
              
              // After animation, we can clear dashoffset and restore d transition for future updates
              setTimeout(() => {
                if (fg.isConnected) {
                  fg.style.transition = `d 0.4s ease-out`;
                  fg.style.strokeDasharray = "";
                  fg.style.strokeDashoffset = "";
                  fg.removeAttribute("pathLength");
                }
              }, 600 + index * 80 + 50);
            });
          });
        }
      } else {
        fg.style.transition = "d 0.4s ease-out";
        if (fgPath) fg.setAttribute("d", fgPath);
      }

      fg.style.stroke = data[index].color || getSegmentColor(index);
    });
  }
}
