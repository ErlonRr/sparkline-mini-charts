// meters.test.js — Radial-bar rings follow the data length; the gauge's empty state clears its value.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createRealm, dispatchHover, flushMicrotasks, mount, stubSvgLayout } from "./dom.js";

const main = await createRealm("meters");
main.defineMiniCharts();
const restoreLayout = stubSvgLayout(main.window);

after(async () => {
  restoreLayout();
  await main.close();
});

afterEach(() => {
  main.document.body.replaceChildren();
});

/**
 * Sets one attribute and lets the batched re-render run.
 *
 * @param {Element} element Chart element.
 * @param {string} name Attribute name.
 * @param {string} value Attribute value.
 */
async function setAttribute(element, name, value) {
  element.setAttribute(name, value);
  await flushMicrotasks();
}

/**
 * @param {Element} element Chart element.
 * @param {string} selector Shadow-DOM selector.
 * @returns {Element[]} Every matching shadow node.
 */
function shadowAll(element, selector) {
  return [...(element.shadowRoot?.querySelectorAll(selector) ?? [])];
}

describe("radial-bar rings follow the data length", () => {
  test("[90, 70, 50, 30] → [10, 20] leaves two rings and two gradients", async () => {
    const element = mount("mini-radial-bar-chart", (chart) => {
      chart.setAttribute("interactive", "");
      chart.setAttribute("gradient", "true");
      chart.setAttribute("data", "[90, 70, 50, 30]");
    });
    await flushMicrotasks();
    assert.equal(shadowAll(element, '[part="track"]').length, 4);

    await setAttribute(element, "data", "[10, 20]");

    assert.equal(shadowAll(element, '[part="track"]').length, 2);
    assert.equal(shadowAll(element, "linearGradient").length, 2);
    assert.deepEqual(
      shadowAll(element, "[data-track-index]").map((ring) => ring.getAttribute("data-track-index")),
      ["0", "1"],
    );

    const [event] = dispatchHover(element, { selector: '[data-track-index="1"]' });
    assert.equal(/** @type {CustomEvent} */ (event).detail.value, 20);
  });

  test("the rings grow back and an empty render hides them", async () => {
    const element = mount("mini-radial-bar-chart", (chart) => chart.setAttribute("data", "[90, 70, 50]"));
    await flushMicrotasks();

    await setAttribute(element, "data", "[40]");
    assert.equal(shadowAll(element, '[part="track"]').length, 1);

    await setAttribute(element, "data", "[40, 30, 20]");
    assert.equal(shadowAll(element, '[part="track"]').length, 3);

    await setAttribute(element, "data", "[]");
    const rings = /** @type {SVGElement[]} */ (shadowAll(element, '[part="track"]'));
    assert.equal(rings.length, 3, "the rings are kept, hidden, for the next render");
    assert.ok(rings.every((ring) => ring.style.display === "none"));
  });
});

describe("gauge empty state", () => {
  test("[72] → [] removes the meter value from the svg", async () => {
    const element = mount("mini-gauge-chart", (chart) => chart.setAttribute("data", "[72]"));
    await flushMicrotasks();
    const svg = /** @type {SVGElement} */ (element.shadowRoot?.querySelector('svg[role="meter"]'));
    assert.equal(svg.getAttribute("aria-valuenow"), "72");

    await setAttribute(element, "data", "[]");

    for (const name of ["aria-valuenow", "aria-valuemin", "aria-valuemax"]) {
      assert.equal(svg.hasAttribute(name), false, `${name} stayed on the meter`);
    }
    const needle = /** @type {SVGElement} */ (element.shadowRoot?.querySelector('[part="needle"]'));
    assert.equal(needle.style.opacity, "0");

    await setAttribute(element, "data", "[40]");
    assert.equal(svg.getAttribute("aria-valuenow"), "40");
    assert.equal(svg.getAttribute("aria-valuemin"), "0");
    assert.equal(svg.getAttribute("aria-valuemax"), "100");
  });

  test("the tooltip points at the needle tip, and a click anywhere selects the reading", async () => {
    const element = mount("mini-gauge-chart", (chart) => {
      chart.setAttribute("tooltip", "");
      chart.setAttribute("data", "[50]");
    });
    await flushMicrotasks();
    const selects = /** @type {CustomEvent[]} */ ([]);
    element.addEventListener("sparkline-select", (event) => selects.push(/** @type {CustomEvent} */ (event)));

    dispatchHover(element, { selector: '[part="zones"]', clientX: 5, clientY: 48 });
    const tip = /** @type {HTMLElement} */ (element.shadowRoot?.querySelector('[part="tooltip"]'));
    // Identity screen CTM: the tip of a needle at mid-range is (50, 15); the tooltip sits 6px above it.
    assert.equal(tip.style.left, "50px");
    assert.equal(tip.style.top, "9px");
    assert.equal(tip.textContent, "50");

    const click = new main.window.MouseEvent("click", { bubbles: true, clientX: 5, clientY: 48 });
    element.shadowRoot?.querySelector("svg")?.dispatchEvent(/** @type {Event} */ (/** @type {unknown} */ (click)));
    assert.equal(selects.length, 1);
    assert.equal(selects[0].detail.chart, "mini-gauge-chart");
    assert.equal(selects[0].detail.value, 50);
  });

  test("show-value is a deprecated no-op: no value text, the dial keeps its 100 × 50 viewBox", async () => {
    const element = mount("mini-gauge-chart", (chart) => {
      chart.setAttribute("show-value", "");
      chart.setAttribute("data", "[72]");
    });
    await flushMicrotasks();
    const svg = /** @type {SVGElement} */ (element.shadowRoot?.querySelector('svg[role="meter"]'));
    assert.equal(element.shadowRoot?.querySelector('[part="text"]'), null);
    assert.equal(svg.getAttribute("viewBox"), "0 0 100 50");
  });

  test("the host's own aria attributes are left alone", async () => {
    const element = mount("mini-gauge-chart", (chart) => {
      chart.setAttribute("aria-valuenow", "page-owned");
      chart.setAttribute("data", "[72]");
    });
    await flushMicrotasks();
    await setAttribute(element, "data", "[]");
    assert.equal(element.getAttribute("aria-valuenow"), "page-owned");
  });

  test("a gauge that starts empty draws its track", async () => {
    const zones = mount("mini-gauge-chart");
    const gradient = mount("mini-gauge-chart", (chart) => chart.setAttribute("gradient", ""));
    await flushMicrotasks();

    assert.equal(shadowAll(zones, '[part="track"]').length, 3, "no zone tracks without data");
    assert.equal(shadowAll(gradient, '[part="track"]').length, 1, "no gradient track without data");
    const needle = /** @type {SVGElement} */ (zones.shadowRoot?.querySelector('[part="needle"]'));
    assert.equal(needle.style.opacity, "0");
    assert.equal(zones.shadowRoot?.querySelector("svg")?.hasAttribute("aria-valuenow"), false);
  });

  test("a null value keeps the range and drops the value", async () => {
    const element = mount("mini-gauge-chart", (chart) => chart.setAttribute("data", "[null, 10, 20]"));
    await flushMicrotasks();
    const svg = /** @type {SVGElement} */ (element.shadowRoot?.querySelector("svg"));

    assert.equal(svg.hasAttribute("aria-valuenow"), false);
    assert.equal(svg.getAttribute("aria-valuemin"), "10");
    assert.equal(svg.getAttribute("aria-valuemax"), "20");
    assert.equal(shadowAll(element, '[part="track"]').length, 3);
  });
});
