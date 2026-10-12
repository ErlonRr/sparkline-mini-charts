// mini-funnel-chart.js — Responsive SVG funnel sparkline Custom Element for conversion steps.

import { readDataArray } from "../core/data.js";
import { createFunnelLayout, funnelConnectorPath, readFunnelSteps } from "../core/layouts/funnel.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { UPDATE_MS, lerp, stopTween, tween } from "../core/motion.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/** @typedef {import("../core/layouts/funnel.js").FunnelStep} FunnelStep */
/** @typedef {import("../core/layouts/funnel.js").FunnelBar} FunnelBar */

/** Lightest shade of the last step in `colors="accent"` (the first step is opaque). */
const LAST_SHADE = 0.35;

/** Share of the entrance spent staggering the steps, at most. */
const ENTRANCE_STAGGER = 0.4;

/**
 * Renders conversion steps as centred bars, widest first, joined by trapezoids.
 *
 * @extends MiniChartElement
 */
export class MiniFunnelChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    orientation: { type: "enum", values: ["horizontal", "vertical"], default: "horizontal" },
    shape: { type: "enum", values: ["trapezoid", "bars"], default: "trapezoid" },
    gap: { type: "number", default: 0.25 },
    radius: { type: "number", default: 0 },
    colors: { type: "enum", values: ["accent", "series"], default: "accent" },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the steps have played their entrance animation (an empty render does not count). */
  #entered = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #connectorsGroup = null;
  /** @type {SVGGElement | null} */
  #stepsGroup = null;

  /** @type {SVGRectElement[]} */
  #steps = [];
  /** @type {SVGPathElement[]} */
  #connectors = [];

  /** Geometry on screen now, so an interrupted transition continues from where it is. @type {FunnelBar[]} */
  #drawn = [];

  /** @type {FunnelStep[]} */
  #currentData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Funnel";
  }

  /**
   * Reads numbers or `{ value, label? }` objects; anything without a finite value is dropped.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {FunnelStep[]}
   */
  parseData(raw) {
    return readFunnelSteps(readDataArray(raw));
  }

  /**
   * Summarizes the funnel: its steps, first and last values and overall conversion.
   * @override
   * @param {FunnelStep[]} data Parsed steps.
   * @returns {string}
   */
  createDefaultLabel(data) {
    if (data.length === 0) return `Empty ${this.chartName} chart`;
    const first = data[0];
    const last = data[data.length - 1];
    const noun = data.length === 1 ? "step" : "steps";
    const share = last?.percent === null || last?.percent === undefined ? "" : ` (${Math.round(last.percent * 10) / 10}% of the first)`;
    return `${this.chartName} chart with ${data.length} ${noun}, from ${first?.value} to ${last?.value}${share}`;
  }

  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data);

    if (!this.#svg) {
      this.#createDOM(label);
    } else {
      this.#svg.setAttribute("aria-label", label);
      const title = this.#svg.querySelector("title");
      if (title) title.textContent = label;
    }

    this.#update(data);
  }

  /** @param {string} label Accessible name. */
  #createDOM(label) {
    // Static text: per-step colors and shades live on the step nodes, never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; --_mc-step-color: initial; --_mc-shade: initial; }
[part~="step"] {
  fill: var(--_mc-step-color, var(--mini-chart-color, var(--_mc-accent)));
  fill-opacity: var(--_mc-shade, 1);
  transition: opacity 0.2s ease, filter 0.2s ease;
  cursor: default;
}
[part~="connector"] {
  fill: var(--mini-chart-connector-color, var(--_mc-step-color, var(--mini-chart-color, var(--_mc-accent))));
  fill-opacity: calc(var(--_mc-shade, 1) * var(--mini-chart-connector-opacity, 0.35));
  pointer-events: none;
  transition: opacity 0.2s ease;
}
svg[data-interactive] [part~="step"] {
  cursor: pointer;
}
svg[data-interactive] [part~="step"]:hover {
  filter: brightness(1.15);
  opacity: 1 !important;
}
svg[data-interactive]:has([part~="step"]:hover) :is([part~="step"], [part~="connector"]):not(:hover) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#connectorsGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "connectors" }));
    this.#stepsGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "steps" }));
    this.#svg.append(this.#connectorsGroup, this.#stepsGroup);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    // The listeners sit on the chart's own shadow nodes: they cannot leak and survive a move.
    this.#stepsGroup.addEventListener("pointerover", this.#onPointerMove);
    this.#stepsGroup.addEventListener("click", this.#onClick);
    this.#svg.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * The tooltip anchor of a step: the end of its bar (the right end of a
   * horizontal bar, the top of a vertical one).
   *
   * @param {number} index Step index.
   * @returns {{ x: number, y: number } | undefined}
   */
  #stepEnd(index) {
    const bar = this.#drawn[index];
    if (!bar) return undefined;
    return this.option("orientation") === "vertical"
      ? { x: bar.x + bar.width / 2, y: bar.y }
      : { x: bar.x + bar.width, y: bar.y };
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => this.#onPointer(e, "sparkline-hover");
  #onClick = (/** @type {MouseEvent} */ e) => this.#onPointer(e, "sparkline-select");

  /**
   * @param {MouseEvent} e Pointer or click event.
   * @param {"sparkline-hover" | "sparkline-select"} type Event to dispatch.
   */
  #onPointer(e, type) {
    if (!this.option("interactive")) return;
    const step = /** @type {Element | null} */ (e.target)?.closest('[part~="step"]');
    if (!step || !step.hasAttribute("data-index")) return;

    const index = Number.parseInt(step.getAttribute("data-index") || "0", 10);
    const datum = this.#currentData[index];
    if (!datum) return;
    const series = this.option("colors") === "series";

    this.dispatchPoint(type, {
      index,
      value: datum.value,
      datum,
      mark: step,
      anchor: this.#stepEnd(index),
      legacy: {
        index,
        value: datum.value,
        label: datum.label,
        percent: datum.percent,
        conversion: datum.conversion,
        element: step,
        ...(series ? { color: getSegmentColor(index) } : {}),
      },
    }, e);
  }

  #onPointerLeave = () => {
    if (!this.option("interactive")) return;
    this.clearHover();
    this.dispatchEvent(new CustomEvent("sparkline-leave", { bubbles: true, composed: true }));
  };

  /**
   * Adds or removes nodes so there is one rect per step and one connector between two steps.
   *
   * @param {number} count Number of steps.
   */
  #syncNodes(count) {
    while (this.#steps.length < count) {
      const rect = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "step" }));
      this.#stepsGroup?.append(rect);
      this.#steps.push(rect);
    }
    while (this.#steps.length > count) this.#steps.pop()?.remove();
    this.#drawn.length = Math.min(this.#drawn.length, count);

    const connectors = Math.max(0, count - 1);
    while (this.#connectors.length < connectors) {
      const path = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "connector", d: "" }));
      this.#connectorsGroup?.append(path);
      this.#connectors.push(path);
    }
    while (this.#connectors.length > connectors) this.#connectors.pop()?.remove();
  }

  /** @param {FunnelStep[]} data Parsed steps. */
  #update(data) {
    stopTween(this);
    this.#currentData = data;
    this.#syncNodes(data.length);
    if (data.length === 0 || !this.#connectorsGroup) return;

    const horizontal = this.option("orientation") !== "vertical";
    const series = this.option("colors") === "series";
    const radius = Math.max(0, this.option("radius") ?? 0);
    this.#connectorsGroup.style.display = this.option("shape") === "bars" ? "none" : "";

    const bars = createFunnelLayout(data.map((step) => step.value), {
      width: this.chartWidth,
      height: this.chartHeight,
      horizontal,
      gap: this.option("gap"),
    });

    const count = bars.length;
    /** @param {Element} node @param {number} index Step whose color and shade the node takes. */
    const paint = (node, index) => {
      const shade = series || count === 1 ? 1 : 1 - ((1 - LAST_SHADE) * index) / (count - 1);
      const style = /** @type {SVGElement} */ (node).style;
      style.setProperty("--_mc-shade", String(Math.round(shade * 1000) / 1000));
      if (series) style.setProperty("--_mc-step-color", `var(--mini-chart-color-${index + 1}, ${getSegmentColor(index)})`);
      else style.removeProperty("--_mc-step-color");
    };

    this.#steps.forEach((rect, index) => {
      rect.setAttribute("data-index", String(index));
      rect.setAttribute("data-value", String(data[index]?.value));
      paint(rect, index);
      const bar = bars[index];
      const corner = bar ? Math.min(radius, (horizontal ? bar.height : bar.width) / 2) : 0;
      if (corner > 0) {
        rect.setAttribute("rx", String(corner));
        rect.setAttribute("ry", String(corner));
      } else {
        rect.removeAttribute("rx");
        rect.removeAttribute("ry");
      }
    });
    // A connector takes the color and shade of the step above (or left of) it.
    this.#connectors.forEach((path, index) => paint(path, index));

    // A bar enters (and a new step appears) from zero length at the centre of its slot.
    const collapsed = (/** @type {FunnelBar} */ bar) =>
      horizontal ? { ...bar, x: this.chartWidth / 2, width: 0 } : { ...bar, y: this.chartHeight / 2, height: 0 };
    const entering = !this.#entered;
    this.#entered = true;
    const from = bars.map((bar, index) => (entering ? collapsed(bar) : (this.#drawn[index] ?? collapsed(bar))));
    const stagger = entering && count > 1 ? Math.min(ENTRANCE_STAGGER, 0.08 * (count - 1)) : 0;

    /** @param {number} t Eased progress. */
    const frame = (t) => {
      bars.forEach((bar, index) => {
        const delay = count > 1 ? (stagger * index) / (count - 1) : 0;
        const local = t >= 1 ? 1 : Math.max(0, Math.min(1, (t - delay) / (1 - stagger)));
        const start = from[index] ?? bar;
        const now = {
          x: lerp(start.x, bar.x, local),
          y: lerp(start.y, bar.y, local),
          width: lerp(start.width, bar.width, local),
          height: lerp(start.height, bar.height, local),
        };
        this.#drawn[index] = now;
        const rect = this.#steps[index];
        if (!rect) return;
        rect.setAttribute("x", String(now.x));
        rect.setAttribute("y", String(now.y));
        rect.setAttribute("width", String(now.width));
        rect.setAttribute("height", String(now.height));
      });
      this.#connectors.forEach((path, index) => {
        const upper = this.#drawn[index];
        const lower = this.#drawn[index + 1];
        path.setAttribute("d", upper && lower ? funnelConnectorPath(upper, lower, horizontal) : "");
      });
    };

    tween(this, frame, entering ? UPDATE_MS / (1 - stagger) : UPDATE_MS);
  }
}

acceptDataValues(MiniFunnelChart);
