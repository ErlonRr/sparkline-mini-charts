// mini-treemap-chart.js — Responsive SVG squarified treemap sparkline Custom Element.

import { readDataArray } from "../core/data.js";
import { createTreemapLayout, readTreemapEntries } from "../core/layouts/treemap.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { UPDATE_MS, attributeFrames, stopTween, tween } from "../core/motion.js";
import { getSegmentColor } from "../core/palette.js";
import { chartStyles, createChartSvg, createSvgElement, setLengthProperty } from "../core/svg.js";

/** Duration of the entrance, in milliseconds, like the other charts' reveals. */
const ENTRANCE_MS = 800;

/** viewBox width; the height follows the host's aspect ratio (2 / 1 by default). */
const TREEMAP_WIDTH = 100;

/**
 * Reads a rect's geometry from its attributes (mid-transition included).
 *
 * @param {Element} rect Rendered rect.
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
function readRect(rect) {
  const read = (/** @type {string} */ name) => Number.parseFloat(rect.getAttribute(name) ?? "") || 0;
  return { x: read("x"), y: read("y"), width: read("width"), height: read("height") };
}

/**
 * The tooltip anchor of a tile: its centre.
 *
 * @param {Element} tile Tile rect.
 * @returns {{ x: number, y: number }}
 */
function tileCentre(tile) {
  const { x, y, width, height } = readRect(tile);
  return { x: x + width / 2, y: y + height / 2 };
}

/**
 * Reads a CSS aspect ratio (`2 / 1`, `3/1`, `1.5`).
 *
 * @param {string} text Custom property value.
 * @returns {number | null} Width over height, or `null` when it is not a positive ratio.
 */
function parseRatio(text) {
  const match = /^\s*([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?$/.exec(text);
  if (!match) return null;
  const ratio = Number(match[1]) / (match[2] === undefined ? 1 : Number(match[2]));
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}

/**
 * Renders positive values as tiles whose areas are proportional to the
 * values, laid out as a flat squarified treemap.
 *
 * @extends MiniChartElement
 */
export class MiniTreemapChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    gap: { type: "number", default: 1 },
    radius: { type: "number" },
    sort: { type: "boolean", default: true },
    colors: { type: "enum", values: ["series", "accent"], default: "series" },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #group = null;

  /** Tile of each data index (`undefined` until that index first has a positive value). @type {Array<SVGRectElement | undefined>} */
  #tiles = [];

  /** Data indices of the drawn tiles, in layout order (largest first when sorted). @type {number[]} */
  #order = [];

  /** @type {import("../core/layouts/treemap.js").TreemapEntry[]} */
  #entries = [];

  /** Sum of the positive values. */
  #total = 0;

  /** viewBox height, from the host's aspect ratio. */
  #height = TREEMAP_WIDTH / 2;

  /** Whether the tiles have played their entrance (an empty first render does not count). */
  #entered = false;

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return this.#height;
  }

  /** @returns {string} Preferred responsive CSS aspect ratio. */
  get chartAspectRatio() {
    return "2 / 1";
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Treemap";
  }

  /**
   * Keyboard stops: the tiles in layout order (largest first when sorted).
   * @override
   * @returns {import("../core/mini-chart-element.js").KeyboardTarget[]}
   */
  keyboardTargets() {
    return this.#order.flatMap((index) => {
      const node = this.#tiles[index];
      return node ? [{ node }] : [];
    });
  }

  /**
   * Reads numbers or `{ value, label?, color? }` objects; zero and negative values are kept and skipped by the layout.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {import("../core/layouts/treemap.js").TreemapEntry[]}
   */
  parseData(raw) {
    try {
      return readTreemapEntries(readDataArray(raw));
    } catch {
      return [];
    }
  }

  /**
   * @override
   * @param {import("../core/layouts/treemap.js").TreemapEntry[]} data Parsed entries.
   * @returns {string}
   */
  createDefaultLabel(data) {
    const drawn = data.filter((entry) => entry.value > 0).length;
    const skipped = data.length - drawn;
    const note = skipped > 0 ? ` (${skipped} zero or negative ${skipped === 1 ? "value" : "values"} not shown)` : "";
    return drawn === 0 ? `Empty ${this.chartName} chart${note}` : `${this.chartName} chart with ${drawn} values${note}`;
  }

  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data);

    this.#readAspectRatio();
    if (!this.#svg) {
      this.#createDOM(label);
    } else {
      this.#svg.setAttribute("aria-label", label);
      const title = this.#svg.querySelector("title");
      if (title) title.textContent = label;
    }
    this.#svg?.setAttribute("viewBox", `0 0 ${TREEMAP_WIDTH} ${this.#height}`);

    this.#applyOptions();
    this.#update(data);
  }

  /**
   * Follows `--mini-chart-aspect-ratio`: the tiles are laid out in a viewBox
   * of the host's ratio, so they fill the box instead of being letterboxed.
   */
  #readAspectRatio() {
    let ratio = null;
    try {
      ratio = parseRatio(getComputedStyle(this).getPropertyValue("--mini-chart-aspect-ratio"));
    } catch {
      // No computed style (not rendered): keep the default.
    }
    this.#height = TREEMAP_WIDTH / Math.min(20, Math.max(0.25, ratio ?? 2));
  }

  /** @param {string} label Accessible name. */
  #createDOM(label) {
    // Static text: per-instance options live on the svg (see #applyOptions), never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; --_mc-radius: initial; }
[part~="tile"] {
  fill: currentColor;
  rx: var(--_mc-radius, var(--mini-chart-bar-radius, 1px));
  ry: var(--_mc-radius, var(--mini-chart-bar-radius, 1px));
  transition: opacity 0.2s ease, filter 0.2s ease;
  cursor: default;
}
svg[data-interactive] [part~="tile"] {
  cursor: pointer;
}
svg[data-interactive] [part~="tile"]:hover {
  filter: brightness(1.15);
  opacity: 1 !important;
}
svg[data-interactive] [part="tiles"]:has([part~="tile"]:hover) [part~="tile"]:not(:hover) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: TREEMAP_WIDTH, height: this.#height, label });
    this.#group = /** @type {SVGGElement} */ (createSvgElement("g", { part: "tiles" }));
    this.#svg.append(this.#group);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#group.addEventListener("pointerover", this.#onPointerMove);
    this.#group.addEventListener("click", this.#onClick);
    this.#svg.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /** Applies `radius` on every render; an explicit value wins over `--mini-chart-bar-radius`. */
  #applyOptions() {
    if (!this.#svg) return;
    const radius = this.option("radius");
    setLengthProperty(this.#svg, "--_mc-radius", radius === undefined ? null : String(radius), "px");
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => this.#onPointer(e, "sparkline-hover");
  #onClick = (/** @type {MouseEvent} */ e) => this.#onPointer(e, "sparkline-select");

  #onPointerLeave = () => {
    if (!this.option("interactive")) return;
    this.clearHover();
    this.dispatchEvent(new CustomEvent("sparkline-leave", { bubbles: true, composed: true }));
  };

  /**
   * @param {MouseEvent} e Pointer or click event.
   * @param {"sparkline-hover" | "sparkline-select"} type Event to dispatch.
   */
  #onPointer(e, type) {
    if (!this.option("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    if (!target || !target.hasAttribute?.("data-index")) return;

    const index = Number(target.getAttribute("data-index"));
    const entry = this.#entries.find((item) => item.index === index);
    if (!entry || entry.value <= 0) return;

    const percent = this.#total > 0 ? (entry.value / this.#total) * 100 : 0;
    const datum = entry.datum !== null && typeof entry.datum === "object"
      ? { .../** @type {Record<string, unknown>} */ (entry.datum), value: entry.value, percent }
      : { value: entry.value, percent };

    this.dispatchPoint(type, {
      index,
      value: entry.value,
      datum,
      mark: target,
      anchor: tileCentre(target),
      legacy: {
        percentage: Number(percent.toFixed(1)),
        ...(entry.label === undefined ? {} : { label: entry.label }),
        color: entry.color ?? (this.option("colors") === "accent" ? "" : getSegmentColor(index)),
        element: target,
      },
    }, e);
  }

  /**
   * Lays the tiles out and moves them: from their centers on the entrance and
   * for tiles that appear, from where they are on an update.
   *
   * @param {import("../core/layouts/treemap.js").TreemapEntry[]} data Parsed entries.
   */
  #update(data) {
    const group = this.#group;
    if (!group) return;
    stopTween(this);
    this.#entries = data;

    const { tiles, total } = createTreemapLayout(data, {
      width: TREEMAP_WIDTH,
      height: this.#height,
      gap: this.option("gap"),
      sort: Boolean(this.option("sort")),
    });
    this.#total = total;
    this.#order = tiles.map((tile) => tile.index);

    const accent = this.option("colors") === "accent";
    const largest = tiles.reduce((max, tile) => Math.max(max, tile.value), 0);
    const entering = !this.#entered && tiles.length > 0;
    if (tiles.length > 0) this.#entered = true;

    // Tiles past the end of the data are removed; the others are hidden until they have a positive value again.
    const length = data.reduce((max, entry) => Math.max(max, entry.index + 1), 0);
    for (const surplus of this.#tiles.splice(length)) surplus?.remove();
    const drawn = new Set(this.#order);
    this.#tiles.forEach((tile, index) => {
      if (tile && !drawn.has(index)) tile.style.display = "none";
    });

    /** @type {import("../core/motion.js").AttributeTarget[]} */
    const moves = [];
    for (const tile of tiles) {
      let rect = this.#tiles[tile.index];
      const shown = Boolean(rect && rect.style.display !== "none" && rect.hasAttribute("width"));
      if (!rect) {
        rect = /** @type {SVGRectElement} */ (createSvgElement("rect"));
        this.#tiles[tile.index] = rect;
        // Data order in the DOM, so a tile keeps its place among its siblings.
        const next = this.#tiles.slice(tile.index + 1).find((node) => node !== undefined);
        group.insertBefore(rect, next ?? null);
      }
      const entry = data.find((item) => item.index === tile.index);
      rect.style.display = "";
      rect.setAttribute("part", `tile tile-${tile.index + 1}`);
      rect.setAttribute("data-index", String(tile.index));
      rect.style.fill = entry?.color ?? (accent ? "" : `var(--mini-chart-color-${tile.index + 1}, ${getSegmentColor(tile.index)})`);
      rect.style.fillOpacity = accent && !entry?.color && largest > 0 ? String(Math.round((0.35 + (0.65 * tile.value) / largest) * 1000) / 1000) : "";

      const to = { x: tile.x, y: tile.y, width: tile.width, height: tile.height };
      const collapsed = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2, width: 0, height: 0 };
      moves.push(entering || !shown ? { el: rect, from: collapsed, to } : { el: rect, to });
    }

    tween(this, attributeFrames(moves), entering ? ENTRANCE_MS : UPDATE_MS);
  }
}

acceptDataValues(MiniTreemapChart);
