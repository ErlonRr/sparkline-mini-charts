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
