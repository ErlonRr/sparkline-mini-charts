// mini-scatter-chart.js — Responsive SVG 2D scatter plot and bubble sparkline Custom Element.

import { createScatterLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} ScatterCache
 * @property {SVGCircleElement} circle
 */

/**
 * Renders 2D coordinates (x, y) as a scatter sparkline with optional trendline and bubble radius.
 *
 * @extends MiniChartElement
 */
export class MiniScatterChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "point-radius",
    "trend-line",
    "min-x",
    "max-x",
    "min-y",
    "max-y",
    "interactive",
  ];

  /** @type {boolean} */
  #initialized = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGLineElement | null} */
  #trendLineEl = null;
  /** @type {SVGGElement | null} */
  #pointsContainer = null;

  /** @type {ScatterCache[]} */
  #points = [];

  /** @type {any[]} */
  #currentData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Scatter";
  }

  /**
   * Cleans up pending timers and interaction listeners on disconnection.
   * @override
   */
  cleanup() {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    this.#detachInteractionListeners();
  }

  /**
   * Overrides data getter to parse 2D coordinate arrays or objects.
   * @returns {any[]}
   */
  get data() {
    try {
      const parsed = JSON.parse(this.getAttribute("data") || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data.map((d) => Array.isArray(d) ? d[1] ?? d[0] : (d.y ?? d.x ?? 0)));

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
[part="trend-line"] {
  stroke: var(--mini-chart-trend-color, color-mix(in srgb, var(--primary, #3b82f6) 40%, transparent));
  stroke-width: var(--mini-chart-trend-width, 1.5px);
  stroke-dasharray: 3 3;
  transition: all 0.4s ease-out;
}
[part~="point"] {
  fill: var(--mini-chart-point-color, var(--mini-chart-color, #3b82f6));
  stroke: var(--mini-chart-point-stroke, var(--surface, #ffffff));
  stroke-width: 1px;
  transition: cx 0.4s ease-out, cy 0.4s ease-out, r 0.2s ease-out, opacity 0.3s ease-out;
  cursor: default;
}
:host([interactive]) [part~="point"]:hover {
  transform: scale(1.4);
  transform-origin: center;
  filter: brightness(1.25);
  opacity: 1 !important;
}
:host([interactive]) [part="points"]:has([part~="point"]:hover) [part~="point"]:not(:hover) {
  opacity: 0.35;
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#trendLineEl = /** @type {SVGLineElement} */ (createSvgElement("line", { part: "trend-line" }));
    this.#pointsContainer = /** @type {SVGGElement} */ (createSvgElement("g", { part: "points" }));

    this.#svg.append(this.#trendLineEl, this.#pointsContainer);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    const circle = target?.closest('[part~="point"]');
    if (!circle || !circle.hasAttribute("data-index")) return;

    const index = parseInt(circle.getAttribute("data-index") || "0", 10);
    const pointData = this.#currentData[index];

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: { index, data: pointData, element: circle },
    }));
  };

  #onPointerLeave = () => {
    if (!this.hasAttribute("interactive")) return;
    this.dispatchEvent(new CustomEvent("sparkline-leave", {
      bubbles: true,
      composed: true,
    }));
  };

  #setupInteractionListeners() {
    this.#pointsContainer?.addEventListener("pointerover", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  #detachInteractionListeners() {
    this.#pointsContainer?.removeEventListener("pointerover", this.#onPointerMove);
    this.#svg?.removeEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * @param {any[]} data 
   */
  #updateChart(data) {
    if (!this.#pointsContainer || !this.#trendLineEl || !this.#svg) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }

    this.#currentData = data;

    if (data.length === 0) {
      this.#trendLineEl.style.display = "none";
      for (const p of this.#points) {
        p.circle.style.display = "none";
      }
      return;
    }

    const pointRadiusAttr = parseFloat(this.getAttribute("point-radius") || "3");
    const pointRadius = !isNaN(pointRadiusAttr) ? pointRadiusAttr : 3;

    const minX = parseFloat(this.getAttribute("min-x") || "");
    const maxX = parseFloat(this.getAttribute("max-x") || "");
    const minY = parseFloat(this.getAttribute("min-y") || "");
    const maxY = parseFloat(this.getAttribute("max-y") || "");

    const showTrendLine = this.hasAttribute("trend-line") && this.getAttribute("trend-line") !== "false";

    const { points, trendLine } = createScatterLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      padding: 4,
      pointRadius,
      minX: !isNaN(minX) ? minX : undefined,
      maxX: !isNaN(maxX) ? maxX : undefined,
      minY: !isNaN(minY) ? minY : undefined,
      maxY: !isNaN(maxY) ? maxY : undefined,
    });

    // Update trendline
    if (showTrendLine && trendLine) {
      this.#trendLineEl.style.display = "";
      this.#trendLineEl.setAttribute("x1", String(trendLine.x1));
      this.#trendLineEl.setAttribute("y1", String(trendLine.y1));
      this.#trendLineEl.setAttribute("x2", String(trendLine.x2));
      this.#trendLineEl.setAttribute("y2", String(trendLine.y2));
    } else {
      this.#trendLineEl.style.display = "none";
    }

    const isInitial = this.#points.length === 0;

    while (this.#points.length < points.length) {
      const circle = /** @type {SVGCircleElement} */ (createSvgElement("circle", { part: "point" }));
      this.#pointsContainer.append(circle);
      this.#points.push({ circle });
    }

    if (isInitial) {
      // Step 1: Initial state (opacity 0, r = 0)
      points.forEach((item, index) => {
        const cache = this.#points[index];
        cache.circle.style.display = "";
        cache.circle.setAttribute("data-index", String(index));
        cache.circle.style.transition = "none";

        cache.circle.setAttribute("cx", String(item.x));
        cache.circle.setAttribute("cy", String(item.y));
        cache.circle.setAttribute("r", "0");
        cache.circle.style.opacity = "0";
      });

      // Step 2: Reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Staggered reveal
      points.forEach((item, index) => {
        const cache = this.#points[index];
        cache.circle.style.transition = `r 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.02}s, opacity 0.3s ease ${index * 0.02}s`;
        cache.circle.setAttribute("r", String(item.r));
        cache.circle.style.opacity = "1";
      });

      const maxDuration = 350 + points.length * 20 + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          this.#points.forEach((p) => {
            if (p.circle.isConnected) p.circle.style.transition = "";
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Normal update
      this.#points.forEach((cache, index) => {
        if (index >= points.length) {
          cache.circle.style.display = "none";
          return;
        }

        cache.circle.style.display = "";
        cache.circle.setAttribute("data-index", String(index));
        const item = points[index];

        cache.circle.style.transition = "";
        cache.circle.setAttribute("cx", String(item.x));
        cache.circle.setAttribute("cy", String(item.y));
        cache.circle.setAttribute("r", String(item.r));
        cache.circle.style.opacity = "1";
      });
    }
  }
}
