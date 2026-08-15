// mini-pie-chart.js — Responsive SVG pie/donut sparkline Custom Element.

import { createRadialLayout, describePieSector } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders non-negative values as a full circular pie or donut sparkline with animations and interactions.
 *
 * @extends MiniChartElement
 */
export class MiniPieChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "inner-radius",
    "donut",
    "pad-angle",
    "start-angle",
    "interactive",
  ];

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #group = null;

  /** @type {number[]} */
  #currentData = [];

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return 100;
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Pie";
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
      
      const maskId = `pie-mask-${Math.random().toString(36).slice(2, 9)}`;
      svg.dataset.maskId = maskId;
      
      const defs = createSvgElement("defs");
      const mask = createSvgElement("mask", { id: maskId });
      const maskCircle = createSvgElement("circle", { 
        cx: "50", cy: "50", r: "25", 
        fill: "none", stroke: "white", "stroke-width": "50",
        "stroke-dasharray": "157.1", "stroke-dashoffset": "157.1",
        transform: "rotate(-90 50 50)"
      });
      
      mask.append(maskCircle);
      defs.append(mask);
      
      this.#group = /** @type {SVGGElement} */ (createSvgElement("g", { mask: `url(#${maskId})`, part: "group" }));
      svg.append(defs, this.#group);
      
      this.shadowRoot?.replaceChildren(style, svg);
      this.#setupInteractionListeners();
    } else {
      svg.setAttribute("aria-label", label);
      const title = svg.querySelector("title");
      if (title) title.textContent = label;
    }

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
:host([interactive]) [part~="segment"] {
  cursor: pointer;
}
:host([interactive]) [part~="segment"]:hover {
  filter: brightness(1.18);
  opacity: 1 !important;
}
:host([interactive]) [part="group"]:has([part~="segment"]:hover) [part~="segment"]:not(:hover) {
  opacity: 0.45;
}`;

    this.renderChart(svg, data, isInitialRender);
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {SVGPathElement | null} */ (e.target);
    if (!target || target.tagName !== "path" || !target.hasAttribute("data-index")) return;

    const index = parseInt(target.getAttribute("data-index") || "0", 10);
    const value = this.#currentData[index] || 0;
    const total = this.#currentData.reduce((s, v) => s + Math.max(0, v), 0);
    const percentage = total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
    const color = getSegmentColor(index);

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: { index, value, percentage, color, element: target },
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
    this.#group?.addEventListener("pointerover", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  #detachInteractionListeners() {
    this.#group?.removeEventListener("pointerover", this.#onPointerMove);
    this.#svg?.removeEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * Updates SVG children with DOM diffing, donut support, and animations.
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

    this.#currentData = data;
    const group = this.#group ?? svg.querySelector('[part="group"]');
    if (!group) return;

    const startAngleAttr = parseFloat(this.getAttribute("start-angle") || "-90");
    const startAngle = !isNaN(startAngleAttr) ? (startAngleAttr * Math.PI) / 180 : -Math.PI / 2;

    const donutAttr = parseFloat(this.getAttribute("donut") || this.getAttribute("inner-radius") || "0");
    const innerRatio = !isNaN(donutAttr) ? Math.max(0, Math.min(0.9, donutAttr)) : 0;
    const outerRadius = 48;
    const innerRadius = outerRadius * innerRatio;

    const { slices } = createRadialLayout(data, { startAngle });
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

    slices.forEach((slice, index) => {
      const path = describePieSector(50, 50, outerRadius, slice.startAngle, slice.endAngle, innerRadius);
      const segment = /** @type {SVGPathElement} */ (existingSegments[index]);
      
      if (!path) {
        segment.setAttribute("d", "");
        return;
      }

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


    if (isInitial) {
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
