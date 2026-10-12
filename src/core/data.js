// data.js — Safe parsing and normalization for the declarative chart data API.

/**
 * Parses a JSON array into the finite numeric values accepted by every chart.
 * Invalid entries are ignored so an invalid attribute cannot break rendering.
 *
 * @param {string | null} value JSON array supplied through the `data` attribute.
 * @returns {number[]} Finite numeric values in their original order.
 */
export function parseNumericData(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) => typeof item === "number" && Number.isFinite(item));
  } catch {
    return [];
  }
}

/**
 * Parses a JSON array whose values are positional (e.g. `[value, min, max]`).
 * Unlike `parseNumericData`, nothing is dropped: an entry that is not a finite
 * number becomes `null`, so every other value keeps its index.
 *
 * @param {string | null} value JSON array supplied through the `data` attribute.
 * @returns {(number | null)[]} One entry per array item, in the original order.
 */
export function parsePositionalData(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : null));
  } catch {
    return [];
  }
}
