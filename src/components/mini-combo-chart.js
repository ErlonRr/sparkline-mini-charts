// mini-combo-chart.js — Responsive SVG combination (bar + line) sparkline Custom Element.

import { createBarLayout, createCartesianLayout, createDomain, createSmoothPath } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay, pointerToViewBoxX } from "../core/svg.js";

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

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** Whether the line and bars have played their entrance animation. */
  #entered = false;

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
   * Cancels pending timers and animation frames on disconnection. Interaction
   * listeners stay attached, so a moved element keeps emitting events.
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
  }

  /**
   * Overrides the default data parser to accept an array of `{bar, line}`.
   * @override
   * @param {string | null} raw JSON text of the `data` attribute.
   * @returns {ComboDataPoint[]}
   */
  parseData(raw) {
    try {
      const parsed = JSON.parse(raw || "[]");
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

    // Through the screen CTM, so letterboxing (host aspect ratio ≠ viewBox) does not shift the index.
    const relativeX = pointerToViewBoxX(this.#svg, e, this.chartWidth);
    if (relativeX === null) return;

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

  /**
   * Attaches the interaction listeners once. They sit on nodes of the element's
   * own shadow tree, so they cannot leak and stay attached when the element is
   * disconnected and reconnected (moved, reordered, teleported).
   */
  #setupInteractionListeners() {
    if (this.#listenersAttached) return;
    this.#listenersAttached = true;
    this.#svg?.addEventListener("pointermove", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
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
      this.#barsGroup.replaceChildren();
      this.#linePath.style.display = "none";
      this.#pointsGroup.replaceChildren();
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

    // The bars sit in equal slots (a band scale): put each line vertex on its bar's centre, so the
    // line, the last point and the hover crosshair all share the bars' x positions.
    const linePoints = lineLayout.points.map((pt, i) => {
      const bar = barLayout.bars[i];
      return bar ? { x: bar.x + bar.width / 2, y: pt.y } : pt;
    });

    this.#currentCoordinates = linePoints.map((pt, i) => ({
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

    const isInitial = !this.#entered;

    if (isInitial) {
      this.#entered = true;

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

      // Step 3: Trigger staggered bars; the whole stagger is capped, however many bars there are.
      barLayout.bars.forEach((bar, index) => {
        const rect = existingBars[index];
        rect.style.transition = `all 0.4s ease-out ${entranceDelay(index, barLayout.bars.length, 30)}ms`;
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
      }, 400 + entranceDelay(barLayout.bars.length - 1, barLayout.bars.length, 30) + 50);
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
      ? createSmoothPath(linePoints)
      : linePoints.reduce((acc, pt, i) => `${acc}${i === 0 ? "M" : " L"} ${pt.x} ${pt.y}`, "");

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
    this.#pointsGroup.replaceChildren();
    if (linePoints.length > 0) {
      const last = linePoints[linePoints.length - 1];
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
