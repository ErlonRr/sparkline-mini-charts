// mini-radial-bar-chart.js — Responsive SVG radial bar/activity ring sparkline Custom Element.

import { createRadialBarLayout, describeArc } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * @typedef {Object} TrackCache
 * @property {SVGGElement} group
 * @property {SVGPathElement} bg
 * @property {SVGPathElement} fg
 */

/**
 * Renders multiple data points as concentric radial activity rings with hardware-accelerated stroke transitions.
 *
 * @extends MiniChartElement
 */
export class MiniRadialBarChart extends MiniChartElement {
  static observedAttributes = [
    "data",
    "label",
    "sweep",
    "round-caps",
    "min",
    "max",
    "interactive",
  ];

  /** @type {boolean} */
  #initialized = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGGElement | null} */
  #container = null;

  /** @type {TrackCache[]} */
  #tracks = [];

  /** @type {any[]} */
  #currentData = [];

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return 100;
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Radial-bar";
  }

  /**
   * Cleans up pending timers and interaction listeners on disconnection.
   * @override
   */
  cleanup() {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    this.#detachInteractionListeners();
  }

  /**
   * Overrides data getter to support numbers or objects `{value, color}`.
   * @returns {any[]}
   */
  get data() {
    try {
      const parsed = JSON.parse(this.getAttribute("data") || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => {
        if (typeof item === "number" && Number.isFinite(item)) return true;
        if (item && typeof item === "object" && Number.isFinite(item.value)) return true;
        return false;
      });
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

    this.#updateChart(data);
  }

  /**
   * @param {string} label 
   */
  #createDOM(label) {
    const roundCaps = this.getAttribute("round-caps") !== "false";

    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part~="track-bg"] {
  fill: none;
  stroke: var(--mini-chart-track-bg, var(--mini-chart-track-color, rgba(128, 128, 128, 0.15)));
  stroke-linecap: ${roundCaps ? "round" : "butt"};
}

[part~="track-fg"] {
  fill: none;
  stroke-linecap: ${roundCaps ? "round" : "butt"};
  transition: stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, filter 0.2s ease;
  cursor: default;
}
:host([interactive]) [part~="track-fg"] {
  cursor: pointer;
}
:host([interactive]) [part~="track-fg"]:hover {
  filter: brightness(1.18);
  opacity: 1 !important;
}
:host([interactive]) [part="tracks"]:has([part~="track-fg"]:hover) [part~="track-fg"]:not(:hover) {
  opacity: 0.45;
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "tracks" }));
    
    this.#svg.append(this.#container);
    this.shadowRoot?.replaceChildren(style, this.#svg);

    this.#setupInteractionListeners();
  }

  #onPointerMove = (/** @type {PointerEvent} */ e) => {
    if (!this.hasAttribute("interactive")) return;
    const target = /** @type {SVGPathElement | null} */ (e.target);
    if (!target || !target.hasAttribute("data-track-index")) return;

    const trackIndex = parseInt(target.getAttribute("data-track-index") || "0", 10);
    const item = this.#currentData[trackIndex];
    const value = typeof item === "number" ? item : item?.value || 0;
    const color = (typeof item === "object" && item?.color) || getSegmentColor(trackIndex);

    this.dispatchEvent(new CustomEvent("sparkline-hover", {
      bubbles: true,
      composed: true,
      detail: { trackIndex, value, color, element: target },
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
    this.#container?.addEventListener("pointerover", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  #detachInteractionListeners() {
    this.#container?.removeEventListener("pointerover", this.#onPointerMove);
    this.#svg?.removeEventListener("pointerleave", this.#onPointerLeave);
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

    this.#currentData = data;

    if (data.length === 0) {
      for (const track of this.#tracks) {
        track.group.style.display = "none";
      }
      return;
    }

    const rawValues = data.map((d) => (typeof d === "number" ? d : d.value));
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    const maxDomain = !isNaN(maxAttr) ? maxAttr : undefined;

    const sweepAttr = parseFloat(this.getAttribute("sweep") || "270");
    const sweepDeg = !isNaN(sweepAttr) ? sweepAttr : 270;
    const sweepRad = (sweepDeg * Math.PI) / 180;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + sweepRad;

    const { tracks } = createRadialBarLayout(rawValues, {
      maxDomain,
      startAngle,
      endAngle,
      maxRadius: 44,
      innerRadius: rawValues.length > 1 ? 16 : 44,
    });

    const isInitial = this.#tracks.length === 0;
    const trackWidth = Math.max(2, Math.min(10, 36 / (tracks.length || 1)));

    while (this.#tracks.length < tracks.length) {
      const group = /** @type {SVGGElement} */ (createSvgElement("g", { part: "track" }));
      const bg = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "track-bg" }));
      const fg = /** @type {SVGPathElement} */ (createSvgElement("path", {
        part: "track-fg",
        pathLength: "100",
        "stroke-dasharray": "100",
      }));
      
      group.append(bg, fg);
      this.#container.append(group);
      this.#tracks.push({ group, bg, fg });
    }

    if (isInitial) {
      // Step 1: Set initial track arcs with stroke-dashoffset = 100 (empty)
      tracks.forEach((geo, index) => {
        const cache = this.#tracks[index];
        cache.group.style.display = "";
        cache.group.setAttribute("data-index", String(index));
        cache.fg.setAttribute("data-track-index", String(index));

        const fullArcPath = describeArc(50, 50, geo.radius, startAngle, endAngle);
        cache.bg.setAttribute("d", fullArcPath);
        cache.bg.style.strokeWidth = `${trackWidth}px`;

        cache.fg.setAttribute("d", fullArcPath);
        cache.fg.style.strokeWidth = `${trackWidth}px`;
        cache.fg.style.transition = "none";
        cache.fg.style.strokeDashoffset = "100";
        cache.fg.style.opacity = geo.value > 0 ? "1" : "0";
        const item = data[index];
        const color = (typeof item === "object" && item.color) || `var(--mini-chart-color-${index + 1}, ${getSegmentColor(index)})`;
        cache.fg.style.stroke = color;
      });

      // Step 2: Single batch reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Trigger staggered stroke-dashoffset animation
      tracks.forEach((geo, index) => {
        const cache = this.#tracks[index];
        const progress = Math.max(0, Math.min(1, (geo.endAngle - startAngle) / (sweepRad || 1)));
        const targetOffset = (1 - progress) * 100;

        const delay = index * 0.1;
        cache.fg.style.transition = `stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, opacity 0.3s ease ${delay}s`;
        cache.fg.style.strokeDashoffset = String(targetOffset);
      });

      const maxDuration = 800 + tracks.length * 100 + 50;
      this.#timerId = setTimeout(() => {
        if (this.isConnected) {
          this.#tracks.forEach((t) => {
            if (t.fg.isConnected) t.fg.style.transition = "";
          });
        }
        this.#timerId = null;
      }, maxDuration);
    } else {
      // Step 4: Normal reactive update
      tracks.forEach((geo, index) => {
        const cache = this.#tracks[index];
        cache.group.style.display = "";
        cache.group.setAttribute("data-index", String(index));
        cache.fg.setAttribute("data-track-index", String(index));
        
        const fullArcPath = describeArc(50, 50, geo.radius, startAngle, endAngle);
        cache.bg.setAttribute("d", fullArcPath);
        cache.bg.style.strokeWidth = `${trackWidth}px`;

        cache.fg.setAttribute("d", fullArcPath);
        cache.fg.style.strokeWidth = `${trackWidth}px`;
        
        const progress = Math.max(0, Math.min(1, (geo.endAngle - startAngle) / (sweepRad || 1)));
        const targetOffset = (1 - progress) * 100;

        cache.fg.style.transition = "stroke-dashoffset 0.4s ease-out, opacity 0.3s ease";
        cache.fg.style.strokeDashoffset = String(targetOffset);
        cache.fg.style.opacity = geo.value > 0 ? "1" : "0";

        const item = data[index];
        const color = (typeof item === "object" && item.color) || `var(--mini-chart-color-${index + 1}, ${getSegmentColor(index)})`;
        cache.fg.style.stroke = color;
      });
    }

  }
}
