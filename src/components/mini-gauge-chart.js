// mini-gauge-chart.js — Responsive SVG gauge sparkline Custom Element.

import { parsePositionalData } from "../core/data.js";
import { describeArc } from "../core/geometry.js";
import { parseGradient, resolveGradientColors, setGradientStops } from "../core/gradient.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} ZoneConfig
 * @property {number} upTo
 * @property {string} color
 */

/** Default 6-stop smooth gradient from safe (green) to warning (amber) to danger (red). */
const DEFAULT_GRADIENT = Object.freeze(["#10b981", "#84cc16", "#eab308", "#f59e0b", "#f97316", "#ef4444"]);

/** Needle outlines by `needle-type`, pointing up from the pivot at (50, 50). */
const NEEDLE_PATHS = Object.freeze({
  triangle: "M 47 50 L 53 50 L 50 15 Z",
  line: "M 49 50 L 51 50 L 50 15 Z",
});

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
 * Reads a zone bound: a finite number, or a numeric string such as `"50"`.
 * @param {unknown} value Raw `upTo` from the `zones` attribute.
 * @returns {number | null} The number, or `null` when the value is not numeric.
 */
function toFiniteNumber(value) {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

/**
 * Renders a meter gauge with colored threshold zones or multi-stop gradients and an animated rotating needle.
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
    "gradient",
    "interactive",
  ];

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** Whether the needle has played its entrance sweep. */
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
  #zonesGroup = null;
  /** @type {SVGPathElement | null} */
  #needle = null;
  /** @type {SVGTextElement | null} */
  #valueText = null;

  /** @type {string} */
  #zonesSignature = "";

  /** @type {number} */
  #currentZoneIndex = -1;
  /**
   * The value (as given, before clamping) the active zone was last computed
   * for, or `null` before the first reading. `zone-change` fires only when the
   * value itself moves: a new `min` or `max` that changes the clamped value does not count.
   * @type {number | null}
   */
  #zoneValue = null;
  /** @type {number} */
  #currentValue = 0;
  /** @type {ZoneConfig[]} */
  #currentZones = [];

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
   * Overrides the default data parser: `[value, min, max]` is positional, so an
   * invalid entry becomes `null` in its slot instead of shifting the others.
   * @override
   * @param {string | null} raw JSON text of the `data` attribute.
   * @returns {(number | null)[]}
   */
  parseData(raw) {
    return parsePositionalData(raw);
  }

  /**
   * A null value is no reading, so the chart is labelled empty, as it was
   * before null entries kept their slot.
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
}
:host([interactive]) [part="track"],
:host([interactive]) [part="needle"] {
  cursor: pointer;
}
:host([interactive]) [part="track"]:hover {
  filter: brightness(1.15);
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#svg.setAttribute("role", "meter");

    this.#defs = createSvgElement("defs");
    this.#gradId = `gauge-grad-${Math.random().toString(36).slice(2, 9)}`;
    this.#gradient = /** @type {SVGLinearGradientElement} */ (createSvgElement("linearGradient", {
      id: this.#gradId,
      x1: "0%",
      y1: "0%",
      x2: "100%",
      y2: "0%",
    }));
    this.#defs.append(this.#gradient);

    this.#zonesGroup = /** @type {SVGGElement} */ (createSvgElement("g", { part: "zones" }));

    // Needle rests at pivot (50, 50), pointing straight UP toward (50, 15).
    // CSS rotation: -90deg = left (gauge min), 0deg = top (midpoint), +90deg = right (gauge max)
    // Its shape follows `needle-type` on every render (see #updateChart).
    this.#needle = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "needle" }));

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

    this.#svg.append(this.#defs, this.#zonesGroup, this.#needle, pivot, this.#valueText);
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
        zoneIndex: this.#currentZoneIndex,
        zoneColor: this.#currentZones[this.#currentZoneIndex]?.color,
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
   * @param {number} min 
   * @param {number} max 
   * @returns {ZoneConfig[]}
   */
  #resolveZones(min, max) {
    const raw = this.getAttribute("zones");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          /** @type {ZoneConfig[]} */
          const zones = [];
          for (const zone of parsed) {
            if (!zone || typeof zone.color !== "string") continue;
            const upTo = toFiniteNumber(zone.upTo);
            if (upTo === null) continue;
            // A zone past either end of the dial is cut at that end, never drawn around the pivot.
            zones.push({ ...zone, upTo: Math.max(min, Math.min(max, upTo)) });
          }
          // With no valid zone left, the dial keeps its default bands instead of rendering empty.
          if (zones.length > 0) return zones.sort((a, b) => a.upTo - b.upTo);
        }
      } catch {}
    }
    return defaultZones(min, max);
  }

  /**
   * Draws the dial: one continuous gradient track, or one track segment per
   * zone. Nothing is rebuilt while the range, zones and gradient are unchanged.
   * @param {number} min Lower bound of the gauge.
   * @param {number} max Upper bound of the gauge.
   * @param {ZoneConfig[]} zones Resolved zones, sorted by `upTo`.
   */
  #drawDial(min, max, zones) {
    if (!this.#zonesGroup || !this.#gradient) return;

    const gradientStops = resolveGradientColors(parseGradient(this.getAttribute("gradient")), DEFAULT_GRADIENT);
    const signature = `${min}|${max}|${JSON.stringify(zones)}|${JSON.stringify(gradientStops)}`;
    if (signature === this.#zonesSignature) return;
    this.#zonesSignature = signature;

    const range = max - min || 1;
    /** @type {SVGPathElement[]} */
    const tracks = [];

    if (gradientStops) {
      // Continuous smooth gradient mode
      setGradientStops(this.#gradient, gradientStops);
      const fullArc = describeArc(50, 50, 40, Math.PI, 2 * Math.PI);
      if (fullArc) {
        tracks.push(createSvgElement("path", {
          part: "track",
          stroke: `url(#${this.#gradId})`,
          d: fullArc,
        }));
      }
    } else {
      // Segmented discrete zones mode
      let prevUpTo = min;
      zones.forEach((zone) => {
        const startAngle = Math.PI + Math.PI * ((prevUpTo - min) / range);
        const endAngle = Math.PI + Math.PI * ((zone.upTo - min) / range);
        prevUpTo = zone.upTo;

        const arcPath = describeArc(50, 50, 40, startAngle, endAngle);
        if (arcPath) {
          tracks.push(createSvgElement("path", {
            part: "track",
            stroke: zone.color,
            d: arcPath,
          }));
        }
      });
    }

    this.#zonesGroup.replaceChildren(...tracks);
  }

  /**
   * @param {(number | null)[]} data 
   */
  #updateChart(data) {
    if (!this.#needle || !this.#zonesGroup || !this.#svg || !this.#valueText || !this.#gradient) return;
    if (this.#rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }

    this.#needle.setAttribute("d", NEEDLE_PATHS[this.getAttribute("needle-type") === "line" ? "line" : "triangle"]);

    const minAttr = parseFloat(this.getAttribute("min") || "");
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    
    // A null min or max falls back to the attribute or the default, never to the next value.
    let min = !isNaN(minAttr) ? minAttr : (data[1] ?? 0);
    let max = !isNaN(maxAttr) ? maxAttr : (data[2] ?? 100);

    if (min >= max) max = min + 1;
    const range = max - min || 1;

    // The dial is drawn even without a reading, so an empty gauge still shows its track.
    const zones = this.#resolveZones(min, max);
    this.#currentZones = zones;
    this.#drawDial(min, max, zones);

    // No reading (empty data, or a null value): hide the needle and the value text, and
    // clear the value on the svg, which is the element that carries role="meter".
    const value = data[0] ?? null;
    if (value === null) {
      this.#needle.style.opacity = "0";
      this.#valueText.style.display = "none";
      this.#valueText.textContent = "";
      this.#svg.removeAttribute("aria-valuenow");
      if (data.length === 0) {
        this.#svg.removeAttribute("aria-valuemin");
        this.#svg.removeAttribute("aria-valuemax");
      } else {
        this.#svg.setAttribute("aria-valuemin", String(min));
        this.#svg.setAttribute("aria-valuemax", String(max));
      }
      return;
    }
    this.#svg.setAttribute("aria-valuemin", String(min));
    this.#svg.setAttribute("aria-valuemax", String(max));
    this.#needle.style.opacity = "1";

    const clampedVal = Math.max(min, Math.min(max, value));
    const progress = (clampedVal - min) / range;

    this.#currentValue = clampedVal;

    // -90deg = gauge min (left), 0deg = mid (up), +90deg = gauge max (right)
    const angleDeg = -90 + progress * 180;

    this.#svg.setAttribute("aria-valuenow", String(clampedVal));

    if (this.hasAttribute("show-value")) {
      this.#valueText.textContent = String(Math.round(clampedVal));
      this.#valueText.style.display = "";
    } else {
      this.#valueText.style.display = "none";
    }

    // Identify active zone
    let activeZoneIdx = zones.findIndex((z) => clampedVal <= z.upTo);
    if (activeZoneIdx === -1) activeZoneIdx = zones.length - 1;

    // Only a value moving into another zone is a transition. The first reading and
    // re-renders that leave the value in place (label, gradient, zones, range) stay silent.
    const valueMoved = this.#zoneValue !== null && value !== this.#zoneValue;
    this.#zoneValue = value;

    if (valueMoved && activeZoneIdx !== this.#currentZoneIndex) {
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

    const isInitial = !this.#entered;
    if (isInitial) {
      this.#entered = true;
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