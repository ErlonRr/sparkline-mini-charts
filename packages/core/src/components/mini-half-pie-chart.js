// mini-half-pie-chart.js — Responsive SVG semi-circular pie/donut sparkline Custom Element.

import { parsePositionalData } from "../core/data.js";
import { createRadialLayout, describePieSector, polarToCartesian } from "../core/geometry.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { lerp, stopTween, tween } from "../core/motion.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders non-negative values as an upper semi-circular pie or donut sparkline.
 *
 * @extends MiniChartElement
 */
export class MiniHalfPieChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    innerRadius: { type: "number", default: 0 },
    donut: { type: "number" },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** Slice angles on screen, mid-transition included. @type {Array<{ start: number, end: number }>} */
  #shownArcs = [];

  /**
   * Whether the slices have played their entrance reveal. An empty first
   * render (a framework setting `data` after connecting) does not count, so
   * the reveal plays when the first values arrive.
   */
  #entered = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #group = null;

  /** @type {number[]} */
  #currentData = [];

  /** @type {Array<{ start: number, end: number }>} Final slice angles, where the tooltip points. */
  #targetArcs = [];

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return 50;
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Half-pie";
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
   * Overrides the default data parser: an invalid entry such as `null` becomes
   * a zero-sized slice in its slot, so slice `n` keeps color `n`.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {number[]}
   */
  parseData(raw) {
    return parsePositionalData(raw).map((value) => value ?? 0);
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
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part~="segment"] { 
  fill: var(--mini-chart-segment-color, currentColor);
  transition: opacity 0.2s ease, filter 0.2s ease; 
  stroke: var(--mini-chart-gap-color, transparent);
  stroke-width: var(--mini-chart-gap-width, 0.5px);
  cursor: default;
}

mask circle { transition: stroke-dashoffset 0.8s ease-out; }
svg[data-interactive] [part~="segment"] {
  cursor: pointer;
}
svg[data-interactive] [part~="segment"]:hover {
  filter: brightness(1.18);
  opacity: 1 !important;
}
svg[data-interactive] [part="group"]:has([part~="segment"]:hover) [part~="segment"]:not(:hover) {
  opacity: var(--_mc-dim);
}`;
      svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
      this.#svg = svg;

      const maskId = `half-pie-mask-${Math.random().toString(36).slice(2, 9)}`;
      svg.dataset.maskId = maskId;

      const defs = createSvgElement("defs");
      const mask = createSvgElement("mask", { id: maskId });
      const maskCircle = createSvgElement("circle", { 
        cx: "50", cy: "50", r: "25", 
        fill: "none", stroke: "white", "stroke-width": "50",
        "stroke-dasharray": "78.54 157.1", "stroke-dashoffset": "78.54",
        transform: "rotate(-180 50 50)"
      });

      mask.append(maskCircle);
      defs.append(mask);

      this.#group = /** @type {SVGGElement} */ (createSvgElement("g", { mask: `url(#${maskId})`, part: "group" }));
      svg.append(defs, this.#group);

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
    const target = /** @type {SVGPathElement | null} */ (e.target);
    if (!target || target.tagName !== "path" || !target.hasAttribute("data-index")) return;

    const index = parseInt(target.getAttribute("data-index") || "0", 10);
    const value = this.#currentData[index] || 0;
    const total = this.#currentData.reduce((s, v) => s + Math.max(0, v), 0);
    const percentage = total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
    const color = getSegmentColor(index);
    const arc = this.#targetArcs[index];

    this.dispatchPoint(type, {
      index,
      value,
      datum: this.#currentData[index],
      mark: target,
      // The tooltip points at the middle of the slice's outer edge.
      anchor: arc ? polarToCartesian(50, 50, 46, (arc.start + arc.end) / 2) : undefined,
      legacy: { index, value, percentage, color, element: target },
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
    this.#group?.addEventListener("pointerover", this.#onPointerMove);
    this.#group?.addEventListener("click", this.#onClick);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * Updates SVG children with DOM diffing, donut support, and animations.
   * 
   * @param {SVGSVGElement} svg Responsive SVG root.
   * @param {number[]} data Parsed chart values.
   * @param {boolean} isInitial True until the first render that draws a slice, which plays the entrance reveal.
   */
  renderChart(svg, data, isInitial = false) {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    stopTween(this);

    this.#currentData = data;
    const group = this.#group ?? svg.querySelector('[part="group"]');
    if (!group) return;

    const innerRatio = Math.max(0, Math.min(0.9, this.option("donut") ?? this.option("innerRadius") ?? 0));
    const outerRadius = 46;
    const innerRadius = outerRadius * innerRatio;

    const { slices } = createRadialLayout(data, { startAngle: Math.PI, sweep: Math.PI });
    const existingSegments = Array.from(group.querySelectorAll('[part~="segment"]'));

    while (existingSegments.length < slices.length) {
      const segment = createSvgElement("path", { part: "segment" });
      group.append(segment);
      existingSegments.push(segment);
    }
    while (existingSegments.length > slices.length) {
      const segment = existingSegments.pop();
      segment?.remove();
    }

    /** @type {Array<{ segment: Element, start: number, end: number }>} */
    const arcs = [];
    let drawn = 0;
    slices.forEach((slice, index) => {
      const path = describePieSector(50, 50, outerRadius, slice.startAngle, slice.endAngle, innerRadius);
      const segment = /** @type {SVGPathElement} */ (existingSegments[index]);
      arcs.push(path ? { segment, start: slice.startAngle, end: slice.endAngle } : { segment, start: slice.startAngle, end: slice.startAngle });
      
      if (!path) {
        segment.setAttribute("d", "");
        return;
      }
      drawn += 1;

      if (isInitial) {
        segment.style.transition = "none";
      } else {
        segment.style.transition = "";
      }

      segment.setAttribute("d", path);
      segment.setAttribute("data-index", String(index));
      segment.setAttribute("part", `segment segment-${index + 1}`);
      segment.style.setProperty("--mini-chart-segment-color", `var(--mini-chart-color-${index + 1}, ${getSegmentColor(index)})`);
    });

    this.#targetArcs = arcs.map(({ start, end }) => ({ start, end }));

    // Updates move the slice angles with an rAF tween, from where the slices are now.
    const previous = this.#shownArcs;
    if (!isInitial && previous.length > 0 && drawn > 0) {
      const from = arcs.map((arc, index) => previous[index] ?? { start: arc.end, end: arc.end });
      tween(this, (t) => {
        this.#shownArcs = arcs.map((arc, index) => {
          const start = lerp(from[index].start, arc.start, t);
          const end = lerp(from[index].end, arc.end, t);
          arc.segment.setAttribute("d", end - start > 1e-6 ? (describePieSector(50, 50, outerRadius, start, end, innerRadius) || "") : "");
          return { start, end };
        });
      });
    } else {
      this.#shownArcs = arcs.map(({ start, end }) => ({ start, end }));
    }

    if (isInitial && drawn > 0) {
      this.#entered = true;
      const maskCircle = /** @type {SVGCircleElement | null} */ (svg.querySelector("mask circle"));
      if (maskCircle) {
        maskCircle.getBoundingClientRect(); // force reflow
        maskCircle.style.strokeDashoffset = "0";

        this.#timerId = setTimeout(() => {
          if (this.isConnected && maskCircle.isConnected) {
            maskCircle.style.transition = "none";
          }
          this.#timerId = null;
        }, 850);
      }
    }
  }
}

acceptDataValues(MiniHalfPieChart);
