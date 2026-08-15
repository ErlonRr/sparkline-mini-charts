// mini-combo-chart.js — Responsive SVG combination (bar + line) sparkline Custom Element.

import { createBarLayout, createCartesianLayout, createDomain, createSmoothPath } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} ComboDataPoint
 * @property {number} bar
 * @property {number} line
 */

/**
 * Renders simultaneous bar and line layers over a synchronized time domain.
 *
 * @extends MiniChartElement
 */
export class MiniComboChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "shared-domain",
    "curve",
    "bar-gap",
    "interactive",
  ];

  /** @type {boolean} */
  #initialized = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;
  /** @type {number | null} */
  #rafId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #barsGroup = null;
  /** @type {SVGPathElement | null} */
  #linePath = null;
  /** @type {SVGRectElement | null} */
  #clipRect = null;
  /** @type {SVGGElement | null} */
  #pointsGroup = null;
  /** @type {SVGLineElement | null} */
  #crosshair = null;

  /** @type {ComboDataPoint[]} */
  #currentData = [];
  /** @type {Array<{ x: number, barY: number, lineY: number }>} */
  #currentCoordinates = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Combo";
  }

  /**
   * Cleans up pending timers, frames, and listeners on disconnection.
   * @override
   */
  cleanup() {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    this.#detachInteractionListeners();
  }

  /**
   * Overrides data getter to parse array of `{bar, line}`.
   * @returns {ComboDataPoint[]}
   */
  get data() {
    try {
      const parsed = JSON.parse(this.getAttribute("data") || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          Number.isFinite(item.bar) &&
          Number.isFinite(item.line)
      );
    } catch {
      return [];
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

    this.#updateChart(data);
  }

  /**
   * @param {string} label 
   */
  #createDOM(label) {
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part~="bar"] { 
  fill: var(--mini-chart-bar-color, rgba(128, 128, 128, 0.3)); 
  transition: opacity 0.2s ease, fill 0.2s ease; 
  cursor: default;
}
[part="line"] { 
  stroke: var(--mini-chart-color, #2563eb); 
  stroke-width: var(--mini-chart-stroke-width, 2); 
  transition: d 0.4s ease-out; 
  pointer-events: none;
}
[part="point"] { 
  fill: var(--mini-chart-color, #2563eb); 
  transition: cx 0.4s ease-out, cy 0.4s ease-out; 
  pointer-events: none;
}
[part="crosshair"] { display: none; pointer-events: none; }
:host([interactive]) [part~="bar"] {
  cursor: pointer;
}
:host([interactive]) [part~="bar"]:hover {
  fill: var(--mini-chart-bar-color-hover, rgba(128, 128, 128, 0.6));
  filter: brightness(1.2);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });

    this.#barsGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "bars" }));

    const clipId = `combo-clip-${Math.random().toString(36).slice(2, 9)}`;
    const defs = createSvgElement("defs");
    const clipPath = createSvgElement("clipPath", { id: clipId });

    this.#clipRect = /** @type {SVGRectElement} */ (createSvgElement("rect", {
      x: "0",
      y: "0",
      width: String(this.chartWidth),
      height: String(this.chartHeight),
    }));
    clipPath.append(this.#clipRect);
    defs.append(clipPath);

    const lineGroup = createSvgElement("g", { "clip-path": `url(#${clipId})`, part: "line-group" });
    this.#linePath = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "line" }));
    lineGroup.append(this.#linePath);

    this.#pointsGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "points" }));

    this.#crosshair = /** @type {SVGLineElement} */ (createSvgElement("line", {
      part: "crosshair",
      y1: "0",
      y2: String(this.chartHeight),
    }));

    this.#svg.append(defs, this.#barsGroup, lineGroup, this.#pointsGroup, this.#crosshair);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive") || this.#currentCoordinates.length === 0 || !this.#svg) return;

    const rect = this.#svg.getBoundingClientRect();
    if (rect.width === 0) return;

    const relativeX = ((e.clientX - rect.left) / rect.width) * this.chartWidth;
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < this.#currentCoordinates.length; i++) {
      const dist = Math.abs(this.#currentCoordinates[i].x - relativeX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    const coord = this.#currentCoordinates[closestIndex];
    const dataPt = this.#currentData[closestIndex];

    if (this.#crosshair) {
      this.#crosshair.style.display = "";
      this.#crosshair.setAttribute("x1", String(coord.x));
      this.#crosshair.setAttribute("x2", String(coord.x));
    }

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: {
        index: closestIndex,
        barValue: dataPt.bar,
        lineValue: dataPt.line,
        x: coord.x,
        y: coord.lineY,
      },
    }));
  };

  #onPointerLeave = () => {
    if (!this.hasAttribute("interactive")) return;
    if (this.#crosshair) this.#crosshair.style.display = "none";
    this.dispatchEvent(new CustomEvent("sparkline-leave", {
      bubbles: true,
      composed: true,
    }));
  };

  #setupInteractionListeners() {
    this.#svg?.addEventListener("pointermove", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  #detachInteractionListeners() {
    this.#svg?.removeEventListener("pointermove", this.#onPointerMove);
    this.#svg?.removeEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * @param {ComboDataPoint[]} data 
   */
  #updateChart(data) {
    if (!this.#barsGroup || !this.#linePath || !this.#clipRect || !this.#pointsGroup || !this.#svg) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }

    this.#currentData = data;

    if (data.length === 0) {
      this.#barsGroup.innerHTML = "";
      this.#linePath.style.display = "none";
      this.#pointsGroup.innerHTML = "";
      this.#currentCoordinates = [];
      return;
    }

    const barValues = data.map((d) => d.bar);
    const lineValues = data.map((d) => d.line);

    const isSharedDomain = this.getAttribute("shared-domain") !== "false";
    const gapAttr = parseFloat(this.getAttribute("bar-gap") || "0.2");
    const gapRatio = !isNaN(gapAttr) ? Math.max(0, Math.min(0.8, gapAttr)) : 0.2;

    let barLayout;
    let lineLayout;

    if (isSharedDomain) {
      const allVals = [...barValues, ...lineValues];
      const sharedDomain = createDomain(allVals, { includeZero: true });
      barLayout = createBarLayout(barValues, { width: this.chartWidth, height: this.chartHeight, gapRatio, min: sharedDomain[0], max: sharedDomain[1] });
      lineLayout = createCartesianLayout(lineValues, { width: this.chartWidth, height: this.chartHeight, min: sharedDomain[0], max: sharedDomain[1] });
    } else {
      barLayout = createBarLayout(barValues, { width: this.chartWidth, height: this.chartHeight, gapRatio });
      lineLayout = createCartesianLayout(lineValues, { width: this.chartWidth, height: this.chartHeight });
    }

    this.#currentCoordinates = lineLayout.points.map((pt, i) => ({
      x: pt.x,
      barY: barLayout.bars[i]?.y || 0,
      lineY: pt.y,
    }));

    // Update bars
    const existingBars = /** @type {SVGRectElement[]} */ (Array.from(this.#barsGroup.querySelectorAll("rect")));
    while (existingBars.length < barLayout.bars.length) {
      const rect = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "bar" }));
      this.#barsGroup.append(rect);
      existingBars.push(rect);
    }
    while (existingBars.length > barLayout.bars.length) {
      const rect = existingBars.pop();
      rect?.remove();
    }

    const isInitial = !this.#linePath.dataset.rendered;

    if (isInitial) {
      this.#linePath.dataset.rendered = "true";

      // Step 1: Initial bar state
      barLayout.bars.forEach((bar, index) => {
        const rect = existingBars[index];
        rect.style.transition = "none";
        rect.setAttribute("x", String(bar.x));
        rect.setAttribute("y", String(barLayout.baseline));
        rect.setAttribute("width", String(bar.width));
        rect.setAttribute("height", "0");
        rect.setAttribute("data-index", String(index));
      });

      // Step 2: Batch single reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Trigger staggered bars
      barLayout.bars.forEach((bar, index) => {
        const rect = existingBars[index];
        rect.style.transition = `all 0.4s ease-out ${index * 0.03}s`;
        rect.setAttribute("y", String(bar.y));
        rect.setAttribute("height", String(bar.height));
      });

      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          existingBars.forEach((r) => {
            if (r.isConnected) r.style.transition = "";
          });
        }
        this.#timerId = null;
      }, 400 + barLayout.bars.length * 30 + 50);
    } else {
      barLayout.bars.forEach((bar, index) => {
        const rect = existingBars[index];
        rect.style.transition = "";
        rect.setAttribute("x", String(bar.x));
        rect.setAttribute("y", String(bar.y));
        rect.setAttribute("width", String(bar.width));
        rect.setAttribute("height", String(bar.height));
        rect.setAttribute("data-index", String(index));
      });
    }

    // Update Line
    const curve = this.getAttribute("curve") || "linear";
    const lineD = curve === "smooth"
      ? createSmoothPath(lineLayout.points)
      : lineLayout.points.reduce((acc, pt, i) => `${acc}${i === 0 ? "M" : " L"} ${pt.x} ${pt.y}`, "");

    this.#linePath.style.display = "";
    this.#linePath.setAttribute("d", lineD);

    if (isInitial) {
      this.#clipRect.style.transition = "none";
      this.#clipRect.setAttribute("width", "0");

      if (typeof requestAnimationFrame !== "undefined") {
        this.#rafId = requestAnimationFrame(() => {
          this.#rafId = requestAnimationFrame(() => {
            if (!this.#clipRect) return;
            this.#clipRect.style.transition = "width 0.8s ease-out";
            this.#clipRect.setAttribute("width", String(this.chartWidth));
          });
        });
      } else {
        this.#clipRect.setAttribute("width", String(this.chartWidth));
      }
    } else {
      this.#clipRect.setAttribute("width", String(this.chartWidth));
    }

    // Last point indicator
    this.#pointsGroup.innerHTML = "";
    if (lineLayout.points.length > 0) {
      const last = lineLayout.points[lineLayout.points.length - 1];
      const point = createSvgElement("circle", {
        cx: String(last.x),
        cy: String(last.y),
        r: "2",
        part: "point",
      });
      this.#pointsGroup.append(point);
    }
  }
}
