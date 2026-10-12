// new-box-plot.test.js — <mini-box-plot-chart>: quartiles, whiskers, marks, events, empty data and node reuse.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { boxPlotStats, readBoxSources } from "../../src/core/layouts/box-plot.js";
import { createRealm, dispatchHover, flushMicrotasks, mount, stubSvgLayout } from "./dom.js";

const TAG = "mini-box-plot-chart";
const main = await createRealm("new-box-plot");
// Registered here until define.js lists the chart; the realm query gives it the realm's HTMLElement.
const componentUrl = new URL("../../src/components/mini-box-plot-chart.js?realm=new-box-plot-own", import.meta.url).href;
const { MiniBoxPlotChart } = /** @type {typeof import("../../src/components/mini-box-plot-chart.js")} */ (await import(componentUrl));
if (!customElements.get(TAG)) customElements.define(TAG, MiniBoxPlotChart);
const restoreLayout = stubSvgLayout(main.window);

after(async () => {
  restoreLayout();
  await main.close();
});

afterEach(() => {
  main.document.body.replaceChildren();
});

/**
 * @param {Element} element Chart element.
 * @param {string} selector Shadow-DOM selector.
 * @returns {Element[]} Every matching shadow node.
 */
const shadowAll = (element, selector) => [...(element.shadowRoot?.querySelectorAll(selector) ?? [])];

/**
 * @param {string} data `data` attribute.
 * @param {Record<string, string>} [attributes] Other attributes.
 * @returns {Promise<HTMLElement>} The rendered chart.
 */
async function mountBoxPlot(data, attributes = {}) {
  const element = mount(TAG, (chart) => {
    chart.setAttribute("data", data);
    for (const [name, value] of Object.entries(attributes)) chart.setAttribute(name, value);
  });
  await flushMicrotasks();
  return element;
}

const WITH_OUTLIER = [7, 1, 2, 3, 4, 5, 6, 8, 9, 100];

describe("box-plot statistics", () => {
  test("quartiles interpolate between ranks (R type 7)", () => {
    const stats = boxPlotStats([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    assert.deepEqual(stats, { min: 1, q1: 3.25, median: 5.5, q3: 7.75, max: 10, outliers: [] });
    const odd = boxPlotStats([1, 3, 5, 7, 9]);
    assert.deepEqual([odd.q1, odd.median, odd.q3], [3, 5, 7]);
    assert.deepEqual(boxPlotStats([4]), { min: 4, q1: 4, median: 4, q3: 4, max: 4, outliers: [] });
  });

  test("Tukey whiskers stop at 1.5 × IQR; minmax reaches the extremes", () => {
    const tukey = boxPlotStats(WITH_OUTLIER);
    assert.deepEqual([tukey.min, tukey.max, tukey.outliers], [1, 9, [100]]);
    const minmax = boxPlotStats(WITH_OUTLIER, "minmax");
    assert.deepEqual([minmax.min, minmax.max, minmax.outliers], [1, 100, []]);
  });

  test("data shapes: samples, a summary, and an array of either", () => {
    assert.deepEqual(readBoxSources([3, 1, "x", 2]), [[3, 1, 2]]);
    assert.equal(readBoxSources({ q1: 1, median: 2, q3: 3 }).length, 1);
    assert.equal(readBoxSources([[1, 2, 3], { min: 0, q1: 1, median: 2, q3: 3, max: 4 }, [], { q1: 1 }]).length, 2);
    assert.deepEqual(readBoxSources("nope"), []);
  });
});

describe("<mini-box-plot-chart>", () => {
  test("draws the box, median, whiskers and outliers", async () => {
    const element = await mountBoxPlot(JSON.stringify(WITH_OUTLIER));
    assert.equal(shadowAll(element, '[part~="box-group"]').length, 1);
    assert.equal(shadowAll(element, '[part~="whisker"]').length, 2);
    assert.equal(shadowAll(element, '[part~="cap"]').length, 2);
    const [outlier] = shadowAll(element, '[part~="outlier"]');
    assert.equal(outlier?.getAttribute("data-value"), "100");
    // Horizontal domain 1…100 over x 2…98: the outlier sits on the right edge.
    assert.equal(Number(outlier?.getAttribute("cx")), 98);
    const median = shadowAll(element, '[part~="median"]')[0];
    assert.ok(Math.abs(Number(median?.getAttribute("x1")) - (2 + ((5.5 - 1) / 99) * 96)) < 1e-9);
    assert.match(element.shadowRoot?.querySelector("svg")?.getAttribute("aria-label") ?? "", /median 5\.5, quartiles 3\.25 to 7\.75, whiskers 1 to 9, 1 outlier$/);

    element.setAttribute("outliers", "false");
    await flushMicrotasks();
    assert.equal(shadowAll(element, '[part~="outlier"]').length, 0);
  });

  test("several boxes sit side by side, vertically when asked", async () => {
    const element = await mountBoxPlot('[[1, 2, 3, 4], {"min": 0, "q1": 2, "median": 3, "q3": 4, "max": 6, "outliers": [9]}]', {
      orientation: "vertical",
      min: "0",
      max: "10",
    });
    const boxes = shadowAll(element, '[part~="box"]');
    assert.equal(boxes.length, 2);
    assert.ok(Number(boxes[0]?.getAttribute("x")) < Number(boxes[1]?.getAttribute("x")));
    const [outlier] = shadowAll(element, '[part~="outlier"]');
    assert.equal(outlier?.getAttribute("data-box-index"), "1");
    // Vertical: the value axis runs bottom (0, y 28) to top (10, y 2).
    assert.ok(Math.abs(Number(outlier?.getAttribute("cy")) - (28 - 0.9 * 26)) < 1e-9);
  });

  test("hover reports a box summary on series 0 and an outlier on series 1", async () => {
    const element = await mountBoxPlot(JSON.stringify(WITH_OUTLIER), { interactive: "" });
    const [boxEvent] = dispatchHover(element, { selector: '[part~="box"]' });
    const box = /** @type {CustomEvent} */ (boxEvent).detail;
    assert.equal(box.chart, TAG);
    assert.deepEqual([box.index, box.seriesIndex, box.value], [0, 0, 5.5]);
    assert.deepEqual(box.datum, { min: 1, q1: 3.25, median: 5.5, q3: 7.75, max: 9, outliers: [100] });

    const [outlierEvent] = dispatchHover(element, { selector: '[part~="outlier"]' });
    const outlier = /** @type {CustomEvent} */ (outlierEvent).detail;
    assert.deepEqual([outlier.index, outlier.seriesIndex, outlier.value, outlier.boxIndex], [0, 1, 100, 0]);
  });

  test("empty and invalid data draw nothing and an empty label", async () => {
    for (const data of ["[]", "{}", "oops", '[null, "a"]', '{"q1": 1}']) {
      const element = await mountBoxPlot(data);
      assert.equal(shadowAll(element, '[part~="box-group"]').length, 0, data);
      assert.equal(element.shadowRoot?.querySelector("svg")?.getAttribute("aria-label"), "Empty Box-plot chart");
    }
  });

  test("an update keeps the box nodes", async () => {
    const element = await mountBoxPlot("[[1, 2, 3], [2, 3, 4]]");
    const before = shadowAll(element, '[part~="box"]');

    /** @type {any} */ (element).data = [[5, 6, 7], [1, 9, 20]];
    await flushMicrotasks();
    const afterUpdate = shadowAll(element, '[part~="box"]');
    assert.equal(afterUpdate.length, 2);
    assert.ok(afterUpdate.every((node, index) => node === before[index]));

    element.setAttribute("whisker", "minmax");
    await flushMicrotasks();
    assert.equal(shadowAll(element, '[part~="box"]')[0], before[0]);
  });
});
