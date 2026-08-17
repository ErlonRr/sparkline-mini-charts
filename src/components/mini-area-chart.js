// mini-area-chart.js — Responsive SVG area sparkline Custom Element.

import { createCartesianLayout, createSmoothAreaPath, createSmoothPath, createStepPath } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} Point2D
 * @property {number} x
 * @property {number} y
 */

/**
 * Renders a numeric series as a filled area sparkline with native gradients, smooth curves, and animations.
 *
 * @extends MiniChartElement
 */
export class MiniAreaChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "curve",
    "points",
    "gradient",
    "min",
    "max",
    "reference-value",
    "trend-color",
    "interactive",
  ];

  /** @type {Point2D[]} */
  #prevPoints = [];
  /** @type {number} */
  #prevBaseline = 0;

  /** @type {boolean} */
  #initialized = false;

  /** @type {number | null} */
  #rafId = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGPathElement | null} */
  #linePath = null;
  /** @type {SVGPathElement | null} */
  #areaPath = null;
  /** @type {SVGRectElement | null} */
  #clipRect = null;
  /** @type {SVGGElement | null} */
  #pointsGroup = null;
  /** @type {SVGCircleElement[]} */
  #pointElements = [];
  /** @type {SVGLineElement | null} */
  #refLine = null;
  /** @type {SVGLineElement | null} */
  #crosshair = null;
  /** @type {SVGCircleElement | null} */
  #activePoint = null;
  /** @type {SVGLinearGradientElement | null} */
  #gradient = null;

  /** @type {Point2D[]} */
  #currentPoints = [];
  /** @type {number[]} */
  #currentValues = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Area";
  }

  /**
   * Cleans up pending timers, frames, and event listeners on disconnection.
   * @override
   */
  cleanup() {
    this.#cancelPendingAnimations();
    this.#detachInteractionListeners();
  }

  /** Cancels any active requestAnimationFrame or setTimeout in flight. */
  #cancelPendingAnimations() {
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
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

    this.#updateChart(data);
  }

  /**
   * @param {string} label 
   */
  #createDOM(label) {
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part="line"] { transition: d 0.4s ease-out; }
[part="area"] { transition: d 0.4s ease-out; }
[part~="point"] { transition: cx 0.4s ease-out, cy 0.4s ease-out, opacity 0.2s ease-out; }
[part="crosshair"] { display: none; }
[part="active-point"] { display: none; fill: var(--mini-chart-point-fill, currentColor); stroke: white; stroke-width: 1.5; }`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });

    const gradId = `area-grad-${Math.random().toString(36).slice(2, 9)}`;
    const clipId = `area-clip-${Math.random().toString(36).slice(2, 9)}`;
    const defs = createSvgElement("defs");

    // Native vertical gradient
    this.#gradient = /** @type {SVGLinearGradientElement} */ (createSvgElement("linearGradient", {
      id: gradId,
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    }));

    const stop1 = createSvgElement("stop", {
      offset: "0%",
      "stop-color": "currentColor",
      "stop-opacity": "0.45",
    });
    const stop2 = createSvgElement("stop", {
      offset: "100%",
      "stop-color": "currentColor",
      "stop-opacity": "0.02",
    });
    this.#gradient.append(stop1, stop2);

    const clipPath = createSvgElement("clipPath", { id: clipId });
    this.#clipRect = /** @type {SVGRectElement} */ (createSvgElement("rect", {
      x: "0",
      y: "0",
      width: String(this.chartWidth),
      height: String(this.chartHeight),
    }));
    clipPath.append(this.#clipRect);
    defs.append(this.#gradient, clipPath);

    // Reference line (threshold / target)
    this.#refLine = /** @type {SVGLineElement} */ (createSvgElement("line", {
      part: "reference-line",
      x1: "0",
      x2: String(this.chartWidth),
      y1: "0",
      y2: "0",
    }));
    this.#refLine.style.display = "none";

    const group = createSvgElement("g", { "clip-path": `url(#${clipId})`, part: "group" });
    this.#areaPath = /** @type {SVGPathElement} */ (createSvgElement("path", {
      part: "area",
      fill: `url(#${gradId})`,
    }));
    this.#linePath = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "line" }));
    group.append(this.#areaPath, this.#linePath);

    this.#pointsGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "points" }));

    // Interactive crosshair & active point
    this.#crosshair = /** @type {SVGLineElement} */ (createSvgElement("line", {
      part: "crosshair",
      y1: "0",
      y2: String(this.chartHeight),
    }));
    this.#activePoint = /** @type {SVGCircleElement} */ (createSvgElement("circle", {
      r: 2.5,
      part: "active-point",
    }));

    this.#svg.append(defs, this.#refLine, group, this.#pointsGroup, this.#crosshair, this.#activePoint);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive") || this.#currentPoints.length === 0 || !this.#svg) return;

    const rect = this.#svg.getBoundingClientRect();
    if (rect.width === 0) return;

    const relativeX = ((e.clientX - rect.left) / rect.width) * this.chartWidth;
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < this.#currentPoints.length; i++) {
      const dist = Math.abs(this.#currentPoints[i].x - relativeX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    const pt = this.#currentPoints[closestIndex];
    const val = this.#currentValues[closestIndex];

    if (this.#crosshair) {
      this.#crosshair.style.display = "";
      this.#crosshair.setAttribute("x1", String(pt.x));
      this.#crosshair.setAttribute("x2", String(pt.x));
    }
    if (this.#activePoint) {
      this.#activePoint.style.display = "";
      this.#activePoint.setAttribute("cx", String(pt.x));
      this.#activePoint.setAttribute("cy", String(pt.y));
    }

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: { index: closestIndex, value: val, x: pt.x, y: pt.y },
    }));
  };

  #onPointerLeave = () => {
    if (!this.hasAttribute("interactive")) return;
    if (this.#crosshair) this.#crosshair.style.display = "none";
    if (this.#activePoint) this.#activePoint.style.display = "none";

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
   * @param {Point2D[]} points 
   * @param {string} curve
   */
  #buildPath(points, curve) {
    if (points.length === 0) return "";
    if (curve === "smooth") return createSmoothPath(points);
    if (curve === "step" || curve === "step-after" || curve === "step-before") {
      return createStepPath(points, curve === "step" ? "step-after" : curve);
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  /**
   * @param {Point2D[]} points 
   * @param {number} baseline 
   * @param {string} curve
   */
  #buildArea(points, baseline, curve) {
    if (points.length === 0) return "";
    if (curve === "smooth") return createSmoothAreaPath(points, baseline);
    if (curve === "step" || curve === "step-after" || curve === "step-before") {
      const lineD = createStepPath(points, curve === "step" ? "step-after" : curve);
      const last = points[points.length - 1];
      const first = points[0];
      return `${lineD} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
    }
    let d = `M ${points[0].x} ${baseline}`;
    for (let i = 0; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    d += ` L ${points[points.length - 1].x} ${baseline} Z`;
    return d;
  }

  /**
   * @param {number[]} data 
   */
  #updateChart(data) {
    if (!this.#linePath || !this.#areaPath || !this.#pointsGroup || !this.#clipRect || !this.#refLine) return;
    this.#cancelPendingAnimations();

    if (data.length === 0) {
      this.#linePath.style.display = "none";
      this.#areaPath.style.display = "none";
      this.#pointElements.forEach((el) => { el.style.display = "none"; });
      this.#refLine.style.display = "none";
      this.#prevPoints = [];
      this.#currentPoints = [];
      this.#currentValues = [];
      return;
    }

    const minAttr = parseFloat(this.getAttribute("min") || "");
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    const min = !isNaN(minAttr) ? minAttr : undefined;
    const max = !isNaN(maxAttr) ? maxAttr : undefined;

    const { points, baseline, domain } = createCartesianLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      includeZero: true,
      min,
      max,
    });

    this.#currentPoints = points;
    this.#currentValues = data;

    // Trend color calculation
    if (this.getAttribute("trend-color") === "auto" && data.length >= 2) {
      const isBullish = data[data.length - 1] >= data[0];
      this.style.setProperty(
        "--mini-chart-color",
        isBullish
          ? "var(--mini-chart-bullish-color, #10b981)"
          : "var(--mini-chart-bearish-color, #ef4444)"
      );
    } else {
      this.style.removeProperty("--mini-chart-color");
    }

    // Reference value line
    const refVal = parseFloat(this.getAttribute("reference-value") || "");
    if (!isNaN(refVal)) {
      const span = domain[1] - domain[0] || 1;
      const refY = (this.chartHeight - 2) - ((refVal - domain[0]) / span) * (this.chartHeight - 4);
      this.#refLine.style.display = "";
      this.#refLine.setAttribute("y1", String(refY));
      this.#refLine.setAttribute("y2", String(refY));
    } else {
      this.#refLine.style.display = "none";
    }

    // Single point fallback
    if (points.length === 1) {
      this.#linePath.style.display = "none";
      this.#areaPath.style.display = "none";
      this.#pointElements.forEach((el) => { el.style.display = "none"; });
      if (this.#pointElements.length === 0) {
        const circle = /** @type {SVGCircleElement} */ (createSvgElement("circle", { r: "1.75", part: "point" }));
        this.#pointsGroup.append(circle);
        this.#pointElements.push(circle);
      }
      const ptEl = this.#pointElements[0];
      ptEl.style.display = "";
      ptEl.setAttribute("cx", String(points[0].x));
      ptEl.setAttribute("cy", String(points[0].y));
      this.#prevPoints = [];
      return;
    }

    this.#linePath.style.display = "";
    this.#areaPath.style.display = "";

    // Dynamic gradient configuration (support boolean, array of colors, or comma-separated stops)
    const gradAttr = this.getAttribute("gradient");
    if (gradAttr === "false") {
      this.#areaPath.setAttribute("fill", "var(--mini-chart-fill, currentColor)");
      this.#areaPath.style.opacity = "0.2";
    } else {
      let customColors = null;
      if (gradAttr && gradAttr !== "true") {
        try {
          const normalized = gradAttr.replace(/'/g, '"');
          const parsed = JSON.parse(normalized);
          if (Array.isArray(parsed) && parsed.length > 0) customColors = parsed;
        } catch {}
        if (!customColors && gradAttr.includes(",")) {
          customColors = gradAttr.replace(/[\[\]'"]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      if (this.#gradient) {
        this.#gradient.innerHTML = "";
        if (customColors && customColors.length > 0) {
          const count = customColors.length;
          customColors.forEach((col, idx) => {
            const offset = count > 1 ? `${(idx / (count - 1)) * 100}%` : "0%";
            const stop = createSvgElement("stop", {
              offset,
              "stop-color": col,
              "stop-opacity": idx === count - 1 ? "0.05" : "0.55",
            });
            this.#gradient?.append(stop);
          });
        } else {
          const stop1 = createSvgElement("stop", {
            offset: "0%",
            "stop-color": "currentColor",
            "stop-opacity": "0.45",
          });
          const stop2 = createSvgElement("stop", {
            offset: "100%",
            "stop-color": "currentColor",
            "stop-opacity": "0.02",
          });
          this.#gradient.append(stop1, stop2);
        }
      }
      this.#areaPath.setAttribute("fill", `url(#${this.#gradient?.id})`);
      this.#areaPath.style.opacity = "";
    }

    const curve = this.getAttribute("curve") || "linear";
    const newLineD = this.#buildPath(points, curve);
    const newAreaD = this.#buildArea(points, baseline, curve);
    const isInitial = this.#prevPoints.length === 0;

    // Persistent points rendering (pooling to maintain CSS transitions)
    const pointsMode = this.getAttribute("points") || "none";
    /** @type {Array<{ pt: Point2D, type: string }>} */
    const pointsToDraw = [];


    if (pointsMode !== "none") {
      if (pointsMode === "last") {
        pointsToDraw.push({ pt: points[points.length - 1], type: "last" });
      } else if (pointsMode === "all") {
        points.forEach((pt) => pointsToDraw.push({ pt, type: "point" }));
      } else if (pointsMode === "min-max") {
        let minIdx = 0;
        let maxIdx = 0;
        for (let i = 1; i < data.length; i++) {
          if (data[i] < data[minIdx]) minIdx = i;
          if (data[i] > data[maxIdx]) maxIdx = i;
        }
        pointsToDraw.push({ pt: points[minIdx], type: "min" });
        if (maxIdx !== minIdx) pointsToDraw.push({ pt: points[maxIdx], type: "max" });
      }
    }

    while (this.#pointElements.length < pointsToDraw.length) {
      const circle = /** @type {SVGCircleElement} */ (createSvgElement("circle", { r: "1.75", part: "point" }));
      this.#pointsGroup.append(circle);
      this.#pointElements.push(circle);
    }

    this.#pointElements.forEach((circle, idx) => {
      if (idx >= pointsToDraw.length) {
        circle.style.display = "none";
        return;
      }
      const item = pointsToDraw[idx];
      circle.style.display = "";
      circle.setAttribute("part", `point point-${item.type}`);
      if (isInitial) {
        circle.style.transition = "none";
        circle.setAttribute("cx", String(item.pt.x));
        circle.setAttribute("cy", String(item.pt.y));
        circle.getBoundingClientRect();
        circle.style.transition = "";
      } else {
        circle.setAttribute("cx", String(item.pt.x));
        circle.setAttribute("cy", String(item.pt.y));
      }
    });

    if (isInitial) {
      this.#linePath.style.transition = "none";
      this.#linePath.setAttribute("d", newLineD);
      this.#areaPath.style.transition = "none";
      this.#areaPath.setAttribute("d", newAreaD);
      this.#clipRect.style.transition = "none";
      this.#clipRect.setAttribute("width", "0");

      if (typeof requestAnimationFrame !== "undefined") {
        this.#rafId = requestAnimationFrame(() => {
          this.#rafId = requestAnimationFrame(() => {
            if (!this.#clipRect) return;
            this.#clipRect.style.transition = "width 0.8s ease-out";
            this.#clipRect.setAttribute("width", String(this.chartWidth));

            this.#timerId = setTimeout(() => {
              if (this.isConnected && this.#clipRect) {
                this.#clipRect.style.transition = "none";
              }
              this.#timerId = null;
            }, 850);
          });
        });
      } else {
        this.#clipRect.setAttribute("width", String(this.chartWidth));
      }
    } else {
      if (this.#prevPoints.length !== points.length || this.#prevBaseline !== baseline) {
        let paddedLineD = `M ${this.#prevPoints[0].x} ${this.#prevPoints[0].y}`;
        let paddedAreaD = `M ${this.#prevPoints[0].x} ${this.#prevBaseline}`;
        
        const prevLen = this.#prevPoints.length;
        const targetLen = points.length;
        
        for (let i = 0; i < targetLen; i++) {
          const p = i < prevLen ? this.#prevPoints[i] : this.#prevPoints[prevLen - 1];
          if (i > 0) paddedLineD += ` L ${p.x} ${p.y}`;
          paddedAreaD += ` L ${p.x} ${p.y}`;
        }
        
        const endP = targetLen <= prevLen ? this.#prevPoints[targetLen - 1] : this.#prevPoints[prevLen - 1];
        paddedAreaD += ` L ${endP.x} ${this.#prevBaseline} Z`;

        this.#linePath.style.transition = "none";
        this.#areaPath.style.transition = "none";
        this.#linePath.setAttribute("d", paddedLineD);
        this.#areaPath.setAttribute("d", paddedAreaD);
        
        this.#linePath.getBoundingClientRect(); // forced reflow for morph starting frame
      }

      this.#linePath.style.transition = ""; 
      this.#linePath.setAttribute("d", newLineD);
      this.#areaPath.style.transition = ""; 
      this.#areaPath.setAttribute("d", newAreaD);
      this.#clipRect.setAttribute("width", String(this.chartWidth));
    }
    
    this.#prevPoints = points;
    this.#prevBaseline = baseline;
  }
}
