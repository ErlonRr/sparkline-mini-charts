// mini-gauge-chart.js — Responsive SVG gauge sparkline Custom Element.

import { describeArc } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} ZoneConfig
 * @property {number} upTo
 * @property {string} color
 */

/**
 * Builds the default 3-band zone config (safe/warn/danger) from the current range.
 * @param {number} min
 * @param {number} max
 * @returns {ZoneConfig[]}
 */
function defaultZones(min, max) {
  const span = max - min || 1;
  return [
    { upTo: min + span * 0.333, color: "var(--mini-chart-safe-color, var(--mini-chart-bullish-color, #10b981))" },
    { upTo: min + span * 0.666, color: "var(--mini-chart-warn-color, var(--mini-chart-warning-color, #f59e0b))" },
    { upTo: max, color: "var(--mini-chart-danger-color, var(--mini-chart-bearish-color, #ef4444))" },
  ];
}


/**
 * Renders a meter gauge with colored threshold zones and an animated rotating needle.
 *
 * @extends MiniChartElement
 */
export class MiniGaugeChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "min",
    "max",
    "zones",
    "needle-type",
    "show-value",
  ];

  /** @type {boolean} */
  #initialized = false;

  /** @type {number | null} */
  #rafId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #zonesGroup = null;
  /** @type {SVGPathElement | null} */
  #needle = null;
  /** @type {SVGTextElement | null} */
  #valueText = null;

  /** @type {string} */
  #zonesSignature = "";

  /** @type {number} */
  #currentZoneIndex = -1;

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
    return "Gauge";
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
  stroke-width: var(--mini-chart-stroke-width, 14);
}
[part="needle"] {
  fill: var(--mini-chart-needle-color, var(--mini-chart-color, #2563eb));
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: 50px 50px;
}
[part="pivot"] {
  fill: var(--mini-chart-needle-color, var(--mini-chart-color, #2563eb));
}
[part="text"] {
  fill: var(--mini-chart-text-color, currentColor);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  text-anchor: middle;
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#svg.setAttribute("role", "meter");

    this.#zonesGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "zones" }));

    // Needle rests at pivot (50, 50), pointing straight UP toward (50, 15).
    // CSS rotation: -90deg = left (gauge min), 0deg = top (midpoint), +90deg = right (gauge max)
    const needleType = this.getAttribute("needle-type") || "triangle";
    if (needleType === "line") {
      this.#needle = /** @type {SVGPathElement} */ (createSvgElement("path", {
        part: "needle",
        d: "M 49 50 L 51 50 L 50 15 Z",
      }));
    } else {
      this.#needle = /** @type {SVGPathElement} */ (createSvgElement("path", {
        part: "needle",
        d: "M 47 50 L 53 50 L 50 15 Z",
      }));
    }

    const pivot = createSvgElement("circle", {
      part: "pivot",
      cx: "50",
      cy: "50",
      r: "4",
    });

    this.#valueText = /** @type {SVGTextElement} */ (createSvgElement("text", {
      part: "text",
      x: "50",
      y: "48",
    }));
    this.#valueText.style.display = "none";

    this.#svg.append(this.#zonesGroup, this.#needle, pivot, this.#valueText);
    this.shadowRoot?.replaceChildren(style, this.#svg);
  }

  /**
   * @param {number} min 
   * @param {number} max 
   * @returns {ZoneConfig[]}
   */
  #resolveZones(min, max) {
    const raw = this.getAttribute("zones");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((z) => z && typeof z.color === "string" && Number.isFinite(z.upTo))
            .sort((a, b) => a.upTo - b.upTo);
        }
      } catch {}
    }
    return defaultZones(min, max);
  }

  /**
   * @param {number[]} data 
   */
  #updateChart(data) {
    if (!this.#needle || !this.#zonesGroup || !this.#svg || !this.#valueText) return;
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }

    if (data.length === 0) {
      this.#needle.style.opacity = "0";
      this.removeAttribute("aria-valuenow");
      return;
    }
    this.#needle.style.opacity = "1";

    const minAttr = parseFloat(this.getAttribute("min") || "");
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    
    let value = data[0];
    let min = !isNaN(minAttr) ? minAttr : (data.length > 1 ? data[1] : 0);
    let max = !isNaN(maxAttr) ? maxAttr : (data.length > 2 ? data[2] : 100);

    if (min >= max) max = min + 1;
    const clampedVal = Math.max(min, Math.min(max, value));
    const range = max - min || 1;
    const progress = (clampedVal - min) / range;

    // -90deg = gauge min (left), 0deg = mid (up), +90deg = gauge max (right)
    const angleDeg = -90 + progress * 180;

    this.#svg.setAttribute("aria-valuenow", String(clampedVal));
    this.#svg.setAttribute("aria-valuemin", String(min));
    this.#svg.setAttribute("aria-valuemax", String(max));

    if (this.hasAttribute("show-value")) {
      this.#valueText.textContent = String(Math.round(clampedVal));
      this.#valueText.style.display = "";
    } else {
      this.#valueText.style.display = "none";
    }

    // Build zones
    const zones = this.#resolveZones(min, max);
    const signature = `${min}|${max}|${JSON.stringify(zones)}`;

    if (signature !== this.#zonesSignature) {
      this.#zonesSignature = signature;
      this.#zonesGroup.innerHTML = "";

      let prevUpTo = min;
      zones.forEach((zone) => {
        const startAngle = Math.PI + Math.PI * ((prevUpTo - min) / range);
        const endAngle = Math.PI + Math.PI * ((zone.upTo - min) / range);
        prevUpTo = zone.upTo;

        const arcPath = describeArc(50, 50, 40, startAngle, endAngle);
        if (arcPath) {
          const zoneEl = createSvgElement("path", {
            part: "track",
            stroke: zone.color,
            d: arcPath,
          });
          this.#zonesGroup?.append(zoneEl);
        }
      });
    }


    // Identify active zone
    let activeZoneIdx = zones.findIndex((z) => clampedVal <= z.upTo);
    if (activeZoneIdx === -1) activeZoneIdx = zones.length - 1;

    if (activeZoneIdx !== this.#currentZoneIndex && this.#currentZoneIndex !== -1) {
      this.dispatchEvent(new CustomEvent("zone-change", {
        bubbles: true,
        composed: true,
        detail: {
          value: clampedVal,
          zoneIndex: activeZoneIdx,
          zoneColor: zones[activeZoneIdx]?.color,
        },
      }));
    }
    this.#currentZoneIndex = activeZoneIdx;

    const isInitial = !this.#needle.dataset.rendered;
    if (isInitial) {
      this.#needle.dataset.rendered = "true";
      this.#needle.style.transition = "none";
      this.#needle.style.transform = "rotate(-90deg)"; // Start at minimum

      if (typeof requestAnimationFrame !== "undefined") {
        this.#rafId = requestAnimationFrame(() => {
          this.#rafId = requestAnimationFrame(() => {
            if (!this.#needle) return;
            this.#needle.style.transition = "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
            this.#needle.style.transform = `rotate(${angleDeg}deg)`;
          });
        });
      } else {
        this.#needle.style.transform = `rotate(${angleDeg}deg)`;
      }
    } else {
      this.#needle.style.transition = "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
      this.#needle.style.transform = `rotate(${angleDeg}deg)`;
    }
  }
}