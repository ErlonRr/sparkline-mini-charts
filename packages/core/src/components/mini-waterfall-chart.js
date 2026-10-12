// mini-waterfall-chart.js — Responsive SVG waterfall (running total) sparkline Custom Element.

import { readDataArray } from "../core/data.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { attributeFrames, readAttributes, stopTween, tween } from "../core/motion.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay } from "../core/svg.js";

/** Padding around the bars, in viewBox units. */
const PADDING = 2;

/**
 * A data entry: a delta, or an object. `{ total: true }` draws the running
 * total from zero instead of a step.
 *
 * @typedef {number | { value?: number, total?: boolean, label?: string }} WaterfallEntry
 */

/**
 * @typedef {Object} WaterfallBar
 * @property {number} x Left edge.
 * @property {number} y Top edge.
 * @property {number} width Width.
 * @property {number} height Height.
 * @property {"positive" | "negative" | "total"} kind Color role.
 * @property {number} value The step (a delta), or the running total for a total bar.
 * @property {number} start Value where the bar starts.
 * @property {number} end Value where the bar ends: the running total after it.
 * @property {number} startY y of `start`.
 * @property {number} endY y of `end`.
 */

/**
 * Lays out the bars: each delta starts at the running total and ends at the
 * new running total; a total bar spans from zero to the running total. The
 * value axis always includes zero.
 *
 * @param {readonly WaterfallEntry[]} entries Parsed entries.
 * @param {{ width: number, height: number, gap: number }} options Layout options.
 * @returns {WaterfallBar[]}
 */
export function createWaterfallLayout(entries, { width, height, gap }) {
  let running = 0;
  const steps = entries.map((entry) => {
    const isTotal = typeof entry === "object" && entry?.total === true;
    const delta = typeof entry === "number" ? entry : Number(entry?.value ?? 0) || 0;
    const start = isTotal ? 0 : running;
    const end = isTotal ? running : running + delta;
    running = end;
    /** @type {WaterfallBar["kind"]} */
    const kind = isTotal ? "total" : delta < 0 ? "negative" : "positive";
    return { kind, value: isTotal ? end : delta, start, end };
  });

  const levels = [0, ...steps.flatMap((step) => [step.start, step.end])];
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const span = hi - lo || 1;
  const project = (/** @type {number} */ value) => PADDING + ((hi - value) / span) * (height - PADDING * 2);

  const slot = steps.length > 0 ? (width - PADDING * 2) / steps.length : 0;
  const barWidth = slot * (1 - Math.min(0.8, Math.max(0, gap)));
  return steps.map((step, index) => {
    const startY = project(step.start);
    const endY = project(step.end);
    return {
      ...step,
      x: PADDING + slot * index + (slot - barWidth) / 2,
      y: Math.min(startY, endY),
      width: barWidth,
      height: Math.abs(endY - startY),
      startY,
      endY,
    };
  });
}

/**
 * Renders a series of deltas as floating bars that step from one running total
 * to the next, with optional total bars and connector lines.
 *
 * @extends MiniChartElement
 */
export class MiniWaterfallChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    gap: { type: "number", default: 0.25 },
    radius: { type: "number", default: 0 },
    connectors: { type: "boolean", default: true },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** @type {boolean} */
  #initialized = false;

  /** Whether the bars have played their entrance; an empty first render does not count. */
  #entered = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #connectorGroup = null;
  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {SVGRectElement[]} */
  #bars = [];
  /** @type {SVGLineElement[]} */
  #connectors = [];

  /** @type {WaterfallEntry[]} */
  #currentData = [];
  /** @type {WaterfallBar[]} */
  #layout = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Waterfall";
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

  /**
   * Keeps finite numbers, objects with a finite `value`, and `{ total: true }`
   * objects (whose `value` is ignored). Other entries are skipped.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {WaterfallEntry[]}
   */
  parseData(raw) {
    const parsed = readDataArray(raw);
    if (!parsed) return [];
    return parsed.filter((item) => {
      if (typeof item === "number") return Number.isFinite(item);
      if (item === null || typeof item !== "object" || Array.isArray(item)) return false;
      return item.total === true || (typeof item.value === "number" && Number.isFinite(item.value));
    });
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
   * @param {string} label Accessible name.
   */
  #createDOM(label) {
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part~="connector"] {
  stroke: var(--mini-chart-connector-color, var(--_mc-grid));
  stroke-width: var(--mini-chart-connector-width, 1);
  vector-effect: non-scaling-stroke;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
[part~="bar"] {
  transition: opacity 0.2s ease, filter 0.2s ease;
  cursor: default;
}
[part~="positive"] { fill: var(--mini-chart-positive-color, var(--_mc-positive)); }
[part~="negative"] { fill: var(--mini-chart-negative-color, var(--_mc-negative)); }
[part~="total"] { fill: var(--mini-chart-total-color, currentColor); }
svg[data-interactive] [part~="bar"] {
  cursor: pointer;
}
svg[data-interactive] [part~="bar"]:hover {
  filter: brightness(1.15);
  opacity: 1 !important;
}
svg[data-interactive] [part="bars"]:has([part~="bar"]:hover) [part~="bar"]:not(:hover) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#connectorGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "connectors" }));
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "bars" }));
    this.#svg.append(this.#connectorGroup, this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => this.#onPointer(e, "sparkline-hover");
  #onClick = (/** @type {MouseEvent} */ e) => this.#onPointer(e, "sparkline-select");

  /**
   * @param {MouseEvent} e Pointer or click event.
   * @param {"sparkline-hover" | "sparkline-select"} type Event to dispatch.
   */
  #onPointer(e, type) {
    if (!this.option("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    const bar = target?.closest?.("[data-index]");
    if (!bar) return;

    const index = Number.parseInt(bar.getAttribute("data-index") ?? "0", 10);
    const step = this.#layout[index];
    const entry = this.#currentData[index];
    if (!step || entry === undefined) return;
    const label = typeof entry === "object" && typeof entry.label === "string" ? entry.label : undefined;
    const datum = { value: step.value, runningTotal: step.end, isTotal: step.kind === "total" };

    this.dispatchPoint(type, {
      index,
      value: step.value,
      datum: label === undefined ? datum : { ...datum, label },
      mark: bar,
      anchor: { x: step.x + step.width / 2, y: step.y },
      legacy: { element: bar },
    }, e);
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
    this.#container?.addEventListener("pointerover", this.#onPointerMove);
    this.#container?.addEventListener("click", this.#onClick);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * @param {WaterfallEntry[]} data Parsed chart values.
   */
  #updateChart(data) {
    const svg = this.#svg;
    const container = this.#container;
    const connectorGroup = this.#connectorGroup;
    if (!svg || !container || !connectorGroup) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    stopTween(this);

    this.#currentData = data;
    const bars = createWaterfallLayout(data, { width: this.chartWidth, height: this.chartHeight, gap: this.option("gap") });
    this.#layout = bars;
    const radius = String(Math.max(0, this.option("radius")));

    const before = this.#bars.map((rect) => readAttributes(rect, ["x", "y", "width", "height"]));
    while (this.#bars.length < bars.length) {
      const rect = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "bar" }));
      container.append(rect);
      this.#bars.push(rect);
    }
    while (this.#bars.length > bars.length) this.#bars.pop()?.remove();

    // One connector between two neighbouring bars, at the running total they share.
    const links = this.option("connectors") ? bars.slice(1).map((bar, index) => {
      const previous = /** @type {WaterfallBar} */ (bars[index]);
      return { x1: previous.x + previous.width, y1: previous.endY, x2: bar.x, y2: previous.endY };
    }) : [];
    const linesBefore = this.#connectors.map((line) => readAttributes(line, ["x1", "y1", "x2", "y2"]));
    while (this.#connectors.length < links.length) {
      const line = /** @type {SVGLineElement} */ (createSvgElement("line", { part: "connector" }));
      connectorGroup.append(line);
      this.#connectors.push(line);
    }
    while (this.#connectors.length > links.length) this.#connectors.pop()?.remove();

    bars.forEach((bar, index) => {
      const rect = this.#bars[index];
      rect.setAttribute("part", `bar ${bar.kind}`);
      rect.setAttribute("rx", radius);
      rect.setAttribute("ry", radius);
      rect.setAttribute("data-index", String(index));
      rect.setAttribute("data-value", String(bar.value));
    });

    if (bars.length === 0) return;

    const isInitial = !this.#entered;
    this.#entered = true;
    // A bar that enters grows from where it starts (the previous running total, or zero for a total).
    const collapsed = (/** @type {WaterfallBar} */ bar) => ({ x: bar.x, y: bar.startY, width: bar.width, height: 0 });
    const final = (/** @type {WaterfallBar} */ bar) => ({ x: bar.x, y: bar.y, width: bar.width, height: bar.height });

    if (isInitial) {
      attributeFrames(this.#connectors.map((line, index) => ({ el: line, to: /** @type {Record<string, number>} */ (links[index]) })))(1);
      const animate = this.option("motion") !== "reduce";
      bars.forEach((bar, index) => {
        const rect = this.#bars[index];
        rect.style.transition = "none";
        for (const [name, value] of Object.entries(animate ? collapsed(bar) : final(bar))) rect.setAttribute(name, String(value));
      });
      if (!animate) return;

      for (const line of this.#connectors) {
        line.style.transition = "none";
        line.style.opacity = "0";
      }
      svg.getBoundingClientRect();
      const stagger = entranceDelay(bars.length - 1, bars.length, 40);
      bars.forEach((bar, index) => {
        const rect = this.#bars[index];
        const delay = entranceDelay(index, bars.length, 40);
        rect.style.transition = `y 0.4s ease-out ${delay}ms, height 0.4s ease-out ${delay}ms`;
        for (const [name, value] of Object.entries(final(bar))) rect.setAttribute(name, String(value));
      });
      // The connectors appear once the bars have settled.
      for (const line of this.#connectors) {
        line.style.transition = `opacity 0.3s ease ${stagger + 300}ms`;
        line.style.opacity = "";
      }
      const maxDuration = 400 + stagger + 350;
      this.#timerId = setTimeout(() => {
        for (const node of [...this.#bars, ...this.#connectors]) if (node.isConnected) node.style.transition = "";
        this.#timerId = null;
      }, maxDuration);
      return;
    }

    // Update: an rAF tween of the bars and connectors (new ones grow from their start).
    /** @type {import("../core/motion.js").AttributeTarget[]} */
    const moves = bars.map((bar, index) => {
      const rect = this.#bars[index];
      rect.style.transition = "";
      return { el: rect, from: before[index] ?? collapsed(bar), to: final(bar) };
    });
    this.#connectors.forEach((line, index) => {
      const link = /** @type {Record<string, number>} */ (links[index]);
      line.style.transition = "";
      line.style.opacity = "";
      moves.push({ el: line, from: linesBefore[index] ?? { ...link, x2: link.x1 }, to: link });
    });
    tween(this, attributeFrames(moves));
  }
}

acceptDataValues(MiniWaterfallChart);
