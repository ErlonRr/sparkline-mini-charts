// mini-stacked-bar-chart.js — Responsive SVG single stacked (composition) bar Custom Element.

import { readDataArray } from "../core/data.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { attributeFrames, readAttributes, stopTween, tween } from "../core/motion.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay, setColorProperty } from "../core/svg.js";

/** Length of the bar along its axis, in viewBox units. */
const LENGTH = 100;

/** Thickness of the bar, in viewBox units. */
const THICKNESS = 20;

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
 * The tooltip anchor of a segment: the centre of its top edge.
 *
 * @param {Element} segment Segment rect.
 * @returns {{ x: number, y: number }}
 */
function rectTopCentre(segment) {
  const { x, y, width } = readRect(segment);
  return { x: x + width / 2, y };
}

/**
 * A data entry: a number, or an object with a value and an optional label and color.
 *
 * @typedef {number | { value?: unknown, label?: unknown, color?: unknown }} StackedBarEntry
 */

/**
 * @typedef {Object} StackedBarRect
 * @property {number} x Left edge.
 * @property {number} y Top edge.
 * @property {number} width Width.
 * @property {number} height Height.
 */

/**
 * @typedef {Object} StackedBarLayout
 * @property {(StackedBarRect & { value: number, percent: number })[]} segments One per entry, in data order.
 * @property {StackedBarRect | null} track The unfilled rest of the bar, or `null` when there is none.
 * @property {number} total Sum of the (non-negative) values.
 */

/**
 * Reads the value of an entry; anything that is not a finite, positive number is 0.
 *
 * @param {StackedBarEntry} entry Data entry.
 * @returns {number}
 */
export function stackedBarValue(entry) {
  const value = typeof entry === "number" ? entry : entry?.value;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Lays out the segments of one bar along its length, in data order (left to
 * right, or bottom to top when vertical). Without `max` the segments fill the
 * whole bar; with `max` they fill `total / max` of it and the track takes the rest.
 *
 * @param {readonly number[]} values Non-negative values.
 * @param {{ max?: number | undefined, gap: number, vertical: boolean }} options Layout options.
 * @returns {StackedBarLayout}
 */
export function createStackedBarLayout(values, { max, gap, vertical }) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const scale = max !== undefined && Number.isFinite(max) && max > 0 ? max : null;
  const filled = total <= 0 ? 0 : scale === null ? LENGTH : LENGTH * Math.min(1, total / scale);
  const visible = values.filter((value) => value > 0).length;
  // A gap never takes more than half of the filled length.
  const space = visible > 1 ? Math.min(Math.max(0, gap), (filled * 0.5) / (visible - 1)) : 0;
  const usable = filled - space * Math.max(0, visible - 1);

  /** @type {(start: number, length: number) => StackedBarRect} */
  const place = (start, length) =>
    vertical ? { x: 0, y: LENGTH - start - length, width: THICKNESS, height: length } : { x: start, y: 0, width: length, height: THICKNESS };

  let cursor = 0;
  let drawn = 0;
  const segments = values.map((value) => {
    const length = total > 0 ? (usable * value) / total : 0;
    const rect = place(cursor, length);
    if (value > 0) {
      drawn += 1;
      cursor += length + (drawn < visible ? space : 0);
    }
    return { ...rect, value, percent: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0 };
  });

  const trackStart = filled > 0 ? filled + (filled < LENGTH ? Math.max(0, gap) : 0) : 0;
  const trackLength = values.length > 0 ? LENGTH - trackStart : 0;
  return { segments, track: trackLength > 0 && (scale !== null || total <= 0) ? place(trackStart, trackLength) : null, total };
}

/**
 * Renders the composition of a total as one bar split into colored segments,
 * optionally filled up to `max` with a track for the rest.
 *
 * @extends MiniChartElement
 */
export class MiniStackedBarChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    max: { type: "number" },
    gap: { type: "number", default: 1 },
    radius: { type: "number", default: 0 },
    orientation: { type: "enum", values: ["horizontal", "vertical"], default: "horizontal" },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** @type {boolean} */
  #initialized = false;

  /** Whether the segments have played their entrance; an empty first render does not count. */
  #entered = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGRectElement | null} */
  #track = null;
  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {SVGRectElement[]} */
  #segments = [];

  /** @type {StackedBarEntry[]} */
  #currentData = [];

  /** @type {number[]} */
  #percents = [];

  /** @returns {boolean} Whether the bar is vertical. */
  get #vertical() {
    return this.option("orientation") === "vertical";
  }

  /** @returns {number} SVG viewBox width. */
  get chartWidth() {
    return this.#vertical ? THICKNESS : LENGTH;
  }

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return this.#vertical ? LENGTH : THICKNESS;
  }

  /** @returns {string} Default aspect ratio of the horizontal bar (the stylesheet flips it for `orientation="vertical"`). */
  get chartAspectRatio() {
    return `${LENGTH} / ${THICKNESS}`;
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Stacked bar";
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
   * Reads numbers and `{ value, label?, color? }` objects. Any other entry
   * becomes `0`, a zero-length segment in its slot, so segment `n` keeps color `n`.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {StackedBarEntry[]}
   */
  parseData(raw) {
    const parsed = readDataArray(raw);
    if (!parsed) return [];
    return parsed.map((item) => (typeof item === "number" || (item !== null && typeof item === "object" && !Array.isArray(item)) ? item : 0));
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
   * @param {string} label Accessible name.
   */
  #createDOM(label) {
    // Static text: segment colors live on each segment as --_mc-segment-color, never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; --_mc-segment-color: initial; }
:host([orientation="vertical"]) { --mini-chart-default-aspect-ratio: ${THICKNESS} / ${LENGTH}; }
[part="track"] {
  fill: var(--mini-chart-track-color, var(--_mc-track));
}
[part~="segment"] {
  fill: var(--_mc-segment-color, currentColor);
  transition: opacity 0.2s ease, filter 0.2s ease;
  cursor: default;
}
svg[data-interactive] [part~="segment"] {
  cursor: pointer;
}
svg[data-interactive] [part~="segment"]:hover {
  filter: brightness(1.15);
  opacity: 1 !important;
}
svg[data-interactive] [part="segments"]:has([part~="segment"]:hover) [part~="segment"]:not(:hover) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#track = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "track" }));
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "segments" }));
    this.#svg.append(this.#track, this.#container);
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
    const segment = target?.closest?.("[data-index]");
    if (!segment) return;

    const index = Number.parseInt(segment.getAttribute("data-index") ?? "0", 10);
    const entry = this.#currentData[index];
    if (entry === undefined) return;
    const value = stackedBarValue(entry);
    const percent = this.#percents[index] ?? 0;
    const label = typeof entry === "object" && typeof entry?.label === "string" ? entry.label : undefined;

    this.dispatchPoint(type, {
      index,
      value,
      datum: label === undefined ? { value, percent } : { value, percent, label },
      mark: segment,
      anchor: rectTopCentre(segment),
      legacy: { percentage: percent, element: segment },
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
   * @param {StackedBarEntry[]} data Parsed chart values.
   */
  #updateChart(data) {
    const svg = this.#svg;
    const track = this.#track;
    if (!this.#container || !svg || !track) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    stopTween(this);

    this.#currentData = data;
    const vertical = this.#vertical;
    svg.setAttribute("viewBox", `0 0 ${this.chartWidth} ${this.chartHeight}`);

    const { segments, track: rest } = createStackedBarLayout(data.map(stackedBarValue), {
      max: this.option("max"),
      gap: this.option("gap"),
      vertical,
    });
    this.#percents = segments.map((segment) => segment.percent);
    const radius = String(Math.max(0, this.option("radius")));

    const before = this.#segments.map((rect) => readAttributes(rect, ["x", "y", "width", "height"]));
    while (this.#segments.length < segments.length) {
      const rect = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "segment" }));
      this.#container.append(rect);
      this.#segments.push(rect);
    }
    while (this.#segments.length > segments.length) this.#segments.pop()?.remove();

    segments.forEach((segment, index) => {
      const rect = this.#segments[index];
      const entry = data[index];
      rect.setAttribute("part", `segment segment-${index + 1}`);
      rect.setAttribute("rx", radius);
      rect.setAttribute("ry", radius);
      if (segment.value > 0) {
        rect.setAttribute("data-index", String(index));
        rect.setAttribute("data-value", String(segment.value));
        rect.style.display = "";
      } else {
        rect.removeAttribute("data-index");
        rect.removeAttribute("data-value");
        rect.style.display = "none";
      }
      // An entry's own color wins when it is a valid CSS color; otherwise the palette token.
      setColorProperty(rect, "--_mc-segment-color", typeof entry === "object" && typeof entry?.color === "string" ? entry.color : null);
      if (!rect.style.getPropertyValue("--_mc-segment-color")) {
        rect.style.setProperty("--_mc-segment-color", `var(--mini-chart-color-${index + 1}, ${getSegmentColor(index)})`);
      }
    });

    track.setAttribute("rx", radius);
    track.setAttribute("ry", radius);
    track.style.display = rest ? "" : "none";
    const trackTo = rest ?? readAttributes(track, ["x", "y", "width", "height"]) ?? { x: 0, y: 0, width: 0, height: 0 };

    if (segments.length === 0) return;

    const isInitial = !this.#entered;
    this.#entered = true;
    // A segment that enters grows from the start of the bar (left, or bottom when vertical).
    const collapsed = (/** @type {StackedBarRect} */ rect) =>
      vertical ? { x: rect.x, y: LENGTH, width: rect.width, height: 0 } : { x: 0, y: rect.y, width: 0, height: rect.height };

    if (isInitial) {
      attributeFrames([{ el: track, to: trackTo }])(1);
      const animate = this.option("motion") !== "reduce";
      segments.forEach((segment, index) => {
        const rect = this.#segments[index];
        rect.style.transition = "none";
        const start = animate ? collapsed(segment) : segment;
        for (const [name, value] of Object.entries({ x: start.x, y: start.y, width: start.width, height: start.height })) rect.setAttribute(name, String(value));
      });
      if (!animate) return;

      svg.getBoundingClientRect();
      segments.forEach((segment, index) => {
        const rect = this.#segments[index];
        const delay = entranceDelay(index, segments.length, 60);
        rect.style.transition = `x 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, y 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, width 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, height 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
        for (const [name, value] of Object.entries({ x: segment.x, y: segment.y, width: segment.width, height: segment.height })) rect.setAttribute(name, String(value));
      });
      const maxDuration = 500 + entranceDelay(segments.length - 1, segments.length, 60) + 50;
      this.#timerId = setTimeout(() => {
        for (const rect of this.#segments) if (rect.isConnected) rect.style.transition = "";
        this.#timerId = null;
      }, maxDuration);
      return;
    }

    // Update: an rAF tween of every segment and of the track.
    /** @type {import("../core/motion.js").AttributeTarget[]} */
    const moves = segments.map((segment, index) => {
      const rect = this.#segments[index];
      rect.style.transition = "";
      return {
        el: rect,
        from: before[index] ?? collapsed(segment),
        to: { x: segment.x, y: segment.y, width: segment.width, height: segment.height },
      };
    });
    moves.push({ el: track, to: trackTo });
    tween(this, attributeFrames(moves));
  }
}

acceptDataValues(MiniStackedBarChart);
