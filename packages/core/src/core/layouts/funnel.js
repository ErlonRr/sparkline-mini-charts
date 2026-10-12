// funnel.js — Funnel steps (value, share of the first, conversion) and layout for <mini-funnel-chart>.

/**
 * One funnel step, as reported in event details.
 *
 * @typedef {Object} FunnelStep
 * @property {number} value Step value.
 * @property {string} [label] Step name, when the data gives one.
 * @property {number | null} percent Value as a percentage of the first step (`null` when the first is 0).
 * @property {number | null} conversion Value as a percentage of the previous step (`null` for the first step, or after a 0).
 */

/**
 * Geometry of one step, in viewBox units.
 *
 * @typedef {Object} FunnelBar
 * @property {number} x Left edge.
 * @property {number} y Top edge.
 * @property {number} width Width.
 * @property {number} height Height.
 */

/** @param {unknown} value @returns {value is number} */
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * Reads funnel steps from numbers or `{ value, label? }` objects. Items
 * without a finite value are dropped.
 *
 * @param {readonly unknown[] | null} items Parsed `data` array.
 * @returns {FunnelStep[]}
 */
export function readFunnelSteps(items) {
  if (!items) return [];
  /** @type {{ value: number, label?: string }[]} */
  const entries = [];
  for (const item of items) {
    if (isFiniteNumber(item)) {
      entries.push({ value: item });
    } else if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      const { value, label } = /** @type {Record<string, unknown>} */ (item);
      if (!isFiniteNumber(value)) continue;
      entries.push(typeof label === "string" ? { value, label } : { value });
    }
  }
  const first = entries[0]?.value ?? 0;
  return entries.map((entry, index) => {
    const previous = index > 0 ? (entries[index - 1]?.value ?? 0) : 0;
    return {
      ...entry,
      percent: first !== 0 ? (entry.value / first) * 100 : null,
      conversion: index > 0 && previous !== 0 ? (entry.value / previous) * 100 : null,
    };
  });
}

/**
 * Lays out the steps. With `horizontal`, steps run top to bottom as
 * horizontal bars centred on the width; otherwise they run left to right as
 * vertical bars centred on the height. Bar length is proportional to the
 * value over the largest value (negative values draw as 0). Each step owns
 * an equal slot with `gap` of it empty, and the first and last bars touch
 * the edges.
 *
 * @param {readonly number[]} values Step values.
 * @param {{ width: number, height: number, horizontal: boolean, gap: number }} options Layout options.
 * @returns {FunnelBar[]}
 */
export function createFunnelLayout(values, { width, height, horizontal, gap }) {
  const count = values.length;
  if (count === 0) return [];
  const g = Math.max(0, Math.min(0.9, Number.isFinite(gap) ? gap : 0.25));
  const largest = Math.max(0, ...values);
  const along = horizontal ? height : width;
  const across = horizontal ? width : height;
  // n bars and n - 1 gaps fill the axis: n·s(1 - g) + (n - 1)·s·g = s(n - g).
  const slot = along / (count - g);
  const thickness = slot * (1 - g);

  return values.map((value, index) => {
    const length = largest > 0 ? (Math.max(0, value) / largest) * across : 0;
    const start = index * slot;
    const offset = (across - length) / 2;
    return horizontal
      ? { x: offset, y: start, width: length, height: thickness }
      : { x: start, y: offset, width: thickness, height: length };
  });
}

/**
 * The connector between two consecutive bars: a trapezoid from the end edge
 * of `from` to the start edge of `to`.
 *
 * @param {FunnelBar} from Upper (or left) bar.
 * @param {FunnelBar} to Lower (or right) bar.
 * @param {boolean} horizontal Orientation of the funnel.
 * @returns {string} Path data, or `""` when the bars touch or overlap.
 */
export function funnelConnectorPath(from, to, horizontal) {
  const r = (/** @type {number} */ n) => Math.round(n * 1000) / 1000;
  if (horizontal) {
    const top = from.y + from.height;
    if (to.y - top <= 0) return "";
    return `M${r(from.x)},${r(top)}H${r(from.x + from.width)}L${r(to.x + to.width)},${r(to.y)}H${r(to.x)}Z`;
  }
  const left = from.x + from.width;
  if (to.x - left <= 0) return "";
  return `M${r(left)},${r(from.y)}V${r(from.y + from.height)}L${r(to.x)},${r(to.y + to.height)}V${r(to.y)}Z`;
}
