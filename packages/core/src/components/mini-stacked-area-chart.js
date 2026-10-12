// mini-stacked-area-chart.js — Responsive SVG stacked area sparkline Custom Element.

import { createStackedLayout, createSmoothPath } from "../core/geometry.js";
import { readDataArray } from "../core/data.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { lerp, stopTween, tween } from "../core/motion.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles, pointerToViewBoxX } from "../core/svg.js";

/**
 * @typedef {Object} LayerCache
 * @property {SVGPathElement} path
 * @property {Array<{ x: number, y0: number, y1: number }>} prevPoints
 */

/**
 * Renders multiple series as stacked cumulative layers with animations and interactions.
 *
 * @extends MiniChartElement
 */
export class MiniStackedAreaChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    curve: { type: "enum", values: ["linear", "smooth", "step"], default: "linear" },
    normalize: { type: "boolean", presence: true },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

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

  /** @type {number[]} x of each column, for the hovered index. */
  #columnX = [];

  /** Layer points on screen, mid-transition included. @type {Array<Array<{ x: number, y0: number, y1: number }>>} */
  #shownLayers = [];

  /**
   * Keyboard stops: one per column of each layer; ArrowUp and ArrowDown change layer.
   * @override
   * @returns {import("../core/mini-chart-element.js").KeyboardTarget[]}
   */
  keyboardTargets() {
    return this.#shownLayers.flatMap((points, row) => {
      const node = this.#layers[row]?.path;
      if (!node || node.style.display === "none") return [];
      return points.map((point, col) => ({ node, x: point.x, y: (point.y0 + point.y1) / 2, row, col }));
    });
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Stacked-area";
  }

  /**
   * Cancels pending timers and animation frames on disconnection. Interaction
   * listeners stay attached, so a moved element keeps emitting events.
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
  }

  /**
   * Overrides the default data parser to support 2D arrays.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {number[][]}
   */
  parseData(raw) {
    try {
      const parsed = readDataArray(raw);
      if (!parsed) return [];
      // An invalid entry becomes 0 in place (never dropped), so every series keeps its column indices.
      return parsed.map((series) =>
        Array.isArray(series) ? series.map((value) => (Number.isFinite(value) ? value : 0)) : []
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
svg[data-interactive] [part~="layer"] {
  cursor: pointer;
}
svg[data-interactive] [part~="layer"]:hover {
  filter: brightness(1.18);
  opacity: 1 !important;
}
svg[data-interactive] [part="layers"]:has([part~="layer"]:hover) [part~="layer"]:not(:hover) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });

    const clipId = `stacked-clip-${Math.random().toString(36).slice(2, 9)}`;
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

  #onPointerMove = (/** @type {PointerEvent} */ e) => this.#onPointer(e, "sparkline-hover");
  #onClick = (/** @type {MouseEvent} */ e) => this.#onPointer(e, "sparkline-select");

  /**
   * @param {MouseEvent} e Pointer or click event.
   * @param {"sparkline-hover" | "sparkline-select"} type Event to dispatch.
   */
  #onPointer(e, type) {
    if (!this.option("interactive")) return;
    const target = /** @type {SVGPathElement | null} */ (e.target);
    if (!target || !target.hasAttribute("data-layer-index")) return;

    const layerIndex = parseInt(target.getAttribute("data-layer-index") || "0", 10);
    const seriesData = this.#currentData[layerIndex] || [];
    const color = getSegmentColor(layerIndex);

    // The column under the pointer: layers cover every column, so the index follows the pointer's x.
    let index = 0;
    const relativeX = this.#svg ? pointerToViewBoxX(this.#svg, e, this.chartWidth) : null;
    if (relativeX !== null) {
      let distance = Infinity;
      this.#columnX.forEach((x, column) => {
        if (Math.abs(x - relativeX) < distance) {
          distance = Math.abs(x - relativeX);
          index = column;
        }
      });
    }
    const value = typeof seriesData[index] === "number" ? seriesData[index] : null;
    const point = this.#shownLayers[layerIndex]?.[index];

    this.dispatchPoint(type, {
      index,
      seriesIndex: layerIndex,
      value,
      mark: target,
      // The tooltip points at the top of the layer at that column.
      anchor: point ? { x: point.x, y: Math.min(point.y0, point.y1) } : undefined,
      legacy: { layerIndex, seriesData, color, element: target },
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
    this.#container?.addEventListener("pointermove", this.#onPointerMove);
    this.#container?.addEventListener("click", this.#onClick);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * @param {Array<{ x: number, y0: number, y1: number }>} points 
   * @param {string} curve 
   */
  #buildPath(points, curve) {
    if (points.length === 0) return "";
    
    if (curve === "smooth" && points.length > 2) {
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
    stopTween(this);

    this.#currentData = data;

    if (data.length === 0) {
      for (const layer of this.#layers) {
        layer.path.style.display = "none";
      }
      this.#shownLayers = [];
      return;
    }

    const isNormalized = Boolean(this.option("normalize"));
    const offset = isNormalized ? "expand" : "none";
    const curve = this.option("curve") || "linear";

    const { layers } = createStackedLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      offset,
    });
    this.#columnX = layers[0]?.points.map((point) => point.x) ?? [];

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


      cache.path.style.transition = isInitial ? "none" : "";
      cache.path.setAttribute("d", newD);
      cache.prevPoints = layerGeo.points;
    });

    // Updates move every layer point with an rAF tween (CSS `d` transitions do not run in Safari).
    const previous = this.#shownLayers;
    if (!isInitial && previous.length > 0) {
      const from = layers.map((layerGeo, index) => {
        const shown = previous[index];
        return layerGeo.points.map((point, i) => shown?.[Math.min(i, shown.length - 1)] ?? { x: point.x, y0: point.y0, y1: point.y0 });
      });
      tween(this, (t) => {
        this.#shownLayers = layers.map((layerGeo, index) => {
          const points = layerGeo.points.map((end, i) => {
            const start = from[index][i];
            return { x: lerp(start.x, end.x, t), y0: lerp(start.y0, end.y0, t), y1: lerp(start.y1, end.y1, t) };
          });
          this.#layers[index].path.setAttribute("d", this.#buildPath(points, curve));
          return points;
        });
      });
    } else {
      this.#shownLayers = layers.map((layerGeo) => layerGeo.points);
    }

    // Hide surplus layers
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

acceptDataValues(MiniStackedAreaChart);
