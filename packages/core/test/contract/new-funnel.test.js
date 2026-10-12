// new-funnel.test.js — <mini-funnel-chart>: step math, marks, events, empty data and node reuse.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createFunnelLayout, readFunnelSteps } from "../../src/core/layouts/funnel.js";
import { createRealm, dispatchHover, flushMicrotasks, mount, stubSvgLayout } from "./dom.js";

const TAG = "mini-funnel-chart";
const main = await createRealm("new-funnel");
// Registered here until define.js lists the chart; the realm query gives it the realm's HTMLElement.
const componentUrl = new URL("../../src/components/mini-funnel-chart.js?realm=new-funnel-own", import.meta.url).href;
const { MiniFunnelChart } = /** @type {typeof import("../../src/components/mini-funnel-chart.js")} */ (await import(componentUrl));
if (!customElements.get(TAG)) customElements.define(TAG, MiniFunnelChart);
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
async function mountFunnel(data, attributes = {}) {
  const element = mount(TAG, (chart) => {
    chart.setAttribute("data", data);
    for (const [name, value] of Object.entries(attributes)) chart.setAttribute(name, value);
  });
  await flushMicrotasks();
  return element;
}

describe("funnel steps", () => {
  test("percent of the first and conversion from the previous step", () => {
    const steps = readFunnelSteps([1000, { value: 620, label: "Signed up" }, 310, 120, "x", null]);
    assert.deepEqual(steps.map((step) => step.value), [1000, 620, 310, 120]);
    assert.deepEqual(steps.map((step) => step.percent), [100, 62, 31, 12]);
    assert.deepEqual(steps.map((step) => step.conversion), [null, 62, 50, (120 / 310) * 100]);
    assert.equal(steps[1]?.label, "Signed up");
  });

  test("bars are centred, proportional to the largest value and fill the axis", () => {
    const bars = createFunnelLayout([100, 50], { width: 100, height: 30, horizontal: true, gap: 0.25 });
    assert.deepEqual(bars.map((bar) => [bar.x, bar.width]), [[0, 100], [25, 50]]);
    const last = bars[1];
    assert.ok(last && Math.abs(last.y + last.height - 30) < 1e-9);

    const vertical = createFunnelLayout([100, 50], { width: 100, height: 30, horizontal: false, gap: 0 });
    assert.deepEqual(vertical.map((bar) => [bar.x, bar.y, bar.width, bar.height]), [[0, 0, 50, 30], [50, 7.5, 50, 15]]);
  });
});

describe("<mini-funnel-chart>", () => {
  test("draws one step per value and a connector between steps", async () => {
    const element = await mountFunnel("[1000, 620, 310, 120]");
    const steps = shadowAll(element, '[part~="step"]');
    assert.equal(steps.length, 4);
    assert.deepEqual(steps.map((step) => Number(step.getAttribute("width"))), [100, 62, 31, 12]);
    const connectors = shadowAll(element, '[part~="connector"]');
    assert.equal(connectors.length, 3);
    assert.ok(connectors.every((path) => (path.getAttribute("d") ?? "").startsWith("M")));
    assert.match(element.shadowRoot?.querySelector("svg")?.getAttribute("aria-label") ?? "", /Funnel chart with 4 steps, from 1000 to 120 \(12% of the first\)/);
  });

  test('shape="bars" hides the connectors and colors="series" uses the series tokens', async () => {
    const element = await mountFunnel("[3, 2, 1]", { shape: "bars", colors: "series", orientation: "vertical" });
    const group = /** @type {SVGGElement | undefined} */ (shadowAll(element, '[part="connectors"]')[0]);
    assert.equal(group?.style.display, "none");
    const step = /** @type {SVGRectElement | undefined} */ (shadowAll(element, '[part~="step"]')[1]);
    assert.match(step?.style.getPropertyValue("--_mc-step-color") ?? "", /var\(--mini-chart-color-2, #f43f5e\)/);
    assert.equal(step?.getAttribute("height"), "20");
  });

  test("hover reports the step with its percent and conversion", async () => {
    const element = await mountFunnel('[1000, {"value": 620, "label": "Trial"}, 310]', { interactive: "" });
    const [event] = dispatchHover(element, { selector: '[data-index="2"]' });
    const detail = /** @type {CustomEvent} */ (event).detail;
    assert.equal(detail.chart, TAG);
    assert.equal(detail.index, 2);
    assert.equal(detail.seriesIndex, 0);
    assert.equal(detail.value, 310);
    assert.deepEqual(detail.datum, { value: 310, percent: 31, conversion: 50 });
    assert.equal(detail.conversion, 50);

    const [second] = dispatchHover(element, { selector: '[data-index="1"]' });
    assert.equal(/** @type {CustomEvent} */ (second).detail.datum.label, "Trial");
  });

  test("empty and invalid data draw no step and an empty label", async () => {
    for (const data of ["[]", "not json", '[null, "a", {"label": "x"}]', '{"value": 1}']) {
      const element = await mountFunnel(data);
      assert.equal(shadowAll(element, '[part~="step"]').length, 0, data);
      assert.equal(element.shadowRoot?.querySelector("svg")?.getAttribute("aria-label"), "Empty Funnel chart");
    }
  });

  test("an update keeps the step nodes and moves them", async () => {
    const element = await mountFunnel("[100, 50, 25]");
    const before = shadowAll(element, '[part~="step"]');

    /** @type {any} */ (element).data = [100, 80, 40];
    await flushMicrotasks();
    const afterUpdate = shadowAll(element, '[part~="step"]');
    assert.equal(afterUpdate.length, 3);
    assert.ok(afterUpdate.every((node, index) => node === before[index]));
    assert.equal(afterUpdate[1]?.getAttribute("width"), "80");

    element.setAttribute("data", "[10, 5]");
    await flushMicrotasks();
    const shorter = shadowAll(element, '[part~="step"]');
    assert.equal(shorter.length, 2);
    assert.equal(shorter[0], before[0]);
    assert.equal(shadowAll(element, '[part~="connector"]').length, 1);
  });
});
