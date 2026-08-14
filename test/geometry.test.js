// geometry.test.js — Unit tests for the shared dependency-free chart geometry.

import assert from "node:assert/strict";
import test from "node:test";

import { parseNumericData } from "../src/core/data.js";
import {
  createBarLayout,
  createBulletLayout,
  createCartesianLayout,
  createDomain,
  createLinearScale,
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

test("createScatterLayout maps 2D points and calculates linear regression trendline", () => {
  const layout = createScatterLayout([[1, 2], [2, 4], [3, 6], [4, 8]], { width: 100, height: 30 });
  assert.equal(layout.points.length, 4);
  assert.ok(layout.trendLine);
  assert.equal(layout.domainX[0], 1);
  assert.equal(layout.domainX[1], 4);
  assert.equal(layout.domainY[0], 2);
  assert.equal(layout.domainY[1], 8);
});



