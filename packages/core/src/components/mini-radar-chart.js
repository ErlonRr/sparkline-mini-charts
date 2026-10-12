// mini-radar-chart.js — Responsive SVG radar (spider) sparkline Custom Element.

import { readDataArray } from "../core/data.js";
import {
  RADAR_CENTER,
  createRadarLayout,
  describeRadarGrid,
  describeRadarPolygon,
  readRadarSeries,
} from "../core/layouts/radar.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { UPDATE_MS, lerp, stopTween, tween } from "../core/motion.js";
import { getSegmentColor } from "../core/palette.js";
import { chartStyles, createChartSvg, createSvgElement } from "../core/svg.js";

/** Duration of the entrance, in milliseconds, like the other charts' reveals. */
const ENTRANCE_MS = 800;

/**
 * @typedef {Object} RadarSeriesCache
 * @property {SVGGElement} group The series' group.
 * @property {SVGPathElement} area The series' polygon.
 * @property {SVGCircleElement[]} points One vertex marker per axis.
 */

/**
 * Converts a pointer position to viewBox coordinates through the screen CTM
 * (which includes the `xMidYMid meet` letterboxing), or the client rect.
 *
 * @param {SVGSVGElement} svg Chart svg.
 * @param {{ clientX: number, clientY: number }} pointer Pointer position.
 * @param {number} size viewBox width and height.
 * @returns {{ x: number, y: number } | null}
 */
function pointerToViewBox(svg, { clientX, clientY }, size) {
  const ctm = typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;
  if (ctm) {
    try {
      const { a, b, c, d, e, f } = ctm.inverse();
      const x = a * clientX + c * clientY + e;
      const y = b * clientX + d * clientY + f;
      if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    } catch {
      // Not invertible: use the client rect.
    }
  }
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return { x: ((clientX - rect.left) / rect.width) * size, y: ((clientY - rect.top) / rect.height) * size };
}

/**
 * Renders one or more series as overlaid polygons on radial axes (a radar or
 * spider chart), over an optional grid of spokes and rings.
 *
 * @extends MiniChartElement
 */
export class MiniRadarChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    max: { type: "number" },
    levels: { type: "number", default: 3 },
    grid: { type: "boolean", default: true },
    fill: { type: "boolean", default: true },
    points: { type: "boolean", default: false },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGPathElement | null} */
  #grid = null;
  /** @type {SVGGElement | null} */
  #plot = null;

  /** @type {RadarSeriesCache[]} */
  #series = [];

  /** @type {number[][]} */
  #currentData = [];

  /** Vertices on screen, mid-transition included. @type {Array<Array<{ x: number, y: number }>>} */
  #shown = [];

  /** Whether the polygons have played their entrance (an empty first render does not count). */
  #entered = false;

  /** @type {Element[]} Nodes marked `data-hover` by the pointer. */
  #hovered = [];

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return 100;
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Radar";
  }

  /**
   * Keyboard stops: one per vertex; ArrowLeft and ArrowRight walk the axes,
   * ArrowUp and ArrowDown change series.
   * @override
   * @returns {import("../core/mini-chart-element.js").KeyboardTarget[]}
   */
  keyboardTargets() {
    return this.#shown.flatMap((points, row) => {
      const cache = this.#series[row];
      if (!cache) return [];
      return points.flatMap((point, col) => {
        const node = cache.points[col];
        return node ? [{ node, x: point.x, y: point.y, row, col }] : [];
      });
    });
  }

  /**
   * Reads a `number[]` (one series) or a `number[][]` (overlaid series) with at least 3 axes.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {number[][]}
   */
  parseData(raw) {
    try {
      return readRadarSeries(readDataArray(raw));
    } catch {
      return [];
    }
  }

  /**
   * @override
   * @param {number[][]} data Parsed series.
   * @returns {string}
   */
  createDefaultLabel(data) {
    if (data.length === 0) return `Empty ${this.chartName} chart`;
    const axes = data[0]?.length ?? 0;
    return data.length === 1
      ? `${this.chartName} chart with ${axes} axes`
      : `${this.chartName} chart with ${data.length} series over ${axes} axes`;
  }

  /** @override */
  cleanup() {
    this.#clearHighlight();
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

    this.#applyOptions(data);
    this.#update(data);
  }

  /** @param {string} label Accessible name. */
  #createDOM(label) {
    // Static text: per-instance options live on the svg (see #applyOptions), never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part="grid"] {
  fill: none;
  stroke: var(--mini-chart-track-color, var(--_mc-track));
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
[part~="series"] {
  transition: opacity 0.2s ease, filter 0.2s ease;
}
[part~="area"] {
  fill: currentColor;
  fill-opacity: 0.2;
  stroke: currentColor;
  stroke-width: var(--mini-chart-stroke-width, 1.5);
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
svg:not([data-fill]) [part~="area"] {
  fill: none;
}
[part~="point"] {
  fill: var(--mini-chart-point-fill, currentColor);
  stroke: var(--_mc-surface);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  r: calc(var(--_mc-px, 0.5) * 2.5px);
  visibility: hidden;
  pointer-events: none;
}
svg[data-points] [part~="point"],
[part~="point"]:is([data-hover], [data-active]) {
  visibility: visible;
}
svg[data-interactive] {
  cursor: pointer;
}
svg[data-interactive] [part~="series"][data-hover] {
  filter: brightness(1.12);
}
svg[data-interactive]:has([part~="series"][data-hover]) [part~="series"]:not([data-hover]) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#grid = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "grid" }));
    this.#plot = /** @type {SVGGElement} */ (createSvgElement("g", { part: "plot" }));
    this.#svg.append(this.#grid, this.#plot);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#svg.addEventListener("pointerover", this.#onPointerMove);
    this.#svg.addEventListener("pointermove", this.#onPointerMove);
    this.#svg.addEventListener("click", this.#onClick);
    this.#svg.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * Applies the styling options on every render, so changing them after the
   * first render takes effect.
   *
   * @param {number[][]} data Parsed series.
   */
  #applyOptions(data) {
    const svg = this.#svg;
    if (!svg) return;
    svg.toggleAttribute("data-fill", Boolean(this.option("fill")));
    svg.toggleAttribute("data-points", Boolean(this.option("points")));
    svg.toggleAttribute("data-multi", data.length > 1);
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => this.#onPointer(e, "sparkline-hover");
  #onClick = (/** @type {MouseEvent} */ e) => this.#onPointer(e, "sparkline-select");

  #onPointerLeave = () => {
    if (!this.option("interactive")) return;
    this.#clearHighlight();
    this.clearHover();
    this.dispatchEvent(new CustomEvent("sparkline-leave", { bubbles: true, composed: true }));
  };

  /**
   * Finds the vertex under the pointer: the event's own vertex (keyboard
   * navigation dispatches on it), else the nearest vertex of any series.
   *
   * @param {MouseEvent} e Pointer or click event.
   * @returns {{ seriesIndex: number, index: number } | null}
   */
  #hit(e) {
    const target = /** @type {Element | null} */ (e.target);
    const series = target?.getAttribute?.("data-series");
    const axis = target?.getAttribute?.("data-axis");
    if (series && axis) return { seriesIndex: Number(series), index: Number(axis) };

    if (!this.#svg) return null;
    const point = pointerToViewBox(this.#svg, e, this.chartWidth);
    if (!point) return null;
    /** @type {{ seriesIndex: number, index: number } | null} */
    let best = null;
    let distance = Infinity;
    this.#shown.forEach((points, seriesIndex) => {
      points.forEach((vertex, index) => {
        const d = Math.hypot(vertex.x - point.x, vertex.y - point.y);
        // `<=`: on a tie, the series drawn on top wins.
        if (d <= distance) {
          distance = d;
          best = { seriesIndex, index };
        }
      });
    });
    return best;
  }

  /**
   * @param {MouseEvent} e Pointer or click event.
   * @param {"sparkline-hover" | "sparkline-select"} type Event to dispatch.
   */
  #onPointer(e, type) {
    if (!this.option("interactive")) return;
    const hit = this.#hit(e);
    if (!hit) return;
    const { seriesIndex, index } = hit;
    const cache = this.#series[seriesIndex];
    const value = this.#currentData[seriesIndex]?.[index];
    if (!cache || value === undefined) return;

    const mark = cache.points[index] ?? null;
    this.#highlight([cache.group, ...(mark ? [mark] : [])]);
    this.dispatchPoint(type, {
      index,
      seriesIndex,
      value,
      datum: value,
      mark,
      anchor: this.#shown[seriesIndex]?.[index],
      legacy: { color: this.#seriesColor(seriesIndex, this.#currentData.length) },
    }, e);
  }

  /** @param {Element[]} nodes Nodes to mark `data-hover`. */
  #highlight(nodes) {
    this.#clearHighlight();
    for (const node of nodes) node.setAttribute("data-hover", "");
    this.#hovered = nodes;
  }

  #clearHighlight() {
    for (const node of this.#hovered) node.removeAttribute("data-hover");
    this.#hovered = [];
  }

  /**
   * The color of a series: the accent for a single series, else palette color `N`.
   *
   * @param {number} index Series index.
   * @param {number} count Number of series.
   * @returns {string} CSS color.
   */
  #seriesColor(index, count) {
    return count > 1 ? `var(--mini-chart-color-${index + 1}, ${getSegmentColor(index)})` : "";
  }

  /**
   * Creates or reuses the nodes of every series, then moves the vertices:
   * from the center on the entrance, from where they are on an update.
   *
   * @param {number[][]} data Parsed series.
   */
  #update(data) {
    const svg = this.#svg;
    const grid = this.#grid;
    const plot = this.#plot;
    if (!svg || !grid || !plot) return;
    stopTween(this);
    this.#clearHighlight();
    this.#currentData = data;

    const max = this.option("max");
    const layout = createRadarLayout(data, {
      max: typeof max === "number" && max > 0 ? max : undefined,
      levels: this.option("levels"),
    });

    grid.setAttribute("d", this.option("grid") ? describeRadarGrid(layout) : "");

    while (this.#series.length < layout.series.length) {
      const group = /** @type {SVGGElement} */ (createSvgElement("g", { part: "series" }));
      const area = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "area" }));
      group.append(area);
      plot.append(group);
      this.#series.push({ group, area, points: [] });
    }
    for (const surplus of this.#series.splice(layout.series.length)) surplus.group.remove();

    layout.series.forEach((vertices, seriesIndex) => {
      const cache = /** @type {RadarSeriesCache} */ (this.#series[seriesIndex]);
      cache.group.setAttribute("part", `series series-${seriesIndex + 1}`);
      cache.group.setAttribute("data-layer-index", String(seriesIndex));
      cache.group.style.color = this.#seriesColor(seriesIndex, layout.series.length);
      cache.area.setAttribute("part", `area area-${seriesIndex + 1}`);

      while (cache.points.length < vertices.length) {
        const point = /** @type {SVGCircleElement} */ (createSvgElement("circle", { part: "point", r: "2" }));
        cache.group.append(point);
        cache.points.push(point);
      }
      for (const surplus of cache.points.splice(vertices.length)) surplus.remove();
      cache.points.forEach((point, axis) => {
        point.setAttribute("data-series", String(seriesIndex));
        point.setAttribute("data-axis", String(axis));
      });
    });

    if (layout.series.length === 0) {
      this.#shown = [];
      return;
    }

    const entering = !this.#entered;
    this.#entered = true;
    const center = { x: RADAR_CENTER, y: RADAR_CENTER };
    const targets = layout.series.map((vertices) => vertices.map(({ x, y }) => ({ x, y })));
    const previous = this.#shown;
    const from = targets.map((vertices, s) => vertices.map((_, i) => (entering ? center : (previous[s]?.[i] ?? center))));

    tween(this, (t) => {
      this.#shown = targets.map((vertices, s) =>
        vertices.map((end, i) => {
          const start = from[s]?.[i] ?? end;
          return { x: lerp(start.x, end.x, t), y: lerp(start.y, end.y, t) };
        }),
      );
      this.#shown.forEach((vertices, s) => {
        const cache = this.#series[s];
        if (!cache) return;
        cache.area.setAttribute("d", describeRadarPolygon(vertices));
        vertices.forEach((vertex, i) => {
          cache.points[i]?.setAttribute("cx", String(vertex.x));
          cache.points[i]?.setAttribute("cy", String(vertex.y));
        });
      });
    }, entering ? ENTRANCE_MS : UPDATE_MS);
  }
}

acceptDataValues(MiniRadarChart);
