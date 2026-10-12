// svg.js — Native SVG element construction and shared Shadow DOM presentation.

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const chartStyles = `
  :host {
    /* Private defaults: one accent, semantic colors and neutrals, overridden by the public tokens. */
    --_mc-accent: #2563eb;
    --_mc-positive: var(--mini-chart-bullish-color, #10b981);
    --_mc-negative: var(--mini-chart-bearish-color, #ef4444);
    --_mc-neutral: var(--mini-chart-muted-color, #94a3b8);
    --_mc-track: rgba(100, 116, 139, 0.18);
    --_mc-grid: rgba(100, 116, 139, 0.5);
    --_mc-surface: var(--mini-chart-surface, #ffffff);
    --_mc-dim: var(--mini-chart-dim-opacity, 0.45);
    --_mc-tooltip-bg: #0f172a;
    --_mc-tooltip-color: #f8fafc;
    --_mc-px: initial;
    color: var(--mini-chart-color, var(--_mc-accent));
    display: inline-block;
    aspect-ratio: var(--mini-chart-aspect-ratio, var(--mini-chart-default-aspect-ratio, 10 / 3));
    min-inline-size: 2rem;
    min-block-size: 0.5rem;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
  }

  /* Built-in dark mode: the defaults follow the page's color-scheme. */
  @supports (color: light-dark(#000, #fff)) {
    :host {
      --_mc-accent: light-dark(#2563eb, #60a5fa);
      --_mc-positive: var(--mini-chart-bullish-color, light-dark(#10b981, #34d399));
      --_mc-negative: var(--mini-chart-bearish-color, light-dark(#ef4444, #f87171));
      --_mc-neutral: var(--mini-chart-muted-color, light-dark(#94a3b8, #64748b));
      --_mc-track: light-dark(rgba(100, 116, 139, 0.18), rgba(148, 163, 184, 0.24));
      --_mc-grid: light-dark(rgba(100, 116, 139, 0.5), rgba(148, 163, 184, 0.55));
      --_mc-surface: var(--mini-chart-surface, light-dark(#ffffff, #0f172a));
      --_mc-tooltip-bg: light-dark(#0f172a, #f8fafc);
      --_mc-tooltip-color: light-dark(#f8fafc, #0f172a);
    }
  }

  :host([hidden]) {
    display: none;
  }

  svg {
    block-size: 100%;
    display: block;
    inline-size: 100%;
    overflow: visible;
  }

  svg:focus {
    outline: none;
  }

  svg:focus-visible {
    border-radius: 2px;
    outline: 2px solid var(--mini-chart-focus-ring, var(--mini-chart-color, var(--_mc-accent)));
    outline-offset: 2px;
  }

  [part="line"] {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: var(--mini-chart-stroke-width, 2);
    vector-effect: non-scaling-stroke;
  }

  [part~="bar"],
  [part~="segment"] {
    fill: var(--mini-chart-fill, var(--mini-chart-segment-color, currentColor));
  }

  [part~="point"] {
    fill: var(--mini-chart-point-fill, currentColor);
  }


  [part="reference-line"] {
    stroke: var(--mini-chart-ref-color, var(--_mc-grid));
    stroke-width: var(--mini-chart-ref-width, 1);
    stroke-dasharray: 3 2;
    vector-effect: non-scaling-stroke;
  }

  [part="crosshair"] {
    stroke: var(--mini-chart-crosshair-color, var(--_mc-grid));
    stroke-width: var(--mini-chart-crosshair-width, 1);
    stroke-dasharray: 2 2;
    pointer-events: none;
    vector-effect: non-scaling-stroke;
  }

  /* Keyboard navigation: the active mark stands out, the others dim like on hover. */
  svg[data-interactive] [data-active] {
    filter: brightness(1.15);
    opacity: 1 !important;
  }

  svg[data-interactive]:has([data-active]) :is([data-index], [data-track-index], [data-layer-index]):not([data-active], :has([data-active])) {
    opacity: var(--_mc-dim);
  }

  [part="tooltip"] {
    background: var(--mini-chart-tooltip-bg, var(--_mc-tooltip-bg));
    border-radius: 4px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    color: var(--mini-chart-tooltip-color, var(--_mc-tooltip-color));
    font: 600 12px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif;
    font-variant-numeric: tabular-nums;
    left: 0;
    opacity: 0;
    padding: 2px 6px;
    pointer-events: none;
    /* Fixed: a card with overflow: hidden around the chart does not clip it (see #showTooltip). */
    position: fixed;
    top: 0;
    transition: opacity 0.12s ease;
    visibility: hidden;
    white-space: nowrap;
    z-index: 10;
  }

  [part="tooltip"][data-visible] {
    opacity: 1;
    visibility: visible;
  }

  /* Timing only: never override geometry (stroke-dashoffset, d, width, height, r), which encodes the data. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-delay: 0s !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-delay: 0s !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

/**
 * Trend colors for `trend-color="auto"`. The chart marks its own svg with
 * `data-trend` and never writes the host's style, which belongs to the page.
 */
export const trendStyles = `
  svg[data-trend="up"] {
    --mini-chart-color: var(--_mc-positive);
    color: var(--mini-chart-color);
  }

  svg[data-trend="down"] {
    --mini-chart-color: var(--_mc-negative);
    color: var(--mini-chart-color);
  }
`;

/**
 * Sets `data-trend="up|down"` on a chart's svg when `trend-color="auto"` and
 * there are at least two values, and removes it otherwise.
 *
 * @param {SVGSVGElement} svg The chart's root svg.
 * @param {readonly number[]} values Chart values in order.
 * @param {string | null} trendColor Value of the `trend-color` attribute.
 */
export function setTrend(svg, values, trendColor) {
  if (trendColor === "auto" && values.length >= 2) {
    svg.setAttribute("data-trend", values[values.length - 1] >= values[0] ? "up" : "down");
  } else {
    svg.removeAttribute("data-trend");
  }
}

/**
 * Writes a per-instance length attribute to a private `--_mc-*` custom
 * property on an internal node, where the static stylesheet reads it as
 * `var(--_mc-x, var(--mini-chart-x, default))`. The value is parsed to a
 * finite, non-negative number first, so attribute text never reaches CSS.
 * An absent or invalid attribute removes the property, and the stylesheet
 * falls back to the theme token, then to the default. The stylesheet must
 * declare the property `initial` on `:host`, so a page value cannot leak in.
 *
 * @param {SVGElement} node Internal node that carries the property (the chart's svg).
 * @param {`--_mc-${string}`} property Private custom property name.
 * @param {string | null} raw Attribute value, or `null` when it is absent.
 * @param {string} [unit] Unit appended to the number, e.g. `"px"`.
 */
export function setLengthProperty(node, property, raw, unit = "") {
  const value = raw === null || raw.trim() === "" ? Number.NaN : Number.parseFloat(raw);

  if (Number.isFinite(value) && value >= 0) {
    node.style.setProperty(property, `${value}${unit}`);
  } else {
    node.style.removeProperty(property);
  }
}

/**
 * Writes a per-instance color attribute to a private `--_mc-*` custom property
 * on an internal node, like `setLengthProperty()` does for lengths. Only a
 * value that parses as a CSS color is written; anything else removes the
 * property, so the stylesheet falls back to the theme token, then the default.
 *
 * @param {SVGElement} node Internal node that carries the property (the chart's svg).
 * @param {`--_mc-${string}`} property Private custom property name.
 * @param {string | null | undefined} raw Color, or `null`/`undefined` when it is absent.
 */
export function setColorProperty(node, property, raw) {
  const color = typeof raw === "string" ? raw.trim() : "";
  if (color !== "" && isCssColor(color)) {
    node.style.setProperty(property, color);
  } else {
    node.style.removeProperty(property);
  }
}

/**
 * Tells whether a token is a CSS color: the CSS parser decides in a browser;
 * elsewhere it must look like a hex color, a color function or a keyword.
 *
 * @param {string} token Color text.
 * @returns {boolean}
 */
function isCssColor(token) {
  const css = globalThis.CSS;
  if (typeof css?.supports === "function") return css.supports("color", token);
  return /^(?:#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|[a-z]+|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(.*\))$/is.test(token);
}

/**
 * Longest delay, in milliseconds, between the first and the last mark of a
 * staggered entrance. Whatever the number of marks, the entrance takes at most
 * this long plus one transition.
 */
export const ENTRANCE_STAGGER_MS = 300;

/**
 * Entrance delay of one mark. Marks keep their own step while the whole
 * stagger (from the first mark to the last) fits in `ENTRANCE_STAGGER_MS`;
 * past that, the delays are spread as `index / (count - 1) × ENTRANCE_STAGGER_MS`,
 * so 365 bars enter as fast as 10.
 *
 * @param {number} index Mark index.
 * @param {number} count Number of marks that enter together.
 * @param {number} step Preferred delay between two marks, in milliseconds.
 * @returns {number} Delay in whole milliseconds.
 */
export function entranceDelay(index, count, step) {
  if (count <= 0) return 0;
  return Math.round(index * Math.min(step, ENTRANCE_STAGGER_MS / Math.max(count - 1, 1)));
}

/**
 * Converts a pointer position to the x coordinate of the chart's viewBox.
 * The screen CTM includes the `preserveAspectRatio="xMidYMid meet"`
 * letterboxing, so a host whose aspect ratio differs from the viewBox still
 * maps the cursor onto the mark under it. Without a usable CTM (no layout, a
 * singular matrix) the svg's client rect is used instead.
 *
 * @param {SVGSVGElement} svg The chart's root svg.
 * @param {{ clientX: number, clientY: number }} pointer Pointer position in client pixels.
 * @param {number} viewBoxWidth Width of the svg's viewBox.
 * @returns {number | null} The x coordinate in viewBox units, or `null` when the svg has no size.
 */
export function pointerToViewBoxX(svg, { clientX, clientY }, viewBoxWidth) {
  const ctm = typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;

  if (ctm) {
    try {
      // A singular matrix inverts to NaN entries (DOMMatrix), which the finiteness check rejects,
      // or throws (legacy SVGMatrix), which falls through to the rect below.
      const { a, c, e } = ctm.inverse();
      const x = a * clientX + c * clientY + e;
      if (Number.isFinite(x)) return x;
    } catch {
      // Not invertible: use the client rect.
    }
  }

  const rect = svg.getBoundingClientRect();
  if (rect.width === 0) return null;
  return ((clientX - rect.left) / rect.width) * viewBoxWidth;
}

/**
 * Creates an SVG element and assigns string attributes.
 *
 * @template {keyof SVGElementTagNameMap} K
 * @param {K} name SVG tag name.
 * @param {Record<string, string | number>} [attributes] Element attributes.
 * @returns {SVGElementTagNameMap[K]} The created SVG node.
 */
export function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name);

  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, String(value));
  }

  return /** @type {SVGElementTagNameMap[K]} */ (element);
}

/**
 * Creates an accessible responsive SVG with a text alternative.
 *
 * @param {{ width: number, height: number, label: string }} options SVG dimensions and accessible name.
 * @returns {SVGSVGElement} Configured SVG root.
 */
export function createChartSvg({ width, height, label }) {
  const svg = /** @type {SVGSVGElement} */ (
    createSvgElement("svg", {
      part: "svg",
      role: "img",
      viewBox: `0 0 ${width} ${height}`,
      "aria-label": label,
      preserveAspectRatio: "xMidYMid meet",
    })
  );
  const title = createSvgElement("title");
  title.textContent = label;
  svg.append(title);
  return svg;
}

