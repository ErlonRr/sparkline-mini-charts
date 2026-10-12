// gradient.js — Shared parser and stop renderer for the `gradient` attribute.

import { SVG_NAMESPACE } from "./svg.js";

/**
 * A parsed `gradient` attribute. `false` turns the gradient off, `true` asks
 * for the chart's default stops, and a list gives the colors. Each list entry
 * is one color, or (radial-bar) the colors of one ring.
 *
 * @typedef {boolean | (string | string[])[]} GradientSetting
 */

/**
 * Values that turn the gradient off: what Angular and Vue emit for `false`,
 * plus the words a user is likely to write for "no gradient".
 */
const OFF_VALUES = new Set(["false", "0", "none", "off", "no"]);

/** Values that turn the default gradient on: the bare boolean attribute and `true`. */
const DEFAULT_VALUES = new Set(["", "true"]);

/**
 * Color syntax accepted where the CSS parser is not available (server
 * renderers, test DOMs): hex colors, color functions, `var()` and keywords.
 */
const COLOR_SYNTAX =
  /^(?:#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|[a-z]+|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\(.*\))$/is;

/** @type {WeakMap<SVGGradientElement, string>} Last stops written to each gradient. */
const renderedStops = new WeakMap();

/**
 * Tells whether a token can be used as a `stop-color`. In a browser the CSS
 * parser decides (`var()` is always kept, since it resolves only at paint
 * time); elsewhere the token must look like a hex color, a color function or
 * a keyword.
 *
 * @param {string} token Bare color token.
 * @returns {boolean} Whether the token is kept.
 */
export function isGradientColor(token) {
  if (/^var\(/i.test(token)) return true;
  const css = globalThis.CSS;
  if (typeof css?.supports === "function") return css.supports("color", token);
  return COLOR_SYNTAX.test(token);
}

/**
 * Parses a `gradient` attribute value.
 *
 * - `null` (attribute absent), `"false"` and `"0"` turn the gradient off.
 * - `""` (bare attribute) and `"true"` select the chart's default stops.
 * - A JSON array (single quotes accepted) gives the colors, or one array of colors per ring.
 * - Any other text is a comma-separated color list. Commas inside parentheses
 *   (`rgb()`, `hsl()`, `oklch()`, `var()`) and quotes do not split a color.
 *
 * `"none"`, `"off"` and `"no"` also turn the gradient off. Entries that are not
 * CSS colors are dropped (a `stop-color` the browser rejects paints black),
 * and a value with no usable color turns the gradient off.
 *
 * @param {string | null | undefined} value Attribute value.
 * @returns {GradientSetting} The parsed setting.
 */
export function parseGradient(value) {
  if (value === null || value === undefined) return false;

  const text = value.trim();
  const keyword = text.toLowerCase();
  if (OFF_VALUES.has(keyword)) return false;
  if (DEFAULT_VALUES.has(keyword)) return true;

  const colors = parseJsonColors(text) ?? splitColorList(text);
  return colors.length > 0 ? colors : false;
}

/**
 * Resolves the flat color list a single-gradient chart paints with.
 *
 * @param {GradientSetting} setting Parsed `gradient` attribute.
 * @param {readonly string[]} defaults The chart's default stops, used for `true`.
 * @returns {string[] | null} The stop colors, or `null` when the gradient is off.
 */
export function resolveGradientColors(setting, defaults) {
  if (setting === false) return null;
  if (setting === true) return [...defaults];

  const colors = setting.filter((entry) => typeof entry === "string");
  return colors.length > 0 ? colors : null;
}

/**
 * Replaces the stops of a gradient with one evenly spaced stop per color. The
 * color goes through the style property, so `var()` and every CSS color
 * syntax work. Nothing is rewritten when the stops are unchanged.
 *
 * @param {SVGGradientElement} gradient Gradient element to fill.
 * @param {readonly string[]} colors Stop colors, in order.
 * @param {(index: number, count: number) => string | null} [opacityAt] Optional `stop-opacity` per stop.
 */
export function setGradientStops(gradient, colors, opacityAt) {
  const count = colors.length;
  const opacities = colors.map((_, index) => opacityAt?.(index, count) ?? null);
  const signature = JSON.stringify([colors, opacities]);
  if (renderedStops.get(gradient) === signature) return;
  renderedStops.set(gradient, signature);

  const stops = colors.map((color, index) => {
    const stop = document.createElementNS(SVG_NAMESPACE, "stop");
    stop.setAttribute("offset", count > 1 ? `${(index / (count - 1)) * 100}%` : "0%");
    stop.style.setProperty("stop-color", color);
    const opacity = opacities[index];
    if (opacity !== null) stop.setAttribute("stop-opacity", opacity);
    return stop;
  });

  gradient.replaceChildren(...stops);
}

/**
 * Reads a JSON array of colors, or of color arrays. Single quotes are accepted,
 * as in `['#f00', '#00f']`.
 *
 * @param {string} text Trimmed attribute value.
 * @returns {(string | string[])[] | null} The colors, or `null` when the text is not a JSON list.
 */
function parseJsonColors(text) {
  if (!text.startsWith("[") && !text.startsWith('"')) return null;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    try {
      parsed = JSON.parse(text.replace(/'/g, '"'));
    } catch {
      return null;
    }
  }

  if (typeof parsed === "string") parsed = [parsed];
  if (!Array.isArray(parsed)) return null;

  /** @type {(string | string[])[]} */
  const colors = [];
  for (const entry of parsed) {
    if (typeof entry === "string") {
      const color = cleanColor(entry);
      if (isGradientColor(color)) colors.push(color);
    } else if (Array.isArray(entry)) {
      const ring = entry.filter((color) => typeof color === "string").map(cleanColor).filter(isGradientColor);
      if (ring.length > 0) colors.push(ring);
    }
  }
  return colors;
}

/**
 * Splits a comma-separated color list. Commas nested in parentheses or quotes
 * stay inside their color, so `rgb(255,0,0), blue` gives two colors. One pair
 * of enclosing brackets and the quotes around each color are dropped.
 *
 * @param {string} text Trimmed attribute value.
 * @returns {string[]} The colors, in order.
 */
function splitColorList(text) {
  const list = text.startsWith("[") && text.endsWith("]") ? text.slice(1, -1) : text;

  /** @type {string[]} */
  const tokens = [];
  let depth = 0;
  /** @type {string | null} */
  let quote = null;
  let start = 0;

  for (let index = 0; index < list.length; index += 1) {
    const char = list[index];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    } else if (char === "," && depth === 0) {
      tokens.push(list.slice(start, index));
      start = index + 1;
    }
  }
  tokens.push(list.slice(start));

  return tokens.map(cleanColor).filter(isGradientColor);
}

/**
 * Trims a color token and removes the quotes around it.
 *
 * @param {string} token Raw token.
 * @returns {string} The bare color, or `""`.
 */
function cleanColor(token) {
  const trimmed = token.trim();
  const quoted = /^(["'])(.*)\1$/s.exec(trimmed);
  return (quoted ? quoted[2] : trimmed).trim();
}
