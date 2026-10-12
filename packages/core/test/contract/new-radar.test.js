// new-radar.test.js — <mini-radar-chart>: layout, rendering, events, empty data and node reuse.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { installHappyDom } from "../adapters/happy-dom.js";
import { dispatchHover, flushMicrotasks, stubSvgLayout } from "./dom.js";

const dom = installHappyDom();
const restoreLayout = stubSvgLayout(dom.window);
// The chart class extends the HTMLElement it finds when its module is evaluated.
const { MiniRadarChart } = await import("../../src/components/mini-radar-chart.js");
const { createRadarLayout, readRadarSeries } = await import("../../src/core/layouts/radar.js");
if (!customElements.get("mini-radar-chart")) customElements.define("mini-radar-chart", MiniRadarChart);

after(async () => {
  restoreLayout();
  await dom.close();
});

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Mounts a radar chart and lets its first render run.
 *
 * @param {Record<string, string>} attributes Attributes to set before connecting.
 * @returns {Promise<any>} The connected element.
 */
async function mountRadar(attributes) {
  const element = document.createElement("mini-radar-chart");
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.body.append(element);
  await flushMicrotasks();
  return element;
}

/**
 * @param {Element} element Chart element.
 * @param {string} selector Shadow selector.
 * @returns {Element[]}
 */
const all = (element, selector) => [...(element.shadowRoot?.querySelectorAll(selector) ?? [])];

/**
 * @param {number} actual Actual value.
 * @param {number} expected Expected value.
 */
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`);

describe("radar layout", () => {
  test("places each value on its axis, clockwise from 12 o'clock, scaled to max", () => {
    const layout = createRadarLayout([[1, 2, 3, 4]], { max: 4 });
    assert.equal(layout.axes, 4);
    const [top, right, bottom, left] = layout.series[0];
    close(top.x, 50);
    close(top.y, 50 - 45 * 0.25);
    close(right.x, 50 + 45 * 0.5);
    close(right.y, 50);
    close(bottom.x, 50);
    close(bottom.y, 50 + 45 * 0.75);
    close(left.x, 5);
    close(left.y, 50);
  });

  test("defaults max to the data maximum, clamps to [0, max] and builds the rings", () => {
    const layout = createRadarLayout([[2, -1, 8], [4, 4, 4]], { max: undefined, levels: 2 });
    assert.equal(layout.max, 8);
    assert.deepEqual(layout.rings, [22.5, 45]);
    close(layout.series[0][1].x, 50);
    close(layout.series[0][1].y, 50);
    close(createRadarLayout([[2, 20, 2]], { max: 10 }).series[0][1].x, 50 + 45 * Math.cos(-Math.PI / 2 + (2 * Math.PI) / 3));
  });

  test("reads one or several series, keeps axis positions and needs 3 axes", () => {
    assert.deepEqual(readRadarSeries([1, "x", 3]), [[1, 0, 3]]);
    assert.deepEqual(readRadarSeries([[1, 2, 3], [4, 5]]), [[1, 2, 3], [4, 5, 0]]);
    assert.deepEqual(readRadarSeries([1, 2]), []);
    assert.deepEqual(readRadarSeries([[null, "a", {}], [1, 2, 3]]), [[1, 2, 3]]);
    assert.deepEqual(readRadarSeries(null), []);
  });
});

describe("<mini-radar-chart>", () => {
  test("draws one polygon with a vertex per axis and the grid", async () => {
    const element = await mountRadar({ data: "[4, 2, 4, 2]" });
    const svg = element.shadowRoot.querySelector("svg");
    assert.equal(svg.getAttribute("viewBox"), "0 0 100 100");
    assert.equal(svg.getAttribute("role"), "img");
    assert.equal(svg.getAttribute("aria-label"), "Radar chart with 4 axes");

    const points = all(element, '[part~="point"]');
    assert.equal(points.length, 4);
    assert.deepEqual(points.map((p) => [Number(p.getAttribute("cx")), Number(p.getAttribute("cy"))]), [[50, 5], [72.5, 50], [50, 95], [27.5, 50]]);
    assert.equal(all(element, '[part~="area"]')[0].getAttribute("d"), "M 50 5 L 72.5 50 L 50 95 L 27.5 50 Z");

    // 4 spokes and 3 rings.
    const grid = element.shadowRoot.querySelector('[part="grid"]');
    assert.equal(grid.getAttribute("d").match(/M/g).length, 7);
    element.setAttribute("levels", "0");
    await flushMicrotasks();
    assert.equal(grid.getAttribute("d").match(/M/g).length, 4);
    element.setAttribute("grid", "false");
    await flushMicrotasks();
    assert.equal(grid.getAttribute("d"), "");
  });

  test("colors several series from the palette and a single one with the accent", async () => {
    const element = await mountRadar({ data: "[[1, 2, 3], [3, 2, 1]]", max: "3", fill: "false", points: "" });
    const groups = /** @type {SVGGElement[]} */ (all(element, '[part~="series"]'));
    assert.equal(groups.length, 2);
    assert.match(groups[1].style.color, /--mini-chart-color-2/);
    const svg = element.shadowRoot.querySelector("svg");
    assert.equal(svg.hasAttribute("data-fill"), false);
    assert.equal(svg.hasAttribute("data-points"), true);
    assert.equal(svg.getAttribute("aria-label"), "Radar chart with 2 series over 3 axes");

    element.data = [1, 2, 3];
    await flushMicrotasks();
    const [single] = /** @type {SVGGElement[]} */ (all(element, '[part~="series"]'));
    assert.equal(single.style.color, "");
    assert.equal(all(element, '[part~="series"]').length, 1);
  });

  test("hover reports the vertex: axis as index, series as seriesIndex", async () => {
    const element = await mountRadar({ data: "[[1, 2, 3, 4], [4, 3, 2, 1]]", interactive: "" });
    const [onVertex] = dispatchHover(element, { selector: '[data-series="1"][data-axis="2"]' });
    const detail = /** @type {CustomEvent} */ (onVertex).detail;
    assert.equal(detail.chart, "mini-radar-chart");
    assert.equal(detail.index, 2);
    assert.equal(detail.seriesIndex, 1);
    assert.equal(detail.value, 2);
    assert.equal(detail.datum, 2);

    // Anywhere in the svg: the nearest vertex (series 0, axis 3 sits at (5, 50) with max 4).
    const [nearest] = dispatchHover(element, { selector: "svg", clientX: 8, clientY: 51 });
    assert.equal(/** @type {CustomEvent} */ (nearest).detail.seriesIndex, 0);
    assert.equal(/** @type {CustomEvent} */ (nearest).detail.index, 3);
    assert.equal(element.keyboardTargets().length, 8);
  });

  test("renders empty and invalid data as an accessible empty chart", async () => {
    for (const data of ["[]", "not json", "[1, 2]", '["a", "b", "c"]']) {
      const element = await mountRadar({ data });
      const svg = element.shadowRoot.querySelector("svg");
      assert.equal(svg.getAttribute("aria-label"), "Empty Radar chart");
      assert.equal(all(element, '[part~="series"]').length, 0);
      assert.equal(element.shadowRoot.querySelector('[part="grid"]').getAttribute("d"), "");
    }
  });

  test("grows from the center on entrance, unless motion is reduced", async () => {
    for (const motion of ["auto", "reduce"]) {
      const element = document.createElement("mini-radar-chart");
      // A laid-out host, so motion is allowed.
      element.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);
      element.setAttribute("data", "[1, 1, 1]");
      element.setAttribute("motion", motion);
      document.body.append(element);
      await flushMicrotasks();
      const point = element.shadowRoot?.querySelector('[part~="point"]');
      assert.equal(point?.getAttribute("cy"), motion === "reduce" ? "5" : "50");
    }
  });

  test("updates reuse the series nodes", async () => {
    const element = await mountRadar({ data: "[1, 2, 3, 4, 5]", max: "5" });
    const area = element.shadowRoot.querySelector('[part~="area"]');
    const firstPoint = element.shadowRoot.querySelector('[part~="point"]');
    element.data = [5, 4, 3, 2, 1];
    await flushMicrotasks();
    assert.equal(element.shadowRoot.querySelector('[part~="area"]'), area);
    assert.equal(element.shadowRoot.querySelector('[part~="point"]'), firstPoint);
    assert.equal(firstPoint.getAttribute("cy"), "5");
  });
});
