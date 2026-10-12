// mini-bar-chart.js — Responsive SVG bar sparkline Custom Element.

import { createBarLayout } from "../core/geometry.js";
import { MiniChartElement, appendChartData } from "../core/mini-chart-element.js";
import { attributeFrames, readAttributes, stopTween, takeSlide, tween } from "../core/motion.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay } from "../core/svg.js";

/**
 * Renders a numeric series as a compact bar sparkline with animations, styling, and interactions.
 *
 * @extends MiniChartElement
 */
export class MiniBarChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    gap: { type: "number", default: 0.2 },
    radius: { type: "number", default: 0 },
    baseline: { type: "number" },
    min: { type: "number" },
    max: { type: "number" },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /**
   * Whether the bars have played their entrance animation. An empty first
   * render (a framework setting `data` after connecting) does not count, so
   * the bars grow in when the first values arrive.
   */
  #entered = false;

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
   * Appends values for live data and keeps the last `maxLength`; the bars slide to the left.
   *
   * @example
   * chart.appendData([42], { maxLength: 30 });
   *
   * @param {number | readonly number[]} values Values to append.
   * @param {import("../core/mini-chart-element.js").AppendDataOptions} [options] Trimming.
   * @returns {void}
   */
  appendData(values, options) {
    appendChartData(this, values, options);
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

  /** Renders the element's complete Shadow DOM tree, preserving SVG for animations. */
  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data);
    let style = this.shadowRoot?.querySelector("style");
    let svg = this.shadowRoot?.querySelector("svg");

    if (!svg || !style) {
      // The stylesheet is static, so it is written once with the nodes instead of on every render.
      style = document.createElement("style");
      style.textContent = `${chartStyles}
:host { 
  --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; 
}
[part~="bar"] { 
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease;
  cursor: default;
}
[part~="positive"] { 
  fill: var(--mini-chart-positive-color, var(--mini-chart-color, var(--_mc-positive)));
}
[part~="negative"] { 
  fill: var(--mini-chart-negative-color, var(--_mc-negative));
}
svg[data-interactive] [part~="bar"] {
  cursor: pointer;
}
svg[data-interactive] [part~="bar"]:hover {
  filter: brightness(1.15);
  opacity: 1 !important;
}
svg[data-interactive] [part="bars"]:has([part~="bar"]:hover) [part~="bar"]:not(:hover) {
  opacity: var(--mini-chart-bar-opacity-inactive, var(--_mc-dim));
}`;
      svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
      this.#svg = svg;

      this.#barsGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "bars" }));
      svg.append(this.#barsGroup);

      this.shadowRoot?.replaceChildren(style, svg);
      // The nodes are new, so they need their own listeners.
      this.#listenersAttached = false;
      this.#setupInteractionListeners();
    } else {
      svg.setAttribute("aria-label", label);
      const title = svg.querySelector("title");
      if (title) title.textContent = label;
    }

    this.renderChart(svg, data, !this.#entered);
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => this.#onPointer(e, "sparkline-hover");
  #onClick = (/** @type {MouseEvent} */ e) => this.#onPointer(e, "sparkline-select");

  /**
   * @param {MouseEvent} e Pointer or click event.
   * @param {"sparkline-hover" | "sparkline-select"} type Event to dispatch.
   */
  #onPointer(e, type) {
    if (!this.option("interactive")) return;
    const target = /** @type {SVGRectElement | null} */ (e.target);
    if (!target || target.tagName !== "rect" || !target.hasAttribute("data-index")) return;

    const index = parseInt(target.getAttribute("data-index") || "0", 10);
    const value = parseFloat(target.getAttribute("data-value") || "0");
    const isPositive = target.getAttribute("part")?.includes("positive") ?? value >= 0;

    this.dispatchPoint(type, { index, value, mark: target, legacy: { index, value, isPositive, element: target } }, e);
  }

  #onPointerLeave = () => {
    if (!this.option("interactive")) return;
    this.clearHover();
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
    this.#barsGroup?.addEventListener("pointerover", this.#onPointerMove);
    this.#barsGroup?.addEventListener("click", this.#onClick);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * Updates SVG children with DOM diffing, batch reflows, and animations.
   * 
   * @param {SVGSVGElement} svg Responsive SVG root.
   * @param {number[]} data Parsed chart values.
   * @param {boolean} isInitial True until the first non-empty render, which plays the entrance animation.
   */
  renderChart(svg, data, isInitial = false) {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    stopTween(this);
    const slide = takeSlide(this);

    const gapRatio = Math.max(0, Math.min(0.8, this.option("gap")));
    const radius = Math.max(0, this.option("radius"));
    const baselineValue = this.option("baseline");
    const pivot = baselineValue ?? 0;

    const { bars, baseline } = createBarLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      gapRatio,
      min: this.option("min"),
      max: this.option("max"),
      baseline: baselineValue,
    });

    const container = this.#barsGroup ?? svg;
    const existingBars = /** @type {SVGRectElement[]} */ (Array.from(container.querySelectorAll('rect')));
    // Where each bar is now, so the update moves bars from there (a slide shifts them by `slide`).
    const before = existingBars.map((rect) => readAttributes(rect, ["x", "y", "width", "height"]));

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
    this.#entered = true;

    if (isInitial) {
      // Step 1: Batch initial positioning at baseline
      bars.forEach((bar, index) => {
        const rect = existingBars[index];
        const val = data[index];
        const isPos = val >= pivot;

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

      // Step 3: Batch trigger staggered transitions; the whole stagger is capped, however many bars there are.
      bars.forEach((bar, index) => {
        const rect = existingBars[index];
        rect.style.transition = `all 0.4s ease-out ${entranceDelay(index, bars.length, 30)}ms`;
        rect.setAttribute("y", String(bar.y));
        rect.setAttribute("height", String(bar.height));
      });

      // Step 4: Central timer for inline transition cleanup
      const maxDuration = 400 + entranceDelay(bars.length - 1, bars.length, 30) + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          existingBars.forEach((r) => {
            if (r.isConnected) r.style.transition = "";
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Normal update: an rAF tween of x, y, width and height (new bars grow from the baseline).
      /** @type {import("../core/motion.js").AttributeTarget[]} */
      const moves = [];
      bars.forEach((bar, index) => {
        const rect = existingBars[index];
        const val = data[index];
        const isPos = val >= pivot;

        rect.style.transition = "";
        const previous = before[index + slide] ?? null;
        moves.push({
          el: rect,
          from: previous ?? { x: slide > 0 ? this.chartWidth : bar.x, y: baseline, width: bar.width, height: 0 },
          to: { x: bar.x, y: bar.y, width: bar.width, height: bar.height },
        });
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
      tween(this, attributeFrames(moves));
    }
  }
}

