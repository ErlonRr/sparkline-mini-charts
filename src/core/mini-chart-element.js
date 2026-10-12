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

  /** Whether a render error has already been logged for this element. */
  #renderErrorReported = false;

  /** Makes the `data` getter return the empty model while the error boundary renders. */
  #renderingEmptyState = false;

  /**
   * The chart's own shadow tree while the shared empty SVG stands in for it.
   * Charts that cache their nodes keep updating them, so the next render
   * puts this tree back first.
   *
   * @type {Node[] | null}
   */
  #replacedTree = null;

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

  /**
   * The only `data` accessor pair. Subclasses customize parsing through
   * `parseData()` and never redeclare the accessor, which would drop the setter.
   *
   * @returns {any} Chart values parsed from the `data` attribute.
   */
  get data() {
    return this.parseData(this.#renderingEmptyState ? null : this.getAttribute("data"));
  }

  /**
   * Reflects values to the declarative `data` attribute. Strings are already
   * JSON and are stored unchanged, `null` and `undefined` remove the attribute,
   * and any other value is serialized with `JSON.stringify`.
   *
   * @param {unknown} values Chart values, or their JSON text.
   */
  set data(values) {
    if (values === null || values === undefined) {
      this.removeAttribute("data");
    } else if (typeof values === "string") {
      this.setAttribute("data", values);
    } else {
      this.setAttribute("data", JSON.stringify(values));
    }
  }

  /**
   * Converts the raw `data` attribute into the values the chart renders.
   * Override it to accept a chart-specific shape; it must never throw.
   *
   * @param {string | null} raw JSON text of the `data` attribute, or `null` when it is absent.
   * @returns {any} Parsed chart values.
   */
  parseData(raw) {
    return parseNumericData(raw);
  }

  connectedCallback() {
    this.#upgradeProperty("data");
    this.#safeRender();
  }

  disconnectedCallback() {
    this.cleanup();
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
      if (this.isConnected) this.#safeRender();
    });
  }

  /**
   * Replays a property assigned before the element was upgraded. Until then the
   * value is an own instance property that would shadow the class accessor forever.
   *
   * @param {string} name Property name.
   */
  #upgradeProperty(name) {
    if (!Object.hasOwn(this, name)) return;

    const value = Reflect.get(this, name);
    Reflect.deleteProperty(this, name);
    Reflect.set(this, name, value);
  }

  /**
   * Error boundary around `render()`. A failing render logs once per element
   * and leaves an accessible empty chart instead of a blank or stale tree.
   */
  #safeRender() {
    if (this.#replacedTree) {
      this.shadowRoot?.replaceChildren(...this.#replacedTree);
      this.#replacedTree = null;
    }

    try {
      this.render();
    } catch (error) {
      if (!this.#renderErrorReported) {
        this.#renderErrorReported = true;
        console.error(`sparkline-mini-charts: <${this.localName}> failed to render and shows an empty chart.`, error);
      }
      this.#renderEmptyState();
    }
  }

  /**
   * Renders the chart's own empty state, so its cached nodes stay in use. If
   * that throws too, falls back to the shared empty SVG.
   */
  #renderEmptyState() {
    this.#renderingEmptyState = true;
    try {
      this.render();
      return;
    } catch {
      // The chart cannot render its empty model either; use the shared empty SVG below.
    } finally {
      this.#renderingEmptyState = false;
    }

    const label = this.getAttribute("label") ?? this.createDefaultLabel([]);
    const style = document.createElement("style");
    style.textContent = `${chartStyles}\n:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }`;
    this.#replacedTree = [...(this.shadowRoot?.childNodes ?? [])];
    this.shadowRoot?.replaceChildren(style, createChartSvg({ width: this.chartWidth, height: this.chartHeight, label }));
  }

  /**
   * Lifecycle cleanup hook invoked on disconnection to cancel pending timers or rAF handles.
   * Can be overridden by subclasses.
   */
  cleanup() {}

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
