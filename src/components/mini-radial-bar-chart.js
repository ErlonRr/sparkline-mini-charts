// mini-radial-bar-chart.js — Responsive SVG radial bar/activity ring sparkline Custom Element.

import { createRadialBarLayout, describeArc } from "../core/geometry.js";
import { parseGradient, resolveGradientColors, setGradientStops } from "../core/gradient.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles, entranceDelay } from "../core/svg.js";

/**
 * @typedef {Object} TrackCache
 * @property {SVGGElement} group
 * @property {SVGPathElement} bg
 * @property {SVGPathElement} fg
 * @property {SVGLinearGradientElement} gradient
 */

/**
 * Renders multiple data points as concentric radial activity rings with gradients and hardware-accelerated stroke transitions.
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
    "gradient",
    "interactive",
  ];

  /** Whether the interaction listeners are attached to the current shadow nodes. */
  #listenersAttached = false;

  /** @type {boolean} */
  #initialized = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #timerId = null;

  /** @type {SVGSVGElement | null} */
  #svg = null;
  /** @type {SVGDefsElement | null} */
  #defs = null;
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
   * Overrides the default data parser to support numbers or objects `{value, color}`.
   * @override
   * @param {string | null} raw JSON text of the `data` attribute.
   * @returns {any[]}
   */
  parseData(raw) {
    try {
      const parsed = JSON.parse(raw || "[]");
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

    this.#applyOptions();
    this.#updateChart(data);
  }

  /**
   * Applies the styling attributes on every render, so changing them after the
   * first render takes effect.
   */
  #applyOptions() {
    if (!this.#svg) return;
    if (this.getAttribute("round-caps") === "false") {
      this.#svg.removeAttribute("data-round-caps");
    } else {
      this.#svg.setAttribute("data-round-caps", "");
    }
  }

  /**
   * @param {string} label 
   */
  #createDOM(label) {
    // Static text: per-instance options live on the svg (see #applyOptions), never in the stylesheet.
    const style = document.createElement("style");
    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part~="track-bg"] {
  fill: none;
  stroke: var(--mini-chart-track-bg, var(--mini-chart-track-color, rgba(128, 128, 128, 0.15)));
  stroke-linecap: butt;
}

[part~="track-fg"] {
  fill: none;
  stroke-linecap: butt;
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
}
svg[data-round-caps] [part~="track-bg"],
svg[data-round-caps] [part~="track-fg"] {
  stroke-linecap: round;
}`;

    this.#svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
    this.#defs = createSvgElement("defs");
    this.#container = /** @type {SVGGElement} */ (createSvgElement("g", { part: "tracks" }));
    
    this.#svg.append(this.#defs, this.#container);
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

  /**
   * Attaches the interaction listeners once. They sit on nodes of the element's
   * own shadow tree, so they cannot leak and stay attached when the element is
   * disconnected and reconnected (moved, reordered, teleported).
   */
  #setupInteractionListeners() {
    if (this.#listenersAttached) return;
    this.#listenersAttached = true;
    this.#container?.addEventListener("pointerover", this.#onPointerMove);
    this.#svg?.addEventListener("pointerleave", this.#onPointerLeave);
  }

  /**
   * Resolves the gradient colors of one ring. A JSON list of color lists gives
   * one gradient per ring; a flat list is shared by every ring.
   * @param {number} index Ring index.
   * @param {string} baseColor The ring's own color, the first default stop.
   * @returns {string[] | null} The stop colors, or `null` for a flat stroke.
   */
  #resolveTrackGradient(index, baseColor) {
    const setting = parseGradient(this.getAttribute("gradient"));
    if (setting === false) return null;
    if (setting === true) return [baseColor, getSegmentColor(index + 3)];

    const ring = setting[index];
    if (Array.isArray(ring)) return ring;
    return resolveGradientColors(setting, []);
  }

  /**
   * Strokes a ring with its gradient, or with its flat color when the gradient is off.
   * @param {TrackCache} cache The ring's nodes.
   * @param {number} index Ring index.
   * @param {any} item The ring's data entry: a number or `{ value, color }`.
   */
  #paintTrack(cache, index, item) {
    const itemColor = typeof item === "object" && item.color ? item.color : null;
    const gradStops = this.#resolveTrackGradient(index, itemColor ?? getSegmentColor(index));

    if (gradStops) {
      setGradientStops(cache.gradient, gradStops);
      cache.fg.style.stroke = `url(#${cache.gradient.id})`;
    } else {
      cache.fg.style.stroke = itemColor ?? `var(--mini-chart-color-${index + 1}, ${getSegmentColor(index)})`;
    }
  }

  /**
   * @param {any[]} data 
   */
  #updateChart(data) {
    if (!this.#container || !this.#svg || !this.#defs) return;
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
    // A max that is not positive cannot scale the rings: keep the default (the data maximum).
    const maxAttr = parseFloat(this.getAttribute("max") || "");
    const maxDomain = Number.isFinite(maxAttr) && maxAttr > 0 ? maxAttr : undefined;

    // The sweep lives in (0, 360]: a larger one is a full ring, a non-positive one keeps the default.
    const sweepAttr = parseFloat(this.getAttribute("sweep") || "270");
    const sweepDeg = Number.isFinite(sweepAttr) && sweepAttr > 0 ? Math.min(sweepAttr, 360) : 270;
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
      const index = this.#tracks.length;
      const gradId = `radial-grad-${index}-${Math.random().toString(36).slice(2, 9)}`;
      const gradient = /** @type {SVGLinearGradientElement} */ (createSvgElement("linearGradient", {
        id: gradId,
        x1: "0%",
        y1: "0%",
        x2: "100%",
        y2: "100%",
      }));
      this.#defs.append(gradient);

      const group = /** @type {SVGGElement} */ (createSvgElement("g", { part: "track" }));
      const bg = /** @type {SVGPathElement} */ (createSvgElement("path", { part: "track-bg" }));
      const fg = /** @type {SVGPathElement} */ (createSvgElement("path", {
        part: "track-fg",
        pathLength: "100",
        "stroke-dasharray": "100",
      }));
      
      group.append(bg, fg);
      this.#container.append(group);
      this.#tracks.push({ group, bg, fg, gradient });
    }

    // Rings beyond the new data length are removed, with their gradients, so no stale ring stays drawn.
    for (const surplus of this.#tracks.splice(tracks.length)) {
      surplus.group.remove();
      surplus.gradient.remove();
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
        
        this.#paintTrack(cache, index, data[index]);
      });

      // Step 2: Single batch reflow
      this.#svg.getBoundingClientRect();

      // Step 3: Trigger staggered stroke-dashoffset animation; the whole stagger is capped, however many rings there are.
      tracks.forEach((geo, index) => {
        const cache = this.#tracks[index];
        const progress = Math.max(0, Math.min(1, (geo.endAngle - startAngle) / (sweepRad || 1)));
        const targetOffset = (1 - progress) * 100;

        const delay = entranceDelay(index, tracks.length, 100);
        cache.fg.style.transition = `stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, opacity 0.3s ease ${delay}ms`;
        cache.fg.style.strokeDashoffset = String(targetOffset);
      });

      const maxDuration = 800 + entranceDelay(tracks.length - 1, tracks.length, 100) + 50;
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

        this.#paintTrack(cache, index, data[index]);
      });
    }
  }
}
