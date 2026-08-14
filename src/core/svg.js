// svg.js — Native SVG element construction and shared Shadow DOM presentation.

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const chartStyles = `
  :host {
    color: var(--mini-chart-color, #2563eb);
    display: inline-block;
    aspect-ratio: var(--mini-chart-aspect-ratio, var(--mini-chart-default-aspect-ratio, 10 / 3));
    min-inline-size: 2rem;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
  }

  svg {
    block-size: 100%;
    display: block;
    inline-size: 100%;
    overflow: visible;
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
    stroke: var(--mini-chart-ref-color, rgba(128, 128, 128, 0.45));
    stroke-width: var(--mini-chart-ref-width, 1);
    stroke-dasharray: 3 2;
  }

  [part="crosshair"] {
    stroke: var(--mini-chart-crosshair-color, rgba(128, 128, 128, 0.5));
    stroke-width: var(--mini-chart-crosshair-width, 1);
    stroke-dasharray: 2 2;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      stroke-dashoffset: 0 !important;
    }
  }
`;

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

