// mini-progress-chart.js — Responsive SVG semi-circular gauge/progress bar Custom Element.

import { parsePositionalData } from "../core/data.js";
import { parseGradient, resolveGradientColors, setGradientStops } from "../core/gradient.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Easing for the arc's dash offset. It must not overshoot: past offset 0 the
 * dash gap moves onto the start of the arc, which then flickers out near 100%.
 */
const VALUE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Inline transition of the value arc once it has entered. */
const VALUE_TRANSITION = `stroke-dashoffset 0.8s ${VALUE_EASING}, opacity 0.3s ease, filter 0.2s ease`;

/** Value-arc stops for `gradient` and `gradient="true"`. */
const DEFAULT_GRADIENT = Object.freeze(["#3b82f6", "#06b6d4", "#10b981"]);

/**
 * Renders a single numeric value as a semi-circular progress meter with gradients, smooth animations, and interaction.
 *
 * @extends MiniChartElement
 */
export class MiniProgressChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "min",
    "max",
    "show-value",
    "unit",
    "gradient",
    "interactive",
  ];

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** @type {boolean} */
  #initialized = false;

  /**
   * Whether the arc has started its entrance animation from empty to the value.
   * It is set when the animation starts, so a render that lands before then
   * (a framework setting `data` right after connecting) restarts the entrance
   * instead of jumping to the value.
   */
  #entered = false;

  /** Whether the last render showed a complete value, so `progress-complete` fires on transitions only. */
  #complete = false;

  /**
   * The value (as given, before clamping) of the last render, or `null` before
   * the first one. Only a render whose value moved can complete the progress.
   * @type {number | null}
   */
  #lastValue = null;

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
  /** @type {SVGPathElement | null} */
  #valuePath = null;
  /** @type {SVGTextElement | null} */
  #valueText = null;

  /** @type {number} */
  #currentValue = 0;
  /** @type {number} */
  #currentProgress = 0;

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return 50;
  }

  /** @returns {string} Default aspect ratio for half-radial geometry. */
  get chartAspectRatio() {
    return "2 / 1";
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Progress";
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
   * Overrides the default data parser: the value is positional (`data[0]`), so
   * an invalid entry becomes `null` in its slot instead of being dropped.
   * @override
   * @param {string | null} raw JSON text of the `data` attribute.
   * @returns {(number | null)[]}
   */
  parseData(raw) {
    return parsePositionalData(raw);
  }

  /**
   * A null value is no reading, so the chart is labelled empty and renders
   * exactly like a missing `data` attribute.
   * @override
   * @param {(number | null)[]} data Parsed chart values.
   * @returns {string} Accessible chart label.
   */
  createDefaultLabel(data) {
    return super.createDefaultLabel(data[0] === null ? [] : data);
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
[part="track"] {
  fill: none;
  stroke: var(--mini-chart-track-color, rgba(128, 128, 128, 0.18));
  stroke-width: var(--mini-chart-stroke-width, 12);
  stroke-linecap: round;
}
[part="value"] {
  fill: none;
  stroke: var(--mini-chart-value-color, var(--mini-chart-color, #3b82f6));
  stroke-width: var(--mini-chart-stroke-width, 12);
  stroke-linecap: round;
  transition: ${VALUE_TRANSITION};
}
[part="text"] {
  fill: var(--mini-chart-text-color, currentColor);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
}
:host([interactive]) [part="value"] {
  cursor: pointer;
}
:host([interactive]) [part="value"]:hover {
  filter: brightness(1.18);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#svg.setAttribute("role", "meter");

    this.#defs = createSvgElement("defs");
    this.#gradId = `prog-grad-${Math.random().toString(36).slice(2, 9)}`;
    this.#gradient = /** @type {SVGLinearGradientElement} */ (createSvgElement("linearGradient", {
      id: this.#gradId,
      x1: "0%",
      y1: "0%",
      x2: "100%",
      y2: "0%",
    }));
    this.#defs.append(this.#gradient);

    const track = createSvgElement("path", {
      part: "track",
      d: "M 10 50 A 40 40 0 0 1 90 50",
    });

    this.#valuePath = /** @type {SVGPathElement} */ (createSvgElement("path", {
      part: "value",
      d: "M 10 50 A 40 40 0 0 1 90 50",
      pathLength: "100",
      "stroke-dasharray": "100",
      "stroke-dashoffset": "100",
    }));

    this.#valueText = /** @type {SVGTextElement} */ (createSvgElement("text", {
      part: "text",
      x: "50",
      y: "42",
    }));
    this.#valueText.style.display = "none";

    this.#svg.append(this.#defs, track, this.#valuePath, this.#valueText);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive") || !this.#svg) return;
    const rect = this.#svg.getBoundingClientRect();
    if (rect.width === 0) return;

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: {
        value: this.#currentValue,
        progress: this.#currentProgress,
      },
    }));
  };

  #onPointerLeave = () => {
    if (!this.hasAttribute("interactive")) return;
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
    this.#svg?.addEventListener("pointermove", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * @param {(number | null)[]} data 
   */
  #updateChart(data) {
    if (!this.#valuePath || !this.#svg || !this.#valueText || !this.#gradient) return;
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }

    const minAttr = parseFloat(this.getAttribute("min") || "0");
    const maxAttr = parseFloat(this.getAttribute("max") || "100");
    const min = !isNaN(minAttr) ? minAttr : 0;
    const max = !isNaN(maxAttr) && maxAttr > min ? maxAttr : 100;

    // A missing or null value falls back to the default 0.
    const rawVal = data[0] ?? 0;
    const clampedVal = Math.max(min, Math.min(max, rawVal));
    const progress = (clampedVal - min) / (max - min);
    const targetOffset = 100 - progress * 100;

    this.#currentValue = clampedVal;
    this.#currentProgress = progress;

    this.#svg.setAttribute("aria-valuenow", String(clampedVal));
    this.#svg.setAttribute("aria-valuemin", String(min));
    this.#svg.setAttribute("aria-valuemax", String(max));

    // Show center text if requested
    if (this.hasAttribute("show-value")) {
      const unit = this.getAttribute("unit") || "";
      const displayVal = Math.round(clampedVal);
      this.#valueText.textContent = `${displayVal}${unit}`;
      this.#valueText.style.display = "";
    } else {
      this.#valueText.style.display = "none";
    }

    // Gradient stroke on the value arc. Without one, the inline stroke is cleared
    // and the stylesheet's themed value color applies.
    const gradientStops = resolveGradientColors(parseGradient(this.getAttribute("gradient")), DEFAULT_GRADIENT);
    if (gradientStops) {
      setGradientStops(this.#gradient, gradientStops);
      this.#valuePath.style.stroke = `url(#${this.#gradId})`;
    } else {
      this.#valuePath.style.stroke = "";
    }

    // A private flag, not the inline style: the empty arc's offset is a presentation attribute.
    if (!this.#entered) {
      // Entrance: paint the empty arc first, then transition to the value two frames later.
      this.#valuePath.style.transition = "none";
      this.#valuePath.style.strokeDashoffset = "100";
      this.#valuePath.style.opacity = progress > 0 ? "1" : "0";

      if (typeof requestAnimationFrame !== "undefined") {
        this.#rafId = requestAnimationFrame(() => {
          this.#rafId = requestAnimationFrame(() => {
            this.#rafId = null;
            if (!this.#valuePath) return;
            this.#entered = true;
            this.#valuePath.style.transition = VALUE_TRANSITION;
            this.#valuePath.style.strokeDashoffset = String(targetOffset);
          });
        });
      } else {
        this.#entered = true;
        this.#valuePath.style.strokeDashoffset = String(targetOffset);
      }
    } else {
      this.#valuePath.style.transition = VALUE_TRANSITION;
      this.#valuePath.style.strokeDashoffset = String(targetOffset);
      this.#valuePath.style.opacity = progress > 0 ? "1" : "0";
    }

    // Fire only when the value itself reaches max: not on every render that finds it
    // there, and not when another attribute (a lower `max`) completes a value in place.
    const complete = clampedVal >= max;
    const valueMoved = this.#lastValue === null || rawVal !== this.#lastValue;
    const completed = complete && !this.#complete && valueMoved;
    this.#complete = complete;
    this.#lastValue = rawVal;

    if (completed) {
      this.dispatchEvent(new CustomEvent("progress-complete", {
        bubbles: true,
        composed: true,
        detail: { value: clampedVal, max },
      }));
    }
  }
}
