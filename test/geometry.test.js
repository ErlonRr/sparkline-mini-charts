// geometry.test.js — Unit tests for the shared dependency-free chart geometry.

import assert from "node:assert/strict";
import test from "node:test";

import { parseNumericData } from "../src/core/data.js";
import {
  createBarLayout,
  createBulletLayout,
  createCandlestickLayout,
  createCartesianLayout,
  createDomain,
  createLinearScale,
  createRadialBarLayout,
  createRadialLayout,
  createRangeBarLayout,
  createScatterLayout,
  createSmoothPath,
  createSmoothAreaPath,
  createStepPath,
  createStackedLayout,
  createWinLossLayout,
  describePieSector,
} from "../src/core/geometry.js";



test("parseNumericData preserves only finite numeric values", () => {
  assert.deepEqual(parseNumericData('[1, "2", null, 3.5, 1e999]'), [1, 3.5]);
  assert.deepEqual(parseNumericData("not json"), []);
});

test("createDomain includes a zero baseline when requested and supports explicit min/max", () => {
  assert.deepEqual(createDomain([5, 10], { includeZero: true }), [0, 10]);
  assert.deepEqual(createDomain([-10, -5], { includeZero: true }), [-10, 0]);
  assert.deepEqual(createDomain([4, 4]), [3.6, 4.4]);
  assert.deepEqual(createDomain([5, 10], { min: 0, max: 20 }), [0, 20]);
});

test("createLinearScale projects values between input and SVG coordinates", () => {
  const scale = createLinearScale([0, 10], [28, 2]);

  assert.equal(scale.project(0), 28);
  assert.equal(scale.project(5), 15);
  assert.equal(scale.project(10), 2);
});

test("createCartesianLayout maps single-value series to the chart center", () => {
  const layout = createCartesianLayout([8]);

  assert.equal(layout.points[0].x, 50);
  assert.ok(Math.abs(layout.points[0].y - 15) < 0.0000001);
});

test("createBarLayout shares a zero baseline across positive and negative values", () => {
  const layout = createBarLayout([-5, 5]);

  assert.equal(layout.bars.length, 2);
  assert.equal(layout.bars[0].y, layout.baseline);
  assert.equal(layout.bars[1].y, 2);
  assert.ok(layout.bars.every((bar) => bar.height > 0));
});

test("createRadialLayout allocates a complete requested sweep", () => {
  const layout = createRadialLayout([1, -2, 3], { startAngle: 0, sweep: Math.PI });

  assert.equal(layout.total, 4);
  assert.equal(layout.slices[1].endAngle, layout.slices[1].startAngle);
  assert.equal(layout.slices[2].endAngle, Math.PI);
});

test("describePieSector creates paths for partial, full circles and donut sectors", () => {
  assert.match(describePieSector(50, 50, 48, 0, Math.PI), /^M 50 50 L 98 50 A 48 48/);
  assert.match(describePieSector(50, 50, 48, 0, Math.PI * 2), /m 0 -48/);
  
  // Donut sector
  const donutSector = describePieSector(50, 50, 48, 0, Math.PI, 24);
  assert.ok(donutSector.includes("A 48 48"));
  assert.ok(donutSector.includes("A 24 24"));
});

test("createSmoothPath generates cubic bezier spline commands", () => {
  const points = [{ x: 0, y: 10 }, { x: 50, y: 20 }, { x: 100, y: 5 }];
  const path = createSmoothPath(points);
  assert.match(path, /^M 0 10 C/);
  assert.ok(path.includes("100 5"));
});

test("createSmoothAreaPath closes smooth line path to baseline", () => {
  const points = [{ x: 0, y: 10 }, { x: 50, y: 20 }, { x: 100, y: 5 }];
  const area = createSmoothAreaPath(points, 28);
  assert.match(area, /^M 0 10 C/);
  assert.ok(area.endsWith("L 100 28 L 0 28 Z"));
});

test("createStepPath generates orthogonal stepped lines", () => {
  const points = [{ x: 0, y: 10 }, { x: 50, y: 20 }, { x: 100, y: 5 }];
  const stepAfter = createStepPath(points, "step-after");
  assert.equal(stepAfter, "M 0 10 H 50 V 20 H 100 V 5");
});

test("createStackedLayout calculates cumulative layer coordinates", () => {
  const series = [[10, 20], [5, 15]];
  const layout = createStackedLayout(series, { width: 100, height: 30 });
  assert.equal(layout.layers.length, 2);
  assert.equal(layout.layers[0].points.length, 2);
});

test("createBulletLayout correctly calculates ranges, measure, and target marker", () => {
  const layout = createBulletLayout({ value: 75, target: 85, ranges: [50, 80, 100], min: 0, max: 100 }, { width: 100, height: 30, padding: 3 });
  assert.equal(layout.value, 75);
  assert.equal(layout.target, 85);
  assert.equal(layout.ranges.length, 3);
  assert.ok(layout.measure.width > 0);
  assert.ok(layout.targetMarker.x1 > 0);
});

test("createWinLossLayout partitions positive, negative, and zero outcomes", () => {
  const layout = createWinLossLayout([1, -1, 0, 2], { width: 100, height: 30 });
  assert.equal(layout.items.length, 4);
  assert.equal(layout.items[0].type, "win");
  assert.equal(layout.items[1].type, "loss");
  assert.equal(layout.items[2].type, "tie");
  assert.equal(layout.items[3].type, "win");

  const statusLayout = createWinLossLayout([1, -1, 0], { width: 100, height: 30, mode: "status" });
  assert.equal(statusLayout.mode, "status");
  assert.equal(statusLayout.items[0].height, statusLayout.items[1].height);
});

test("createRangeBarLayout projects floating intervals and optional markers", () => {
  const layout = createRangeBarLayout([[10, 20, 15], [5, 30, 22]], { width: 100, height: 30 });
  assert.equal(layout.bars.length, 2);
  assert.ok(layout.bars[0].height > 0);
  assert.ok(layout.bars[0].marker);
  assert.equal(layout.bars[0].min, 10);
  assert.equal(layout.bars[0].max, 20);
});

test("createRangeBarLayout reads low/high/value as aliases of min/max/current", () => {
  const aliased = createRangeBarLayout([{ low: 10, high: 30, value: 22 }], { width: 100, height: 30 });
  const canonical = createRangeBarLayout([{ min: 10, max: 30, current: 22 }], { width: 100, height: 30 });
  assert.deepEqual(aliased, canonical);
  assert.equal(aliased.bars[0].current, 22);
  assert.ok(aliased.bars[0].marker);

  const both = createRangeBarLayout([{ min: 5, low: 10, max: 25, high: 30, current: 15, value: 22 }]);
  assert.equal(both.bars[0].min, 5);
  assert.equal(both.bars[0].max, 25);
  assert.equal(both.bars[0].current, 15);
});

test("createScatterLayout maps 2D points and calculates linear regression trendline", () => {
  const layout = createScatterLayout([[1, 2], [2, 4], [3, 6], [4, 8]], { width: 100, height: 30 });
  assert.equal(layout.points.length, 4);
  assert.ok(layout.trendLine);
  assert.equal(layout.domainX[0], 1);
  assert.equal(layout.domainX[1], 4);
  assert.equal(layout.domainY[0], 2);
  assert.equal(layout.domainY[1], 8);
});

test("createCandlestickLayout scales only open/high/low/close: extra tuple columns are ignored", () => {
  const ohlc = [[10, 12, 9, 11], [11, 14, 10, 13], [13, 13, 8, 9]];
  const expected = createCandlestickLayout(ohlc);

  const ohlcv = ohlc.map((row, index) => [...row, 50_000 * (index + 1)]);
  assert.deepEqual(createCandlestickLayout(ohlcv), expected);

  const timestamped = ohlc.map((row) => [...row, "2024-01-01"]);
  assert.deepEqual(createCandlestickLayout(timestamped), expected);
});

test("createStackedLayout counts a missing value as 0 at its own index", () => {
  const { layers } = createStackedLayout([[1, null, 3], [2, 2, 2]], { width: 100, height: 30, padding: 2 });
  const [bottom, top] = layers;

  // Stack heights per column: 3, 2, 5. The 3 of the first series stays at index 2.
  const yOf = (/** @type {number} */ value) => 28 - (value / 5) * 26;
  assert.deepEqual(bottom.points.map((p) => p.y1), [yOf(1), yOf(0), yOf(3)]);
  assert.deepEqual(top.points.map((p) => p.y1), [yOf(3), yOf(2), yOf(5)]);
  assert.deepEqual(top.points.map((p) => p.y0), bottom.points.map((p) => p.y1));
});

test("extents of large series are measured without spreading into Math.min/Math.max", () => {
  const values = Array.from({ length: 1_000_000 }, (_, index) => index % 1000);

  assert.deepEqual(createDomain(values), [0, 999]);
  assert.deepEqual(createCartesianLayout(values).domain, [0, 999]);
  assert.equal(createBarLayout(values).bars.length, values.length);

  const candles = Array.from({ length: 250_000 }, (_, index) => [index % 7, 10, 0, (index + 3) % 7]);
  assert.equal(createCandlestickLayout(candles).candles.length, candles.length);

  assert.equal(createRadialBarLayout(values).tracks.length, values.length);
  assert.equal(createBulletLayout({ value: 5, target: 7, ranges: values }).max, 999);
  assert.equal(createRangeBarLayout(values.map((v) => [v, v + 1])).bars.length, values.length);
  const scatter = createScatterLayout(values.map((v, index) => [index, v]));
  assert.deepEqual(scatter.domainY, [0, 999]);
  assert.deepEqual(scatter.domainX, [0, values.length - 1]);
});

test("createDomain skips entries that are not finite numbers", () => {
  assert.deepEqual(createDomain([3, Number.NaN, 7, Infinity]), [3, 7]);
  assert.deepEqual(createDomain([Number.NaN]), [0, 1]);
});

test("crossed explicit bounds (min >= max) fall back to the data extent instead of flipping the chart", () => {
  assert.deepEqual(createDomain([1, 2, 3], { min: 10, max: 0 }), [1, 3]);
  assert.deepEqual(createDomain([1, 2, 3], { min: 5 }), [1, 3]);
  assert.deepEqual(createDomain([1, 2, 3], { max: -1 }), [1, 3]);
  assert.deepEqual(createDomain([1, 2, 3], { min: 2, max: 2 }), [1, 3]);
  assert.deepEqual(createDomain([5, 10], { includeZero: true, min: 20, max: 0 }), [0, 10]);
  // Valid explicit bounds are still honoured.
  assert.deepEqual(createDomain([1, 2, 3], { min: 0, max: 10 }), [0, 10]);

  const flipped = createCartesianLayout([1, 2, 3], { min: 10, max: 0 });
  assert.deepEqual(flipped, createCartesianLayout([1, 2, 3]));
  assert.ok(flipped.points[2].y < flipped.points[0].y, "a higher value is drawn higher");
  for (const point of flipped.points) assert.ok(point.y >= 2 && point.y <= 28);

  assert.deepEqual(createBarLayout([2, 8], { min: 10, max: 0 }), createBarLayout([2, 8]));
  const candles = [[10, 12, 9, 11], [11, 14, 10, 13]];
  assert.deepEqual(createCandlestickLayout(candles, { min: 10, max: 0 }), createCandlestickLayout(candles));
  const ranges = [[10, 20, 15], [5, 30, 22]];
  assert.deepEqual(createRangeBarLayout(ranges, { min: 10, max: 0 }), createRangeBarLayout(ranges));
  const points = [[1, 2], [2, 4], [3, 6]];
  assert.deepEqual(createScatterLayout(points, { minX: 10, maxX: 0, minY: 10, maxY: 0 }), createScatterLayout(points));

  const bullet = createBulletLayout({ value: 75, target: 85, ranges: [50, 80, 100], min: 10, max: 0 });
  assert.equal(bullet.min, 0);
  assert.equal(bullet.max, 100);
});

test("createRadialBarLayout ignores a maximum that is not positive", () => {
  const expected = createRadialBarLayout([50, 100]);
  assert.deepEqual(createRadialBarLayout([50, 100], { maxDomain: 0 }), expected);
  assert.deepEqual(createRadialBarLayout([50, 100], { maxDomain: -5 }), expected);
  for (const track of createRadialBarLayout([0, 50], { maxDomain: 0 }).tracks) {
    assert.ok(Number.isFinite(track.endAngle));
  }
});
