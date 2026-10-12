// data.test.js — Contract for the `data` property, the per-chart parsers and the render error boundary.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createBulletLayout } from "../../src/core/geometry.js";
import { createRealm, dispatchHover, flushMicrotasks, mount, renderSignature } from "./dom.js";
import { chartFixtures } from "./fixtures.js";

const main = await createRealm("data");
main.defineMiniCharts();

after(async () => {
  await main.close();
});

afterEach(() => {
  main.document.body.replaceChildren();
});

const tags = [...main.components.keys()];
const fixtures = new Map(chartFixtures.map((fixture) => [fixture.tag, fixture.data]));

/** The realm's MiniChartElement, reached through any chart class. */
const MiniChartElement = Object.getPrototypeOf(/** @type {Function} */ (main.components.get("mini-line-chart")));

/**
 * Mounts a chart with the given attributes and waits for its batched render.
 *
 * @param {string} tag Chart tag name.
 * @param {Record<string, string>} attributes Attributes set before connecting.
 * @returns {Promise<HTMLElement>} The rendered element.
 */
async function render(tag, attributes) {
  const element = mount(tag, (chart) => {
    for (const [name, value] of Object.entries(attributes)) chart.setAttribute(name, value);
  });
  await flushMicrotasks();
  return element;
}

/**
 * @param {Element} element Chart element.
 * @param {string} selector Shadow-DOM selector.
 * @returns {Element} The matching node.
 */
function shadowNode(element, selector) {
  const node = element.shadowRoot?.querySelector(selector);
  assert.ok(node, `${selector} not found in <${element.localName}>`);
  return node;
}

/**
 * Replaces `console.error` while `action` runs.
 *
 * @param {() => Promise<void>} action Code under test.
 * @returns {Promise<unknown[][]>} The arguments of every `console.error` call.
 */
async function captureConsoleErrors(action) {
  /** @type {unknown[][]} */
  const calls = [];
  const consoleError = console.error;
  console.error = (/** @type {unknown[]} */ ...args) => calls.push(args);
  try {
    await action();
  } finally {
    console.error = consoleError;
  }
  return calls;
}

describe("data property", () => {
  test("MiniChartElement owns the only data accessor, with a getter and a setter", () => {
    const descriptor = Object.getOwnPropertyDescriptor(MiniChartElement.prototype, "data");
    assert.equal(typeof descriptor?.get, "function");
    assert.equal(typeof descriptor?.set, "function");
  });

  for (const tag of tags) {
    test(`<${tag}> reflects assigned values to the data attribute`, () => {
      const element = /** @type {any} */ (mount(tag));
      const data = fixtures.get(tag);
      const json = JSON.stringify(data);

      element.data = data;
      assert.equal(element.getAttribute("data"), json, "a value is serialized with JSON.stringify");
      assert.deepEqual(element.data, element.parseData(json), "the getter parses the attribute");

      element.data = null;
      assert.equal(element.hasAttribute("data"), false, "null removes the attribute");

      element.data = json;
      assert.equal(element.getAttribute("data"), json, "a string is stored unchanged");

      element.data = undefined;
      assert.equal(element.hasAttribute("data"), false, "undefined removes the attribute");
    });
  }
});

describe("parsing", () => {
  test("<mini-bullet-chart> treats a number as the value and still applies target", async () => {
    const element = await render("mini-bullet-chart", { data: "42", target: "80" });
    const svg = shadowNode(element, "svg");
    const target = shadowNode(element, '[part="target"]');
    const expected = createBulletLayout({ value: 42, target: 80 }, { width: 100, height: 30, padding: 3 });

    assert.equal(svg.getAttribute("aria-valuenow"), "42");
    assert.equal(target.getAttribute("x1"), String(expected.targetMarker.x1));
  });

  test("<mini-bullet-chart> applies min, max and ranges to a number", async () => {
    const element = await render("mini-bullet-chart", { data: "42", min: "0", max: "200", ranges: "[50,100,150]" });

    assert.equal(shadowNode(element, "svg").getAttribute("aria-valuemax"), "200");
    assert.equal(element.shadowRoot?.querySelectorAll('[part~="range"]').length, 3);
  });

  test("<mini-bullet-chart> renders null like a missing data attribute", async () => {
    const withNull = await render("mini-bullet-chart", { data: "null" });
    const withoutData = await render("mini-bullet-chart", {});
    assert.deepEqual(renderSignature(withNull), renderSignature(withoutData));
  });

  test("<mini-gauge-chart> keeps min and max in place when the value is null", async () => {
    const svg = shadowNode(await render("mini-gauge-chart", { data: "[null,0,50]" }), "svg");
    assert.equal(svg.getAttribute("aria-valuemin"), "0");
    assert.equal(svg.getAttribute("aria-valuemax"), "50");
  });

  test("<mini-gauge-chart> reports no reading, not a false 0, for a null value", async () => {
    const element = await render("mini-gauge-chart", { data: "[null,0,50]" });
    const svg = shadowNode(element, "svg");
    assert.equal(svg.hasAttribute("aria-valuenow"), false);
    assert.equal(svg.getAttribute("aria-label"), "Empty Gauge chart");
    assert.equal(/** @type {SVGElement} */ (shadowNode(element, '[part="needle"]')).style.opacity, "0");

    const withNull = await render("mini-gauge-chart", { data: "[null]" });
    assert.equal(shadowNode(withNull, "svg").hasAttribute("aria-valuenow"), false);
    assert.equal(shadowNode(withNull, "svg").getAttribute("aria-label"), "Empty Gauge chart");

    element.setAttribute("data", "[30,0,50]");
    await flushMicrotasks();
    assert.equal(svg.getAttribute("aria-valuenow"), "30");
    element.setAttribute("data", "[]");
    await flushMicrotasks();
    assert.equal(svg.hasAttribute("aria-valuenow"), false, "an emptied gauge drops its last reading");
  });

  test("<mini-gauge-chart> falls back to the min attribute, then the default, for a null min", async () => {
    const byDefault = shadowNode(await render("mini-gauge-chart", { data: "[30,null,50]" }), "svg");
    assert.equal(byDefault.getAttribute("aria-valuenow"), "30");
    assert.equal(byDefault.getAttribute("aria-valuemin"), "0");
    assert.equal(byDefault.getAttribute("aria-valuemax"), "50");

    const byAttribute = shadowNode(await render("mini-gauge-chart", { data: "[30,null,50]", min: "10" }), "svg");
    assert.equal(byAttribute.getAttribute("aria-valuemin"), "10");
    assert.equal(byAttribute.getAttribute("aria-valuemax"), "50");
  });

  test("<mini-progress-chart> falls back to 0 for a null value", async () => {
    const element = await render("mini-progress-chart", { data: "[null]" });
    const svg = shadowNode(element, "svg");
    assert.equal(svg.getAttribute("aria-valuenow"), "0");
    assert.equal(svg.getAttribute("aria-label"), "Empty Progress chart");

    const withoutData = await render("mini-progress-chart", {});
    assert.deepEqual(renderSignature(element), renderSignature(withoutData), "a null value renders like no data, as in 1.4.0");
  });

  for (const tag of ["mini-pie-chart", "mini-half-pie-chart"]) {
    test(`<${tag}> keeps a null slot so later slices keep their color and index`, async () => {
      const element = await render(tag, { data: "[3,null,1]", interactive: "" });
      const third = shadowNode(element, 'path[data-index="2"]');
      assert.equal(third.getAttribute("part"), "segment segment-3");

      const [event] = dispatchHover(element, { selector: 'path[data-index="2"]' });
      assert.deepEqual(
        { index: /** @type {any} */ (event)?.detail.index, value: /** @type {any} */ (event)?.detail.value },
        { index: 2, value: 1 },
      );
    });
  }

  test("<mini-range-bar-chart> drops items that are neither arrays nor objects", async () => {
    const element = await render("mini-range-bar-chart", { data: '[[10,20],null,{"min":5,"max":15},7,"x"]' });
    assert.equal(element.shadowRoot?.querySelectorAll('[part~="range-group"]').length, 2);
  });

  test("<mini-scatter-chart> drops null gaps and keeps plain numbers", async () => {
    const pairs = await render("mini-scatter-chart", { data: '[[1,2],null,{"x":3,"y":4},"x"]' });
    assert.equal(pairs.shadowRoot?.querySelectorAll('[part~="point"]').length, 2);

    const numbers = await render("mini-scatter-chart", { data: "[1,5,3]" });
    assert.equal(numbers.shadowRoot?.querySelectorAll('[part~="point"]').length, 3);
  });

  for (const tag of tags) {
    test(`<${tag}> computes its default label from parsed data`, async () => {
      const element = await render(tag, { data: '[null,"x",{}]' });
      const label = shadowNode(element, "svg").getAttribute("aria-label");
      const chart = /** @type {any} */ (element);
      assert.equal(label, chart.createDefaultLabel(Array.isArray(chart.data) ? chart.data : [chart.data]));
    });
  }
});

describe("render error boundary", () => {
  const BarChart = /** @type {any} */ (main.components.get("mini-bar-chart"));

  /** A bar chart that throws on purpose whenever it has data and `fail` is set. */
  class FailingBarChart extends BarChart {
    fail = true;

    render() {
      if (this.fail && this.data.length > 0) throw new Error("render failed on purpose");
      super.render();
    }
  }

  /** A chart that throws on purpose on every render, its empty state included. */
  class BrokenChart extends MiniChartElement {
    get chartName() {
      return "Broken";
    }

    renderChart() {
      throw new Error("render failed on purpose");
    }
  }

  main.window.customElements.define("test-failing-bar-chart", /** @type {any} */ (FailingBarChart));
  main.window.customElements.define("test-broken-chart", /** @type {any} */ (BrokenChart));

  test("a failing render logs once per element and shows the chart's own empty state", async () => {
    /** @type {any} */
    let first;
    const calls = await captureConsoleErrors(async () => {
      first = await render("test-failing-bar-chart", { data: "[1,2,3]" });
      first.setAttribute("data", "[4,5]");
      await flushMicrotasks();
      first.setAttribute("data", "[6]");
      await flushMicrotasks();
      await render("test-failing-bar-chart", { data: "[1,2,3]" });
    });

    assert.equal(calls.length, 2, "one console.error per failing element");
    assert.ok(calls.every((args) => args.some((arg) => arg instanceof Error)), "the error is passed to console.error");

    const svg = shadowNode(first, "svg");
    assert.equal(svg.getAttribute("role"), "img");
    assert.equal(svg.getAttribute("aria-label"), "Empty Bar chart");
    assert.equal(first.shadowRoot.querySelectorAll('[part~="bar"]').length, 0);

    first.fail = false;
    first.setAttribute("data", "[1,2]");
    await flushMicrotasks();
    assert.equal(first.shadowRoot.querySelectorAll('[part~="bar"]').length, 2, "the chart recovers on the next valid render");
  });

  test("when the empty state throws too, the shared empty SVG is shown", async () => {
    /** @type {any} */
    let element;
    const calls = await captureConsoleErrors(async () => {
      element = await render("test-broken-chart", { data: "[1,2,3]" });
      element.setAttribute("data", "[4]");
      await flushMicrotasks();
    });

    assert.equal(calls.length, 1);
    const svg = shadowNode(element, "svg");
    assert.equal(svg.getAttribute("role"), "img");
    assert.equal(svg.getAttribute("aria-label"), "Empty Broken chart");
    assert.equal(shadowNode(element, "title").textContent, "Empty Broken chart");
  });

  for (const tag of tags) {
    const ChartClass = /** @type {any} */ (main.components.get(tag));

    /** The chart, made to throw on every render while `fail` is set, its empty state included. */
    class RecoveringChart extends ChartClass {
      fail = false;

      render() {
        if (this.fail) throw new Error("render failed on purpose");
        super.render();
      }
    }

    main.window.customElements.define(`test-recovering-${tag}`, /** @type {any} */ (RecoveringChart));

    test(`<${tag}> recovers from the shared empty SVG on the next valid render`, async () => {
      const json = JSON.stringify(fixtures.get(tag));
      /** @type {any} */
      let element;
      /** @type {string[]} */
      let healthy = [];
      const calls = await captureConsoleErrors(async () => {
        element = await render(`test-recovering-${tag}`, { data: json });
        // An update render, not the first one, which starts entry animations.
        element.setAttribute("data", json);
        await flushMicrotasks();
        healthy = renderSignature(element);

        element.fail = true;
        element.setAttribute("data", json);
        await flushMicrotasks();
        assert.match(shadowNode(element, "svg").getAttribute("aria-label") ?? "", /^Empty /);

        element.fail = false;
        element.setAttribute("data", json);
        await flushMicrotasks();
      });

      assert.equal(calls.length, 1);
      assert.equal(element.shadowRoot.querySelectorAll("svg").length, 1);
      assert.deepEqual(renderSignature(element), healthy, "the chart's own tree is back and up to date");
    });
  }
});
