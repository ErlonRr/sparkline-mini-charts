// treemap.js — Entry parsing and squarified layout (Bruls, Huizing & van Wijk) for <mini-treemap-chart>.

/**
 * One data entry of a treemap.
 *
 * @typedef {Object} TreemapEntry
 * @property {number} index Index of the entry in the `data` array.
 * @property {number} value Entry value (tiles are drawn for positive values only).
 * @property {string} [label] Entry name, when the data gives one.
 * @property {string} [color] Tile color, when the data gives one.
 * @property {unknown} datum The entry as given.
 */

/**
 * One tile, in viewBox units.
 *
 * @typedef {Object} TreemapTile
 * @property {number} index Index of the entry in the `data` array.
 * @property {number} value Entry value.
 * @property {number} x Left edge.
 * @property {number} y Top edge.
 * @property {number} width Width.
 * @property {number} height Height.
 */

/**
 * @typedef {Object} TreemapRect
 * @property {number} x Left edge.
 * @property {number} y Top edge.
 * @property {number} width Width.
 * @property {number} height Height.
 */

/** @param {unknown} value @returns {value is number} */
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * Reads treemap entries from numbers or `{ value, label?, color? }` objects.
 * Items without a finite value are dropped; every entry keeps its index in
 * the array. Zero and negative values are kept here and skipped by the layout.
 *
 * @param {readonly unknown[] | null} items Parsed `data` array.
 * @returns {TreemapEntry[]}
 */
export function readTreemapEntries(items) {
  if (!items) return [];
  /** @type {TreemapEntry[]} */
  const entries = [];
  items.forEach((item, index) => {
    if (isFiniteNumber(item)) {
      entries.push({ index, value: item, datum: item });
    } else if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      const { value, label, color } = /** @type {Record<string, unknown>} */ (item);
      if (!isFiniteNumber(value)) return;
      /** @type {TreemapEntry} */
      const entry = { index, value, datum: item };
      if (typeof label === "string") entry.label = label;
      if (typeof color === "string" && color.trim() !== "") entry.color = color.trim();
      entries.push(entry);
    }
  });
  return entries;
}

/**
 * The worst aspect ratio of a row of areas laid along a side of length `side`.
 *
 * @param {readonly number[]} row Areas of the row.
 * @param {number} side Length of the side the row is laid along.
 * @returns {number}
 */
function worstRatio(row, side) {
  let sum = 0;
  let min = Infinity;
  let max = 0;
  for (const area of row) {
    sum += area;
    min = Math.min(min, area);
    max = Math.max(max, area);
  }
  const side2 = side * side;
  const sum2 = sum * sum;
  return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
}

/**
 * Squarified treemap: fills `rect` with one tile per item, each with an area
 * proportional to its value, in the given order. Rows are laid along the
 * shorter side of the space left, and an item joins the current row while it
 * does not make the row's worst aspect ratio worse.
 *
 * @param {readonly { index: number, value: number }[]} items Items with positive values.
 * @param {TreemapRect} rect Space to fill.
 * @returns {TreemapTile[]} Tiles, in the order of `items`.
 */
export function squarify(items, rect) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (items.length === 0 || total <= 0 || rect.width <= 0 || rect.height <= 0) return [];

  const scale = (rect.width * rect.height) / total;
  const areas = items.map((item) => item.value * scale);
  let { x, y, width, height } = rect;
  /** @type {TreemapTile[]} */
  const tiles = [];

  let start = 0;
  while (start < items.length) {
    const side = Math.min(width, height);
    let end = start + 1;
    let worst = worstRatio(areas.slice(start, end), side);
    while (end < items.length) {
      const next = worstRatio(areas.slice(start, end + 1), side);
      if (next > worst) break;
      worst = next;
      end += 1;
    }

    const row = areas.slice(start, end);
    const rowArea = row.reduce((sum, area) => sum + area, 0);
    const last = end === items.length;
    if (width >= height) {
      // A column on the left, as tall as the space; the last row takes all that is left.
      const thickness = last ? width : rowArea / height;
      let offset = y;
      row.forEach((area, i) => {
        const tileHeight = i === row.length - 1 ? y + height - offset : area / thickness;
        const item = /** @type {{ index: number, value: number }} */ (items[start + i]);
        tiles.push({ index: item.index, value: item.value, x, y: offset, width: thickness, height: tileHeight });
        offset += tileHeight;
      });
      x += thickness;
      width -= thickness;
    } else {
      // A row at the top, as wide as the space.
      const thickness = last ? height : rowArea / width;
      let offset = x;
      row.forEach((area, i) => {
        const tileWidth = i === row.length - 1 ? x + width - offset : area / thickness;
        const item = /** @type {{ index: number, value: number }} */ (items[start + i]);
        tiles.push({ index: item.index, value: item.value, x: offset, y, width: tileWidth, height: thickness });
        offset += tileWidth;
      });
      y += thickness;
      height -= thickness;
    }
    start = end;
  }
  return tiles;
}

/**
 * Lays out the positive entries as a squarified treemap in a `width` ×
 * `height` box. Zero, negative and non-finite values get no tile and are
 * listed in `skipped`. With `gap`, tiles are inset so that neighbours are
 * `gap` apart while the outer tiles still touch the box's edges.
 *
 * @param {readonly { index: number, value: number }[]} entries Entries (see `readTreemapEntries`).
 * @param {{ width: number, height: number, gap?: number, sort?: boolean }} options
 *   `sort` (default on) lays out the largest value first, which gives the squarest tiles.
 * @returns {{ tiles: TreemapTile[], total: number, skipped: number[] }}
 */
export function createTreemapLayout(entries, { width, height, gap = 0, sort = true }) {
  const positive = entries.filter((entry) => isFiniteNumber(entry.value) && entry.value > 0);
  const skipped = entries.filter((entry) => !positive.includes(entry)).map((entry) => entry.index);
  const total = positive.reduce((sum, entry) => sum + entry.value, 0);
  const ordered = sort ? [...positive].sort((a, b) => b.value - a.value || a.index - b.index) : positive;

  const g = isFiniteNumber(gap) ? Math.max(0, gap) : 0;
  const half = g / 2;
  const tiles = squarify(ordered, { x: -half, y: -half, width: width + g, height: height + g }).map((tile) => ({
    ...tile,
    x: tile.x + half,
    y: tile.y + half,
    width: Math.max(0, tile.width - g),
    height: Math.max(0, tile.height - g),
  }));
  return { tiles, total, skipped };
}
