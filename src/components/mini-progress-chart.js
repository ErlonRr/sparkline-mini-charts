// mini-progress-chart.js — Responsive SVG progress arc sparkline Custom Element.

import { createRadialLayout, describeArc } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders a single value out of a maximum as a semi-circular progress arc.
 *
 * @extends MiniChartElement
 */
export class MiniProgressChart extends MiniChartElement {
  /** @type {any[]} */
  #prevLayout = [];

  /** @type {boolean} */
  #initialized = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGPathElement | null} */
  #trackPath = null;
  /** @type {SVGPathElement | null} */
  #valuePath = null;

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Progress";
  }

  /** @returns {string} Default aspect ratio for half-radial geometry. */
  get chartAspectRatio() {
    return "2";
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
  stroke: var(--mini-chart-track-color, rgba(128, 128, 128, 0.2)); 
  stroke-width: var(--mini-chart-stroke-width, 10); 
  stroke-linecap: round;
}
[part="value"] { 
  fill: none; 
  stroke: currentColor; 
  stroke-width: var(--mini-chart-stroke-width, 10); 
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); /* bouncy ease-out */
}`;

    // A gauge is a half-circle, so viewBox uses the top half of the circle
    this.#svg = createChartSvg({ width: 100, height: 50, label });
    // Adjust viewBox for stroke overflow (stroke-width: 10)
    this.#svg.setAttribute("viewBox", "-55 -55 110 60");

    const trackD = describeArc(0, 0, 45, -Math.PI, 0);

    this.#trackPath = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "track", d: trackD }));
    this.#valuePath = /** @type {SVGPathElement} */ (createSvgElement("path", { 
      part: "value", 
      d: trackD,
      pathLength: "1",
      "stroke-dasharray": "1",
      "stroke-dashoffset": "1"
    }));

    this.#svg.append(this.#trackPath, this.#valuePath);
    this.shadowRoot?.replaceChildren(style, this.#svg);
    
    this.setAttribute("role", "meter");
  }

  /**
   * Updates SVG attributes and triggers animations natively.
   * 
   * @param {number[]} data Parsed chart values. Expects [value].
   */
  #updateChart(data) {
    if (!this.#valuePath) return;

    if (data.length === 0) {
      this.removeAttribute("aria-valuenow");
      this.#valuePath.style.display = "none";
      this.#prevLayout = [];
      return;
    }

    this.#valuePath.style.display = "";

    const value = data[0] || 0;
    const minAttr = parseFloat(this.getAttribute("min") || "0");
    const maxAttr = parseFloat(this.getAttribute("max") || "100");
    const min = isNaN(minAttr) ? 0 : minAttr;
    const max = isNaN(maxAttr) ? 100 : maxAttr;
    
    this.setAttribute("aria-valuemin", String(min));
    this.setAttribute("aria-valuemax", String(max));
    this.setAttribute("aria-valuenow", String(value));

    const span = max - min || 1;
    let progress = (value - min) / span;
    progress = Math.max(0, Math.min(1, progress));
    
    const targetOffset = 1 - progress;
    const isInitial = this.#prevLayout.length === 0;

    if (isInitial && progress > 0) {
      this.#valuePath.style.transition = "none";
      this.#valuePath.style.strokeDashoffset = "1";
      this.#valuePath.getBoundingClientRect(); // force reflow
      
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!this.#valuePath) return;
            this.#valuePath.style.transition = ""; // restore bouncy transition
            this.#valuePath.style.strokeDashoffset = String(targetOffset);
          });
        });
      } else {
        this.#valuePath.style.transition = "";
        this.#valuePath.style.strokeDashoffset = String(targetOffset);
      }
    } else {
      this.#valuePath.style.strokeDashoffset = String(targetOffset);
    }
    
    this.#prevLayout = [value];
  }
}
