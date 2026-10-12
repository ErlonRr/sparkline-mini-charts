// new-waterfall.test.js — <mini-waterfall-chart>: running totals, total bars, connectors, events, empty data and updates.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createRealm, flushMicrotasks, mount, renderSignature, stubSvgLayout } from "./dom.js";

const TAG = "mini-waterfall-chart";
const main = await createRealm("new-waterfall");
// Registered here until src/define.js lists the chart.
const { MiniWaterfallChart, createWaterfallLayout } = await import(new URL("../../src/components/mini-waterfall-chart.js?realm=new-waterfall-own", import.meta.url).href);
if (!customElements.get(TAG)) customElements.define(TAG, MiniWaterfallChart);
const restoreLayout = stubSvgLayout(main.window);

after(async () => {
  restoreLayout();
  await main.close();
});

afterEach(() => {
  main.document.body.replaceChildren();
});

/**
 * @param {(chart: any) => void} [setup] Runs before connecting.
 * @returns {Promise<any>} The rendered chart.
 */
async function render(setup) {
  const element = mount(TAG, setup);
  await flushMicrotasks();
  return element;
}

/**
 * @param {any} chart Chart.
 * @returns {any[]} The bar rects.
 */
const bars = (chart) => [...chart.shadowRoot.querySelectorAll('[part~="bar"]')];

describe("<mini-waterfall-chart>", () => {
  test("steps from one running total to the next; a total bar starts at zero", () => {
    const layout = createWaterfallLayout([10, -4, { total: true }], { width: 100, height: 30, gap: 0.2 });
    assert.deepEqual(layout.map((/** @type {any} */ bar) => [bar.kind, bar.value, bar.start, bar.end]), [
      ["positive", 10, 0, 10],
      ["negative", -4, 10, 6],
      ["total", 6, 0, 6],
    ]);
    const [first, second] = layout;
    assert.equal(second?.startY, first?.endY, "the second bar starts where the first ends");
  });

  test("renders one bar per entry, colored by role, and connectors between them", async () => {
    const chart = await render((el) => el.setAttribute("data", '[10, -4, 6, {"total": true, "label": "End"}]'));
    assert.deepEqual(bars(chart).map((bar) => bar.getAttribute("part")), ["bar positive", "bar negative", "bar positive", "bar total"]);
    assert.equal(chart.shadowRoot.querySelectorAll('[part="connector"]').length, 3);

    chart.connectors = false;
    await flushMicrotasks();
    assert.equal(chart.getAttribute("connectors"), "false");
    assert.equal(chart.shadowRoot.querySelectorAll('[part="connector"]').length, 0);
  });

  test("the data property renders like the attribute", async () => {
    const data = [5, -2, { value: 3, label: "Q3" }, { total: true }];
    const fromAttribute = await render((el) => el.setAttribute("data", JSON.stringify(data)));
    const fromProperty = await render((el) => (el.data = data));
    assert.deepEqual(renderSignature(fromProperty), renderSignature(fromAttribute));
  });

  test("hover and select report the step and the running total", async () => {
    const chart = await render((el) => {
      el.setAttribute("interactive", "");
      el.data = [10, { value: -4, label: "Costs" }, { total: true }];
    });
    /** @type {any[]} */
    const events = [];
    for (const type of ["sparkline-hover", "sparkline-select"]) chart.addEventListener(type, (/** @type {any} */ e) => events.push(e));
    const [, second, third] = bars(chart);
    second.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, composed: true }));
    third.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    assert.deepEqual(events.map((e) => `${e.type}:${e.detail.index}`), ["sparkline-hover:1", "sparkline-select:2"]);
    assert.equal(events[0].detail.value, -4);
    assert.deepEqual(events[0].detail.datum, { value: -4, runningTotal: 6, isTotal: false, label: "Costs" });
    assert.equal(events[1].detail.value, 6);
    assert.deepEqual(events[1].detail.datum, { value: 6, runningTotal: 6, isTotal: true });
    assert.equal(events[1].detail.chart, TAG);
  });

  test("empty and invalid data render no bar and do not throw", async () => {
    const empty = await render();
    assert.equal(bars(empty).length, 0);
    assert.equal(empty.shadowRoot.querySelector("svg").getAttribute("aria-label"), "Empty Waterfall chart");
    empty.setAttribute("data", '["a", null, {"value": "x"}]');
    await flushMicrotasks();
    assert.equal(bars(empty).length, 0);
  });

  test("an update keeps the bar nodes and ends on the new geometry", async () => {
    const reference = await render((el) => (el.data = [4, -2, 3]));
    const finalHeights = bars(reference).map((bar) => bar.getAttribute("height"));

    const chart = await render((el) => (el.data = [1, 1, 1]));
    const before = bars(chart);
    chart.data = [4, -2, 3];
    await flushMicrotasks();
    await main.window.happyDOM.waitUntilComplete();
    const after = bars(chart);
    after.forEach((node, index) => assert.equal(node, before[index]));
    assert.deepEqual(after.map((bar) => bar.getAttribute("height")), finalHeights);
  });
});
