// framework-attributes.js — Prop-to-attribute conversion shared by the React and Vue wrappers.

/**
 * Boolean attributes that a chart treats as on when they are absent. Turning
 * one off takes the explicit value `"false"`. Every other boolean option is
 * presence-only: the chart reads it with `hasAttribute()`, so even the value
 * `"false"` would turn it on, and `false` has to omit the attribute instead.
 *
 * @type {Readonly<Record<string, readonly string[]>>}
 */
const defaultTrueAttributes = Object.freeze({
  "mini-area-chart": ["gradient"],
  "mini-candlestick-chart": ["hollow-bullish"],
  "mini-combo-chart": ["shared-domain"],
  "mini-radial-bar-chart": ["round-caps"],
});

/**
 * Attributes that the wrappers always write with `setAttribute()`. React 19
 * and Vue assign a custom element prop as a property whenever the element has
 * a property of that name, and `normalize` would then shadow the inherited
 * `Node.prototype.normalize()` method instead of reaching the attribute.
 *
 * @type {readonly string[]}
 */
export const attributeOnlyNames = Object.freeze(["normalize"]);

/**
 * Converts a camelCase prop name to its kebab-case attribute name. Names that
 * are already kebab-case are returned unchanged.
 *
 * @param {string} key Prop name.
 * @returns {string} Attribute name.
 */
export function toAttributeName(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Serializes chart values for the `data` attribute. Wrappers always pass the
 * JSON text: server renderers drop object values on custom elements, and the
 * element's `data` setter stores a string unchanged.
 *
 * @param {unknown} data Chart values, or their JSON text.
 * @returns {string} JSON text for the `data` attribute.
 */
export function toDataAttribute(data) {
  if (typeof data === "string") return data;
  return JSON.stringify(data ?? []) ?? "[]";
}

/**
 * @typedef {Object} ChartAttributes
 * @property {(key: string) => string | null} nameOf Returns the chart attribute a prop sets, or `null` when the prop is not a chart option.
 * @property {(name: string, value: unknown) => string | undefined} valueOf Converts a prop value to the attribute value; `undefined` means the attribute is omitted.
 */

/**
 * Creates the prop converter for one chart. Only the chart's observed
 * attributes, in camelCase or kebab-case, are chart options; every other prop
 * (`style`, `class`, `id`, `aria-*`, `data-*`, listeners…) is left to the framework.
 *
 * @param {string} tagName Custom Element tag name.
 * @param {readonly string[]} observedAttributes The chart's `observedAttributes`.
 * @returns {ChartAttributes} The chart's prop converter.
 */
export function createChartAttributes(tagName, observedAttributes) {
  const observed = new Set(observedAttributes);
  const defaultTrue = new Set(defaultTrueAttributes[tagName] ?? []);

  return {
    nameOf(key) {
      const name = toAttributeName(key);
      return observed.has(name) ? name : null;
    },
    valueOf(name, value) {
      switch (typeof value) {
        case "string":
          return value;
        case "number":
        case "bigint":
          return String(value);
        case "boolean":
          if (value) return "";
          return defaultTrue.has(name) ? "false" : undefined;
        case "object":
          return value === null ? undefined : JSON.stringify(value);
        default:
          return undefined;
      }
    },
  };
}
