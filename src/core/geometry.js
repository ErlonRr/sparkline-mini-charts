// geometry.js — Shared scale, Cartesian, and radial geometry for every mini chart.

export const TAU = Math.PI * 2;

const EPSILON = 0.000001;

/**
 * Creates a linear projection between a numeric domain and output range.
 *
 * @param {[number, number]} domain Input minimum and maximum.
 * @param {[number, number]} range Output start and end coordinates.
 * @returns {{ project: (value: number) => number }} A value-to-coordinate mapper.
 */
export function createLinearScale(domain, range) {
  const [domainStart, domainEnd] = domain;
  const [rangeStart, rangeEnd] = range;
  const span = domainEnd - domainStart || 1;

  return Object.freeze({
    project: (value) => rangeStart + ((value - domainStart) / span) * (rangeEnd - rangeStart),
  });
}

/**
 * Calculates the numeric domain, optionally preserving a zero baseline.
 *
 * @param {number[]} values Finite values to measure.
 * @param {{ includeZero?: boolean }} [options] Domain behavior.
 * @returns {[number, number]} A non-zero-span domain.
 */
export function createDomain(values, { includeZero = false } = {}) {
  if (values.length === 0) return [0, 1];

  let minimum = Math.min(...values);
  let maximum = Math.max(...values);

  if (includeZero) {
    minimum = Math.min(minimum, 0);
    maximum = Math.max(maximum, 0);
  }

  if (minimum === maximum) {
    const padding = Math.abs(minimum) * 0.1 || 1;
    return [minimum - padding, maximum + padding];
  }

  return [minimum, maximum];
}

/**
 * Maps a data series into a padded SVG Cartesian coordinate system.
 *
 * @param {number[]} values Finite data values.
 * @param {{ width?: number, height?: number, padding?: number, includeZero?: boolean }} [options] Layout dimensions.
 * @returns {{ domain: [number, number], points: { x: number, y: number }[], baseline: number }} Chart coordinates.
 */
export function createCartesianLayout(
  values,
  { width = 100, height = 30, padding = 2, includeZero = false } = {},
) {
  const domain = createDomain(values, { includeZero });
  const yScale = createLinearScale(domain, [height - padding, padding]);
  const xScale = createLinearScale([0, Math.max(values.length - 1, 1)], [padding, width - padding]);
  const baselineValue = Math.min(Math.max(0, domain[0]), domain[1]);

  return {
    domain,
    points: values.map((value, index) => ({
      x: values.length === 1 ? width / 2 : xScale.project(index),
      y: yScale.project(value),
    })),
    baseline: yScale.project(baselineValue),
  };
}

/**
 * Builds rectangles around the common Cartesian zero baseline.
 *
 * @param {number[]} values Finite data values.
 * @param {{ width?: number, height?: number, padding?: number, gapRatio?: number }} [options] Layout dimensions.
 * @returns {{ bars: { x: number, y: number, width: number, height: number }[], baseline: number }} Bar geometry.
 */
export function createBarLayout(
  values,
  { width = 100, height = 30, padding = 2, gapRatio = 0.2 } = {},
) {
  const cartesian = createCartesianLayout(values, { width, height, padding, includeZero: true });
  const innerWidth = width - padding * 2;
  const slotWidth = values.length > 0 ? innerWidth / values.length : 0;
  const barWidth = slotWidth * (1 - gapRatio);

  return {
    baseline: cartesian.baseline,
    bars: cartesian.points.map((point, index) => ({
      x: padding + slotWidth * index + (slotWidth - barWidth) / 2,
      y: Math.min(point.y, cartesian.baseline),
      width: barWidth,
      height: Math.abs(point.y - cartesian.baseline),
    })),
  };
}

/**
 * Builds rectangles and wicks for OHLC candlestick charts.
 *
 * @param {number[][]} values Array of [Open, High, Low, Close] tuples.
 * @param {{ width?: number, height?: number, padding?: number, gapRatio?: number }} [options] Layout dimensions.
 * @returns {{ candles: { x: number, open: number, high: number, low: number, close: number, isBullish: boolean, bodyY: number, bodyHeight: number, bodyWidth: number }[] }} Candlestick geometry.
 */
export function createCandlestickLayout(
  values,
  { width = 100, height = 30, padding = 2, gapRatio = 0.2 } = {},
) {
  // Extract all Highs and Lows to find the domain
  const allValues = values.flatMap(v => v);
  const domain = createDomain(allValues);
  const yScale = createLinearScale(domain, [height - padding, padding]);
  
  const innerWidth = width - padding * 2;
  const slotWidth = values.length > 0 ? innerWidth / values.length : 0;
  const bodyWidth = slotWidth * (1 - gapRatio);

  return {
    candles: values.map((candle, index) => {
      const [open, high, low, close] = candle;
      const o = yScale.project(open);
      const h = yScale.project(high);
      const l = yScale.project(low);
      const c = yScale.project(close);

      return {
        x: padding + slotWidth * index + (slotWidth - bodyWidth) / 2,
        open: o,
        high: h,
        low: l,
        close: c,
        isBullish: close >= open,
        bodyY: Math.min(o, c),
        bodyHeight: Math.max(Math.abs(o - c), 0.5), // Min 0.5px height so doji candles are visible
        bodyWidth,
      };
    }),
  };
}

/**
 * Converts a polar angle to an SVG coordinate, where zero points to the right.
 *
 * @param {number} centerX Horizontal center coordinate.
 * @param {number} centerY Vertical center coordinate.
 * @param {number} radius Circle radius.
 * @param {number} angle Angle in radians.
 * @returns {{ x: number, y: number }} SVG point.
 */
export function polarToCartesian(centerX, centerY, radius, angle) {
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

/**
 * Allocates non-negative data values across a radial sweep.
 *
 * @param {number[]} values Finite data values.
 * @param {{ startAngle?: number, sweep?: number }} [options] Angular layout options.
 * @returns {{ total: number, slices: { value: number, startAngle: number, endAngle: number }[] }} Slice geometry.
 */
export function createRadialLayout(values, { startAngle = -Math.PI / 2, sweep = TAU } = {}) {
  const positiveValues = values.map((value) => Math.max(0, value));
  const total = positiveValues.reduce((sum, value) => sum + value, 0);
  let angle = startAngle;

  return {
    total,
    slices: positiveValues.map((value) => {
      const nextAngle = angle + (total > 0 ? (value / total) * sweep : 0);
      const slice = { value, startAngle: angle, endAngle: nextAngle };
      angle = nextAngle;
      return slice;
    }),
  };
}

/**
 * Creates an SVG path for a pie sector from shared radial geometry.
 *
 * @param {number} centerX Horizontal center coordinate.
 * @param {number} centerY Vertical center coordinate.
 * @param {number} radius Circle radius.
 * @param {number} startAngle Sector start in radians.
 * @param {number} endAngle Sector end in radians.
 * @returns {string} SVG path data.
 */
export function describePieSector(centerX, centerY, radius, startAngle, endAngle) {
  const sweep = Math.abs(endAngle - startAngle);
  if (sweep < EPSILON) return "";

  if (sweep >= TAU - EPSILON) {
    return [
      `M ${formatNumber(centerX)} ${formatNumber(centerY)}`,
      `m 0 ${formatNumber(-radius)}`,
      `a ${formatNumber(radius)} ${formatNumber(radius)} 0 1 1 0 ${formatNumber(radius * 2)}`,
      `a ${formatNumber(radius)} ${formatNumber(radius)} 0 1 1 0 ${formatNumber(-radius * 2)}`,
      "z",
    ].join(" ");
  }

  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArc = sweep > Math.PI ? 1 : 0;

  return [
    `M ${formatNumber(centerX)} ${formatNumber(centerY)}`,
    `L ${formatNumber(start.x)} ${formatNumber(start.y)}`,
    `A ${formatNumber(radius)} ${formatNumber(radius)} 0 ${largeArc} 1 ${formatNumber(end.x)} ${formatNumber(end.y)}`,
    "Z",
  ].join(" ");
}

/**
 * Creates an SVG path for an open arc (e.g. for a gauge chart).
 *
 * @param {number} centerX Horizontal center coordinate.
 * @param {number} centerY Vertical center coordinate.
 * @param {number} radius Circle radius.
 * @param {number} startAngle Sector start in radians.
 * @param {number} endAngle Sector end in radians.
 * @returns {string} SVG path data.
 */
export function describeArc(centerX, centerY, radius, startAngle, endAngle) {
  const sweep = Math.abs(endAngle - startAngle);
  if (sweep < EPSILON) return "";

  if (sweep >= TAU - EPSILON) {
    return [
      `M ${formatNumber(centerX)} ${formatNumber(centerY - radius)}`,
      `a ${formatNumber(radius)} ${formatNumber(radius)} 0 1 1 0 ${formatNumber(radius * 2)}`,
      `a ${formatNumber(radius)} ${formatNumber(radius)} 0 1 1 0 ${formatNumber(-radius * 2)}`,
    ].join(" ");
  }

  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArc = sweep > Math.PI ? 1 : 0;

  return [
    `M ${formatNumber(start.x)} ${formatNumber(start.y)}`,
    `A ${formatNumber(radius)} ${formatNumber(radius)} 0 ${largeArc} 1 ${formatNumber(end.x)} ${formatNumber(end.y)}`
  ].join(" ");
}

/** @param {number} value Numeric SVG coordinate. */
function formatNumber(value) {
  const rounded = Number(value.toFixed(3));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/**
 * Calculates stacked layout coordinates for multiple series.
 * 
 * @param {number[][]} series Array of data series, where each series is an array of numeric values.
 * @param {{ width?: number, height?: number, padding?: number, offset?: "none" | "silhouette" }} [options] Layout dimensions.
 * @returns {{ layers: { points: { x: number, y0: number, y1: number }[] }[] }} Stacked geometry.
 */
export function createStackedLayout(
  series,
  { width = 100, height = 30, padding = 2, offset = "none" } = {},
) {
  if (series.length === 0) return { layers: [] };
  
  const numPoints = Math.max(...series.map(s => s.length));
  if (numPoints === 0) return { layers: [] };

  // Calculate stacked values (raw data space)
  const stackedData = series.map(() => new Array(numPoints).fill({ y0: 0, y1: 0 }));
  let minVal = 0;
  let maxVal = 0;

  for (let i = 0; i < numPoints; i++) {
    let sum = 0;
    for (let j = 0; j < series.length; j++) {
      sum += (series[j][i] || 0);
    }

    let currentY = offset === "silhouette" ? -sum / 2 : 0;
    
    for (let j = 0; j < series.length; j++) {
      const val = (series[j][i] || 0);
      const y0 = currentY;
      const y1 = currentY + val;
      
      stackedData[j][i] = { y0, y1 };
      
      minVal = Math.min(minVal, y0, y1);
      maxVal = Math.max(maxVal, y0, y1);
      
      currentY = y1;
    }
  }

  // Create scales
  /** @type {[number, number]} */
  const domain = [minVal, maxVal];
  const yScale = createLinearScale(domain, [height - padding, padding]);
  const xScale = createLinearScale([0, Math.max(numPoints - 1, 1)], [padding, width - padding]);

  // Project to SVG coordinates
  return {
    layers: stackedData.map(layerData => ({
      points: layerData.map((d, index) => ({
        x: numPoints === 1 ? width / 2 : xScale.project(index),
        y0: yScale.project(d.y0),
        y1: yScale.project(d.y1),
      }))
    }))
  };
}

/**
 * Allocates data values as concentric radial bars.
 * 
 * @param {number[]} values Finite data values.
 * @param {{ width?: number, height?: number, maxRadius?: number, innerRadius?: number, maxDomain?: number, startAngle?: number, endAngle?: number }} [options] Layout options.
 * @returns {{ tracks: { value: number, radius: number, startAngle: number, endAngle: number }[] }} Track geometry.
 */
export function createRadialBarLayout(
  values,
  { width = 100, height = 100, maxRadius = 40, innerRadius = 10, maxDomain, startAngle = 0, endAngle = Math.PI * 1.5 } = {}
) {
  const domainMax = maxDomain !== undefined ? maxDomain : Math.max(...values, 1);
  const sweep = endAngle - startAngle;
  
  const trackCount = values.length;
  const radiusStep = trackCount > 1 ? (maxRadius - innerRadius) / (trackCount - 1) : 0;

  return {
    tracks: values.map((value, index) => {
      const radius = trackCount === 1 ? maxRadius : innerRadius + index * radiusStep;
      const progress = Math.max(0, Math.min(1, value / domainMax));
      const angle = startAngle + progress * sweep;
      
      return {
        value,
        radius,
        startAngle,
        endAngle: angle,
      };
    })
  };
}
