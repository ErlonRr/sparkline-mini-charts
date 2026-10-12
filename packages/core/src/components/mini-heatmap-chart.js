// mini-heatmap-chart.js — Responsive SVG heatmap / calendar grid sparkline Custom Element.

import { readDataArray } from "../core/data.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { attributeFrames, lerp, readAttributes, stopTween, tween } from "../core/motion.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay } from "../core/svg.js";

/**
 * One cell of the heatmap grid.
 *
 * @typedef {Object} HeatmapCell
 * @property {number} x Left edge, in viewBox units.
 * @property {number} y Top edge, in viewBox units.
 * @property {number} size Side of the square cell (gap removed).
 * @property {number} radius Corner radius.
 * @property {number} row Grid row.
 * @property {number} col Grid column.
 * @property {number | null} value Value, or `null` for an empty slot.
 * @property {number} index Index reported in events: the column of a `number[][]` row, the position in a flat `number[]`.
 * @property {number} seriesIndex Row of a `number[][]`; `0` for a flat `number[]`.
 * @property {number} level Color intensity in [0, 1].
 */

/**
 * @typedef {Object} HeatmapLayoutOptions
 * @property {number} width viewBox width.
 * @property {number} height viewBox height.
 * @property {number | undefined} columns Wrap length of a flat `number[]`.
 * @property {string | undefined} layout `"calendar"` fills a flat `number[]` column by column.
 * @property {number} gap Share of each cell left empty, 0–0.9.
 * @property {number} radius Corner radius as a share of the cell side, 0–0.5.
 * @property {number} levels Number of color steps; 0 is continuous.
 * @property {number | undefined} min Domain minimum.
 * @property {number | undefined} max Domain maximum.
 */

/**
 * Maps a value to a color intensity in [0, 1]. The domain minimum is 0 (the
 * empty color). With `levels` ≥ 2 the intensity snaps up to one of `levels`
 * steps (0, 1/(levels-1), …, 1), so any value above the minimum is visible.
 *
 * @param {number} value Cell value.
 * @param {number} lo Domain minimum.
 * @param {number} hi Domain maximum.
 * @param {number} levels Number of steps; 0 is continuous.
 * @returns {number}
 */
export function heatmapLevel(value, lo, hi, levels) {
  const span = hi - lo;
  const t = span > 0 ? Math.min(1, Math.max(0, (value - lo) / span)) : value > lo ? 1 : 0;
  if (levels <= 0 || t <= 0) return t;
  if (levels === 1) return 1;
  return Math.ceil(t * (levels - 1) - 1e-9) / (levels - 1);
}

/**
 * Lays out square cells, centered in the viewBox.
 *
 * @param {(number | null)[] | (number | null)[][]} data Flat values or rows of values.
 * @param {HeatmapLayoutOptions} options Layout options.
 * @returns {{ cells: HeatmapCell[], rows: number, cols: number }}
 */
export function createHeatmapLayout(data, { width, height, columns, layout, gap, radius, levels, min, max }) {
  /** @type {{ row: number, col: number, value: number | null, index: number, seriesIndex: number }[]} */
  const slots = [];
  let rows = 0;
  let cols = 0;

  if (data.some(Array.isArray)) {
    const grid = /** @type {(number | null)[][]} */ (data);
    rows = grid.length;
    cols = Math.max(0, ...grid.map((row) => row.length));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) slots.push({ row, col, value: grid[row]?.[col] ?? null, index: col, seriesIndex: row });
    }
  } else if (data.length > 0) {
    const flat = /** @type {(number | null)[]} */ (data);
    const calendar = layout === "calendar";
    const wrap = columns !== undefined && Number.isFinite(columns) && columns >= 1 ? Math.floor(columns) : calendar ? 7 : flat.length;
    const span = Math.min(wrap, flat.length);
    const lines = Math.ceil(flat.length / span);
    rows = calendar ? span : lines;
    cols = calendar ? lines : span;
    flat.forEach((value, index) => {
      const row = calendar ? index % span : Math.floor(index / span);
      const col = calendar ? Math.floor(index / span) : index % span;
      slots.push({ row, col, value, index, seriesIndex: 0 });
    });
  }

  if (rows === 0 || cols === 0) return { cells: [], rows: 0, cols: 0 };

  const values = /** @type {number[]} */ (slots.map((slot) => slot.value).filter((value) => value !== null));
  const lo = min ?? Math.min(0, ...values);
  const hi = max ?? (values.length > 0 ? Math.max(...values) : lo);

  const step = Math.min(width / cols, height / rows);
  const offsetX = (width - step * cols) / 2;
  const offsetY = (height - step * rows) / 2;
  const inset = (step * Math.min(0.9, Math.max(0, gap))) / 2;
  const size = step - inset * 2;
  const corner = size * Math.min(0.5, Math.max(0, radius));

  return {
    rows,
    cols,
    cells: slots.map((slot) => ({
      ...slot,
      x: offsetX + slot.col * step + inset,
      y: offsetY + slot.row * step + inset,
      size,
      radius: corner,
      level: slot.value === null ? 0 : heatmapLevel(slot.value, lo, hi, levels),
    })),
  };
}

/**
 * Renders a grid of values (a matrix, or a flat series wrapped into rows or
 * calendar weeks) as colored cells whose intensity follows the value.
 *
 * @extends MiniChartElement
 */
export class MiniHeatmapChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    columns: { type: "number" },
    layout: { type: "enum", values: ["grid", "calendar"], default: "grid" },
    gap: { type: "number", default: 0.15 },
    radius: { type: "number", default: 0.2 },
    levels: { type: "number", default: 5 },
    min: { type: "number" },
    max: { type: "number" },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** @type {boolean} */
  #initialized = false;

  /** Whether the cells have played their entrance; an empty first render does not count. */
  #entered = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {SVGRectElement[]} */
  #rects = [];

  /** Color intensity of each rect on screen, mid-transition included. @type {number[]} */
  #shownLevels = [];

  /** @type {HeatmapCell[]} */
  #cells = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Heatmap";
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
   * Reads a flat `number[]` or rows of numbers (`number[][]`). An entry that is
   * not a finite number becomes `null` (an empty cell) and keeps its slot.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {(number | null)[] | (number | null)[][]}
   */
  parseData(raw) {
    const parsed = readDataArray(raw);
    if (!parsed) return [];
    const cell = (/** @type {unknown} */ value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
    if (parsed.some(Array.isArray)) return parsed.map((row) => (Array.isArray(row) ? row.map(cell) : []));
    return parsed.map(cell);
  }

  /**
   * Counts the cells that hold a value.
   * @override
   * @param {(number | null)[] | (number | null)[][]} data Parsed chart values.
   * @returns {string} Accessible chart label.
   */
  createDefaultLabel(data) {
    const count = data.flat().filter((value) => value !== null).length;
    return count === 0 ? `Empty ${this.chartName} chart` : `${this.chartName} chart with ${count} values`;
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
   * The cells that hold a value, in reading order (row by row), with their
   * row and column so ArrowUp and ArrowDown move between rows.
   * @override
   * @returns {import("../core/mini-chart-element.js").KeyboardTarget[]}
   */
  keyboardTargets() {
    const stops = this.#cells
      .map((cell, index) => ({ cell, node: this.#rects[index] }))
      .filter(({ cell, node }) => cell.value !== null && node?.isConnected)
      .sort((a, b) => a.cell.row - b.cell.row || a.cell.col - b.cell.col)
      .map(({ cell, node }) => ({ node: /** @type {Element} */ (node), row: cell.row, col: cell.col }));
    return stops.length > 0 ? stops : super.keyboardTargets();
  }

  /**
   * @param {string} label Accessible name.
   */
  #createDOM(label) {
    // Static text: per-cell intensity lives on each cell as --_mc-level, never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; --_mc-level: initial; }
[part~="cell"] {
  fill: color-mix(in srgb, var(--mini-chart-color, var(--_mc-accent)) var(--_mc-level, 0%), var(--mini-chart-empty-color, var(--_mc-track)));
  stroke: transparent;
  stroke-width: var(--mini-chart-cell-outline-width, 1.5);
  vector-effect: non-scaling-stroke;
  transition: opacity 0.2s ease, stroke 0.2s ease;
  cursor: default;
}
svg[data-interactive] [part~="cell"][data-index] {
  cursor: pointer;
}
svg[data-interactive] [part~="cell"][data-index]:hover,
svg[data-interactive] [part~="cell"][data-active] {
  stroke: var(--mini-chart-cell-outline-color, currentColor);
  opacity: 1 !important;
}
svg[data-interactive] [part="cells"]:has([part~="cell"][data-index]:hover) [part~="cell"]:not(:hover) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "cells" }));
    this.#svg.append(this.#container);
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
    const rect = target?.closest?.("[data-index]");
    if (!rect) return;

    const cell = this.#cells[Number.parseInt(rect.getAttribute("data-index") ?? "", 10)];
    if (!cell || cell.value === null) return;

    this.dispatchPoint(type, {
      index: cell.index,
      seriesIndex: cell.seriesIndex,
      value: cell.value,
      datum: cell.value,
      mark: rect,
      anchor: { x: cell.x + cell.size / 2, y: cell.y + cell.size / 2 },
      legacy: { row: cell.row, column: cell.col, level: cell.level, element: rect },
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
    this.#container?.addEventListener("click", this.#onClick);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * @param {(number | null)[] | (number | null)[][]} data Parsed chart values.
   */
  #updateChart(data) {
    if (!this.#container || !this.#svg) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    stopTween(this);

    const levels = this.option("levels");
    const { cells, cols } = createHeatmapLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      columns: this.option("columns"),
      layout: this.option("layout"),
      gap: this.option("gap"),
      radius: this.option("radius"),
      levels: Number.isFinite(levels) ? Math.max(0, Math.round(levels)) : 5,
      min: this.option("min"),
      max: this.option("max"),
    });
    this.#cells = cells;

    // Where each cell is now, so an update moves and recolors cells from there.
    const before = this.#rects.map((rect) => readAttributes(rect, ["x", "y", "width", "height"]));
    const previousLevels = this.#shownLevels;

    while (this.#rects.length < cells.length) {
      const rect = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "cell" }));
      this.#container.append(rect);
      this.#rects.push(rect);
    }
    while (this.#rects.length > cells.length) this.#rects.pop()?.remove();

    cells.forEach((cell, index) => {
      const rect = this.#rects[index];
      rect.setAttribute("part", cell.value === null ? "cell empty" : "cell");
      rect.setAttribute("rx", String(cell.radius));
      rect.setAttribute("ry", String(cell.radius));
      if (cell.value === null) {
        rect.removeAttribute("data-index");
        rect.removeAttribute("data-value");
      } else {
        rect.setAttribute("data-index", String(index));
        rect.setAttribute("data-value", String(cell.value));
      }
    });

    if (cells.length === 0) {
      this.#shownLevels = [];
      return;
    }

    const isInitial = !this.#entered;
    this.#entered = true;
    /** @type {import("../core/motion.js").AttributeTarget[]} */
    const moves = cells.map((cell, index) => ({
      el: this.#rects[index],
      from: before[index] ?? { x: cell.x, y: cell.y, width: cell.size, height: cell.size },
      to: { x: cell.x, y: cell.y, width: cell.size, height: cell.size },
    }));
    const targetLevels = cells.map((cell) => cell.level);
    const setLevels = (/** @type {number[]} */ shown) => {
      this.#shownLevels = shown;
      shown.forEach((level, index) => this.#rects[index]?.style.setProperty("--_mc-level", `${Math.round(level * 1000) / 10}%`));
    };

    if (isInitial) {
      attributeFrames(moves)(1);
      setLevels(targetLevels);
      if (this.option("motion") === "reduce") return;

      // Entrance: the cells fade in column by column; the whole stagger is capped.
      for (const rect of this.#rects) {
        rect.style.transition = "none";
        rect.style.opacity = "0";
      }
      this.#svg.getBoundingClientRect();
      cells.forEach((cell, index) => {
        const rect = this.#rects[index];
        rect.style.transition = `opacity 0.35s ease-out ${entranceDelay(cell.col, cols, 20)}ms`;
        rect.style.opacity = "";
      });
      const maxDuration = 350 + entranceDelay(cols - 1, cols, 20) + 50;
      this.#timerId = setTimeout(() => {
        for (const rect of this.#rects) if (rect.isConnected) rect.style.transition = "";
        this.#timerId = null;
      }, maxDuration);
      return;
    }

    // Update: an rAF tween of the geometry and of each cell's intensity (new cells rise from the empty color).
    for (const rect of this.#rects) {
      rect.style.transition = "";
      rect.style.opacity = "";
    }
    const fromLevels = targetLevels.map((_, index) => previousLevels[index] ?? 0);
    const move = attributeFrames(moves);
    tween(this, (t) => {
      move(t);
      setLevels(targetLevels.map((level, index) => lerp(fromLevels[index] ?? 0, level, t)));
    });
  }
}

acceptDataValues(MiniHeatmapChart);
