// box-plot.js — Box-plot statistics (quartiles, Tukey fences) and layout for <mini-box-plot-chart>.

/**
 * The five-number summary of one box, as drawn: `min` and `max` are the
 * whisker ends, `outliers` the points beyond them.
 *
 * @typedef {Object} BoxSummary
 * @property {number} min Low whisker end.
 * @property {number} q1 First quartile (bottom of the box).
 * @property {number} median Median.
 * @property {number} q3 Third quartile (top of the box).
 * @property {number} max High whisker end.
 * @property {number[]} outliers Values beyond the whiskers, ascending.
 */

/**
 * A box source as `parseData()` keeps it: raw samples, or a summary object.
 *
 * @typedef {number[] | Partial<BoxSummary> & Record<string, unknown>} BoxSource
 */

/**
 * Quantile of sorted values by linear interpolation between closest ranks
 * (R type 7, the NumPy and spreadsheet default).
 *
 * @param {readonly number[]} sorted Values in ascending order (at least one).
 * @param {number} p Probability in [0, 1].
 * @returns {number}
 */
export function quantile(sorted, p) {
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = sorted[lower] ?? 0;
  const high = sorted[upper] ?? low;
  return low + (high - low) * (position - lower);
}

/**
 * Computes the summary of raw samples.
 *
 * - `"tukey"`: the whiskers reach the most extreme samples within
 *   1.5 × IQR of the box; samples beyond them are outliers.
 * - `"minmax"`: the whiskers reach the lowest and highest samples; no outliers.
 *
 * @param {readonly number[]} samples Finite values, in any order (at least one).
 * @param {"tukey" | "minmax"} [whisker] Whisker rule.
 * @returns {BoxSummary}
 */
export function boxPlotStats(samples, whisker = "tukey") {
  const sorted = [...samples].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const first = sorted[0] ?? 0;
  const last = sorted[sorted.length - 1] ?? 0;
  if (whisker === "minmax") return { min: first, q1, median, q3, max: last, outliers: [] };

  const fence = 1.5 * (q3 - q1);
  const inside = sorted.filter((value) => value >= q1 - fence && value <= q3 + fence);
  return {
    min: Math.min(inside[0] ?? q1, q1),
    q1,
    median,
    q3,
    max: Math.max(inside[inside.length - 1] ?? q3, q3),
    outliers: sorted.filter((value) => value < q1 - fence || value > q3 + fence),
  };
}

/** @param {unknown} value @returns {value is number} */
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * Turns a summary object into a `BoxSummary`: `q1`, `median` and `q3` are
 * required, `min` and `max` default to the box, and the five values are
 * sorted so the box never draws inside out.
 *
 * @param {Record<string, unknown>} source Summary object.
 * @returns {BoxSummary | null} The summary, or `null` when it is not usable.
 */
export function normalizeSummary(source) {
  const { q1, median, q3 } = source;
  if (!isFiniteNumber(q1) || !isFiniteNumber(median) || !isFiniteNumber(q3)) return null;
  const min = isFiniteNumber(source.min) ? source.min : Math.min(q1, q3);
  const max = isFiniteNumber(source.max) ? source.max : Math.max(q1, q3);
  const [a = 0, b = 0, c = 0, d = 0, e = 0] = [min, q1, median, q3, max].sort((x, y) => x - y);
  const outliers = Array.isArray(source.outliers) ? source.outliers.filter(isFiniteNumber).sort((x, y) => x - y) : [];
  return { min: a, q1: b, median: c, q3: d, max: e, outliers };
}

/**
 * Normalizes the `data` of a box plot into box sources: an array of numbers
 * is one box of samples, a summary object is one box, and an array of sample
 * arrays and/or summary objects is one box per item. Unusable items are dropped.
 *
 * @param {unknown} parsed The parsed `data` value.
 * @returns {BoxSource[]}
 */
export function readBoxSources(parsed) {
  if (Array.isArray(parsed)) {
    const nested = parsed.some((item) => item !== null && typeof item === "object");
    if (!nested) {
      const samples = parsed.filter(isFiniteNumber);
      return samples.length > 0 ? [samples] : [];
    }
    /** @type {BoxSource[]} */
    const sources = [];
    for (const item of parsed) {
      if (Array.isArray(item)) {
        const samples = item.filter(isFiniteNumber);
        if (samples.length > 0) sources.push(samples);
      } else if (item !== null && typeof item === "object" && normalizeSummary(item)) {
        sources.push(item);
      }
    }
    return sources;
  }
  if (parsed !== null && typeof parsed === "object" && normalizeSummary(/** @type {Record<string, unknown>} */ (parsed))) {
    return [/** @type {BoxSource} */ (parsed)];
  }
  return [];
}

/**
 * Summarizes every box source.
 *
 * @param {readonly BoxSource[]} sources Box sources from `readBoxSources()`.
 * @param {"tukey" | "minmax"} whisker Whisker rule for raw samples.
 * @returns {BoxSummary[]}
 */
export function summarizeBoxes(sources, whisker) {
  /** @type {BoxSummary[]} */
  const boxes = [];
  for (const source of sources) {
    const summary = Array.isArray(source) ? boxPlotStats(source, whisker) : normalizeSummary(source);
    if (summary) boxes.push(summary);
  }
  return boxes;
}

/**
 * Geometry of one box along the value axis (`lo`…`hi`, in viewBox units) and
 * across it (`center`, `size`), whatever the orientation.
 *
 * @typedef {Object} BoxGeometry
 * @property {number} lo Low whisker end.
 * @property {number} q1 Box start.
 * @property {number} median Median line.
 * @property {number} q3 Box end.
 * @property {number} hi High whisker end.
 * @property {number} center Centre of the box across the value axis.
 * @property {number} size Box thickness across the value axis.
 */

/**
 * @typedef {Object} OutlierGeometry
 * @property {number} at Position along the value axis.
 * @property {number} center Position across it.
 * @property {number} box Index of the box the outlier belongs to.
 * @property {number} value The outlier value.
 */

/**
 * Lays out the boxes. The value axis runs along the width when `horizontal`
 * (low on the left) and along the height otherwise (low at the bottom); boxes
 * sit side by side across it, each in an equal slot with `gap` of it empty.
 *
 * @param {readonly BoxSummary[]} boxes Summaries.
 * @param {{ width: number, height: number, horizontal: boolean, gap: number, min?: number | undefined, max?: number | undefined, outliers: boolean, padding?: number }} options Layout options.
 * @returns {{ boxes: BoxGeometry[], outliers: OutlierGeometry[], domain: [number, number] }}
 */
export function createBoxPlotLayout(boxes, options) {
  const { width, height, horizontal, outliers: showOutliers, padding = 2 } = options;
  const gap = Math.max(0, Math.min(0.9, Number.isFinite(options.gap) ? options.gap : 0.4));
  if (boxes.length === 0) return { boxes: [], outliers: [], domain: [0, 1] };

  const values = boxes.flatMap((box) => [box.min, box.max, ...(showOutliers ? box.outliers : [])]);
  let low = isFiniteNumber(options.min) ? options.min : Math.min(...values);
  let high = isFiniteNumber(options.max) ? options.max : Math.max(...values);
  if (isFiniteNumber(options.min) && isFiniteNumber(options.max) && options.min >= options.max) {
    low = Math.min(...values);
    high = Math.max(...values);
  }
  if (!(high > low)) {
    const spread = Math.abs(low) * 0.1 || 1;
    low -= spread;
    high += spread;
  }

  const length = horizontal ? width : height;
  const across = horizontal ? height : width;
  const start = padding;
  const span = Math.max(0, length - padding * 2);
  /** @param {number} value @returns {number} */
  const scale = (value) => {
    const ratio = (Math.max(low, Math.min(high, value)) - low) / (high - low);
    return horizontal ? start + ratio * span : length - start - ratio * span;
  };

  const crossPadding = Math.min(1, across / 10);
  const slot = (across - crossPadding * 2) / boxes.length;
  const size = slot * (1 - gap);

  return {
    domain: [low, high],
    boxes: boxes.map((box, index) => ({
      lo: scale(box.min),
      q1: scale(box.q1),
      median: scale(box.median),
      q3: scale(box.q3),
      hi: scale(box.max),
      center: crossPadding + slot * (index + 0.5),
      size,
    })),
    outliers: showOutliers
      ? boxes.flatMap((box, index) =>
          box.outliers.map((value) => ({ at: scale(value), center: crossPadding + slot * (index + 0.5), box: index, value })),
        )
      : [],
  };
}
