// mini-bullet-chart.js — Responsive SVG bullet sparkline Custom Element for KPIs and OKRs.

import { createBulletLayout } from "../core/geometry.js";
import { resolveGradientColors, setGradientStops } from "../core/gradient.js";
import { MiniChartElement, acceptDataValues } from "../core/mini-chart-element.js";
import { attributeFrames, stopTween, tween } from "../core/motion.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/** Measure-bar stops for `gradient` and `gradient="true"`. */
const DEFAULT_GRADIENT = Object.freeze(["#2563eb", "#8b5cf6", "#ec4899"]);

/**
 * Renders a Stephen Few bullet graph for performance tracking with optional gradient fills.
 *
 * @extends MiniChartElement
 */
export class MiniBulletChart extends MiniChartElement {
  /** @type {Readonly<Record<string, import("../core/mini-chart-element.js").OptionDescriptor>>} */
  static props = {
    target: { type: "number" },
    min: { type: "number" },
    max: { type: "number" },
    ranges: { type: "json" },
    gradient: { type: "colorList", default: false },
    interactive: { type: "boolean", presence: true },
    tooltip: { type: "boolean" },
    locale: { type: "string" },
    motion: { type: "enum", values: ["auto", "reduce"] },
  };

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** Measured value of the last render, reported by the events. */
  #currentValue = 0;

  /** Whether the measure bar has played its entrance animation. */
  #entered = false;

  /** @type {boolean} */
  #initialized = false;

  /** @type {number | null} */
  #rafId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGDefsElement | null} */
  #defs = null;
  /** @type {SVGLinearGradientElement | null} */
  #gradient = null;
  /** @type {string} */
  #gradId = "";
  /** @type {SVGGElement | null} */
  #rangesGroup = null;
  /** @type {SVGRectElement | null} */
  #measureRect = null;
  /** @type {{ x: number, y: number } | null} Top of the measure bar's end, where the tooltip points. */
  #measureEnd = null;
  /** @type {SVGLineElement | null} */
  #targetMarker = null;

  /** @type {any} */
  #currentData = null;

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Bullet";
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
  }

  /**
   * Overrides the default data parser to accept numeric arrays, bullet config
   * objects, or a single number, which becomes `{ value }` so the target, min,
   * max and ranges attributes still apply. `null` and any other JSON value give
   * the empty model `[]`.
   * @override
   * @param {any} raw JSON text of the `data` attribute, or the `data` property's value.
   * @returns {any}
   */
  parseData(raw) {
    if (raw === null || raw === undefined || raw === "") return [];
    let parsed = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        const num = parseFloat(raw);
        return !isNaN(num) ? [num] : [];
      }
    }
    if (typeof parsed === "number") return Number.isFinite(parsed) ? { value: parsed } : [];
    if (parsed !== null && typeof parsed === "object") return parsed;
    return [];
  }

  /**
   * Keyboard stop: the measure bar.
   * @override
   * @returns {import("../core/mini-chart-element.js").KeyboardTarget[]}
   */
  keyboardTargets() {
    return this.#measureRect ? [{ node: this.#measureRect }] : [];
  }

  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(Array.isArray(data) ? data : [data.value || 0]);

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
[part~="range"] {
  fill: var(--mini-chart-range-color, var(--_mc-track));
  transition: opacity 0.2s ease;
  pointer-events: none;
}
[part~="range-1"] { fill: var(--mini-chart-range-1, color-mix(in srgb, var(--mini-chart-color, var(--_mc-accent)) 12%, rgba(128, 128, 128, 0.1))); }
[part~="range-2"] { fill: var(--mini-chart-range-2, color-mix(in srgb, var(--mini-chart-color, var(--_mc-accent)) 24%, rgba(128, 128, 128, 0.16))); }
[part~="range-3"] { fill: var(--mini-chart-range-3, color-mix(in srgb, var(--mini-chart-color, var(--_mc-accent)) 36%, rgba(128, 128, 128, 0.22))); }
[part="measure"] {
  fill: var(--mini-chart-measure-color, var(--mini-chart-color, var(--_mc-accent)));
  rx: 2px;
  ry: 2px;
  transition: filter 0.2s ease;
  cursor: default;
}
[part="target"] {
  stroke: var(--mini-chart-target-color, var(--mini-chart-danger-color, var(--_mc-negative)));
  stroke-width: var(--mini-chart-target-width, 2.5px);
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
svg[data-interactive] [part="measure"] {
  cursor: pointer;
}
svg[data-interactive] [part="measure"]:hover {
  filter: brightness(1.2);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#svg.setAttribute("role", "meter");

    this.#defs = createSvgElement("defs");
    this.#gradId = `bullet-grad-${Math.random().toString(36).slice(2, 9)}`;
    this.#gradient = /** @type {SVGLinearGradientElement} */ (createSvgElement("linearGradient", {
      id: this.#gradId,
      x1: "0%",
      y1: "0%",
      x2: "100%",
      y2: "0%",
    }));
    this.#defs.append(this.#gradient);

    this.#rangesGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "ranges" }));
    this.#measureRect = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "measure" }));
    this.#targetMarker = /** @type {SVGLineElement} */ (createSvgElement("line", { part: "target" }));

    this.#svg.append(this.#defs, this.#rangesGroup, this.#measureRect, this.#targetMarker);
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
    if (!target || !target.matches('[part~="measure"], [part~="target"]')) return;

    this.dispatchPoint(type, {
      value: this.#currentValue,
      datum: this.#currentData,
      mark: target,
      // The tooltip points at the end of the measure bar.
      anchor: this.#measureEnd ?? undefined,
      legacy: { data: this.#currentData, element: target },
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
    this.#svg?.addEventListener("pointerover", this.#onPointerMove);
    this.#svg?.addEventListener("click", this.#onClick);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * @param {any} data 
   */
  #updateChart(data) {
    if (!this.#rangesGroup || !this.#measureRect || !this.#targetMarker || !this.#svg || !this.#gradient) return;
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    stopTween(this);

    this.#currentData = data;

    // Resolve merged options from attributes
    const targetAttr = this.option("target") ?? Number.NaN;
    const minAttr = this.option("min") ?? Number.NaN;
    const maxAttr = this.option("max") ?? Number.NaN;
    const rangesAttr = this.option("ranges");

    let mergedData = data;
    if (Array.isArray(data)) {
      const val = data.length > 0 ? data[0] : 0;
      const tgt = !isNaN(targetAttr) ? targetAttr : (data.length > 1 ? data[1] : val);
      let ranges;
      if (rangesAttr !== undefined) {
        ranges = rangesAttr;
      } else if (data.length > 2) {
        ranges = data.slice(2);
      }
      mergedData = {
        value: val,
        target: tgt,
        ranges,
        min: !isNaN(minAttr) ? minAttr : undefined,
        max: !isNaN(maxAttr) ? maxAttr : undefined,
      };
    } else if (typeof data === "object" && data !== null) {
      mergedData = {
        ...data,
        target: !isNaN(targetAttr) ? targetAttr : data.target,
        min: !isNaN(minAttr) ? minAttr : data.min,
        max: !isNaN(maxAttr) ? maxAttr : data.max,
      };
      if (rangesAttr !== undefined) mergedData.ranges = rangesAttr;
    }

    const geo = createBulletLayout(mergedData, {
      width: this.chartWidth,
      height: this.chartHeight,
      padding: 3,
    });

    this.#currentValue = geo.value;
    this.#measureEnd = { x: geo.measure.x + geo.measure.width, y: geo.measure.y };
    this.#svg.setAttribute("aria-valuenow", String(geo.value));
    this.#svg.setAttribute("aria-valuemin", String(geo.min));
    this.#svg.setAttribute("aria-valuemax", String(geo.max));

    // Render background qualitative ranges
    this.#rangesGroup.replaceChildren(
      ...geo.ranges.map((range, idx) =>
        createSvgElement("rect", {
          part: `range range-${idx + 1}`,
          x: String(range.x),
          y: String(range.y),
          width: String(range.width),
          height: String(range.height),
        }),
      ),
    );

    // Gradient fill on the measure bar. Without one, the inline fill is cleared
    // and the stylesheet's themed measure color applies.
    const gradStops = resolveGradientColors(this.option("gradient") ?? false, DEFAULT_GRADIENT);
    if (gradStops) {
      setGradientStops(this.#gradient, gradStops);
      this.#measureRect.style.fill = `url(#${this.#gradId})`;
    } else {
      this.#measureRect.style.fill = "";
    }

    const isInitial = !this.#entered;
    if (isInitial) {
      this.#entered = true;
      this.#measureRect.style.transition = "none";
      this.#measureRect.setAttribute("x", String(geo.measure.x));
      this.#measureRect.setAttribute("y", String(geo.measure.y));
      this.#measureRect.setAttribute("width", "0");
      this.#measureRect.setAttribute("height", String(geo.measure.height));

      this.#targetMarker.setAttribute("x1", String(geo.targetMarker.x1));
      this.#targetMarker.setAttribute("y1", String(geo.targetMarker.y1));
      this.#targetMarker.setAttribute("x2", String(geo.targetMarker.x2));
      this.#targetMarker.setAttribute("y2", String(geo.targetMarker.y2));

      if (typeof requestAnimationFrame !== "undefined") {
        this.#rafId = requestAnimationFrame(() => {
          this.#rafId = requestAnimationFrame(() => {
            if (!this.#measureRect) return;
            this.#measureRect.style.transition = "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
            this.#measureRect.setAttribute("width", String(geo.measure.width));
          });
        });
      } else {
        this.#measureRect.setAttribute("width", String(geo.measure.width));
      }
    } else {
      // rAF tween of the measure and the target, from where they are now.
      this.#measureRect.style.transition = "";
      this.#targetMarker.style.transition = "";
      tween(this, attributeFrames([
        { el: this.#measureRect, to: { x: geo.measure.x, y: geo.measure.y, width: geo.measure.width, height: geo.measure.height } },
        { el: this.#targetMarker, to: { x1: geo.targetMarker.x1, y1: geo.targetMarker.y1, x2: geo.targetMarker.x2, y2: geo.targetMarker.y2 } },
      ]), 500);
    }
  }
}

acceptDataValues(MiniBulletChart);
