// live.test.js — Live data (data property, appendData, reflectData), update tweens, tooltip and keyboard navigation.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createRealm, flushMicrotasks, mount, stubSvgLayout } from "./dom.js";
import { chartFixtures } from "./fixtures.js";

const main = await createRealm("live");
main.defineMiniCharts();
const restoreLayout = stubSvgLayout(main.window);

after(async () => {
  restoreLayout();
  await main.close();
});

afterEach(() => {
  main.document.body.replaceChildren();
  Reflect.deleteProperty(globalThis, "matchMedia");
});

/**
 * @param {string} tag Chart tag.
 * @param {(chart: any) => void} [setup] Runs before connecting.
 * @returns {Promise<any>} The rendered chart.
 */
async function render(tag, setup) {
  const element = mount(tag, setup);
  await flushMicrotasks();
  return element;
}

/**
 * @param {Element} element Chart.
 * @param {string} type Event type.
 * @returns {any[]} Live list of the event details.
 */
function record(element, type) {
  /** @type {any[]} */
  const details = [];
  element.addEventListener(type, (event) => details.push(/** @type {CustomEvent} */ (event).detail ?? null));
  return details;
}

/**
 * @param {Element} element Chart.
 * @param {string} key Key name.
 */
function press(element, key) {
  const svg = element.shadowRoot?.querySelector("svg");
  const event = new main.window.KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true });
  svg?.dispatchEvent(/** @type {Event} */ (/** @type {unknown} */ (event)));
}

describe("the data property", () => {
  test("an array renders without a JSON round trip and is still reflected", async () => {
    const chart = await render("mini-line-chart");
    const values = [1, 5, 3];
    const parse = JSON.parse;
    let parses = 0;
    JSON.parse = (/** @type {string} */ text, /** @type {any} */ reviver) => {
      parses += 1;
      return parse(text, reviver);
    };
    try {
      chart.data = values;
      await flushMicrotasks();
    } finally {
      JSON.parse = parse;
    }
    assert.equal(parses, 0, "rendering parsed JSON");
    assert.equal(chart.getAttribute("data"), "[1,5,3]");
    assert.deepEqual(chart.data, [1, 5, 3]);
    assert.equal(chart.shadowRoot.querySelector("svg").getAttribute("aria-label"), "Line chart with 3 values");

    chart.setAttribute("data", "[4, 2]");
    await flushMicrotasks();
    assert.deepEqual(chart.data, [4, 2], "a later attribute takes over");
  });

  test("defineMiniCharts({ reflectData: false }) keeps the values off the attribute", async () => {
    main.defineMiniCharts({ reflectData: false });
    try {
      const chart = await render("mini-bar-chart", (el) => el.setAttribute("data", "[1]"));
      chart.data = [3, 4, 5];
      await flushMicrotasks();
      assert.equal(chart.hasAttribute("data"), false);
      assert.equal(chart.shadowRoot.querySelectorAll('[part~="bar"]').length, 3);
    } finally {
      main.defineMiniCharts({ reflectData: true });
    }
  });

  test("appendData() appends and trims to maxLength", async () => {
    const bars = await render("mini-bar-chart", (el) => (el.data = [1, 2, 3]));
    bars.appendData([4, 5], { maxLength: 4 });
    await flushMicrotasks();
    assert.deepEqual(bars.data, [2, 3, 4, 5]);
    assert.equal(bars.shadowRoot.querySelectorAll('[part~="bar"]').length, 4);

    const line = await render("mini-line-chart", (el) => (el.data = [1, 2]));
    line.appendData(3);
    await flushMicrotasks();
    assert.deepEqual(line.data, [1, 2, 3]);

    const scatter = await render("mini-scatter-chart", (el) => (el.data = [[1, 2]]));
    scatter.appendData([[2, 3], [3, 1]], { maxLength: 2 });
    await flushMicrotasks();
    assert.deepEqual(scatter.data, [[2, 3], [3, 1]]);
  });
});

describe("update transitions", () => {
  /**
   * Turns motion on: the test DOM has animation frames; it gets a media query
   * that does not ask for reduced motion, and the charts a layout box.
   */
  const allowMotion = () => {
    globalThis.matchMedia = /** @type {any} */ (() => ({ matches: false }));
    const prototype = main.window.HTMLElement.prototype;
    const original = prototype.getBoundingClientRect;
    prototype.getBoundingClientRect = function () {
      return this.localName?.startsWith("mini-") ? new main.window.DOMRect(0, 0, 100, 30) : original.call(this);
    };
    restoreBox = () => {
      prototype.getBoundingClientRect = original;
    };
  };
  /** @type {() => void} */
  let restoreBox = () => {};
  afterEach(() => restoreBox());

  test("a line moves through intermediate frames and ends on the final path", async () => {
    const reference = await render("mini-line-chart", (el) => (el.data = [5, 1, 5]));
    const finalD = reference.shadowRoot.querySelector('[part="line"]').getAttribute("d");

    allowMotion();
    const chart = await render("mini-line-chart", (el) => (el.data = [1, 5, 1]));
    const path = chart.shadowRoot.querySelector('[part="line"]');
    const startD = path.getAttribute("d");
    chart.data = [5, 1, 5];
    await flushMicrotasks();
    assert.equal(path.getAttribute("d"), startD, "the update starts from the current line");
    await main.window.happyDOM.waitUntilComplete();
    assert.equal(path.getAttribute("d"), finalD);
  });

  test("motion=\"reduce\" draws the update at once", async () => {
    const reference = await render("mini-bar-chart", (el) => (el.data = [4, 2]));
    const finalHeight = reference.shadowRoot.querySelector('[part~="bar"]').getAttribute("height");

    allowMotion();
    const chart = await render("mini-bar-chart", (el) => {
      el.setAttribute("motion", "reduce");
      el.data = [1, 2];
    });
    chart.data = [4, 2];
    await flushMicrotasks();
    assert.equal(chart.shadowRoot.querySelector('[part~="bar"]').getAttribute("height"), finalHeight);
  });
});

describe("tooltip and keyboard", () => {
  test("tooltip implies interactive, makes the svg focusable and formats the value", async () => {
    const chart = await render("mini-bar-chart", (el) => {
      el.setAttribute("tooltip", "");
      el.setAttribute("locale", "de-DE");
      el.data = [1234.5, 2];
    });
    const svg = chart.shadowRoot.querySelector("svg");
    assert.equal(chart.interactive, true);
    assert.equal(svg.getAttribute("tabindex"), "0");
    assert.ok(svg.hasAttribute("data-interactive"));

    press(chart, "ArrowRight");
    const tip = chart.shadowRoot.querySelector('[part="tooltip"]');
    assert.ok(tip?.hasAttribute("data-visible"));
    assert.equal(tip.textContent, "1.234,5");

    press(chart, "Escape");
    assert.equal(tip.hasAttribute("data-visible"), false);
  });

  for (const { tag, data } of chartFixtures) {
    test(`<${tag}> arrows hover with pointerType "keyboard", Enter selects, Escape leaves`, async () => {
      const chart = await render(tag, (el) => {
        el.setAttribute("tooltip", "");
        el.data = data;
      });
      const hovers = record(chart, "sparkline-hover");
      const selects = record(chart, "sparkline-select");
      const leaves = record(chart, "sparkline-leave");

      press(chart, "ArrowRight");
      assert.equal(hovers.length, 1, "no hover after ArrowRight");
      assert.equal(hovers[0].pointerType, "keyboard");
      assert.equal(hovers[0].chart, tag);
      assert.notEqual(chart.shadowRoot.querySelector('[part="tooltip"]')?.textContent ?? "", "", "empty tooltip");

      press(chart, "End");
      press(chart, "Enter");
      assert.equal(selects.length, 1, "no select after Enter");
      assert.equal(selects[0].pointerType, "keyboard");

      press(chart, "Escape");
      assert.equal(leaves.length, 1, "no leave after Escape");
      assert.equal(chart.shadowRoot.querySelector("[data-active]"), null);
    });
  }
});
