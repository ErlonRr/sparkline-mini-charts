// mini-chart-element.js — Shared Custom Element lifecycle and declarative data handling.

import { parseNumericData } from "./data.js";
import { chartStyles, createChartSvg } from "./svg.js";

const HTMLElementBase = /** @type {typeof HTMLElement} */ (globalThis.HTMLElement ?? class {});

/**
 * Base class for static, responsive SVG chart elements.
 *
 * @abstract
 */
export class MiniChartElement extends HTMLElementBase {
  static observedAttributes = ["data", "label"];

  #renderQueued = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  /** @returns {number} SVG viewBox width. */
  get chartWidth() {
    return 100;
  }

  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return 30;
  }

  /** @returns {string} Preferred responsive CSS aspect ratio. */
  get chartAspectRatio() {
    return `${this.chartWidth} / ${this.chartHeight}`;
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "chart";
  }

  /** @returns {any[]} Parsed values supplied through the `data` attribute. */
  get data() {
    return parseNumericData(this.getAttribute("data"));
  }

  /** @param {any[]} values Values to serialize to the declarative `data` attribute. */
  set data(values) {
    this.setAttribute("data", JSON.stringify(values));
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.requestRender();
  }

  /** Schedules a single rerender for a batch of synchronous attribute changes. */
  requestRender() {
    if (!this.isConnected || this.#renderQueued) return;

    this.#renderQueued = true;
    queueMicrotask(() => {
      this.#renderQueued = false;
      if (this.isConnected) this.render();
    });
  }

  /** Renders the element's complete Shadow DOM tree. */
  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data);
    const style = document.createElement("style");
    const svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });

    style.textContent = `${chartStyles}\n:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }`;
    this.renderChart(svg, data);
    this.shadowRoot?.replaceChildren(style, svg);
  }

  /**
   * Produces the default accessible name for a chart instance.
   *
   * @param {any[]} data Parsed chart values.
   * @returns {string} Accessible chart label.
   */
  createDefaultLabel(data) {
    return data.length === 0 ? `Empty ${this.chartName} chart` : `${this.chartName} chart with ${data.length} values`;
  }

  /**
   * Appends chart-specific SVG nodes to the supplied root.
   *
   * @abstract
   * @param {SVGSVGElement} _svg Responsive SVG root.
   * @param {any[]} _data Parsed chart values.
   * @returns {void}
   */
  renderChart(_svg, _data) {
    throw new Error("MiniChartElement subclasses must implement renderChart().");
  }
}
