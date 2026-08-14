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
 * Calculates the numeric domain, optionally preserving a zero baseline and explicit bounds.
 *
 * @param {number[]} values Finite values to measure.
 * @param {{ includeZero?: boolean, min?: number, max?: number }} [options] Domain behavior.
 * @returns {[number, number]} A non-zero-span domain [minimum, maximum].
 */
export function createDomain(values, { includeZero = false, min, max } = {}) {
  let minimum = min !== undefined ? min : (values.length > 0 ? Math.min(...values) : 0);
  let maximum = max !== undefined ? max : (values.length > 0 ? Math.max(...values) : 1);

  if (includeZero) {
    if (min === undefined) minimum = Math.min(minimum, 0);
    if (max === undefined) maximum = Math.max(maximum, 0);
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
 * @param {{ width?: number, height?: number, padding?: number, includeZero?: boolean, min?: number, max?: number }} [options] Layout dimensions.
 * @returns {{ domain: [number, number], points: { x: number, y: number }[], baseline: number }} Chart coordinates.
 */
export function createCartesianLayout(
  values,
  { width = 100, height = 30, padding = 2, includeZero = false, min, max } = {},
) {
  const domain = createDomain(values, { includeZero, min, max });
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
 * Generates an SVG cubic Bézier smooth spline path (Catmull-Rom to Cubic Bézier conversion).
 *
 * @param {{ x: number, y: number }[]} points Cartesian point sequence.
 * @returns {string} SVG path string `d`.
 */
export function createSmoothPath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${formatNumber(points[0].x)} ${formatNumber(points[0].y)}`;
  if (points.length === 2) {
    return `M ${formatNumber(points[0].x)} ${formatNumber(points[0].y)} L ${formatNumber(points[1].x)} ${formatNumber(points[1].y)}`;
  }

  let d = `M ${formatNumber(points[0].x)} ${formatNumber(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${formatNumber(cp1x)} ${formatNumber(cp1y)}, ${formatNumber(cp2x)} ${formatNumber(cp2y)}, ${formatNumber(p2.x)} ${formatNumber(p2.y)}`;
  }
  return d;
}

/**
 * Generates a closed SVG area path using smooth spline interpolation anchored to baseline.
 *
 * @param {{ x: number, y: number }[]} points Cartesian point sequence.
 * @param {number} baseline Vertical baseline coordinate.
 * @returns {string} SVG path string `d`.
 */
export function createSmoothAreaPath(points, baseline) {
  if (points.length === 0) return "";
  const lineD = createSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${lineD} L ${formatNumber(last.x)} ${formatNumber(baseline)} L ${formatNumber(first.x)} ${formatNumber(baseline)} Z`;
}

/**
 * Generates an SVG stepped path between points.
 *
 * @param {{ x: number, y: number }[]} points Cartesian point sequence.
 * @param {"step-after" | "step-before" | "step-middle"} [stepType] Stepping algorithm.
 * @returns {string} SVG path string `d`.
 */
export function createStepPath(points, stepType = "step-after") {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${formatNumber(points[0].x)} ${formatNumber(points[0].y)}`;

  let d = `M ${formatNumber(points[0].x)} ${formatNumber(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    if (stepType === "step-after") {
      d += ` H ${formatNumber(next.x)} V ${formatNumber(next.y)}`;
    } else if (stepType === "step-before") {
      d += ` V ${formatNumber(next.y)} H ${formatNumber(next.x)}`;
    } else {
      const midX = (curr.x + next.x) / 2;
      d += ` H ${formatNumber(midX)} V ${formatNumber(next.y)} H ${formatNumber(next.x)}`;
    }
  }
  return d;
}

/**
 * Builds rectangles around the common Cartesian zero baseline.
 *
 * @param {number[]} values Finite data values.
 * @param {{ width?: number, height?: number, padding?: number, gapRatio?: number, min?: number, max?: number }} [options] Layout dimensions.
 * @returns {{ bars: { x: number, y: number, width: number, height: number }[], baseline: number }} Bar geometry.
 */
export function createBarLayout(
  values,
  { width = 100, height = 30, padding = 2, gapRatio = 0.2, min, max } = {},
) {
  const cartesian = createCartesianLayout(values, { width, height, padding, includeZero: true, min, max });
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
 * @param {{ width?: number, height?: number, padding?: number, gapRatio?: number, min?: number, max?: number }} [options] Layout dimensions.
 * @returns {{ candles: { x: number, open: number, high: number, low: number, close: number, isBullish: boolean, bodyY: number, bodyHeight: number, bodyWidth: number }[] }} Candlestick geometry.
 */
export function createCandlestickLayout(
  values,
  { width = 100, height = 30, padding = 2, gapRatio = 0.2, min, max } = {},
) {
  const allValues = values.flatMap(v => v);
  const domain = createDomain(allValues, { min, max });
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
        bodyHeight: Math.max(Math.abs(o - c), 0.5),
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
 * Creates an SVG path for a pie or donut sector from shared radial geometry.
 *
 * @param {number} centerX Horizontal center coordinate.
 * @param {number} centerY Vertical center coordinate.
 * @param {number} radius Circle outer radius.
 * @param {number} startAngle Sector start in radians.
 * @param {number} endAngle Sector end in radians.
 * @param {number} [innerRadius] Inner radius for donut charts (default: 0).
 * @returns {string} SVG path data.
 */
export function describePieSector(centerX, centerY, radius, startAngle, endAngle, innerRadius = 0) {
  const sweep = Math.abs(endAngle - startAngle);
  if (sweep < EPSILON) return "";

  const isFullCircle = sweep >= TAU - EPSILON;

  // Standard full circle (Pie)
  if (isFullCircle && innerRadius <= 0) {
    return [
      `M ${formatNumber(centerX)} ${formatNumber(centerY)}`,
      `m 0 ${formatNumber(-radius)}`,
      `a ${formatNumber(radius)} ${formatNumber(radius)} 0 1 1 0 ${formatNumber(radius * 2)}`,
      `a ${formatNumber(radius)} ${formatNumber(radius)} 0 1 1 0 ${formatNumber(-radius * 2)}`,
      "z",
    ].join(" ");
  }

  // Full Donut ring
  if (isFullCircle && innerRadius > 0) {
    return [
      `M ${formatNumber(centerX)} ${formatNumber(centerY - radius)}`,
      `a ${formatNumber(radius)} ${formatNumber(radius)} 0 1 0 0 ${formatNumber(radius * 2)}`,
      `a ${formatNumber(radius)} ${formatNumber(radius)} 0 1 0 0 ${formatNumber(-radius * 2)}`,
      `M ${formatNumber(centerX)} ${formatNumber(centerY - innerRadius)}`,
      `a ${formatNumber(innerRadius)} ${formatNumber(innerRadius)} 0 1 1 0 ${formatNumber(innerRadius * 2)}`,
      `a ${formatNumber(innerRadius)} ${formatNumber(innerRadius)} 0 1 1 0 ${formatNumber(-innerRadius * 2)}`,
      "Z",
    ].join(" ");
  }

  const outerStart = polarToCartesian(centerX, centerY, radius, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArc = sweep > Math.PI ? 1 : 0;

  if (innerRadius <= 0) {
    return [
      `M ${formatNumber(centerX)} ${formatNumber(centerY)}`,
      `L ${formatNumber(outerStart.x)} ${formatNumber(outerStart.y)}`,
      `A ${formatNumber(radius)} ${formatNumber(radius)} 0 ${largeArc} 1 ${formatNumber(outerEnd.x)} ${formatNumber(outerEnd.y)}`,
      "Z",
    ].join(" ");
  }

  // Donut sector
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);

  return [
    `M ${formatNumber(outerStart.x)} ${formatNumber(outerStart.y)}`,
    `A ${formatNumber(radius)} ${formatNumber(radius)} 0 ${largeArc} 1 ${formatNumber(outerEnd.x)} ${formatNumber(outerEnd.y)}`,
    `L ${formatNumber(innerEnd.x)} ${formatNumber(innerEnd.y)}`,
    `A ${formatNumber(innerRadius)} ${formatNumber(innerRadius)} 0 ${largeArc} 0 ${formatNumber(innerStart.x)} ${formatNumber(innerStart.y)}`,
    "Z",
  ].join(" ");
}

/**
 * Creates an SVG path for an open arc.
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
 * @param {{ width?: number, height?: number, padding?: number, offset?: "none" | "silhouette" | "expand" }} [options] Layout dimensions.
 * @returns {{ layers: { points: { x: number, y0: number, y1: number }[] }[] }} Stacked geometry.
 */
export function createStackedLayout(
  series,
  { width = 100, height = 30, padding = 2, offset = "none" } = {},
) {
  if (series.length === 0) return { layers: [] };
  
  const numPoints = Math.max(...series.map(s => s.length));
  if (numPoints === 0) return { layers: [] };

  const stackedData = series.map(() => new Array(numPoints).fill({ y0: 0, y1: 0 }));
  let minVal = 0;
  let maxVal = 0;

  for (let i = 0; i < numPoints; i++) {
    let sum = 0;
    for (let j = 0; j < series.length; j++) {
      sum += (series[j][i] || 0);
    }

    let currentY = 0;
    if (offset === "silhouette") {
      currentY = -sum / 2;
    } else if (offset === "expand") {
      currentY = 0;
    }
    
    for (let j = 0; j < series.length; j++) {
      const rawVal = (series[j][i] || 0);
      const val = offset === "expand" && sum > 0 ? (rawVal / sum) * 100 : rawVal;
      const y0 = currentY;
      const y1 = currentY + val;
      
      stackedData[j][i] = { y0, y1 };
      
      minVal = Math.min(minVal, y0, y1);
      maxVal = Math.max(maxVal, y0, y1);
      
      currentY = y1;
    }
  }

  /** @type {[number, number]} */
  const domain = [minVal, maxVal];
  const yScale = createLinearScale(domain, [height - padding, padding]);
  const xScale = createLinearScale([0, Math.max(numPoints - 1, 1)], [padding, width - padding]);

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

/**
 * Calculates geometry for a Stephen Few bullet graph.
 * 
 * @param {{ value?: number, target?: number, ranges?: number[], min?: number, max?: number } | number[]} data Input bullet metrics.
 * @param {{ width?: number, height?: number, padding?: number }} [options] Layout options.
 * @returns {{
 *   value: number,
 *   target: number,
 *   min: number,
 *   max: number,
 *   ranges: Array<{ x: number, y: number, width: number, height: number, upTo: number }>,
 *   measure: { x: number, y: number, width: number, height: number },
 *   targetMarker: { x1: number, y1: number, x2: number, y2: number }
 * }} Bullet chart geometry.
 */
export function createBulletLayout(
  data,
  { width = 100, height = 30, padding = 3 } = {}
) {
  let value = 0;
  let target = 0;
  /** @type {number[]} */
  let rangesInput = [];
  /** @type {number | undefined} */
  let minInput;
  /** @type {number | undefined} */
  let maxInput;

  if (Array.isArray(data)) {
    value = Number.isFinite(data[0]) ? data[0] : 0;
    target = Number.isFinite(data[1]) ? data[1] : value;
    if (data.length > 2) {
      rangesInput = data.slice(2).filter(Number.isFinite);
    }
  } else if (typeof data === "object" && data !== null) {
    value = Number.isFinite(data.value) ? Number(data.value) : 0;
    target = Number.isFinite(data.target) ? Number(data.target) : value;
    if (Array.isArray(data.ranges)) {
      rangesInput = data.ranges.filter(Number.isFinite);
    }
    minInput = Number.isFinite(data.min) ? Number(data.min) : undefined;
    maxInput = Number.isFinite(data.max) ? Number(data.max) : undefined;
  }

  const allPoints = [value, target, ...rangesInput];
  if (minInput !== undefined) allPoints.push(minInput);
  if (maxInput !== undefined) allPoints.push(maxInput);

  const calculatedMin = minInput !== undefined ? minInput : Math.min(0, ...allPoints);
  const calculatedMax = maxInput !== undefined ? maxInput : Math.max(100, ...allPoints);
  const min = calculatedMin;
  const max = calculatedMax > min ? calculatedMax : min + 1;
  const rangeSpan = max - min || 1;

  const innerWidth = Math.max(width - padding * 2, 1);
  const innerHeight = Math.max(height - padding * 2, 1);
  const availableY = padding;

  // Resolve ranges (sorted ascending)
  const sortedRanges = (rangesInput.length > 0 ? rangesInput : [min + rangeSpan * 0.6, min + rangeSpan * 0.85, max])
    .sort((a, b) => a - b);

  let prevX = padding;
  let prevVal = min;
  const ranges = sortedRanges.map((upToVal) => {
    const clampedUpTo = Math.max(min, Math.min(max, upToVal));
    const segmentWidth = ((clampedUpTo - prevVal) / rangeSpan) * innerWidth;
    const item = {
      x: prevX,
      y: availableY,
      width: Math.max(segmentWidth, 0),
      height: innerHeight,
      upTo: clampedUpTo,
    };
    prevX += segmentWidth;
    prevVal = clampedUpTo;
    return item;
  });

  // Measure bar (middle 45% of height)
  const measureHeight = innerHeight * 0.45;
  const measureY = availableY + (innerHeight - measureHeight) / 2;
  const clampedValue = Math.max(min, Math.min(max, value));
  const measureWidth = ((clampedValue - min) / rangeSpan) * innerWidth;

  const measure = {
    x: padding,
    y: measureY,
    width: Math.max(measureWidth, 0),
    height: measureHeight,
  };

  // Target marker (vertical line across 75% of height)
  const targetMarkerHeight = innerHeight * 0.75;
  const targetMarkerY1 = availableY + (innerHeight - targetMarkerHeight) / 2;
  const targetMarkerY2 = targetMarkerY1 + targetMarkerHeight;
  const clampedTarget = Math.max(min, Math.min(max, target));
  const targetX = padding + ((clampedTarget - min) / rangeSpan) * innerWidth;

  const targetMarker = {
    x1: targetX,
    y1: targetMarkerY1,
    x2: targetX,
    y2: targetMarkerY2,
  };

  return {
    value: clampedValue,
    target: clampedTarget,
    min,
    max,
    ranges,
    measure,
    targetMarker,
  };
}

/**
 * Calculates layout coordinates for discrete Win (+1), Loss (-1), and Tie (0) bars or status blocks.
 * 
 * @param {number[]} values Discrete outcome values (positive = win, negative = loss, 0 = tie).
 * @param {{ width?: number, height?: number, padding?: number, gapRatio?: number, mode?: "win-loss" | "status" }} [options] Layout options.
 * @returns {{
 *   items: Array<{ value: number, type: "win" | "loss" | "tie", x: number, y: number, width: number, height: number }>,
 *   baselineY: number,
 *   mode: "win-loss" | "status"
 * }} Win-loss chart layout.
 */
export function createWinLossLayout(
  values,
  { width = 100, height = 30, padding = 3, gapRatio = 0.2, mode = "win-loss" } = {}
) {
  const count = values.length;
  if (count === 0) {
    return { items: [], baselineY: height / 2, mode };
  }

  const innerWidth = Math.max(width - padding * 2, 1);
  const innerHeight = Math.max(height - padding * 2, 1);
  const baselineY = padding + innerHeight / 2;
  const barHeight = innerHeight * 0.44;

  const slotWidth = innerWidth / count;
  const gap = slotWidth * Math.max(0, Math.min(0.8, gapRatio));
  const barWidth = Math.max(slotWidth - gap, 1);

  const items = values.map((val, index) => {
    const x = padding + index * slotWidth + gap / 2;
    /** @type {"win" | "loss" | "tie"} */
    let type = "tie";
    let y = baselineY - 1.5;
    let h = 3;

    if (val > 0) {
      type = "win";
      y = mode === "status" ? padding + 2 : baselineY - barHeight - 1;
      h = mode === "status" ? innerHeight - 4 : barHeight;
    } else if (val < 0) {
      type = "loss";
      y = mode === "status" ? padding + 2 : baselineY + 1;
      h = mode === "status" ? innerHeight - 4 : barHeight;
    } else {
      type = "tie";
      y = mode === "status" ? padding + 2 : baselineY - 1.5;
      h = mode === "status" ? innerHeight - 4 : 3;
    }

    return {
      value: val,
      type,
      x,
      y,
      width: barWidth,
      height: h,
    };
  });

  return { items, baselineY, mode };
}

/**
 * Calculates layout for floating interval range bars with optional current value markers.
 * 
 * @param {Array<number[] | { min: number, max: number, current?: number }>} items Input range items.
 * @param {{ width?: number, height?: number, padding?: number, gapRatio?: number, min?: number, max?: number }} [options] Layout options.
 * @returns {{
 *   bars: Array<{
 *     min: number,
 *     max: number,
 *     current: number | undefined,
 *     x: number,
 *     y: number,
 *     width: number,
 *     height: number,
 *     marker: { x: number, y: number } | undefined
 *   }>
 * }} Range bar chart layout.
 */
export function createRangeBarLayout(
  items,
  { width = 100, height = 30, padding = 4, gapRatio = 0.25, min, max } = {}
) {
  const count = items.length;
  if (count === 0) return { bars: [] };

  const parsedItems = items.map((item) => {
    if (Array.isArray(item)) {
      const v0 = Number.isFinite(item[0]) ? item[0] : 0;
      const v1 = Number.isFinite(item[1]) ? item[1] : v0;
      const cur = item.length > 2 && Number.isFinite(item[2]) ? item[2] : undefined;
      return {
        min: Math.min(v0, v1),
        max: Math.max(v0, v1),
        current: cur,
      };
    } else if (typeof item === "object" && item !== null) {
      const v0 = Number.isFinite(item.min) ? Number(item.min) : 0;
      const v1 = Number.isFinite(item.max) ? Number(item.max) : v0;
      const cur = Number.isFinite(item.current) ? Number(item.current) : undefined;
      return {
        min: Math.min(v0, v1),
        max: Math.max(v0, v1),
        current: cur,
      };
    }
    return { min: 0, max: 0, current: undefined };
  });

  const allVals = parsedItems.flatMap((p) => [p.min, p.max, ...(p.current !== undefined ? [p.current] : [])]);
  const domainMin = min !== undefined ? min : Math.min(...allVals);
  const domainMax = max !== undefined ? max : Math.max(...allVals);

  const innerWidth = Math.max(width - padding * 2, 1);
  const innerHeight = Math.max(height - padding * 2, 1);

  const slotWidth = innerWidth / count;
  const gap = slotWidth * Math.max(0, Math.min(0.8, gapRatio));
  const barWidth = Math.max(slotWidth - gap, 1);

  const yScale = createLinearScale([domainMin, domainMax], [height - padding, padding]);

  const bars = parsedItems.map((item, index) => {
    const x = padding + index * slotWidth + gap / 2;
    const yTop = yScale.project(item.max);
    const yBottom = yScale.project(item.min);
    const y = Math.min(yTop, yBottom);
    const barHeight = Math.max(Math.abs(yBottom - yTop), 2);

    let marker;
    if (item.current !== undefined) {
      const markerY = yScale.project(item.current);
      marker = {
        x: x + barWidth / 2,
        y: markerY,
      };
    }

    return {
      min: item.min,
      max: item.max,
      current: item.current,
      x,
      y,
      width: barWidth,
      height: barHeight,
      marker,
    };
  });

  return { bars };
}

/**
 * Calculates 2D Cartesian layout for scatter plots and bubble sparklines.
 * 
 * @param {Array<[number, number] | [number, number, number] | { x: number, y: number, r?: number } | number>} data Input coordinates.
 * @param {{
 *   width?: number,
 *   height?: number,
 *   padding?: number,
 *   pointRadius?: number,
 *   minX?: number,
 *   maxX?: number,
 *   minY?: number,
 *   maxY?: number
 * }} [options] Layout options.
 * @returns {{
 *   points: Array<{ x: number, y: number, r: number, rawX: number, rawY: number }>,
 *   trendLine: { x1: number, y1: number, x2: number, y2: number } | null,
 *   domainX: [number, number],
 *   domainY: [number, number]
 * }} Scatter chart layout.
 */
export function createScatterLayout(
  data,
  { width = 100, height = 30, padding = 4, pointRadius = 3, minX, maxX, minY, maxY } = {}
) {
  if (!Array.isArray(data) || data.length === 0) {
    return { points: [], trendLine: null, domainX: [0, 1], domainY: [0, 1] };
  }

  /** @type {Array<{ x: number, y: number, r: number }>} */
  const normalized = data.map((item, index) => {
    if (Array.isArray(item)) {
      const x = Number.isFinite(item[0]) ? Number(item[0]) : index;
      const y = item.length > 1 && Number.isFinite(item[1]) ? Number(item[1]) : (Number.isFinite(item[0]) ? Number(item[0]) : 0);
      const r = item.length > 2 && Number.isFinite(item[2]) ? Number(item[2]) : pointRadius;
      return { x, y, r };
    } else if (typeof item === "object" && item !== null) {
      const x = Number.isFinite(item.x) ? Number(item.x) : index;
      const y = Number.isFinite(item.y) ? Number(item.y) : 0;
      const r = Number.isFinite(item.r) ? Number(item.r) : pointRadius;
      return { x, y, r };
    } else if (Number.isFinite(item)) {
      return { x: index, y: Number(item), r: pointRadius };
    }
    return { x: index, y: 0, r: pointRadius };
  });

  const xVals = normalized.map((p) => p.x);
  const yVals = normalized.map((p) => p.y);

  const calcMinX = minX !== undefined ? minX : Math.min(...xVals);
  const calcMaxX = maxX !== undefined ? maxX : Math.max(...xVals);
  const calcMinY = minY !== undefined ? minY : Math.min(...yVals);
  const calcMaxY = maxY !== undefined ? maxY : Math.max(...yVals);

  /** @type {[number, number]} */
  const domainX = [calcMinX, calcMaxX > calcMinX ? calcMaxX : calcMinX + 1];
  /** @type {[number, number]} */
  const domainY = [calcMinY, calcMaxY > calcMinY ? calcMaxY : calcMinY + 1];

  const xScale = createLinearScale(domainX, [padding, width - padding]);
  const yScale = createLinearScale(domainY, [height - padding, padding]);


  const points = normalized.map((p) => ({
    x: xScale.project(p.x),
    y: yScale.project(p.y),
    r: p.r,
    rawX: p.x,
    rawY: p.y,
  }));

  // Calculate Linear Regression Trendline if points >= 2
  let trendLine = null;
  const n = normalized.length;
  if (n >= 2) {
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (const p of normalized) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }

    const denominator = n * sumXX - sumX * sumX;
    if (Math.abs(denominator) > 1e-9) {
      const slope = (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;

      const x1 = domainX[0];
      const y1Val = slope * x1 + intercept;
      const x2 = domainX[1];
      const y2Val = slope * x2 + intercept;

      trendLine = {
        x1: xScale.project(x1),
        y1: yScale.project(y1Val),
        x2: xScale.project(x2),
        y2: yScale.project(y2Val),
      };
    }
  }

  return { points, trendLine, domainX: /** @type {[number, number]} */ (domainX), domainY: /** @type {[number, number]} */ (domainY) };
}



