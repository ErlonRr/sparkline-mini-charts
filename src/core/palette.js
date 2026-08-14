// palette.js — Default segment colors for multi-value radial, stacked, and stream sparklines.

export const SEGMENT_COLORS = Object.freeze([
  "#84cc16", // Lime chartreuse
  "#f43f5e", // Rose pink
  "#0ea5e9", // Sky cyan
  "#f59e0b", // Warm amber
  "#8b5cf6", // Vibrant violet
  "#10b981", // Emerald mint
  "#f97316", // Bright tangerine
  "#6366f1", // Indigo
  "#ec4899", // Fuchsia
  "#06b6d4", // Electric cyan
  "#eab308", // Golden yellow
  "#a855f7", // Deep purple
  "#14b8a6", // Teal
  "#ef4444", // Coral red
  "#3b82f6", // Royal blue
  "#64748b", // Slate
]);

/**
 * Resolves a stable default color for a radial segment or layer index.
 *
 * @param {number} index Zero-based segment index.
 * @returns {string} CSS color value.
 */
export function getSegmentColor(index) {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}
