// mini-range-bar-chart.js — Responsive SVG floating range bar sparkline Custom Element.

import { createRangeBarLayout } from "../core/geometry.js";
import { readDataArray } from "../core/data.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { attributeFrames, stopTween, tween } from "../core/motion.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay, setLengthProperty } from "../core/svg.js";

/**
 * @typedef {Object} RangeBarCache
 * @property {SVGGElement} group
 * @property {SVGRectElement} bar
 * @property {SVGCircleElement} marker
 */

/**
 * Renders floating interval range bars with optional current value markers.
 *
 * @extends MiniChartElement
 */
export class MiniRangeBarChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    gap: { type: "number", default: 0.25 },
    radius: { type: "number" },
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

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {RangeBarCache[]} */
  #bars = [];

  /** @type {any[]} */
  #currentData = [];

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Range-bar";
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
   * Overrides the default data parser to support 2D arrays or range objects.
   * Items that are neither arrays nor objects (e.g. `null` gaps) are dropped.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {any[]}
   */
  parseData(raw) {
    try {
      const parsed = readDataArray(raw);
      if (!parsed) return [];
      return parsed.filter((item) => item !== null && typeof item === "object");
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

    this.#applyOptions();
    this.#updateChart(data);
  }

  /**
   * Applies the styling attributes on every render, so changing them after the
   * first render takes effect. An explicit `radius` wins over the inherited
   * `--mini-chart-bar-radius` token.
   */
  #applyOptions() {
    if (!this.#svg) return;
    const radius = this.option("radius");
    setLengthProperty(this.#svg, "--_mc-radius", radius === undefined ? null : String(radius), "px");
  }

  /**
   * @param {string} label 
   */
  #createDOM(label) {
    // Static text: per-instance options live on the svg (see #applyOptions), never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; --_mc-radius: initial; }
[part~="range-bar"] {
  fill: var(--mini-chart-range-color, var(--mini-chart-color, var(--_mc-accent)));
  rx: var(--_mc-radius, var(--mini-chart-bar-radius, 3px));
  ry: var(--_mc-radius, var(--mini-chart-bar-radius, 3px));
  transition: opacity 0.2s ease, filter 0.2s ease;
  cursor: default;
}
[part~="marker"] {
  fill: var(--mini-chart-marker-color, var(--_mc-surface));
  stroke: var(--mini-chart-marker-stroke, var(--mini-chart-color, var(--_mc-accent)));
  stroke-width: 1.5px;
  vector-effect: non-scaling-stroke;
  r: calc(var(--_mc-px, 0.833) * 3px);
  pointer-events: none;
}
svg[data-interactive] [part~="range-bar"] {
  cursor: pointer;
}
svg[data-interactive] [part~="range-bar"]:hover {
  filter: brightness(1.2);
  opacity: 1 !important;
}
svg[data-interactive] [part="bars"]:has([part~="range-bar"]:hover) [part~="range-bar"]:not(:hover) {
  opacity: var(--_mc-dim);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "bars" }));

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
    const group = target?.closest('[part~="range-group"]');
    if (!group || !group.hasAttribute("data-index")) return;

    const index = parseInt(group.getAttribute("data-index") || "0", 10);
    const rangeData = this.#currentData[index];

    // The reported value is the current marker when there is one, else the upper bound.
    const candidates = Array.isArray(rangeData)
      ? [rangeData[2], rangeData[1], rangeData[0]]
      : [rangeData?.current, rangeData?.value, rangeData?.max, rangeData?.high];
    const value = candidates.find((candidate) => typeof candidate === "number" && Number.isFinite(candidate)) ?? null;

    this.dispatchPoint(type, {
      index,
      value,
      datum: rangeData,
      mark: group.querySelector('[part~="range-bar"]'),
      legacy: { index, data: rangeData, element: group },
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
   * @param {any[]} data 
   */
  #updateChart(data) {
    if (!this.#container || !this.#svg) return;
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    stopTween(this);

    this.#currentData = data;

    if (data.length === 0) {
      for (const b of this.#bars) {
        b.group.style.display = "none";
      }
      return;
    }

    const gapRatio = this.option("gap");

    const min = this.option("min");
    const max = this.option("max");

    const { bars } = createRangeBarLayout(data, {
      width: this.chartWidth,
      height: this.chartHeight,
      gapRatio,
      min,
      max,
      padding: 4,
    });

    const isInitial = this.#bars.length === 0;

    while (this.#bars.length < bars.length) {
      const group = /** @type {SVGGElement} */ (createSvgElement("g", { part: "range-group" }));
      const bar = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "range-bar" }));
      const marker = /** @type {SVGCircleElement} */ (createSvgElement("circle", { part: "marker", r: "2.5" }));

      group.append(bar, marker);
      this.#container.append(group);
      this.#bars.push({ group, bar, marker });
    }

    if (isInitial) {
      // Step 1: Flat initial state
      bars.forEach((item, index) => {
        const cache = this.#bars[index];
        cache.group.style.display = "";
        cache.group.setAttribute("data-index", String(index));

        cache.bar.style.transition = "none";
        cache.marker.style.transition = "none";

        cache.bar.setAttribute("x", String(item.x));
        cache.bar.setAttribute("y", String(item.y + item.height / 2));
        cache.bar.setAttribute("width", String(item.width));
        cache.bar.setAttribute("height", "0");

        if (item.marker) {
          cache.marker.style.display = "";
          cache.marker.setAttribute("cx", String(item.marker.x));
          cache.marker.setAttribute("cy", String(item.marker.y));
          cache.marker.style.opacity = "0";
        } else {
          cache.marker.style.display = "none";
        }
      });

      // Step 2: Batch single reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Staggered reveal; the whole stagger is capped, however many bars there are.
      bars.forEach((item, index) => {
        const cache = this.#bars[index];
        const delay = entranceDelay(index, bars.length, 30);
        cache.bar.style.transition = `y 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, height 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
        cache.bar.setAttribute("y", String(item.y));
        cache.bar.setAttribute("height", String(item.height));

        if (item.marker) {
          // The marker fades in over the second half of its bar's entrance, so it ends with the bar.
          cache.marker.style.transition = `opacity 0.2s ease ${delay + 200}ms`;
          cache.marker.style.opacity = "1";
        }
      });

      const maxDuration = 400 + entranceDelay(bars.length - 1, bars.length, 30) + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          this.#bars.forEach((b) => {
            if (b.group.isConnected) {
              b.bar.style.transition = "";
              b.marker.style.transition = "";
            }
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Normal update: an rAF tween of the bars and markers (a bar shown again starts flat at its middle).
      /** @type {import("../core/motion.js").AttributeTarget[]} */
      const moves = [];
      this.#bars.forEach((cache, index) => {
        if (index >= bars.length) {
          cache.group.style.display = "none";
          return;
        }

        const wasShown = cache.group.style.display !== "none";
        cache.group.style.display = "";
        cache.group.setAttribute("data-index", String(index));
        const item = bars[index];

        cache.bar.style.transition = "";
        moves.push({
          el: cache.bar,
          from: wasShown && cache.bar.hasAttribute("height") ? undefined : { x: item.x, y: item.y + item.height / 2, width: item.width, height: 0 },
          to: { x: item.x, y: item.y, width: item.width, height: item.height },
        });

        if (item.marker) {
          const markerShown = cache.marker.style.display !== "none" && cache.marker.hasAttribute("cx");
          cache.marker.style.display = "";
          cache.marker.style.transition = "";
          if (markerShown) {
            moves.push({ el: cache.marker, to: { cx: item.marker.x, cy: item.marker.y } });
          } else {
            cache.marker.setAttribute("cx", String(item.marker.x));
            cache.marker.setAttribute("cy", String(item.marker.y));
          }
          cache.marker.style.opacity = "1";
        } else {
          cache.marker.style.display = "none";
        }
      });
      tween(this, attributeFrames(moves));
    }
  }
}

acceptDataValues(MiniRangeBarChart);
