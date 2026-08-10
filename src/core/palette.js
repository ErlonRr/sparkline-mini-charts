// palette.js — Default segment colors for multi-value radial sparklines.

const SEGMENT_COLORS = Object.freeze([
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#84cc16",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#a855f7",
]);

/**
 * Resolves a stable default color for a radial segment index.
 *
 * @param {number} index Zero-based segment index.
 * @returns {string} CSS color value.
 */
export function getSegmentColor(index) {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}
