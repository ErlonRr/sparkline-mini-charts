// radar.js — Series parsing, polygon vertices and grid path for <mini-radar-chart>.

import { polarToCartesian } from "../geometry.js";

/** Center of the radar in its 100 × 100 viewBox. */
export const RADAR_CENTER = 50;

/** Radius of the outer ring, leaving room for vertex markers and strokes. */
export const RADAR_RADIUS = 45;

/**
 * One vertex of a series polygon, in viewBox units.
 *
 * @typedef {Object} RadarVertex
 * @property {number} x Horizontal position.
 * @property {number} y Vertical position.
 * @property {number} value The value of the axis, as given.
 */

/**
 * @typedef {Object} RadarLayout
 * @property {number} axes Number of axes (0 when there is nothing to draw).
 * @property {number} max Value at the outer ring.
 * @property {Array<{ x: number, y: number, angle: number }>} spokes Outer end of each axis, from 12 o'clock clockwise.
 * @property {number[]} rings Radius of each grid ring, innermost first.
 * @property {RadarVertex[][]} series Vertices of each series, one per axis.
 */

/** @param {unknown} value @returns {value is number} */
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * Reads radar series from a `number[]` (one series) or a `number[][]` (several,
 * overlaid). An entry that is not a finite number becomes `0`, so every value
 * keeps its axis; a series without any finite value is dropped. Shorter series
 * are padded with `0` to the longest one. Fewer than 3 axes is not a radar,
 * and gives no series.
 *
 * @param {readonly unknown[] | null} items Parsed `data` array.
 * @returns {number[][]} One array per series, all of the same length (≥ 3).
 */
export function readRadarSeries(items) {
  if (!items || items.length === 0) return [];
  const nested = items.some(Array.isArray);
  const rows = nested ? items.filter(Array.isArray) : [items];
  const series = rows
    .filter((row) => row.some(isFiniteNumber))
    .map((row) => row.map((value) => (isFiniteNumber(value) ? value : 0)));
  const axes = Math.max(0, ...series.map((row) => row.length));
  if (axes < 3) return [];
  return series.map((row) => (row.length < axes ? [...row, ...new Array(axes - row.length).fill(0)] : row));
}

/**
 * Lays out radar series around a center: axis `i` points at
 * `-90° + i × 360° / axes`, and a value `v` sits at `clamp(v, 0, max) / max`
 * of the radius.
 *
 * @param {readonly (readonly number[])[]} series Series of the same length (see `readRadarSeries`).
 * @param {{ max?: number, levels?: number, cx?: number, cy?: number, radius?: number }} [options]
 *   `max` is the value at the outer ring (the data maximum when absent or not positive);
 *   `levels` the number of grid rings.
 * @returns {RadarLayout}
 */
export function createRadarLayout(series, { max, levels = 3, cx = RADAR_CENTER, cy = RADAR_CENTER, radius = RADAR_RADIUS } = {}) {
  const axes = series.length > 0 ? Math.max(...series.map((row) => row.length)) : 0;
  if (axes < 3) return { axes: 0, max: 1, spokes: [], rings: [], series: [] };

  const dataMax = Math.max(...series.flat());
  const domainMax = isFiniteNumber(max) && max > 0 ? max : dataMax > 0 ? dataMax : 1;
  const angleOf = (/** @type {number} */ index) => -Math.PI / 2 + (index * 2 * Math.PI) / axes;

  const spokes = Array.from({ length: axes }, (_, index) => {
    const angle = angleOf(index);
    return { ...polarToCartesian(cx, cy, radius, angle), angle };
  });

  const ringCount = isFiniteNumber(levels) ? Math.max(0, Math.floor(levels)) : 0;
  const rings = Array.from({ length: ringCount }, (_, index) => (radius * (index + 1)) / ringCount);

  return {
    axes,
    max: domainMax,
    spokes,
    rings,
    series: series.map((row) =>
      row.map((value, index) => {
        const ratio = Math.min(Math.max(value, 0), domainMax) / domainMax;
        return { ...polarToCartesian(cx, cy, radius * ratio, angleOf(index)), value };
      }),
    ),
  };
}

/**
 * Rounds a coordinate for path data.
 *
 * @param {number} value Coordinate.
 * @returns {number}
 */
const round = (value) => Math.round(value * 1000) / 1000;

/**
 * Describes a closed polygon through the points.
 *
 * @param {readonly { x: number, y: number }[]} points Vertices.
 * @returns {string} Path data, or `""` without points.
 */
export function describeRadarPolygon(points) {
  if (points.length === 0) return "";
  return `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`).join(" ")} Z`;
}

/**
 * Describes the grid: a spoke from the center to every axis end, and one
 * polygon per ring.
 *
 * @param {RadarLayout} layout Radar layout.
 * @param {{ cx?: number, cy?: number }} [center] Center of the radar.
 * @returns {string} Path data, or `""` when there are no axes.
 */
export function describeRadarGrid(layout, { cx = RADAR_CENTER, cy = RADAR_CENTER } = {}) {
  if (layout.axes === 0) return "";
  const spokes = layout.spokes.map((spoke) => `M ${cx} ${cy} L ${round(spoke.x)} ${round(spoke.y)}`);
  const rings = layout.rings.map((ringRadius) =>
    describeRadarPolygon(layout.spokes.map((spoke) => polarToCartesian(cx, cy, ringRadius, spoke.angle))),
  );
  return [...spokes, ...rings].join(" ");
}
