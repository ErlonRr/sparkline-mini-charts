// mini-stream-chart.js — Responsive SVG streamgraph sparkline Custom Element.

import { createStackedLayout, createSmoothPath } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} LayerCache
 * @property {SVGPathElement} path
 * @property {Array<{ x: number, y0: number, y1: number }>} prevPoints
 */

/**
 * Renders multiple time-series as an organic centered streamgraph (ThemeRiver).
 *
 * @extends MiniChartElement
 */
export class MiniStreamChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "curve",
    "interactive",
  ];

  /** @type {boolean} */
  #initialized = false;

  /** @type {number | null} */
  #rafId = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGRectElement | null} */
  #clipRect = null;
  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {LayerCache[]} */
  #layers = [];

  /** @type {number[][]} */
  #currentData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Stream";
  }

  /**
   * Cleans up pending timers and interaction listeners on disconnection.
   * @override
   */
  cleanup() {
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    this.#detachInteractionListeners();
  }

  /**
   * Overrides data getter to parse 2D arrays.
   * @returns {number[][]}
   */
  get data() {
    try {
      const parsed = JSON.parse(this.getAttribute("data") || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.map((series) =>
        Array.isArray(series) ? series.filter(Number.isFinite) : []
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
[part~="layer"] { 
  transition: opacity 0.2s ease, filter 0.2s ease; 
  cursor: default;
}
:host([interactive]) [part~="layer"] {
  cursor: pointer;
}
:host([interactive]) [part~="layer"]:hover {
  filter: brightness(1.18);
  opacity: 1 !important;
}
:host([interactive]) [part="layers"]:has([part~="layer"]:hover) [part~="layer"]:not(:hover) {
  opacity: 0.45;
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });

    const clipId = `stream-clip-${Math.random().toString(36).slice(2, 9)}`;
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

    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", {
      "clip-path": `url(#${clipId})`,
      part: "layers",
    }));

    this.#svg.append(defs, this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {SVGPathElement | null} */ (e.target);
    if (!target || !target.hasAttribute("data-layer-index")) return;

    const layerIndex = parseInt(target.getAttribute("data-layer-index") || "0", 10);
    const seriesData = this.#currentData[layerIndex] || [];
    const color = getSegmentColor(layerIndex);

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: { layerIndex, seriesData, color, element: target },
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
   * @param {Array<{ x: number, y0: number, y1: number }>} points 
   * @param {string} curve 
   */
  #buildPath(points, curve) {
    if (points.length === 0) return "";
    
    if (curve !== "linear" && points.length > 2) {
      const topPoints = points.map((p) => ({ x: p.x, y: p.y1 }));
      const bottomPoints = [...points].reverse().map((p) => ({ x: p.x, y: p.y0 }));
      
      const topD = createSmoothPath(topPoints);
      const bottomD = createSmoothPath(bottomPoints).replace(/^M\s*[\d.]+\s*[\d.]+/, "");
      return `${topD} L ${bottomPoints[0].x} ${bottomPoints[0].y} ${bottomD} Z`;
    }

    let d = `M ${points[0].x} ${points[0].y0}`;
    for (let i = 0; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y1}`;
    }
    for (let i = points.length - 1; i >= 0; i--) {
      d += ` L ${points[i].x} ${points[i].y0}`;
    }
    d += " Z";
    return d;
  }

  /**
   * @param {number[][]} data 
   */
  #updateChart(data) {
    if (!this.#container || !this.#clipRect || !this.#svg) return;
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }

    this.#currentData = data;

    if (data.length === 0) {
      for (const layer of this.#layers) {
        layer.path.style.display = "none";
      }
      return;
    }

    const curve = this.getAttribute("curve") || "smooth";

    const { layers } = createStackedLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      offset: "silhouette",
    });

    const isInitial = this.#layers.length === 0;

    while (this.#layers.length < layers.length) {
      const path = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "layer" }));
      this.#container.append(path);
      this.#layers.push({ path, prevPoints: [] });
    }

    layers.forEach((layerGeo, index) => {
      const cache = this.#layers[index];
      cache.path.style.display = "";
      cache.path.setAttribute("data-layer-index", String(index));
      cache.path.setAttribute("part", `layer layer-${index + 1}`);
      cache.path.style.fill = `var(--mini-chart-color-${index + 1}, ${getSegmentColor(index)})`;

      const newD = this.#buildPath(layerGeo.points, curve);


      if (isInitial) {
        cache.path.style.transition = "none";
        cache.path.setAttribute("d", newD);
      } else {
        cache.path.style.transition = "d 0.4s ease-out";
        cache.path.setAttribute("d", newD);
      }

      cache.prevPoints = layerGeo.points;
    });

    for (let i = layers.length; i < this.#layers.length; i++) {
      this.#layers[i].path.style.display = "none";
    }

    if (isInitial) {
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
      this.#clipRect.setAttribute("width", String(this.chartWidth));
    }
  }
}
