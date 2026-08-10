// mini-gauge-chart.js — Configurable multi-zone SVG gauge Custom Element with a reactive needle.

import { describeArc } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Builds the default 3-band zone config (safe/warn/danger) from the current range,
 * themeable via CSS custom properties. Used when no `zones` attribute is given.
 * @param {number} min
 * @param {number} max
 * @returns {{upTo: number, color: string}[]}
 */
function defaultZones(min, max) {
  const span = max - min || 1;
  return [
    { upTo: min + span * 0.333, color: "var(--mini-chart-bullish-color, #10b981)" },
    { upTo: min + span * 0.666, color: "var(--mini-chart-color-4, #f59e0b)" },
    { upTo: max, color: "var(--mini-chart-bearish-color, #ef4444)" }
  ];
}

/**
 * Renders a value against a minimum and maximum as a speedometer gauge with a needle
 * and an arbitrary number of configurable colored zones.
 *
 * @extends MiniChartElement
 */
export class MiniGaugeChart extends MiniChartElement {
  /** @type {boolean} */
  #initialized = false;

  /** @type {SVGSVGElement | null} */
  #svg = null;

  /** @type {SVGPathElement | null} */
  #needle = null;

  /** @type {SVGGElement | null} */
  #zonesGroup = null;

  /** @type {SVGPathElement[]} */
  #zoneEls = [];

  /** @type {string | null} Cache key (raw zones attr + min + max) to skip no-op rebuilds. */
  #zonesSignature = null;

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Gauge";
  }

  /** @returns {string} Default aspect ratio for half-radial geometry. */
  get chartAspectRatio() {
    return "2 / 1";
  }

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return 50; // half-circle viewBox
  }

  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data);
    const min = data.length > 1 ? data[1] : 0;
    const max = data.length > 2 ? data[2] : 100;

    if (!this.#initialized) {
      this.#createDOM(label, min, max);
      this.#initialized = true;
    } else if (this.#svg) {
      this.#svg.setAttribute("aria-label", label);
      const title = this.#svg.querySelector("title");
      if (title) title.textContent = label;
      this.#syncZones(min, max);
    }

    this.#updateChart(data, min, max);
  }

  /**
   * @param {string} label
   * @param {number} min
   * @param {number} max
   */
  #createDOM(label, min, max) {
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part="track"] {
  fill: none;
  stroke-width: 15;
}
[part="needle"] {
  fill: var(--mini-chart-text, #333);
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: 50px 50px;
}
[part="pivot"] {
  fill: var(--mini-chart-text, #333);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#zonesGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "zones" }));

    // Needle rests at pivot (50,50), pointing straight up toward (50,15).
    // 0deg CSS rotation = up (gauge minimum); +180deg = right (gauge maximum).
    this.#needle = /** @type {SVGPathElement} */ (createSvgElement("path", {
      part: "needle",
      d: "M 48 50 L 52 50 L 50 15 Z"
    }));

    const pivot = createSvgElement("circle", { part: "pivot", cx: "50", cy: "50", r: "4" });

    this.#svg.append(this.#zonesGroup, this.#needle, pivot);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.setAttribute("role", "meter");
    this.#syncZones(min, max);
  }

  /**
   * Rebuilds the colored zone arcs only when the zones config or the value range
   * actually changed, so a plain needle update never touches this DOM.
   *
   * @param {number} min
   * @param {number} max
   */
  #syncZones(min, max) {
    const raw = this.getAttribute("zones");
    const signature = `${raw}|${min}|${max}`;
    if (signature === this.#zonesSignature || !this.#zonesGroup) return;
    this.#zonesSignature = signature;

    const zones = this.#parseZones(raw, min, max);
    this.#zonesGroup.replaceChildren();

    let prevUpTo = min;
    const span = max - min || 1;
    this.#zoneEls = zones.map(zone => {
      const startAngle = Math.PI + Math.PI * ((prevUpTo - min) / span);
      const endAngle = Math.PI + Math.PI * ((zone.upTo - min) / span);
      prevUpTo = zone.upTo;

      return /** @type {SVGPathElement} */ (createSvgElement("path", {
        part: "track",
        stroke: zone.color,
        d: describeArc(50, 50, 40, startAngle, endAngle) || "",
        pathLength: "1",
        "stroke-dasharray": "1",
        "stroke-dashoffset": "1"
      }));
    });

    this.#zonesGroup.append(...this.#zoneEls);
    this.setAttribute("aria-valuemin", String(min));
    this.setAttribute("aria-valuemax", String(max));
    this.#animateZonesIn();
  }

  /**
   * @param {string | null} raw
   * @param {number} min
   * @param {number} max
   * @returns {{upTo: number, color: string}[]}
   */
  #parseZones(raw, min, max) {
    if (!raw) return defaultZones(min, max);
    try {
      const parsed = JSON.parse(raw);
      const zones = Array.isArray(parsed)
        ? parsed
            .filter(/** @type {(z: any) => z is {upTo: number, color: string}} */ (z => z && typeof z.color === "string" && z.color.length > 0 && Number.isFinite(z.upTo)))
            .sort((a, b) => a.upTo - b.upTo)
        : [];
      if (zones.length === 0) return defaultZones(min, max);
      zones[zones.length - 1] = { ...zones[zones.length - 1], upTo: max }; // full coverage to max
      return zones;
    } catch {
      return defaultZones(min, max);
    }
  }

  /** Draws each zone arc in with a per-zone stagger, batching the forced reflow once. */
  #animateZonesIn() {
    this.#zoneEls.forEach(el => {
      el.style.transition = "none";
    });
    this.#svg?.getBoundingClientRect(); // single reflow for the whole batch
    this.#zoneEls.forEach((el, i) => {
      el.style.transition = `stroke-dashoffset 0.6s ease-out ${i * 80}ms`;
      el.style.strokeDashoffset = "0";
    });
  }

  /**
   * @param {number[]} data Parsed chart values: [value, min, max]
   * @param {number} min
   * @param {number} max
   */
  #updateChart(data, min, max) {
    if (!this.#needle) return;

    if (data.length === 0) {
      this.#needle.style.opacity = "0";
      this.removeAttribute("aria-valuenow");
      return;
    }
    this.#needle.style.opacity = "1";

    const value = data[0];
    const range = max - min || 1;
    let progress = (value - min) / range;
    progress = Math.max(0, Math.min(1, progress));

    // -90deg = gauge minimum (left), 0deg = midpoint (up), 90deg = gauge maximum (right)
    const angle = -90 + (progress * 180);
    this.setAttribute("aria-valuenow", String(value));

    const isInitial = !this.#needle.style.transform;

    if (isInitial) {
      this.#needle.style.transition = "none";
      this.#needle.style.transform = "rotate(-90deg)"; // Start at minimum
      this.#needle.getBoundingClientRect(); // force reflow

      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!this.#needle) return;
            this.#needle.style.transition = ""; // Restore CSS transition
            this.#needle.style.transform = `rotate(${angle}deg)`;
          });
        });
      }
    } else {
      this.#needle.style.transform = `rotate(${angle}deg)`;
    }
  }
}