// geometry.test.js — Unit tests for the shared dependency-free chart geometry.

import assert from "node:assert/strict";
import test from "node:test";

import { parseNumericData } from "../src/core/data.js";
import {
  createBarLayout,
  createCartesianLayout,
  createDomain,
  createLinearScale,
  createRadialLayout,
  describePieSector,
} from "../src/core/geometry.js";

test("parseNumericData preserves only finite numeric values", () => {
  assert.deepEqual(parseNumericData('[1, "2", null, 3.5, 1e999]'), [1, 3.5]);
  assert.deepEqual(parseNumericData("not json"), []);
});

test("createDomain includes a zero baseline when requested", () => {
  assert.deepEqual(createDomain([5, 10], { includeZero: true }), [0, 10]);
  assert.deepEqual(createDomain([-10, -5], { includeZero: true }), [-10, 0]);
  assert.deepEqual(createDomain([4, 4]), [3.6, 4.4]);
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

test("describePieSector creates paths for partial and full circles", () => {
  assert.match(describePieSector(50, 50, 48, 0, Math.PI), /^M 50 50 L 98 50 A 48 48/);
  assert.match(describePieSector(50, 50, 48, 0, Math.PI * 2), /m 0 -48/);
});
