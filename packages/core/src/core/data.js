// data.js — Safe parsing and normalization for the declarative chart data API.

/**
 * Reads the array behind a `data` value: an array as given (the `data`
 * property, without a JSON round trip), or the JSON text of the attribute.
 *
 * @param {unknown} value An array, or JSON text.
 * @returns {any[] | null} The array, or `null` when there is none.
 */
export function readDataArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value === "") return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Parses a JSON array into the finite numeric values accepted by every chart.
 * Invalid entries are ignored so an invalid attribute cannot break rendering.
 *
 * @param {string | readonly unknown[] | null} value JSON array supplied through the `data` attribute, or the array itself.
 * @returns {number[]} Finite numeric values in their original order.
 */
export function parseNumericData(value) {
  const parsed = readDataArray(value);
  if (!parsed) return [];
  return /** @type {number[]} */ (parsed.filter((item) => typeof item === "number" && Number.isFinite(item)));
}

/**
 * Parses a JSON array whose values are positional (e.g. `[value, min, max]`).
 * Unlike `parseNumericData`, nothing is dropped: an entry that is not a finite
 * number becomes `null`, so every other value keeps its index.
 *
 * @param {string | readonly unknown[] | null} value JSON array supplied through the `data` attribute, or the array itself.
 * @returns {(number | null)[]} One entry per array item, in the original order.
 */
export function parsePositionalData(value) {
  const parsed = readDataArray(value);
  if (!parsed) return [];
  return parsed.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : null));
}
