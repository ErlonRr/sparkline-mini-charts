// mini-progress-chart.js — Responsive SVG semi-circular gauge/progress bar Custom Element.

import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

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
   * Cleans up pending frames and interaction listeners on disconnection.
   * @override
   */
  cleanup() {
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    this.#detachInteractionListeners();
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
  transition: stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, filter 0.2s ease;
}
:host([gradient]) [part="value"] {
  stroke: unset;
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

  #setupInteractionListeners() {
    this.#svg?.addEventListener("pointermove", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  #detachInteractionListeners() {
    this.#svg?.removeEventListener("pointermove", this.#onPointerMove);
    this.#svg?.removeEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * Resolves gradient colors if specified.
   * @returns {string[] | null}
   */
  #resolveGradientStops() {
    const raw = this.getAttribute("gradient");
    if (raw === null || raw === "false") return null;
    if (raw === "" || raw === "true") {
      return ["#3b82f6", "#06b6d4", "#10b981"];
    }
    try {
      const normalized = raw.replace(/'/g, '"');
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    if (raw.includes(",")) {
      return raw.replace(/[\[\]'"]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
    }
    return null;
  }

  /**
   * @param {number[]} data 
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

    const rawVal = data.length > 0 ? data[0] : 0;
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

    // Configure gradient if enabled
    const gradientStops = this.#resolveGradientStops();
    if (gradientStops) {
      this.#gradient.innerHTML = "";
      const count = gradientStops.length;
      gradientStops.forEach((color, idx) => {
        const offset = count > 1 ? `${(idx / (count - 1)) * 100}%` : "0%";
        const stop = createSvgElement("stop", {
          offset,
          "stop-color": color,
        });
        this.#gradient?.append(stop);
      });
      this.#valuePath.style.stroke = `url(#${this.#gradId})`;
    } else {
      this.#valuePath.style.stroke = "";
    }

    const isInitial = this.#valuePath.style.strokeDashoffset === "100" && !this.#valuePath.dataset.rendered;

    if (isInitial) {
      this.#valuePath.dataset.rendered = "true";
      this.#valuePath.style.transition = "none";
      this.#valuePath.style.strokeDashoffset = "100";
      this.#valuePath.style.opacity = progress > 0 ? "1" : "0";

      if (typeof requestAnimationFrame !== "undefined") {
        this.#rafId = requestAnimationFrame(() => {
          this.#rafId = requestAnimationFrame(() => {
            if (!this.#valuePath) return;
            this.#valuePath.style.transition = "stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, filter 0.2s ease";
            this.#valuePath.style.strokeDashoffset = String(targetOffset);
          });
        });
      } else {
        this.#valuePath.style.strokeDashoffset = String(targetOffset);
      }
    } else {
      this.#valuePath.style.transition = "stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, filter 0.2s ease";
      this.#valuePath.style.strokeDashoffset = String(targetOffset);
      this.#valuePath.style.opacity = progress > 0 ? "1" : "0";
    }

    if (clampedVal >= max) {
      this.dispatchEvent(new CustomEvent("progress-complete", {
        bubbles: true,
        composed: true,
        detail: { value: clampedVal, max },
      }));
    }
  }
}
