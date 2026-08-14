// mini-win-loss-chart.js — Responsive SVG Win/Loss and Uptime sparkline Custom Element.

import { createWinLossLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} WinLossCache
 * @property {SVGRectElement} bar
 */

/**
 * Renders discrete binary and ternary outcomes (Win/Loss/Tie or Up/Down) as a compact sparkline.
 *
 * @extends MiniChartElement
 */
export class MiniWinLossChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "gap",
    "radius",
    "mode",
    "win-color",
    "loss-color",
    "tie-color",
    "interactive",
  ];

  /** @type {boolean} */
  #initialized = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGLineElement | null} */
  #baseline = null;
  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {WinLossCache[]} */
  #bars = [];

  /** @type {number[]} */
  #currentData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Win-loss";
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
    const radius = this.getAttribute("radius") || "2";

    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part="baseline"] {
  stroke: var(--mini-chart-baseline-color, rgba(128, 128, 128, 0.25));
  stroke-width: 1px;
  stroke-dasharray: 2 2;
}
[part~="bar"] {
  rx: var(--mini-chart-bar-radius, ${radius}px);
  ry: var(--mini-chart-bar-radius, ${radius}px);
  transition: all 0.35s ease-out;
  cursor: default;
}
[part~="win"] { fill: var(--mini-chart-win-color, var(--mini-chart-bullish-color, #10b981)); }
[part~="loss"] { fill: var(--mini-chart-loss-color, var(--mini-chart-bearish-color, #ef4444)); }
[part~="tie"] { fill: var(--mini-chart-tie-color, var(--mini-chart-muted-color, #94a3b8)); }
:host([interactive]) [part~="bar"]:hover {
  filter: brightness(1.25);
  transform: scaleY(1.08);
  transform-origin: center;
  opacity: 1 !important;
}
:host([interactive]) [part="bars"]:has([part~="bar"]:hover) [part~="bar"]:not(:hover) {
  opacity: 0.35;
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#baseline = /** @type {SVGLineElement} */ (createSvgElement("line", { part: "baseline" }));
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "bars" }));

    this.#svg.append(this.#baseline, this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    const bar = target?.closest('[part~="bar"]');
    if (!bar || !bar.hasAttribute("data-index")) return;

    const index = parseInt(bar.getAttribute("data-index") || "0", 10);
    const value = this.#currentData[index] ?? 0;
    const outcome = value > 0 ? "win" : (value < 0 ? "loss" : "tie");

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: { index, value, outcome, element: bar },
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
   * @param {number[]} data 
   */
  #updateChart(data) {
    if (!this.#container || !this.#baseline || !this.#svg) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }

    this.#currentData = data;

    if (data.length === 0) {
      this.#baseline.style.display = "none";
      for (const b of this.#bars) {
        b.bar.style.display = "none";
      }
      return;
    }

    const gapAttr = parseFloat(this.getAttribute("gap") || "0.2");
    const gapRatio = !isNaN(gapAttr) ? gapAttr : 0.2;
    const modeAttr = this.getAttribute("mode");
    /** @type {"win-loss" | "status"} */
    const mode = modeAttr === "status" ? "status" : "win-loss";

    if (mode === "status") {
      this.#baseline.style.display = "none";
    } else {
      this.#baseline.style.display = "";
    }

    const { items, baselineY } = createWinLossLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      gapRatio,
      mode,
      padding: 3,
    });

    this.#baseline.setAttribute("x1", "2");
    this.#baseline.setAttribute("x2", String(this.chartWidth - 2));
    this.#baseline.setAttribute("y1", String(baselineY));
    this.#baseline.setAttribute("y2", String(baselineY));

    const isInitial = this.#bars.length === 0;

    while (this.#bars.length < items.length) {
      const bar = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "bar" }));
      this.#container.append(bar);
      this.#bars.push({ bar });
    }

    if (isInitial) {
      // Step 1: Initial state
      items.forEach((item, index) => {
        const cache = this.#bars[index];
        cache.bar.style.display = "";
        cache.bar.setAttribute("data-index", String(index));
        cache.bar.setAttribute("part", `bar ${item.type}`);
        cache.bar.style.transition = "none";

        cache.bar.setAttribute("x", String(item.x));
        cache.bar.setAttribute("y", String(mode === "status" ? item.y : baselineY));
        cache.bar.setAttribute("width", String(item.width));
        cache.bar.setAttribute("height", mode === "status" ? "0" : "0");
      });

      // Step 2: Single reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Staggered reveal
      items.forEach((item, index) => {
        const cache = this.#bars[index];
        cache.bar.style.transition = `y 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.025}s, height 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.025}s, opacity 0.3s ease ${index * 0.025}s`;
        cache.bar.setAttribute("y", String(item.y));
        cache.bar.setAttribute("height", String(item.height));
      });

      const maxDuration = 350 + items.length * 25 + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          this.#bars.forEach((b) => {
            if (b.bar.isConnected) b.bar.style.transition = "";
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Fluid update
      this.#bars.forEach((cache, index) => {
        if (index >= items.length) {
          cache.bar.style.display = "none";
          return;
        }

        cache.bar.style.display = "";
        cache.bar.setAttribute("data-index", String(index));
        const item = items[index];
        cache.bar.setAttribute("part", `bar ${item.type}`);

        cache.bar.style.transition = "";
        cache.bar.setAttribute("x", String(item.x));
        cache.bar.setAttribute("y", String(item.y));
        cache.bar.setAttribute("width", String(item.width));
        cache.bar.setAttribute("height", String(item.height));
      });
    }
  }
}
