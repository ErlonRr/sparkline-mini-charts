// svg.js — Native SVG element construction and shared Shadow DOM presentation.

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const chartStyles = `
  :host {
    color: var(--mini-chart-color, #2563eb);
    display: inline-block;
    aspect-ratio: var(--mini-chart-aspect-ratio, var(--mini-chart-default-aspect-ratio, 10 / 3));
    min-inline-size: 2rem;
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

  [part="bar"],
  [part="segment"] {
    fill: var(--mini-chart-fill, var(--mini-chart-segment-color, currentColor));
  }

  [part="point"] {
    fill: currentColor;
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
