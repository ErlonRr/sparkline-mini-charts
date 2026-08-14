// mini-range-bar-chart.js — Responsive SVG floating range bar sparkline Custom Element.

import { createRangeBarLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} RangeBarCache
 * @property {SVGGElement} group
 * @property {SVGRectElement} bar
 * @property {SVGCircleElement} marker
 */

/**
 * Renders floating interval range bars with optional current value markers.
 *
 * @extends MiniChartElement
 */
export class MiniRangeBarChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "gap",
    "radius",
    "min",
    "max",
    "interactive",
  ];

  /** @type {boolean} */
  #initialized = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {RangeBarCache[]} */
  #bars = [];

  /** @type {any[]} */
  #currentData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Range-bar";
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
   * Overrides data parser to support 2D arrays or range objects.
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
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data.map((d) => Array.isArray(d) ? d[0] : (d.min || 0)));

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
    const radius = this.getAttribute("radius") || "3";

    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part~="range-bar"] {
  fill: var(--mini-chart-range-color, var(--mini-chart-color, #3b82f6));
  rx: var(--mini-chart-bar-radius, ${radius}px);
  ry: var(--mini-chart-bar-radius, ${radius}px);
  transition: all 0.4s ease-out;
  cursor: default;
}
[part~="marker"] {
  fill: var(--mini-chart-marker-color, #ffffff);
  stroke: var(--mini-chart-marker-stroke, var(--mini-chart-color, #3b82f6));
  stroke-width: 1.5px;
  transition: all 0.4s ease-out;
}
:host([interactive]) [part~="range-bar"]:hover {
  filter: brightness(1.2);
  opacity: 1 !important;
}
:host([interactive]) [part="bars"]:has([part~="range-bar"]:hover) [part~="range-bar"]:not(:hover) {
  opacity: 0.35;
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "bars" }));

    this.#svg.append(this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    const group = target?.closest('[part~="range-group"]');
    if (!group || !group.hasAttribute("data-index")) return;

    const index = parseInt(group.getAttribute("data-index") || "0", 10);
    const rangeData = this.#currentData[index];

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: { index, data: rangeData, element: group },
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
    this.#container?.addEventListener("pointerover", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  #detachInteractionListeners() {
    this.#container?.removeEventListener("pointerover", this.#onPointerMove);
    this.#svg?.removeEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * @param {any[]} data 
   */
  #updateChart(data) {
    if (!this.#container || !this.#svg) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }

    this.#currentData = data;

    if (data.length === 0) {
      for (const b of this.#bars) {
        b.group.style.display = "none";
      }
      return;
    }

    const gapAttr = parseFloat(this.getAttribute("gap") || "0.25");
    const gapRatio = !isNaN(gapAttr) ? gapAttr : 0.25;

    const minAttr = parseFloat(this.getAttribute("min") || "");
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    const min = !isNaN(minAttr) ? minAttr : undefined;
    const max = !isNaN(maxAttr) ? maxAttr : undefined;

    const { bars } = createRangeBarLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      gapRatio,
      min,
      max,
      padding: 4,
    });

    const isInitial = this.#bars.length === 0;

    while (this.#bars.length < bars.length) {
      const group = /** @type {SVGGElement} */ (createSvgElement("g", { part: "range-group" }));
      const bar = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "range-bar" }));
      const marker = /** @type {SVGCircleElement} */ (createSvgElement("circle", { part: "marker", r: "2.5" }));

      group.append(bar, marker);
      this.#container.append(group);
      this.#bars.push({ group, bar, marker });
    }

    if (isInitial) {
      // Step 1: Flat initial state
      bars.forEach((item, index) => {
        const cache = this.#bars[index];
        cache.group.style.display = "";
        cache.group.setAttribute("data-index", String(index));

        cache.bar.style.transition = "none";
        cache.marker.style.transition = "none";

        cache.bar.setAttribute("x", String(item.x));
        cache.bar.setAttribute("y", String(item.y + item.height / 2));
        cache.bar.setAttribute("width", String(item.width));
        cache.bar.setAttribute("height", "0");

        if (item.marker) {
          cache.marker.style.display = "";
          cache.marker.setAttribute("cx", String(item.marker.x));
          cache.marker.setAttribute("cy", String(item.marker.y));
          cache.marker.style.opacity = "0";
        } else {
          cache.marker.style.display = "none";
        }
      });

      // Step 2: Batch single reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Staggered reveal
      bars.forEach((item, index) => {
        const cache = this.#bars[index];
        cache.bar.style.transition = `y 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.03}s, height 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.03}s`;
        cache.bar.setAttribute("y", String(item.y));
        cache.bar.setAttribute("height", String(item.height));

        if (item.marker) {
          cache.marker.style.transition = `opacity 0.4s ease ${index * 0.03 + 0.2}s`;
          cache.marker.style.opacity = "1";
        }
      });

      const maxDuration = 400 + bars.length * 30 + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          this.#bars.forEach((b) => {
            if (b.group.isConnected) {
              b.bar.style.transition = "";
              b.marker.style.transition = "";
            }
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Normal update
      this.#bars.forEach((cache, index) => {
        if (index >= bars.length) {
          cache.group.style.display = "none";
          return;
        }

        cache.group.style.display = "";
        cache.group.setAttribute("data-index", String(index));
        const item = bars[index];

        cache.bar.style.transition = "";
        cache.bar.setAttribute("x", String(item.x));
        cache.bar.setAttribute("y", String(item.y));
        cache.bar.setAttribute("width", String(item.width));
        cache.bar.setAttribute("height", String(item.height));

        if (item.marker) {
          cache.marker.style.display = "";
          cache.marker.style.transition = "";
          cache.marker.setAttribute("cx", String(item.marker.x));
          cache.marker.setAttribute("cy", String(item.marker.y));
          cache.marker.style.opacity = "1";
        } else {
          cache.marker.style.display = "none";
        }
      });
    }
  }
}
