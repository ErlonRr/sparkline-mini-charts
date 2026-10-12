// mini-box-plot-chart.js — Responsive SVG box-plot sparkline Custom Element for distributions.

import { createBoxPlotLayout, readBoxSources, summarizeBoxes } from "../core/layouts/box-plot.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { lerp, stopTween, tween } from "../core/motion.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/** @typedef {import("../core/layouts/box-plot.js").BoxSource} BoxSource */
/** @typedef {import("../core/layouts/box-plot.js").BoxSummary} BoxSummary */
/** @typedef {import("../core/layouts/box-plot.js").BoxGeometry} BoxGeometry */

/**
 * @typedef {Object} BoxNodes
 * @property {SVGGElement} group
 * @property {SVGLineElement} whiskerLow
 * @property {SVGLineElement} whiskerHigh
 * @property {SVGLineElement} capLow
 * @property {SVGLineElement} capHigh
 * @property {SVGRectElement} box
 * @property {SVGLineElement} median
 */

/** @typedef {{ at: number, center: number }} OutlierPoint */

/**
 * Renders one or more distributions as box plots: quartile box, median line,
 * whiskers and outlier points.
 *
 * @extends MiniChartElement
 */
export class MiniBoxPlotChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    orientation: { type: "enum", values: ["horizontal", "vertical"], default: "horizontal" },
    whisker: { type: "enum", values: ["tukey", "minmax"], default: "tukey" },
    outliers: { type: "boolean", default: true },
    gap: { type: "number", default: 0.4 },
    min: { type: "number" },
    max: { type: "number" },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the boxes have played their entrance animation (an empty render does not count). */
  #entered = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #boxesGroup = null;
  /** @type {SVGGElement | null} */
  #outliersGroup = null;

  /** @type {BoxNodes[]} */
  #boxes = [];
  /** @type {SVGCircleElement[]} */
  #outliers = [];

  /** Geometry on screen now, so an interrupted transition continues from where it is. */
  #drawn = { boxes: /** @type {BoxGeometry[]} */ ([]), outliers: /** @type {OutlierPoint[]} */ ([]) };

  /** @type {BoxSummary[]} */
  #summaries = [];

  /** Box index and value of each drawn outlier. @type {{ box: number, value: number }[]} */
  #outlierData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Box-plot";
  }

  /**
   * Accepts raw samples (`number[]`), a summary object, or an array of
   * sample arrays and/or summary objects (one box each).
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {BoxSource[]}
   */
  parseData(raw) {
    if (raw === null || raw === undefined || raw === "") return [];
    let parsed = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    return readBoxSources(parsed);
  }

  /** @returns {"tukey" | "minmax"} The resolved whisker rule. */
  #whisker() {
    return this.option("whisker") === "minmax" ? "minmax" : "tukey";
  }

  /**
   * Summarizes the distribution: one box gives its median and whisker range.
   * @override
   * @param {BoxSource[]} data Parsed box sources.
   * @returns {string}
   */
  createDefaultLabel(data) {
    const boxes = summarizeBoxes(data, this.#whisker());
    if (boxes.length === 0) return `Empty ${this.chartName} chart`;
    const round = (/** @type {number} */ n) => Math.round(n * 100) / 100;
    if (boxes.length > 1) {
      return `${this.chartName} chart with ${boxes.length} boxes, medians ${boxes.map((box) => round(box.median)).join(", ")}`;
    }
    const [box] = boxes;
    if (!box) return `Empty ${this.chartName} chart`;
    const outliers = box.outliers.length > 0 && this.option("outliers") !== false ? `, ${box.outliers.length} ${box.outliers.length === 1 ? "outlier" : "outliers"}` : "";
    return `${this.chartName} chart, median ${round(box.median)}, quartiles ${round(box.q1)} to ${round(box.q3)}, whiskers ${round(box.min)} to ${round(box.max)}${outliers}`;
  }

  /**
   * Keyboard stops: each box, then its outliers.
   * @override
   * @returns {import("../core/mini-chart-element.js").KeyboardTarget[]}
   */
  keyboardTargets() {
    /** @type {import("../core/mini-chart-element.js").KeyboardTarget[]} */
    const targets = [];
    this.#boxes.forEach(({ group }, index) => {
      targets.push({ node: group });
      this.#outlierData.forEach((outlier, k) => {
        const node = this.#outliers[k];
        if (outlier.box === index && node) targets.push({ node });
      });
    });
    return targets.length > 0 ? targets : super.keyboardTargets();
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

    this.#update(summarizeBoxes(data, this.#whisker()));
  }

  /** @param {string} label Accessible name. */
  #createDOM(label) {
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part~="box"] {
  fill: var(--mini-chart-box-fill, color-mix(in srgb, var(--mini-chart-color, var(--_mc-accent)) 22%, transparent));
  stroke: var(--mini-chart-box-stroke, var(--mini-chart-color, var(--_mc-accent)));
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}
[part~="median"] {
  stroke: var(--mini-chart-median-color, var(--mini-chart-color, var(--_mc-accent)));
  stroke-width: var(--mini-chart-median-width, 2px);
  vector-effect: non-scaling-stroke;
}
[part~="whisker"],
[part~="cap"] {
  stroke: var(--mini-chart-whisker-color, var(--_mc-neutral));
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}
[part~="outlier"] {
  fill: var(--mini-chart-outlier-color, var(--mini-chart-color, var(--_mc-accent)));
  r: calc(var(--_mc-px, 0.833) * 3px);
}
[part~="box-group"],
[part~="outlier"] {
  transition: opacity 0.2s ease, filter 0.2s ease;
  cursor: default;
}
svg[data-interactive] :is([part~="box-group"], [part~="outlier"]) {
  cursor: pointer;
}
svg[data-interactive] :is([part~="box-group"], [part~="outlier"]):hover {
  filter: brightness(1.15);
  opacity: 1 !important;
}
svg[data-interactive]:has(:is([part~="box-group"], [part~="outlier"]):hover) :is([part~="box-group"], [part~="outlier"]):not(:hover) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#boxesGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "boxes" }));
    this.#outliersGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "outliers" }));
    this.#svg.append(this.#boxesGroup, this.#outliersGroup);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    // The listeners sit on the chart's own shadow nodes: they cannot leak and survive a move.
    this.#svg.addEventListener("pointerover", this.#onPointerMove);
    this.#svg.addEventListener("click", this.#onClick);
    this.#svg.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * The tooltip anchor of a box: its median, on the box's top edge when the
   * value axis is horizontal.
   *
   * @param {number} index Box index.
   * @returns {{ x: number, y: number } | undefined}
   */
  #medianAnchor(index) {
    const box = this.#drawn.boxes[index];
    if (!box) return undefined;
    return this.option("orientation") === "vertical"
      ? { x: box.center, y: box.median }
      : { x: box.median, y: box.center - box.size / 2 };
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => this.#onPointer(e, "sparkline-hover");
  #onClick = (/** @type {MouseEvent} */ e) => this.#onPointer(e, "sparkline-select");

  /**
   * Boxes report on series 0 with their summary; outliers on series 1 with their value.
   *
   * @param {MouseEvent} e Pointer or click event.
   * @param {"sparkline-hover" | "sparkline-select"} type Event to dispatch.
   */
  #onPointer(e, type) {
    if (!this.option("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);

    const outlier = target?.closest('[part~="outlier"]');
    if (outlier?.hasAttribute("data-index")) {
      const index = Number.parseInt(outlier.getAttribute("data-index") || "0", 10);
      const entry = this.#outlierData[index];
      if (!entry) return;
      this.dispatchPoint(type, {
        index,
        seriesIndex: 1,
        value: entry.value,
        datum: entry.value,
        mark: outlier,
        legacy: { index, boxIndex: entry.box, value: entry.value, outlier: true, element: outlier },
      }, e);
      return;
    }

    const group = target?.closest('[part~="box-group"]');
    if (!group?.hasAttribute("data-index")) return;
    const index = Number.parseInt(group.getAttribute("data-index") || "0", 10);
    const summary = this.#summaries[index];
    if (!summary) return;
    this.dispatchPoint(type, {
      index,
      value: summary.median,
      datum: summary,
      mark: group.querySelector('[part~="box"]'),
      anchor: this.#medianAnchor(index),
      legacy: { index, summary, element: group },
    }, e);
  }

  #onPointerLeave = () => {
    if (!this.option("interactive")) return;
    this.clearHover();
    this.dispatchEvent(new CustomEvent("sparkline-leave", { bubbles: true, composed: true }));
  };

  /**
   * Adds or removes nodes to match the boxes and outliers to draw.
   *
   * @param {number} boxes Number of boxes.
   * @param {number} outliers Number of outliers.
   */
  #syncNodes(boxes, outliers) {
    while (this.#boxes.length < boxes) {
      const line = (/** @type {string} */ part) => /** @type {SVGLineElement} */ (createSvgElement("line", { part }));
      /** @type {BoxNodes} */
      const nodes = {
        group: /** @type {SVGGElement} */ (createSvgElement("g", { part: "box-group" })),
        whiskerLow: line("whisker whisker-low"),
        whiskerHigh: line("whisker whisker-high"),
        capLow: line("cap cap-low"),
        capHigh: line("cap cap-high"),
        box: /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "box" })),
        median: line("median"),
      };
      nodes.group.append(nodes.whiskerLow, nodes.whiskerHigh, nodes.capLow, nodes.capHigh, nodes.box, nodes.median);
      this.#boxesGroup?.append(nodes.group);
      this.#boxes.push(nodes);
    }
    while (this.#boxes.length > boxes) this.#boxes.pop()?.group.remove();
    this.#drawn.boxes.length = Math.min(this.#drawn.boxes.length, boxes);

    while (this.#outliers.length < outliers) {
      const circle = /** @type {SVGCircleElement} */ (createSvgElement("circle", { part: "outlier", r: "1.5" }));
      this.#outliersGroup?.append(circle);
      this.#outliers.push(circle);
    }
    while (this.#outliers.length > outliers) this.#outliers.pop()?.remove();
    this.#drawn.outliers.length = Math.min(this.#drawn.outliers.length, outliers);
  }

  /** @param {BoxSummary[]} summaries Boxes to draw. */
  #update(summaries) {
    stopTween(this);
    const horizontal = this.option("orientation") !== "vertical";
    const layout = createBoxPlotLayout(summaries, {
      width: this.chartWidth,
      height: this.chartHeight,
      horizontal,
      gap: this.option("gap"),
      min: this.option("min"),
      max: this.option("max"),
      outliers: this.option("outliers") !== false,
    });

    this.#summaries = summaries;
    this.#outlierData = layout.outliers.map(({ box, value }) => ({ box, value }));
    this.#syncNodes(layout.boxes.length, layout.outliers.length);
    if (layout.boxes.length === 0) return;

    this.#boxes.forEach(({ group }, index) => {
      group.setAttribute("data-index", String(index));
      group.setAttribute("data-value", String(summaries[index]?.median));
    });
    this.#outliers.forEach((circle, index) => {
      const outlier = layout.outliers[index];
      circle.setAttribute("data-index", String(index));
      circle.setAttribute("data-box-index", String(outlier?.box));
      circle.setAttribute("data-value", String(outlier?.value));
    });

    // Boxes enter (and new ones appear) folded onto their median; new outliers leave from it.
    const entering = !this.#entered;
    this.#entered = true;
    const folded = (/** @type {BoxGeometry} */ box) => ({ ...box, lo: box.median, q1: box.median, q3: box.median, hi: box.median });
    const fromBoxes = layout.boxes.map((box, index) => (entering ? folded(box) : (this.#drawn.boxes[index] ?? folded(box))));
    const fromOutliers = layout.outliers.map((outlier, index) => {
      const origin = layout.boxes[outlier.box];
      const start = { at: origin?.median ?? outlier.at, center: outlier.center };
      return entering ? start : (this.#drawn.outliers[index] ?? start);
    });

    /** @param {number} t Eased progress. */
    const frame = (t) => {
      layout.boxes.forEach((box, index) => {
        const start = fromBoxes[index] ?? box;
        /** @type {BoxGeometry} */
        const now = {
          lo: lerp(start.lo, box.lo, t),
          q1: lerp(start.q1, box.q1, t),
          median: lerp(start.median, box.median, t),
          q3: lerp(start.q3, box.q3, t),
          hi: lerp(start.hi, box.hi, t),
          center: lerp(start.center, box.center, t),
          size: lerp(start.size, box.size, t),
        };
        this.#drawn.boxes[index] = now;
        const nodes = this.#boxes[index];
        if (nodes) this.#drawBox(nodes, now, horizontal);
      });
      layout.outliers.forEach((outlier, index) => {
        const start = fromOutliers[index] ?? outlier;
        const now = { at: lerp(start.at, outlier.at, t), center: lerp(start.center, outlier.center, t) };
        this.#drawn.outliers[index] = now;
        const circle = this.#outliers[index];
        if (!circle) return;
        circle.setAttribute("cx", String(horizontal ? now.at : now.center));
        circle.setAttribute("cy", String(horizontal ? now.center : now.at));
      });
    };

    tween(this, frame);
  }

  /**
   * Writes one box's geometry to its nodes. `along` is the value axis and
   * `across` the other one, swapped for vertical boxes.
   *
   * @param {BoxNodes} nodes The box's nodes.
   * @param {BoxGeometry} g Geometry.
   * @param {boolean} horizontal Whether the value axis is horizontal.
   */
  #drawBox(nodes, g, horizontal) {
    /**
     * @param {Element} el Line.
     * @param {number} a1 Start along the value axis.
     * @param {number} c1 Start across it.
     * @param {number} a2 End along the value axis.
     * @param {number} c2 End across it.
     */
    const line = (el, a1, c1, a2, c2) => {
      el.setAttribute("x1", String(horizontal ? a1 : c1));
      el.setAttribute("y1", String(horizontal ? c1 : a1));
      el.setAttribute("x2", String(horizontal ? a2 : c2));
      el.setAttribute("y2", String(horizontal ? c2 : a2));
    };
    const half = g.size / 2;
    const cap = g.size / 4;
    line(nodes.whiskerLow, g.lo, g.center, g.q1, g.center);
    line(nodes.whiskerHigh, g.q3, g.center, g.hi, g.center);
    line(nodes.capLow, g.lo, g.center - cap, g.lo, g.center + cap);
    line(nodes.capHigh, g.hi, g.center - cap, g.hi, g.center + cap);
    line(nodes.median, g.median, g.center - half, g.median, g.center + half);

    const start = Math.min(g.q1, g.q3);
    const length = Math.abs(g.q3 - g.q1);
    nodes.box.setAttribute("x", String(horizontal ? start : g.center - half));
    nodes.box.setAttribute("y", String(horizontal ? g.center - half : start));
    nodes.box.setAttribute("width", String(horizontal ? length : g.size));
    nodes.box.setAttribute("height", String(horizontal ? g.size : length));
  }
}

acceptDataValues(MiniBoxPlotChart);
