// mini-bar-chart.js — Responsive SVG bar sparkline Custom Element.

import { createBarLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders a numeric series as a compact bar sparkline with animations, styling, and interactions.
 *
 * @extends MiniChartElement
 */
export class MiniBarChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "gap",
    "radius",
    "baseline",
    "min",
    "max",
    "interactive",
  ];

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #barsGroup = null;

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Bar";
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

  /** Renders the element's complete Shadow DOM tree, preserving SVG for animations. */
  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data);
    let style = this.shadowRoot?.querySelector("style");
    let svg = this.shadowRoot?.querySelector("svg");
    const isInitialRender = !svg;

    if (!svg || !style) {
      style = document.createElement("style");
      svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
      this.#svg = svg;

      this.#barsGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "bars" }));
      svg.append(this.#barsGroup);

      this.shadowRoot?.replaceChildren(style, svg);
      this.#setupInteractionListeners();
    } else {
      svg.setAttribute("aria-label", label);
      const title = svg.querySelector("title");
      if (title) title.textContent = label;
    }

    style.textContent = `${chartStyles}
:host { 
  --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; 
}
[part~="bar"] { 
  transition: all 0.4s ease-out; 
  transform-box: fill-box; 
  cursor: default;
}
[part~="positive"] { 
  fill: var(--mini-chart-positive-color, var(--mini-chart-color, #10b981)); 
}
[part~="negative"] { 
  fill: var(--mini-chart-negative-color, #ef4444); 
}
:host([interactive]) [part~="bar"]:hover {
  opacity: 1 !important;
}
:host([interactive]) [part="bars"]:has([part~="bar"]:hover) [part~="bar"]:not(:hover) {
  opacity: var(--mini-chart-bar-opacity-inactive, 0.35);
}`;

    this.renderChart(svg, data, isInitialRender);
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {SVGRectElement | null} */ (e.target);
    if (!target || target.tagName !== "rect" || !target.hasAttribute("data-index")) return;

    const index = parseInt(target.getAttribute("data-index") || "0", 10);
    const value = parseFloat(target.getAttribute("data-value") || "0");
    const isPositive = value >= 0;

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: { index, value, isPositive, element: target },
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
    this.#barsGroup?.addEventListener("pointerover", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  #detachInteractionListeners() {
    this.#barsGroup?.removeEventListener("pointerover", this.#onPointerMove);
    this.#svg?.removeEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * Updates SVG children with DOM diffing, batch reflows, and animations.
   * 
   * @param {SVGSVGElement} svg Responsive SVG root.
   * @param {number[]} data Parsed chart values.
   * @param {boolean} isInitial True if this is the first render.
   */
  renderChart(svg, data, isInitial = false) {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }

    const gapAttr = parseFloat(this.getAttribute("gap") || "0.2");
    const gapRatio = !isNaN(gapAttr) ? Math.max(0, Math.min(0.8, gapAttr)) : 0.2;
    const radiusAttr = parseFloat(this.getAttribute("radius") || "0");
    const radius = !isNaN(radiusAttr) ? Math.max(0, radiusAttr) : 0;

    const minAttr = parseFloat(this.getAttribute("min") || "");
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    const min = !isNaN(minAttr) ? minAttr : undefined;
    const max = !isNaN(maxAttr) ? maxAttr : undefined;

    const { bars, baseline } = createBarLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      gapRatio,
      min,
      max,
    });

    const container = this.#barsGroup ?? svg;
    const existingBars = /** @type {SVGRectElement[]} */ (Array.from(container.querySelectorAll('rect')));

    while (existingBars.length < bars.length) {
      const rect = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "bar" }));
      container.append(rect);
      existingBars.push(rect);
    }
    while (existingBars.length > bars.length) {
      const rect = existingBars.pop();
      rect?.remove();
    }

    if (bars.length === 0) return;

    if (isInitial) {
      // Step 1: Batch initial positioning at baseline
      bars.forEach((bar, index) => {
        const rect = existingBars[index];
        const val = data[index];
        const isPos = val >= 0;

        rect.style.transition = "none";
        rect.setAttribute("x", String(bar.x));
        rect.setAttribute("y", String(baseline));
        rect.setAttribute("width", String(bar.width));
        rect.setAttribute("height", "0");
        if (radius > 0) {
          rect.setAttribute("rx", String(radius));
          rect.setAttribute("ry", String(radius));
        } else {
          rect.removeAttribute("rx");
          rect.removeAttribute("ry");
        }
        rect.setAttribute("part", isPos ? "bar positive" : "bar negative");
        rect.setAttribute("data-index", String(index));
        rect.setAttribute("data-value", String(val));
      });

      // Step 2: Single forced reflow on SVG root (no layout thrashing)
      svg.getBoundingClientRect();

      // Step 3: Batch trigger staggered transitions
      bars.forEach((bar, index) => {
        const rect = existingBars[index];
        rect.style.transition = `all 0.4s ease-out ${index * 0.03}s`;
        rect.setAttribute("y", String(bar.y));
        rect.setAttribute("height", String(bar.height));
      });

      // Step 4: Central timer for inline transition cleanup
      const maxDuration = 400 + bars.length * 30 + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          existingBars.forEach((r) => {
            if (r.isConnected) r.style.transition = "";
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Normal update transition
      bars.forEach((bar, index) => {
        const rect = existingBars[index];
        const val = data[index];
        const isPos = val >= 0;

        rect.style.transition = "";
        rect.setAttribute("x", String(bar.x));
        rect.setAttribute("y", String(bar.y));
        rect.setAttribute("width", String(bar.width));
        rect.setAttribute("height", String(bar.height));
        if (radius > 0) {
          rect.setAttribute("rx", String(radius));
          rect.setAttribute("ry", String(radius));
        } else {
          rect.removeAttribute("rx");
          rect.removeAttribute("ry");
        }
        rect.setAttribute("part", isPos ? "bar positive" : "bar negative");
        rect.setAttribute("data-index", String(index));
        rect.setAttribute("data-value", String(val));
      });
    }
  }
}
