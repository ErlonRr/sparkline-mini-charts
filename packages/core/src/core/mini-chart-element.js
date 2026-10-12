// mini-chart-element.js — Shared Custom Element lifecycle and declarative data handling.

import { configLayers, dataReflection, trackChart } from "./config.js";
import { parseNumericData, readDataArray } from "./data.js";
import { attributeOnlyNames, toAttributeName } from "./framework-attributes.js";
import { parseGradient } from "./gradient.js";
import { setLayout, setSlide, stopTween } from "./motion.js";
import { chartStyles, createChartSvg } from "./svg.js";

const HTMLElementBase = /** @type {typeof HTMLElement} */ (globalThis.HTMLElement ?? class {});

/**
 * Describes one chart option: its attribute (the kebab-case form of the key),
 * its camelCase property and how values are read.
 *
 * - `number`: parsed with `parseFloat`; text that is not a number is ignored.
 * - `string` / `enum`: kept as text (`values` lists the documented choices).
 * - `boolean`: a present attribute is on. When `default` is `true`, or for any
 *   flag without `presence`, the text `"false"` turns it off; `presence` flags
 *   are on whatever their value (the 1.x behaviour of `interactive`).
 * - `json`: JSON text, or any value through the property.
 * - `colorList`: a `gradient` value (see `parseGradient`), or an array of colors through the property.
 *
 * @typedef {Object} OptionDescriptor
 * @property {"number" | "string" | "enum" | "boolean" | "json" | "colorList"} type Value type.
 * @property {unknown} [default] Built-in default, used when no layer sets the option.
 * @property {readonly string[]} [values] Documented values of an `enum`.
 * @property {boolean} [presence] Boolean only: any attribute value, `"false"` included, turns it on.
 * @property {boolean} [deprecated] Still accepted for compatibility, but has no effect; tools (the demo configurator) hide it.
 */

/**
 * The uniform `detail` of `sparkline-hover` and `sparkline-select`. Charts add
 * their own 1.x keys (`element`, `percentage`, `layerIndex`…) next to these.
 *
 * @typedef {Object} SparklinePointDetail
 * @property {string} chart Tag name of the chart (`"mini-line-chart"`).
 * @property {number} index Index of the point, bar, slice or candle in its series.
 * @property {number} seriesIndex Index of the series (layer, ring, track); `0` for single-series charts.
 * @property {number | null} value Numeric value of the point.
 * @property {unknown} datum The data entry as given (a number, a candle object, a `[low, high]` pair…).
 * @property {string} color Computed fill (or stroke) of the mark, so themes and tokens are reflected.
 * @property {number} clientX Pointer position in client pixels.
 * @property {number} clientY Pointer position in client pixels.
 * @property {string} [pointerType] `"mouse"`, `"touch"`, `"pen"`, or `"keyboard"` when the point was reached with the arrow keys.
 */

/**
 * Options of `appendData()`.
 *
 * @typedef {Object} AppendDataOptions
 * @property {number} [maxLength] Keeps only the last `maxLength` entries; the chart slides to the left.
 */

/**
 * A stop of keyboard navigation: the node that receives the synthetic
 * pointer events (the chart's own hover code handles them) and, optionally,
 * the viewBox point they are aimed at (the node's center otherwise).
 *
 * @typedef {Object} KeyboardTarget
 * @property {Element} node Node the events are dispatched on.
 * @property {number} [x] viewBox x of the stop.
 * @property {number} [y] viewBox y of the stop.
 * @property {number} [row] Series of the stop; ArrowUp/ArrowDown move between rows.
 * @property {number} [col] Column of the stop within its row.
 */

/**
 * The point a chart reports through `dispatchPoint()`.
 *
 * @typedef {Object} ChartPoint
 * @property {number} [index] Index in the series; defaults to `0`.
 * @property {number} [seriesIndex] Series index; defaults to `0`.
 * @property {number | null} [value] Numeric value.
 * @property {unknown} [datum] Raw data entry; defaults to `value`.
 * @property {Element | null} [mark] The mark whose computed color is reported.
 * @property {{ x: number, y: number }} [anchor] viewBox point the tooltip points at (the needle tip,
 *   the end of an arc, the top of a column); by default the top centre of a small mark, else the pointer.
 * @property {Record<string, unknown>} [legacy] The 1.x detail keys, kept for compatibility.
 */

/** @type {(chart: MiniChartElement, values: unknown, options?: AppendDataOptions) => void} Set by the class's static block. */
let appendImpl = () => {};

/**
 * Appends entries to a chart's data, trimming it to `maxLength`, and makes
 * the next render slide. Series charts expose it as `appendData()`.
 *
 * @param {MiniChartElement} chart Chart element.
 * @param {unknown} values Entries to append (an array), or a single number.
 * @param {AppendDataOptions} [options] Trimming.
 */
export function appendChartData(chart, values, options) {
  appendImpl(chart, values, options);
}

/** @type {WeakMap<Function, string[]>} Observed attributes per chart class. */
const observedByClass = new WeakMap();

/** @type {WeakSet<Function>} Chart classes whose option accessors are installed. */
const classesWithAccessors = new WeakSet();

/**
 * Returns the attribute name of an option.
 *
 * @param {string} name camelCase option name.
 * @returns {string} kebab-case attribute name.
 */
const attributeOf = (name) => toAttributeName(name);

/**
 * Converts an attribute text or a property/configuration value to the option's type.
 *
 * @param {OptionDescriptor} descriptor Option descriptor.
 * @param {unknown} value Attribute text or configured value.
 * @returns {unknown} The typed value, or `undefined` when the value is not usable.
 */
function coerceOption(descriptor, value) {
  switch (descriptor.type) {
    case "number": {
      const number = typeof value === "number" ? value : Number.parseFloat(String(value));
      return Number.isFinite(number) ? number : undefined;
    }
    case "boolean":
      if (typeof value === "boolean") return value;
      if (descriptor.presence && descriptor.default !== true) return true;
      return String(value).trim().toLowerCase() !== "false";
    case "json":
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    case "colorList":
      if (typeof value === "boolean") return value;
      if (Array.isArray(value)) return parseGradient(JSON.stringify(value));
      return parseGradient(String(value));
    default: {
      // An empty value (`curve=""`) means "not set", as `getAttribute(name) || default` read it in 1.x.
      const text = String(value);
      return text === "" ? undefined : text;
    }
  }
}

/**
 * Reads the computed color of a mark: its fill, else its stroke, else the
 * fallback, else its CSS `color`. Gradient paints (`url(…)`), transparent
 * paints and an unresolved `currentColor` are skipped.
 *
 * @param {Element | null | undefined} mark Rendered mark.
 * @param {unknown} fallback Color to use when the mark has no solid paint.
 * @returns {string} The color, or `""` when none is known.
 */
function markColor(mark, fallback) {
  const solid = (/** @type {unknown} */ value) =>
    typeof value === "string" &&
    !["", "none", "transparent", "rgba(0, 0, 0, 0)", "currentcolor"].includes(value.toLowerCase()) &&
    !value.startsWith("url(");

  if (mark && typeof getComputedStyle === "function") {
    try {
      const style = getComputedStyle(mark);
      for (const paint of [style.fill, style.stroke]) {
        // A paint left as `currentColor` (test DOMs do not resolve it) is the mark's `color`.
        const resolved = paint?.toLowerCase() === "currentcolor" ? style.color : paint;
        if (solid(resolved)) return resolved;
      }
      if (solid(fallback)) return /** @type {string} */ (fallback);
      if (solid(style.color)) return style.color;
    } catch {
      // Not an element of a rendered document: use the fallback.
    }
  }
  return solid(fallback) ? /** @type {string} */ (fallback) : "";
}

/** @type {WeakSet<Function>} `parseData()` implementations that accept the array itself, not only JSON text. */
const valueParsers = new WeakSet();

/**
 * Lets a chart class receive the `data` property's array in `parseData()`
 * as is, instead of its JSON text. Built-in charts opt in; a subclass that
 * overrides `parseData()` keeps receiving text, as in 1.x.
 *
 * @param {typeof MiniChartElement} chartClass Chart class whose own `parseData()` handles arrays.
 */
export function acceptDataValues(chartClass) {
  valueParsers.add(chartClass.prototype.parseData);
}

/** @type {Map<string, Intl.NumberFormat>} */
const formats = new Map();

/**
 * Formats a number for the tooltip.
 *
 * @param {unknown} value Number to format.
 * @param {string | undefined} locale BCP 47 locale, or the page's.
 * @returns {string}
 */
function formatNumber(value, locale) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const key = locale ?? "";
  let format = formats.get(key);
  if (!format) {
    try {
      format = new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 2 });
    } catch {
      format = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    }
    formats.set(key, format);
  }
  return format.format(value);
}

/**
 * Prefixes a tooltip text with the datum's `label`, when it has one.
 *
 * @param {any} datum Data entry.
 * @param {string} text Tooltip text.
 * @returns {string}
 */
const named = (datum, text) => (typeof datum?.label === "string" && datum.label !== "" ? `${datum.label}: ${text}` : text);

/**
 * The tooltip text of a hovered point.
 *
 * @param {SparklinePointDetail & Record<string, unknown>} detail Event detail.
 * @param {string | undefined} locale Locale of the numbers.
 * @returns {string}
 */
function tooltipText(detail, locale) {
  const f = (/** @type {unknown} */ value) => formatNumber(value, locale);
  /** A percentage, to one decimal. */
  const pct = (/** @type {number} */ value) => f(Math.round(value * 10) / 10);
  const datum = /** @type {any} */ (detail.datum);
  switch (detail.chart) {
    case "mini-candlestick-chart":
    case "mini-ohlc-chart":
      if (Array.isArray(datum)) return `O ${f(datum[0])} H ${f(datum[1])} L ${f(datum[2])} C ${f(datum[3])}`;
      break;
    case "mini-range-bar-chart": {
      const low = Array.isArray(datum) ? datum[0] : (datum?.min ?? datum?.low);
      const high = Array.isArray(datum) ? datum[1] : (datum?.max ?? datum?.high);
      if (typeof low === "number" && typeof high === "number") return `${f(low)} – ${f(high)}`;
      break;
    }
    case "mini-scatter-chart": {
      const x = Array.isArray(datum) ? datum[0] : datum?.x;
      const y = Array.isArray(datum) ? datum[1] : datum?.y;
      if (typeof x === "number" && typeof y === "number") return `${f(x)}, ${f(y)}`;
      break;
    }
    case "mini-combo-chart":
      if (datum && typeof datum === "object") return `${f(datum.bar)} · ${f(datum.line)}`;
      break;
    case "mini-pie-chart":
    case "mini-half-pie-chart":
      if (typeof detail.percentage === "number") return `${f(detail.value)} (${f(detail.percentage)}%)`;
      break;
    case "mini-stacked-bar-chart":
    case "mini-treemap-chart":
      if (typeof datum?.percent === "number") return named(datum, `${f(detail.value)} (${pct(datum.percent)}%)`);
      break;
    case "mini-funnel-chart":
      if (datum && typeof datum === "object") {
        let text = f(datum.value);
        if (typeof datum.percent === "number") text += ` · ${pct(datum.percent)}%`;
        if (typeof datum.conversion === "number") text += ` (conv. ${pct(datum.conversion)}% from previous)`;
        return named(datum, text);
      }
      break;
    case "mini-waterfall-chart":
      if (datum && typeof datum === "object") {
        if (datum.isTotal) return named(datum, `total ${f(datum.value)}`);
        const sign = typeof datum.value === "number" && datum.value > 0 ? "+" : "";
        return named(datum, `${sign}${f(datum.value)} → ${f(datum.runningTotal)}`);
      }
      break;
    case "mini-box-plot-chart":
      if (detail.seriesIndex === 0 && datum && typeof datum === "object" && typeof datum.median === "number") {
        return `${f(datum.median)} · ${f(datum.q1)}–${f(datum.q3)} · ${f(datum.min)}–${f(datum.max)}`;
      }
      break;
  }
  return f(detail.value);
}

/**
 * Installs a camelCase accessor for every option of a chart class. Names that
 * already exist on the prototype chain (`normalize` is `Node.prototype.normalize()`)
 * and the attribute-only names stay attribute-only.
 *
 * @param {typeof MiniChartElement} chartClass Chart class.
 */
function installOptionAccessors(chartClass) {
  if (classesWithAccessors.has(chartClass)) return;
  classesWithAccessors.add(chartClass);
  const prototype = chartClass.prototype;
  for (const name of Object.keys(chartClass.props)) {
    if (Object.hasOwn(prototype, name)) continue;
    if (name in prototype || name in HTMLElementBase.prototype || attributeOnlyNames.includes(attributeOf(name))) continue;
    Object.defineProperty(prototype, name, {
      configurable: true,
      enumerable: true,
      get() {
        return /** @type {MiniChartElement} */ (this).option(name);
      },
      set(value) {
        /** @type {MiniChartElement} */ (this).setOption(name, value);
      },
    });
  }
}

/**
 * Base class for static, responsive SVG chart elements.
 *
 * @abstract
 */
export class MiniChartElement extends HTMLElementBase {
  /**
   * Option descriptors keyed by camelCase name. Every key is an observed
   * attribute (kebab-case) and, unless it collides with an `HTMLElement`
   * member, a property that reads the resolved, typed value.
   *
   * @type {Readonly<Record<string, OptionDescriptor>>}
   */
  static props = {};

  /** @returns {string[]} `data`, `label`, `preset` and the attribute of every option. */
  static get observedAttributes() {
    let observed = observedByClass.get(this);
    if (!observed) {
      installOptionAccessors(this);
      observed = ["data", "label", "preset", ...Object.keys(this.props).map(attributeOf)];
      observedByClass.set(this, observed);
    }
    return observed;
  }

  /** Values set through option properties that have no attribute form (objects, `false` flags). */
  #explicit = /** @type {Map<string, unknown>} */ (new Map());

  /** @type {Readonly<Record<string, unknown>> | undefined} */
  #options = undefined;

  /**
   * The value last assigned through the `data` property (an array, an object…),
   * parsed as is instead of from the reflected attribute's JSON. `undefined`
   * when the attribute is the source.
   *
   * @type {unknown}
   */
  #dataValue = undefined;

  /** Set while the `data` setter writes the attribute, so the change keeps `#dataValue`. */
  #reflectingData = false;

  /** Index of the keyboard-active stop, or -1. */
  #activeIndex = -1;

  /** @type {Element | null} Node marked `data-active` by keyboard navigation. */
  #activeNode = null;

  /** @type {HTMLElement | null} */
  #tooltip = null;

  /** @type {ResizeObserver | null} */
  #resizeObserver = null;

  /** viewBox units per CSS pixel, written to the svg as `--_mc-px`; 0 before the first measure. */
  #pxScale = 0;

  /** `seriesIndex:index` of the last `sparkline-hover`, so a hover fires only when the point changes. */
  #hoverKey = /** @type {string | null} */ (null);

  /**
   * Whether a microtask render is pending. A synchronous render clears it, so
   * the queued microtask is skipped instead of rendering the same state twice.
   */
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
    // Before define() too, and for a subclass that declares its own observedAttributes.
    installOptionAccessors(/** @type {typeof MiniChartElement} */ (this.constructor));
    const root = this.attachShadow({ mode: "open" });
    // Keyboard navigation, from the shadow root so it survives a chart rebuilding its svg.
    root.addEventListener?.("keydown", (event) => this.#onKeyDown(/** @type {KeyboardEvent} */ (event)));
    root.addEventListener?.("focusout", (event) => {
      if (this.#activeIndex !== -1 && event.target === this.#chartSvg()) this.#leave();
    });
  }

  /**
   * Instance options, below explicit attributes and properties and above
   * presets and global defaults. Assigning replaces the whole object (a frozen
   * shallow copy); `null` or `undefined` clears it.
   *
   * @returns {Readonly<Record<string, unknown>> | undefined} The current options.
   */
  get options() {
    return this.#options;
  }

  /** @param {Readonly<Record<string, unknown>> | null | undefined} value Options keyed by camelCase name. */
  set options(value) {
    this.#options = value && typeof value === "object" ? Object.freeze({ ...value }) : undefined;
    this.requestRender();
  }

  /**
   * Names of the presets applied to this chart, reflected to `preset`. With
   * several names, the rightmost wins.
   *
   * @returns {string} Space-separated preset names.
   */
  get preset() {
    return this.getAttribute("preset") ?? "";
  }

  /** @param {string | readonly string[] | null | undefined} value Preset names. */
  set preset(value) {
    const text = Array.isArray(value) ? value.join(" ") : value;
    if (text === null || text === undefined || text === "") this.removeAttribute("preset");
    else this.setAttribute("preset", String(text));
  }

  /**
   * Resolves an option: explicit attribute or property, then `options`, then
   * the presets named in `preset` (rightmost first), then the global defaults
   * of the tag and of `"*"`, then the built-in default.
   *
   * @param {string} name camelCase option name.
   * @returns {any} The typed value, or `undefined` when nothing sets it.
   */
  option(name) {
    const value = this.#resolve(name);
    // `tooltip` implies `interactive`.
    if (name === "interactive" && !value && this.#resolve("tooltip") === true) return true;
    return value;
  }

  /**
   * @param {string} name camelCase option name.
   * @returns {any} The typed value, or `undefined`.
   */
  #resolve(name) {
    const descriptor = (/** @type {typeof MiniChartElement} */ (this.constructor)).props[name];
    if (!descriptor) return undefined;

    const attribute = attributeOf(name);
    const raw = this.getAttribute(attribute);
    if (raw !== null) {
      const value = coerceOption(descriptor, raw);
      if (value !== undefined) return value;
    }
    if (this.#explicit.has(name)) return this.#explicit.get(name);

    const presets = (this.getAttribute("preset") ?? "").split(/\s+/).filter(Boolean);
    const layers = this.#options ? [this.#options, ...configLayers(this.localName, presets)] : configLayers(this.localName, presets);
    for (const layer of layers) {
      const configured = Object.hasOwn(layer, name) ? layer[name] : layer[attribute];
      if (configured === undefined || configured === null) continue;
      const value = coerceOption(descriptor, configured);
      if (value !== undefined) return value;
    }
    return descriptor.default;
  }

  /**
   * Writes the explicit value of an option, as its property setter does.
   * Numbers, strings and `true` are reflected to the attribute; objects and
   * arrays (`json`, `colorList`) and a `false` flag (or gradient) are kept on
   * the instance, except a `false` for an option that is on by default, which
   * is written as `"false"` as in 1.x.
   * `null` and `undefined` clear the explicit value.
   *
   * @param {string} name camelCase option name.
   * @param {unknown} value New value.
   */
  setOption(name, value) {
    const descriptor = (/** @type {typeof MiniChartElement} */ (this.constructor)).props[name];
    if (!descriptor) return;

    const attribute = attributeOf(name);
    this.#explicit.delete(name);
    if (value === undefined || value === null) {
      this.removeAttribute(attribute);
    } else if (descriptor.type === "boolean" || (descriptor.type === "colorList" && typeof value === "boolean")) {
      if (coerceOption({ type: "boolean" }, value)) {
        this.setAttribute(attribute, "");
      } else if (descriptor.default === true) {
        this.setAttribute(attribute, "false");
      } else {
        this.removeAttribute(attribute);
        this.#explicit.set(name, false);
      }
    } else if (typeof value === "object") {
      this.removeAttribute(attribute);
      this.#explicit.set(name, value);
    } else {
      this.setAttribute(attribute, String(value));
    }
    this.requestRender();
  }

  /**
   * Every option after all configuration layers, keyed by camelCase name.
   * Options that nothing sets are left out.
   *
   * @returns {Readonly<Record<string, unknown>>} The resolved options.
   */
  resolvedOptions() {
    /** @type {Record<string, unknown>} */
    const resolved = {};
    for (const name of Object.keys((/** @type {typeof MiniChartElement} */ (this.constructor)).props)) {
      const value = this.option(name);
      if (value !== undefined) resolved[name] = value;
    }
    return Object.freeze(resolved);
  }

  /**
   * Dispatches `sparkline-hover` or `sparkline-select` with the uniform
   * `SparklinePointDetail`, plus the chart's 1.x keys. A hover is sent
   * only when `(seriesIndex, index)` differs from the previous one.
   *
   * @param {"sparkline-hover" | "sparkline-select"} type Event type.
   * @param {ChartPoint} point The point under the pointer.
   * @param {{ clientX?: number, clientY?: number } | null} [source] Pointer event that caused it.
   * @returns {boolean} Whether an event was dispatched.
   */
  dispatchPoint(type, point, source) {
    const { index = 0, seriesIndex = 0, value = null, mark = null, anchor, legacy = {} } = point;
    const datum = "datum" in point ? point.datum : value;

    if (type === "sparkline-hover") {
      const key = `${seriesIndex}:${index}`;
      if (key === this.#hoverKey) return false;
      this.#hoverKey = key;
    }

    /** @type {SparklinePointDetail & Record<string, unknown>} */
    const detail = {
      ...legacy,
      chart: this.localName,
      index,
      seriesIndex,
      value,
      datum,
      color: markColor(mark, legacy.color),
      clientX: source?.clientX ?? 0,
      clientY: source?.clientY ?? 0,
      pointerType: /** @type {{ pointerType?: string } | null | undefined} */ (source)?.pointerType || "mouse",
    };
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
    if (type === "sparkline-hover" && this.option("tooltip")) this.#showTooltip(detail, mark, anchor);
    return true;
  }

  /** Forgets the hovered point, so the next hover is dispatched. Call it when the pointer leaves. */
  clearHover() {
    this.#hoverKey = null;
    this.#tooltip?.removeAttribute("data-visible");
    this.#setActiveNode(null);
    this.#activeIndex = -1;
  }

  /** @returns {SVGSVGElement | null} The chart's root svg. */
  #chartSvg() {
    return this.shadowRoot?.querySelector("svg") ?? null;
  }

  /**
   * Shows the tooltip next to the hovered mark, flipped and shifted so it stays
   * inside the viewport. It is `position: fixed`, so a card with `overflow: hidden`
   * around a 24px chart does not clip it.
   *
   * @param {SparklinePointDetail & Record<string, unknown>} detail Event detail.
   * @param {Element | null} mark Hovered mark.
   * @param {{ x: number, y: number }} [anchor] viewBox point to point at.
   */
  #showTooltip(detail, mark, anchor) {
    const root = this.shadowRoot;
    if (!root) return;
    if (!this.#tooltip) {
      this.#tooltip = document.createElement("div");
      this.#tooltip.setAttribute("part", "tooltip");
      this.#tooltip.setAttribute("role", "status");
    }
    const tip = this.#tooltip;
    if (tip.parentNode !== root) root.append(tip);
    tip.textContent = tooltipText(detail, this.option("locale"));
    tip.setAttribute("data-visible", "");

    // Anchor: the chart's own point, else the top centre of a small mark (point, bar, candle), else the pointer.
    let x = detail.clientX;
    let y = detail.clientY;
    let bottom = y;
    const svg = this.#chartSvg();
    const ctm = anchor && svg && typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;
    if (anchor && ctm) {
      x = ctm.a * anchor.x + ctm.c * anchor.y + ctm.e;
      y = ctm.b * anchor.x + ctm.d * anchor.y + ctm.f;
      bottom = y;
    } else if (mark && mark !== svg && typeof mark.getBoundingClientRect === "function") {
      const box = mark.getBoundingClientRect();
      const frame = svg?.getBoundingClientRect();
      if (box.width > 0 || box.height > 0) {
        const small = !frame || (box.width <= frame.width * 0.5 && box.height <= frame.height * 0.9);
        if (small) {
          x = box.left + box.width / 2;
          y = box.top;
          bottom = box.bottom;
        }
      }
    }

    // A transformed ancestor moves the fixed box's origin: measure it at (0, 0) first.
    tip.style.left = "0px";
    tip.style.top = "0px";
    const origin = typeof tip.getBoundingClientRect === "function" ? tip.getBoundingClientRect() : { left: 0, top: 0 };
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const viewportWidth = globalThis.innerWidth || document.documentElement?.clientWidth || 0;
    const viewportHeight = globalThis.innerHeight || document.documentElement?.clientHeight || 0;
    const gap = 6;
    const margin = 4;
    let left = x - width / 2;
    if (viewportWidth > 0) left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
    // Above the anchor; below it (under the mark) when there is no room above.
    let top = y - height - gap;
    if (top < margin) top = bottom + gap;
    if (viewportHeight > 0 && top + height > viewportHeight - margin) top = Math.max(margin, Math.min(y - height - gap, viewportHeight - height - margin));
    tip.style.left = `${Math.round(left - origin.left)}px`;
    tip.style.top = `${Math.round(top - origin.top)}px`;
  }

  /**
   * The stops of keyboard navigation, in order. By default, every visible
   * `[data-index]` (or `[data-track-index]`) mark that holds no other one;
   * a chart without marks gets one stop, its svg.
   *
   * @returns {KeyboardTarget[]}
   */
  keyboardTargets() {
    const svg = this.#chartSvg();
    if (!svg) return [];
    const marks = [...svg.querySelectorAll("[data-index], [data-track-index]")].filter((node) => {
      if (node.querySelector("[data-index], [data-track-index]")) return false;
      if (node.localName === "path" && !node.getAttribute("d")) return false;
      for (let current = /** @type {Element | null} */ (node); current && current !== svg; current = current.parentElement) {
        if (/** @type {SVGElement} */ (current).style?.display === "none") return false;
      }
      return true;
    });
    return marks.length > 0 ? marks.map((node) => ({ node })) : [{ node: svg }];
  }

  /**
   * Arrow keys move the active point, Home and End jump to the ends, Enter
   * and Space select it, Escape leaves.
   *
   * @param {KeyboardEvent} event Key event from the shadow tree.
   */
  #onKeyDown(event) {
    const svg = this.#chartSvg();
    if (!svg || event.target !== svg || !this.option("interactive")) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const targets = this.keyboardTargets();
    if (targets.length === 0) return;
    const current = Math.min(this.#activeIndex, targets.length - 1);
    const stop = targets[current];
    let next = current;

    switch (event.key) {
      case "ArrowRight":
        next = current < 0 ? 0 : Math.min(targets.length - 1, current + 1);
        break;
      case "ArrowLeft":
        next = current < 0 ? targets.length - 1 : Math.max(0, current - 1);
        break;
      case "ArrowUp":
      case "ArrowDown": {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        if (current >= 0 && stop.row !== undefined) {
          const found = targets.findIndex((target) => target.row === (stop.row ?? 0) + delta && target.col === stop.col);
          next = found === -1 ? current : found;
        } else {
          next = current < 0 ? 0 : Math.max(0, Math.min(targets.length - 1, current + delta));
        }
        break;
      }
      case "Home":
        next = 0;
        break;
      case "End":
        next = targets.length - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        this.#activate(targets, current < 0 ? 0 : current, "click");
        return;
      case "Escape":
        if (current >= 0) {
          event.preventDefault();
          this.#leave();
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    this.#activate(targets, next, "hover");
  }

  /**
   * Moves the keyboard-active point: marks it and replays the pointer events
   * the chart already handles, with `pointerType: "keyboard"`.
   *
   * @param {KeyboardTarget[]} targets Stops.
   * @param {number} index Stop to activate.
   * @param {"hover" | "click"} kind Whether to hover or select it.
   */
  #activate(targets, index, kind) {
    const target = targets[index];
    if (!target) return;
    const svg = this.#chartSvg();
    const { clientX, clientY } = this.#clientPoint(target, svg);

    if (index !== this.#activeIndex) {
      this.#activeIndex = index;
      if (kind === "hover" || this.#hoverKey === null) {
        this.#setActiveNode(target.node === svg ? null : target.node);
        for (const type of ["pointerover", "pointermove"]) target.node.dispatchEvent(this.#pointerEvent(type, clientX, clientY));
      }
    }
    if (kind === "click") target.node.dispatchEvent(this.#pointerEvent("click", clientX, clientY));
  }

  /**
   * @param {string} type Event type.
   * @param {number} clientX Client x.
   * @param {number} clientY Client y.
   * @returns {Event} A synthetic pointer event that stays inside the shadow tree.
   */
  #pointerEvent(type, clientX, clientY) {
    const init = { bubbles: type !== "pointerleave", composed: false, cancelable: true, clientX, clientY, pointerType: "keyboard", isPrimary: true };
    return typeof PointerEvent === "function" ? new PointerEvent(type, init) : Object.assign(new MouseEvent(type, init), { pointerType: "keyboard" });
  }

  /**
   * The client point of a stop: its viewBox point through the screen CTM, or the centre of its node.
   *
   * @param {KeyboardTarget} target Stop.
   * @param {SVGSVGElement | null} svg Chart svg.
   * @returns {{ clientX: number, clientY: number }}
   */
  #clientPoint(target, svg) {
    if (target.x !== undefined && svg) {
      const y = target.y ?? this.chartHeight / 2;
      const ctm = typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;
      if (ctm) return { clientX: ctm.a * target.x + ctm.c * y + ctm.e, clientY: ctm.b * target.x + ctm.d * y + ctm.f };
      const rect = svg.getBoundingClientRect();
      return { clientX: rect.left + (target.x / this.chartWidth) * rect.width, clientY: rect.top + (y / this.chartHeight) * rect.height };
    }
    const box = target.node.getBoundingClientRect();
    return { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
  }

  /** @param {Element | null} node Node to mark `data-active`. */
  #setActiveNode(node) {
    if (this.#activeNode === node) return;
    this.#activeNode?.removeAttribute("data-active");
    this.#activeNode = node;
    node?.setAttribute("data-active", "");
  }

  /** Ends keyboard navigation the way the pointer leaving the chart does. */
  #leave() {
    const svg = this.#chartSvg();
    this.#activeIndex = -1;
    this.#setActiveNode(null);
    if (svg) svg.dispatchEvent(this.#pointerEvent("pointerleave", 0, 0));
    this.clearHover();
  }

  /**
   * Appends entries to the data and trims it to `maxLength`; the chart slides.
   *
   * @param {unknown} values Entries to append (an array), or a single number.
   * @param {AppendDataOptions} [options] Trimming.
   */
  #append(values, options = {}) {
    const entries = Array.isArray(values) ? values : [values];
    const current = this.#dataValue !== undefined ? this.#dataValue : this.getAttribute("data");
    let next = [...(readDataArray(current) ?? []), ...entries];
    let dropped = 0;
    const maxLength = options.maxLength;
    if (typeof maxLength === "number" && Number.isFinite(maxLength) && maxLength >= 0 && next.length > maxLength) {
      dropped = next.length - Math.floor(maxLength);
      next = next.slice(dropped);
    }
    this.data = next;
    setSlide(this, dropped);
  }

  static {
    appendImpl = (chart, values, options) => chart.#append(values, options);
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
    if (this.#renderingEmptyState) return this.parseData(null);
    if (this.#dataValue === undefined) return this.parseData(this.getAttribute("data"));
    const parse = this.parseData;
    // A subclass's own parseData() keeps receiving JSON text, as in 1.x.
    return valueParsers.has(parse) ? parse.call(this, this.#dataValue) : parse.call(this, JSON.stringify(this.#dataValue));
  }

  /**
   * Sets the chart values. Strings are JSON and are stored unchanged in the
   * `data` attribute; `null` and `undefined` remove it. Any other value is
   * rendered as given (no JSON round trip) and, unless reflection is off
   * (`configureMiniCharts({ reflectData: false })`), also serialized to the
   * attribute with `JSON.stringify`.
   *
   * @param {unknown} values Chart values, or their JSON text.
   */
  set data(values) {
    setSlide(this, 0);
    if (values === null || values === undefined) {
      this.#dataValue = undefined;
      this.removeAttribute("data");
    } else if (typeof values === "string") {
      this.#dataValue = undefined;
      this.setAttribute("data", values);
    } else {
      this.#dataValue = values;
      this.#reflectingData = true;
      try {
        if (dataReflection()) this.setAttribute("data", JSON.stringify(values));
        else this.removeAttribute("data");
      } finally {
        this.#reflectingData = false;
      }
      this.requestRender();
    }
  }

  /**
   * Converts the raw `data` attribute into the values the chart renders.
   * Override it to accept a chart-specific shape; it must never throw.
   * Built-in charts also receive the value assigned to the `data` property
   * as is (an array), so it is never round-tripped through JSON.
   *
   * @param {any} raw JSON text of the `data` attribute, `null` when it is absent, or the `data` property's value.
   * @returns {any} Parsed chart values.
   */
  parseData(raw) {
    return parseNumericData(raw);
  }

  connectedCallback() {
    this.#upgradeProperty("data");
    this.#upgradeProperty("options");
    this.#upgradeProperty("preset");
    for (const name of Object.keys((/** @type {typeof MiniChartElement} */ (this.constructor)).props)) {
      this.#upgradeProperty(name);
    }
    trackChart(this, true);
    this.#observeSize(true);
    this.#safeRender();
  }

  disconnectedCallback() {
    trackChart(this, false);
    this.#observeSize(false);
    this.#hoverKey = null;
    this.#activeIndex = -1;
    this.#tooltip?.removeAttribute("data-visible");
    stopTween(this, true);
    this.cleanup();
  }

  /**
   * Watches the element's size, so marks and text can stay readable in CSS
   * pixels (`--_mc-px`: viewBox units per pixel) from a table row to a card.
   *
   * @param {boolean} connected Whether to start or stop watching.
   */
  #observeSize(connected) {
    if (!connected) {
      this.#resizeObserver?.disconnect();
      this.#resizeObserver = null;
      setLayout(this, undefined);
      return;
    }
    if (this.#resizeObserver || typeof ResizeObserver !== "function") return;
    this.#resizeObserver = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      setLayout(this, Boolean(box && (box.width > 0 || box.height > 0)));
      if (!box || box.width <= 0 || box.height <= 0) return;
      // preserveAspectRatio="xMidYMid meet": the axis that fills the box sets the scale.
      this.#pxScale = Math.max(this.chartWidth / box.width, this.chartHeight / box.height);
      this.#applyPxScale();
    });
    this.#resizeObserver.observe(this);
  }

  /** Writes `--_mc-px` to the chart's svg. */
  #applyPxScale() {
    const svg = this.#chartSvg();
    if (!svg) return;
    if (this.#pxScale > 0) svg.style.setProperty("--_mc-px", String(Math.round(this.#pxScale * 10000) / 10000));
    else svg.style.removeProperty("--_mc-px");
  }

  /**
   * An attribute written after a property object (`el.zones = [...]`, then
   * `setAttribute("zones", …)`) takes over from it.
   *
   * @param {string} [name] Attribute name.
   */
  attributeChangedCallback(name) {
    if (name === "data" && !this.#reflectingData) this.#dataValue = undefined;
    if (name) this.#explicit.delete(name.replace(/-([a-z])/g, (_, char) => char.toUpperCase()));
    this.requestRender();
  }

  /**
   * Schedules a single rerender for a batch of synchronous attribute changes.
   * A render that runs before the microtask (the upgrade of an element that is
   * already in the document queues one per attribute, then connects) makes it
   * a no-op, so entrance animations are not cancelled by a second pass.
   */
  requestRender() {
    if (!this.isConnected || this.#renderQueued) return;

    this.#renderQueued = true;
    queueMicrotask(() => {
      if (!this.#renderQueued) return;
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
    // This render covers every attribute change so far: a queued microtask has nothing left to do.
    this.#renderQueued = false;

    if (this.#replacedTree) {
      this.shadowRoot?.replaceChildren(...this.#replacedTree);
      this.#replacedTree = null;
    }

    try {
      this.render();
      this.#syncInteractive();
    } catch (error) {
      if (!this.#renderErrorReported) {
        this.#renderErrorReported = true;
        console.error(`sparkline-mini-charts: <${this.localName}> failed to render and shows an empty chart.`, error);
      }
      this.#renderEmptyState();
    }
  }

  /**
   * Marks the chart's svg with `data-interactive` when the resolved
   * `interactive` option is on, so the hover styles also follow options,
   * presets and defaults, not only the host attribute.
   */
  #syncInteractive() {
    const svg = this.#chartSvg();
    if (!svg) return;
    if (this.option("interactive")) {
      svg.setAttribute("data-interactive", "");
      // Focusable for the arrow keys (see #onKeyDown).
      svg.setAttribute("tabindex", "0");
    } else {
      svg.removeAttribute("data-interactive");
      svg.removeAttribute("tabindex");
    }
    this.#applyPxScale();
    // A re-render may have replaced or hidden the active node.
    if (this.#activeNode && !this.#activeNode.isConnected) this.#activeNode = null;
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

acceptDataValues(MiniChartElement);
