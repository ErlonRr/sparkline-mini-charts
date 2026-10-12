// new-stacked-bar.test.js — <mini-stacked-bar-chart>: segments, max and track, orientation, events, empty data and updates.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createRealm, flushMicrotasks, mount, renderSignature, stubSvgLayout } from "./dom.js";

const TAG = "mini-stacked-bar-chart";
const main = await createRealm("new-stacked-bar");
// Registered here until src/define.js lists the chart.
const { MiniStackedBarChart } = await import(new URL("../../src/components/mini-stacked-bar-chart.js?realm=new-stacked-bar-own", import.meta.url).href);
if (!customElements.get(TAG)) customElements.define(TAG, MiniStackedBarChart);
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
 * @returns {any[]} The segment rects.
 */
const segments = (chart) => [...chart.shadowRoot.querySelectorAll('[part~="segment"]')];

/**
 * @param {Element} node Rect.
 * @param {string} name Attribute.
 * @returns {number}
 */
const num = (node, name) => Number(node.getAttribute(name));

describe("<mini-stacked-bar-chart>", () => {
  test("renders one segment per entry that fills the whole bar without max", async () => {
    const chart = await render((el) => el.setAttribute("data", "[50, 30, 20]"));
    const nodes = segments(chart);
    assert.equal(nodes.length, 3);
    assert.equal(nodes[1].getAttribute("part"), "segment segment-2");
    const last = /** @type {Element} */ (nodes[2]);
    assert.ok(Math.abs(num(last, "x") + num(last, "width") - 100) < 1e-9, "the last segment ends at the end of the bar");
    assert.ok(num(nodes[0], "width") > num(nodes[1], "width"));
    assert.equal(chart.shadowRoot.querySelector('[part="track"]').style.display, "none");
  });

  test("max fills sum / max of the bar and the track takes the rest", async () => {
    const chart = await render((el) => {
      el.setAttribute("max", "200");
      el.setAttribute("gap", "0");
      el.data = [50, 50];
    });
    const [, second] = segments(chart);
    assert.equal(num(second, "x") + num(second, "width"), 50);
    const track = chart.shadowRoot.querySelector('[part="track"]');
    assert.equal(track.style.display, "");
    assert.equal(num(track, "x"), 50);
    assert.equal(num(track, "width"), 50);
  });

  test("objects carry a label and a color; vertical stacks from the bottom", async () => {
    const chart = await render((el) => {
      el.setAttribute("orientation", "vertical");
      el.data = [{ value: 1, label: "a", color: "#ff0000" }, { value: 3, color: "not a color" }];
    });
    const [first, second] = segments(chart);
    assert.equal(first.style.getPropertyValue("--_mc-segment-color"), "#ff0000");
    assert.match(second.style.getPropertyValue("--_mc-segment-color"), /var\(--mini-chart-color-2/);
    assert.equal(chart.shadowRoot.querySelector("svg").getAttribute("viewBox"), "0 0 20 100");
    assert.equal(num(first, "y") + num(first, "height"), 100, "the first segment sits at the bottom");
  });

  test("the data property renders like the attribute", async () => {
    const data = [{ value: 2, label: "x" }, 5, null];
    const fromAttribute = await render((el) => el.setAttribute("data", JSON.stringify(data)));
    const fromProperty = await render((el) => (el.data = data));
    assert.deepEqual(renderSignature(fromProperty), renderSignature(fromAttribute));
  });

  test("hover and select report the value and its percent of the total", async () => {
    const chart = await render((el) => {
      el.setAttribute("interactive", "");
      el.data = [{ value: 1, label: "Rent" }, 3];
    });
    /** @type {any[]} */
    const events = [];
    for (const type of ["sparkline-hover", "sparkline-select"]) chart.addEventListener(type, (/** @type {any} */ e) => events.push(e));
    const [first, second] = segments(chart);
    first.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, composed: true }));
    second.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    assert.deepEqual(events.map((e) => `${e.type}:${e.detail.index}`), ["sparkline-hover:0", "sparkline-select:1"]);
    assert.deepEqual(events[0].detail.datum, { value: 1, percent: 25, label: "Rent" });
    assert.equal(events[1].detail.value, 3);
    assert.equal(events[1].detail.percentage, 75);
    assert.equal(events[1].detail.chart, TAG);
  });

  test("empty, zero and invalid data render no segment and do not throw", async () => {
    const empty = await render();
    assert.equal(segments(empty).length, 0);
    assert.equal(empty.shadowRoot.querySelector("svg").getAttribute("aria-label"), "Empty Stacked bar chart");
    empty.setAttribute("data", "[0, 0]");
    await flushMicrotasks();
    assert.equal(empty.shadowRoot.querySelectorAll("[data-index]").length, 0);
    assert.equal(empty.shadowRoot.querySelector('[part="track"]').style.display, "", "an all-zero bar shows its track");
    empty.setAttribute("data", "nope");
    await flushMicrotasks();
    assert.equal(segments(empty).length, 0);
  });

  test("an update keeps the segment nodes and ends on the new geometry", async () => {
    const chart = await render((el) => (el.data = [1, 1]));
    const before = segments(chart);
    chart.data = [3, 1];
    await flushMicrotasks();
    await main.window.happyDOM.waitUntilComplete();
    const after = segments(chart);
    after.forEach((node, index) => assert.equal(node, before[index]));
    assert.ok(num(after[0], "width") > num(after[1], "width") * 2);
  });
});
