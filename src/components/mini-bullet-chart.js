// mini-bullet-chart.js — Responsive SVG bullet sparkline Custom Element for KPIs and OKRs.

import { createBulletLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders a Stephen Few bullet graph for performance tracking with optional gradient fills.
 *
 * @extends MiniChartElement
 */
export class MiniBulletChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "target",
    "min",
    "max",
    "ranges",
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
  /** @type {SVGGElement | null} */
  #rangesGroup = null;
  /** @type {SVGRectElement | null} */
  #measureRect = null;
  /** @type {SVGLineElement | null} */
  #targetMarker = null;

  /** @type {any} */
  #currentData = null;

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Bullet";
  }

  /**
   * Cleans up pending frames on disconnection.
   * @override
   */
  cleanup() {
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    this.#detachInteractionListeners();
  }

  /**
   * Overrides data getter to parse numeric arrays or bullet config objects.
   * @returns {any}
   */
  get data() {
    const raw = this.getAttribute("data");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      const num = parseFloat(raw);
      return !isNaN(num) ? [num] : [];
    }
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
  fill: var(--mini-chart-range-color, rgba(128, 128, 128, 0.15));
  transition: opacity 0.2s ease;
  pointer-events: none;
}
[part~="range-1"] { fill: var(--mini-chart-range-1, color-mix(in srgb, var(--primary, #3b82f6) 12%, rgba(128, 128, 128, 0.1))); }
[part~="range-2"] { fill: var(--mini-chart-range-2, color-mix(in srgb, var(--primary, #3b82f6) 24%, rgba(128, 128, 128, 0.16))); }
[part~="range-3"] { fill: var(--mini-chart-range-3, color-mix(in srgb, var(--primary, #3b82f6) 36%, rgba(128, 128, 128, 0.22))); }
[part="measure"] {
  fill: var(--mini-chart-measure-color, var(--mini-chart-color, #3b82f6));
  rx: 2px;
  ry: 2px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease;
  cursor: default;
}
:host([gradient]) [part="measure"] {
  fill: unset;
}
[part="target"] {
  stroke: var(--mini-chart-target-color, var(--mini-chart-danger-color, #ef4444));
  stroke-width: var(--mini-chart-target-width, 2.5px);
  stroke-linecap: round;
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}
:host([interactive]) [part="measure"] {
  cursor: pointer;
}
:host([interactive]) [part="measure"]:hover {
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

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {Element | null} */ (e.target);
    if (!target || !target.matches('[part~="measure"], [part~="target"]')) return;

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: { data: this.#currentData, element: target },
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
    this.#svg?.addEventListener("pointerover", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  #detachInteractionListeners() {
    this.#svg?.removeEventListener("pointerover", this.#onPointerMove);
    this.#svg?.removeEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * Resolves gradient colors for measure bar.
   * @returns {string[] | null}
   */
  #resolveGradientStops() {
    const raw = this.getAttribute("gradient");
    if (raw === null || raw === "false") return null;
    if (raw === "" || raw === "true") {
      return ["#3b82f6", "#8b5cf6", "#ec4899"];
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
   * @param {any} data 
   */
  #updateChart(data) {
    if (!this.#rangesGroup || !this.#measureRect || !this.#targetMarker || !this.#svg || !this.#gradient) return;
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }

    this.#currentData = data;

    // Resolve merged options from attributes
    const targetAttr = parseFloat(this.getAttribute("target") || "");
    const minAttr = parseFloat(this.getAttribute("min") || "");
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    const rangesAttr = this.getAttribute("ranges");

    let mergedData = data;
    if (Array.isArray(data)) {
      const val = data.length > 0 ? data[0] : 0;
      const tgt = !isNaN(targetAttr) ? targetAttr : (data.length > 1 ? data[1] : val);
      let ranges;
      if (rangesAttr) {
        try { ranges = JSON.parse(rangesAttr); } catch {}
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
      if (rangesAttr) {
        try { mergedData.ranges = JSON.parse(rangesAttr); } catch {}
      }
    }

    const geo = createBulletLayout(mergedData, {
      width: this.chartWidth,
      height: this.chartHeight,
      padding: 3,
    });

    this.#svg.setAttribute("aria-valuenow", String(geo.value));
    this.#svg.setAttribute("aria-valuemin", String(geo.min));
    this.#svg.setAttribute("aria-valuemax", String(geo.max));

    // Render background qualitative ranges
    this.#rangesGroup.innerHTML = "";
    geo.ranges.forEach((range, idx) => {
      const rect = createSvgElement("rect", {
        part: `range range-${idx + 1}`,
        x: String(range.x),
        y: String(range.y),
        width: String(range.width),
        height: String(range.height),
      });
      this.#rangesGroup?.append(rect);
    });

    // Configure gradient fill on measure bar
    const gradStops = this.#resolveGradientStops();
    if (gradStops) {
      this.#gradient.innerHTML = "";
      gradStops.forEach((col, idx) => {
        const offset = gradStops.length > 1 ? `${(idx / (gradStops.length - 1)) * 100}%` : "0%";
        this.#gradient?.append(createSvgElement("stop", { offset, "stop-color": col }));
      });
      this.#measureRect.style.fill = `url(#${this.#gradId})`;
    } else {
      this.#measureRect.style.fill = "";
    }

    const isInitial = !this.#measureRect.dataset.rendered;
    if (isInitial) {
      this.#measureRect.dataset.rendered = "true";
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
      this.#measureRect.style.transition = "width 0.4s ease-out, y 0.4s ease-out, height 0.4s ease-out";
      this.#measureRect.setAttribute("x", String(geo.measure.x));
      this.#measureRect.setAttribute("y", String(geo.measure.y));
      this.#measureRect.setAttribute("width", String(geo.measure.width));
      this.#measureRect.setAttribute("height", String(geo.measure.height));

      this.#targetMarker.style.transition = "all 0.4s ease-out";
      this.#targetMarker.setAttribute("x1", String(geo.targetMarker.x1));
      this.#targetMarker.setAttribute("y1", String(geo.targetMarker.y1));
      this.#targetMarker.setAttribute("x2", String(geo.targetMarker.x2));
      this.#targetMarker.setAttribute("y2", String(geo.targetMarker.y2));
    }
  }
}
