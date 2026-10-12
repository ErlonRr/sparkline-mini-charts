// mini-scatter-chart.js — Responsive SVG 2D scatter plot and bubble sparkline Custom Element.

import { createScatterLayout } from "../core/geometry.js";
import { readDataArray } from "../core/data.js";
import { MiniChartElement, acceptDataValues, appendChartData } from "../core/mini-chart-element.js";
import { attributeFrames, stopTween, takeSlide, tween } from "../core/motion.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay } from "../core/svg.js";

/**
 * @typedef {Object} ScatterCache
 * @property {SVGCircleElement} circle
 */

/**
 * Renders 2D coordinates (x, y) as a scatter sparkline with optional trendline and bubble radius.
 *
 * @extends MiniChartElement
 */
export class MiniScatterChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    pointRadius: { type: "number", default: 3 },
    trendLine: { type: "boolean" },
    minX: { type: "number" },
    maxX: { type: "number" },
    minY: { type: "number" },
    maxY: { type: "number" },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** @type {boolean} */
  #initialized = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGLineElement | null} */
  #trendLineEl = null;
  /** @type {SVGGElement | null} */
  #pointsContainer = null;

  /** @type {ScatterCache[]} */
  #points = [];

  /** @type {any[]} */
  #currentData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Scatter";
  }

  /**
   * Appends points for live data and keeps the last `maxLength`.
   *
   * @example
   * chart.appendData([[12, 4.5]], { maxLength: 100 });
   *
   * @param {readonly unknown[]} values Points to append (`[x, y]`, `[x, y, r]` or `{ x, y, r }`).
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

  /**
   * Overrides the default data parser to support 2D coordinate arrays or objects.
   * Other items (e.g. `null` gaps) are dropped, except finite numbers, which
   * the layout plots as `[index, value]`.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {any[]}
   */
  parseData(raw) {
    try {
      const parsed = readDataArray(raw);
      if (!parsed) return [];
      return parsed.filter(
        (item) => (item !== null && typeof item === "object") || (typeof item === "number" && Number.isFinite(item))
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
[part="trend-line"] {
  stroke: var(--mini-chart-trend-color, color-mix(in srgb, var(--mini-chart-color, var(--_mc-accent)) 40%, transparent));
  stroke-width: var(--mini-chart-trend-width, 1.5px);
  stroke-dasharray: 3 3;
  vector-effect: non-scaling-stroke;
}
[part~="point"] {
  fill: var(--mini-chart-point-color, var(--mini-chart-color, var(--_mc-accent)));
  stroke: var(--mini-chart-point-stroke, var(--_mc-surface));
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
  transition: opacity 0.2s ease, filter 0.2s ease, stroke-width 0.2s ease;
  cursor: default;
}
svg[data-interactive] [part~="point"] {
  cursor: pointer;
}
svg[data-interactive] [part~="point"]:hover {
  stroke-width: 2.5px;
  filter: brightness(1.25);
  opacity: 1 !important;
}
svg[data-interactive] [part="points"]:has([part~="point"]:hover) [part~="point"]:not(:hover) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#trendLineEl = /** @type {SVGLineElement} */ (createSvgElement("line", { part: "trend-line" }));
    this.#pointsContainer = /** @type {SVGGElement} */ (createSvgElement("g", { part: "points" }));

    this.#svg.append(this.#trendLineEl, this.#pointsContainer);
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
    const circle = target?.closest('[part~="point"]');
    if (!circle || !circle.hasAttribute("data-index")) return;

    const index = parseInt(circle.getAttribute("data-index") || "0", 10);
    const pointData = this.#currentData[index];

    const y = Array.isArray(pointData) ? pointData[1] : pointData?.y;

    this.dispatchPoint(type, {
      index,
      value: typeof y === "number" && Number.isFinite(y) ? y : null,
      datum: pointData,
      mark: circle,
      legacy: { index, data: pointData, element: circle },
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
    this.#pointsContainer?.addEventListener("pointerover", this.#onPointerMove);
    this.#pointsContainer?.addEventListener("click", this.#onClick);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * @param {any[]} data 
   */
  #updateChart(data) {
    if (!this.#pointsContainer || !this.#trendLineEl || !this.#svg) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    stopTween(this);
    const slide = takeSlide(this);

    this.#currentData = data;

    if (data.length === 0) {
      this.#trendLineEl.style.display = "none";
      for (const p of this.#points) {
        p.circle.style.display = "none";
      }
      return;
    }

    const pointRadius = this.option("pointRadius");
    const showTrendLine = Boolean(this.option("trendLine"));

    const { points, trendLine } = createScatterLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      padding: 4,
      pointRadius,
      minX: this.option("minX"),
      maxX: this.option("maxX"),
      minY: this.option("minY"),
      maxY: this.option("maxY"),
    });

    /** @type {import("../core/motion.js").AttributeTarget[]} */
    const moves = [];

    // Update trendline
    if (showTrendLine && trendLine) {
      const trendShown = this.#trendLineEl.style.display !== "none" && this.#trendLineEl.hasAttribute("x1");
      this.#trendLineEl.style.display = "";
      if (trendShown) {
        moves.push({ el: this.#trendLineEl, to: { x1: trendLine.x1, y1: trendLine.y1, x2: trendLine.x2, y2: trendLine.y2 } });
      } else {
        this.#trendLineEl.setAttribute("x1", String(trendLine.x1));
        this.#trendLineEl.setAttribute("y1", String(trendLine.y1));
        this.#trendLineEl.setAttribute("x2", String(trendLine.x2));
        this.#trendLineEl.setAttribute("y2", String(trendLine.y2));
      }
    } else {
      this.#trendLineEl.style.display = "none";
    }

    const isInitial = this.#points.length === 0;

    while (this.#points.length < points.length) {
      const circle = /** @type {SVGCircleElement} */ (createSvgElement("circle", { part: "point" }));
      this.#pointsContainer.append(circle);
      this.#points.push({ circle });
    }

    if (isInitial) {
      // Step 1: Initial state (opacity 0, r = 0)
      points.forEach((item, index) => {
        const cache = this.#points[index];
        cache.circle.style.display = "";
        cache.circle.setAttribute("data-index", String(index));
        cache.circle.style.transition = "none";

        cache.circle.setAttribute("cx", String(item.x));
        cache.circle.setAttribute("cy", String(item.y));
        cache.circle.setAttribute("r", "0");
        cache.circle.style.opacity = "0";
      });

      // Step 2: Reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Staggered reveal; the whole stagger is capped, however many points there are.
      points.forEach((item, index) => {
        const cache = this.#points[index];
        const delay = entranceDelay(index, points.length, 20);
        cache.circle.style.transition = `r 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 0.3s ease ${delay}ms`;
        cache.circle.setAttribute("r", String(item.r));
        cache.circle.style.opacity = "1";
      });

      const maxDuration = 350 + entranceDelay(points.length - 1, points.length, 20) + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          this.#points.forEach((p) => {
            if (p.circle.isConnected) p.circle.style.transition = "";
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Normal update: an rAF tween of position and radius (new points grow from r = 0).
      const before = this.#points.map((cache) =>
        cache.circle.style.display === "none" ? null : { cx: Number(cache.circle.getAttribute("cx")), cy: Number(cache.circle.getAttribute("cy")), r: Number(cache.circle.getAttribute("r")) },
      );
      this.#points.forEach((cache, index) => {
        if (index >= points.length) {
          cache.circle.style.display = "none";
          return;
        }

        cache.circle.style.display = "";
        cache.circle.setAttribute("data-index", String(index));
        const item = points[index];

        cache.circle.style.transition = "";
        moves.push({
          el: cache.circle,
          from: before[index + slide] ?? { cx: item.x, cy: item.y, r: 0 },
          to: { cx: item.x, cy: item.y, r: item.r },
        });
        cache.circle.style.opacity = "1";
      });
    }
    tween(this, attributeFrames(moves));
  }
}

acceptDataValues(MiniScatterChart);
