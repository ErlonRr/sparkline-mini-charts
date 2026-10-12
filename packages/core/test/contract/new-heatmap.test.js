// new-heatmap.test.js — <mini-heatmap-chart>: cells, layouts, levels, events, empty data and updates.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createRealm, flushMicrotasks, mount, renderSignature, stubSvgLayout } from "./dom.js";

const TAG = "mini-heatmap-chart";
const main = await createRealm("new-heatmap");
// Registered here until src/define.js lists the chart.
const { MiniHeatmapChart, heatmapLevel } = await import(new URL("../../src/components/mini-heatmap-chart.js?realm=new-heatmap-own", import.meta.url).href);
if (!customElements.get(TAG)) customElements.define(TAG, MiniHeatmapChart);
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
 * @returns {any[]} Every cell rect.
 */
const cells = (chart) => [...chart.shadowRoot.querySelectorAll('[part~="cell"]')];

/**
 * @param {Element} target Node.
 * @param {string} type Event type.
 */
const pointer = (target, type) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, clientX: 4, clientY: 6 }));

describe("<mini-heatmap-chart>", () => {
  test("renders one cell per slot of a number[][] grid, with empty slots for gaps", async () => {
    const chart = await render((el) => el.setAttribute("data", "[[1, 2, 3], [4, null]]"));
    assert.equal(cells(chart).length, 6);
    assert.equal(chart.shadowRoot.querySelectorAll("[data-index]").length, 4);
    assert.equal(chart.shadowRoot.querySelectorAll('[part~="empty"]').length, 2);
    assert.equal(chart.shadowRoot.querySelector("svg").getAttribute("aria-label"), "Heatmap chart with 4 values");
  });

  test("wraps a flat number[] row by row, or column by column with layout=\"calendar\"", async () => {
    const grid = await render((el) => {
      el.setAttribute("columns", "7");
      el.data = Array.from({ length: 14 }, (_, i) => i);
    });
    const [first, second] = cells(grid);
    assert.equal(first.getAttribute("y"), second.getAttribute("y"), "row-major: index 1 is beside index 0");

    const calendar = await render((el) => {
      el.setAttribute("columns", "7");
      el.setAttribute("layout", "calendar");
      el.data = Array.from({ length: 14 }, (_, i) => i);
    });
    const [a, b] = cells(calendar);
    assert.equal(a.getAttribute("x"), b.getAttribute("x"), "calendar: index 1 is below index 0");
    assert.notEqual(a.getAttribute("y"), b.getAttribute("y"));
  });

  test("quantizes intensity into levels; levels=0 is continuous", () => {
    assert.equal(heatmapLevel(0, 0, 10, 5), 0);
    assert.equal(heatmapLevel(1, 0, 10, 5), 0.25);
    assert.equal(heatmapLevel(10, 0, 10, 5), 1);
    assert.equal(heatmapLevel(3, 0, 10, 0), 0.3);
    assert.equal(heatmapLevel(20, 0, 10, 0), 1, "clamped to the domain");
  });

  test("the data property renders like the attribute", async () => {
    const data = [[0, 5], [10, 2]];
    const fromAttribute = await render((el) => el.setAttribute("data", JSON.stringify(data)));
    const fromProperty = await render((el) => (el.data = data));
    assert.deepEqual(renderSignature(fromProperty), renderSignature(fromAttribute));
    assert.equal(cells(fromProperty)[2].style.getPropertyValue("--_mc-level"), "100%");
  });

  test("hover and select carry the cell's row, column and value", async () => {
    const chart = await render((el) => {
      el.setAttribute("interactive", "");
      el.data = [[1, 2], [3, 4]];
    });
    /** @type {any[]} */
    const events = [];
    for (const type of ["sparkline-hover", "sparkline-select", "sparkline-leave"]) chart.addEventListener(type, (/** @type {any} */ e) => events.push(e));

    const target = cells(chart)[3];
    pointer(target, "pointerover");
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    chart.shadowRoot.querySelector("svg").dispatchEvent(new PointerEvent("pointerleave"));

    assert.deepEqual(events.map((e) => e.type), ["sparkline-hover", "sparkline-select", "sparkline-leave"]);
    const { detail } = events[0];
    assert.equal(detail.chart, TAG);
    assert.equal(detail.seriesIndex, 1);
    assert.equal(detail.index, 1);
    assert.equal(detail.value, 4);
    assert.equal(detail.datum, 4);
    assert.equal(detail.row, 1);
    assert.equal(detail.column, 1);
    assert.equal(typeof detail.color, "string");
  });

  test("ArrowDown moves to the next row", async () => {
    const chart = await render((el) => {
      el.setAttribute("tooltip", "");
      el.data = [[1, 2], [3, 4]];
    });
    /** @type {any[]} */
    const hovers = [];
    chart.addEventListener("sparkline-hover", (/** @type {any} */ e) => hovers.push(e.detail));
    const press = (/** @type {string} */ key) =>
      chart.shadowRoot.querySelector("svg").dispatchEvent(new main.window.KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }));
    press("ArrowRight");
    press("ArrowDown");
    assert.deepEqual(hovers.map((d) => d.value), [1, 3]);
    assert.equal(hovers[1].pointerType, "keyboard");
  });

  test("empty and invalid data render no cells and do not throw", async () => {
    const empty = await render();
    assert.equal(cells(empty).length, 0);
    assert.equal(empty.shadowRoot.querySelector("svg").getAttribute("aria-label"), "Empty Heatmap chart");
    empty.setAttribute("data", "{not json");
    await flushMicrotasks();
    assert.equal(cells(empty).length, 0);
  });

  test("an update keeps the cell nodes and ends on the new intensities", async () => {
    const chart = await render((el) => (el.data = [0, 5, 10]));
    const before = cells(chart);
    chart.data = [10, 5, 0];
    await flushMicrotasks();
    await main.window.happyDOM.waitUntilComplete();
    const after = cells(chart);
    assert.equal(after.length, 3);
    after.forEach((node, index) => assert.equal(node, before[index]));
    assert.equal(after[0].style.getPropertyValue("--_mc-level"), "100%");
    assert.equal(after[2].style.getPropertyValue("--_mc-level"), "0%");
  });
});
