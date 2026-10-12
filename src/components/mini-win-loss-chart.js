// mini-win-loss-chart.js — Responsive SVG Win/Loss and Uptime sparkline Custom Element.

import { createWinLossLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay, setLengthProperty } from "../core/svg.js";

/**
 * @typedef {Object} WinLossCache
 * @property {SVGRectElement} bar
 */

/**
 * Values of the `mode` attribute and the layout each one selects. `uptime` is
 * an alias of `status`, and `binary` of the default `win-loss`.
 *
 * @type {Readonly<Record<string, "win-loss" | "status">>}
 */
const MODES = Object.freeze({
  "win-loss": "win-loss",
  binary: "win-loss",
  status: "status",
  uptime: "status",
});

/**
 * Resolves the `mode` attribute; an absent or unknown value is `win-loss`.
 *
 * @param {string | null} value Value of the `mode` attribute.
 * @returns {"win-loss" | "status"} The layout mode.
 */
function resolveMode(value) {
  return (value !== null && Object.hasOwn(MODES, value) && MODES[value]) || "win-loss";
}

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

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

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
   * Cancels pending timers and animation frames on disconnection. Interaction
   * listeners stay attached, so a moved element keeps emitting events.
   * @override
   */
  cleanup() {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
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

    this.#applyOptions();
    this.#updateChart(data);
  }

  /**
   * Applies the styling attributes on every render, so changing them after the
   * first render takes effect. An explicit `radius` wins over the inherited
   * `--mini-chart-bar-radius` token.
   */
  #applyOptions() {
    if (!this.#svg) return;
    setLengthProperty(this.#svg, "--_mc-radius", this.getAttribute("radius"), "px");
  }

  /**
   * @param {string} label 
   */
  #createDOM(label) {
    // Static text: per-instance options live on the svg (see #applyOptions), never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; --_mc-radius: initial; }
[part="baseline"] {
  stroke: var(--mini-chart-baseline-color, rgba(128, 128, 128, 0.25));
  stroke-width: 1px;
  stroke-dasharray: 2 2;
}
[part~="bar"] {
  rx: var(--_mc-radius, var(--mini-chart-bar-radius, 2px));
  ry: var(--_mc-radius, var(--mini-chart-bar-radius, 2px));
  transition: opacity 0.2s ease, filter 0.2s ease;
  cursor: default;
}
[part~="win"] { fill: var(--mini-chart-win-color, var(--mini-chart-bullish-color, #10b981)); }
[part~="loss"] { fill: var(--mini-chart-loss-color, var(--mini-chart-bearish-color, #ef4444)); }
[part~="tie"] { fill: var(--mini-chart-tie-color, var(--mini-chart-muted-color, #94a3b8)); }
:host([interactive]) [part~="bar"] {
  cursor: pointer;
}
:host([interactive]) [part~="bar"]:hover {
  filter: brightness(1.2);
  opacity: 1 !important;
}
:host([interactive]) [part="bars"]:has([part~="bar"]:hover) [part~="bar"]:not(:hover) {
  opacity: 0.45;
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

  /**
   * Attaches the interaction listeners once. They sit on nodes of the element's
   * own shadow tree, so they cannot leak and stay attached when the element is
   * disconnected and reconnected (moved, reordered, teleported).
   */
  #setupInteractionListeners() {
    if (this.#listenersAttached) return;
    this.#listenersAttached = true;
    this.#container?.addEventListener("pointerover", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
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
    const mode = resolveMode(this.getAttribute("mode"));

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

      // Step 3: Staggered reveal; the whole stagger is capped, however many bars there are.
      items.forEach((item, index) => {
        const cache = this.#bars[index];
        const delay = entranceDelay(index, items.length, 25);
        cache.bar.style.transition = `y 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, height 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, opacity 0.3s ease ${delay}ms`;
        cache.bar.setAttribute("y", String(item.y));
        cache.bar.setAttribute("height", String(item.height));
      });

      const maxDuration = 350 + entranceDelay(items.length - 1, items.length, 25) + 50;
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
