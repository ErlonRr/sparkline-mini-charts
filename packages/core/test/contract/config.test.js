// config.test.js — Option properties, instance options, presets, global defaults, uniform event details and the formerly dead attributes.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createRealm, flushMicrotasks, mount, stubSvgLayout } from "./dom.js";

const main = await createRealm("config");
main.defineMiniCharts({
  defaults: { "*": { interactive: true }, "mini-line-chart": { curve: "smooth", points: "all" } },
  presets: {
    dense: { "mini-bar-chart": { gap: 0.05 }, "mini-line-chart": { points: "none" } },
    flat: { "mini-line-chart": { curve: "step" } },
  },
});
const restoreLayout = stubSvgLayout(main.window);

after(async () => {
  restoreLayout();
  await main.close();
});

afterEach(() => {
  main.document.body.replaceChildren();
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

describe("option resolution", () => {
  test("attribute > options > preset (rightmost wins) > tag defaults > '*' defaults > built-in default", async () => {
    const chart = await render("mini-line-chart", (el) => el.setAttribute("data", "[1, 3, 2]"));
    assert.equal(chart.option("curve"), "smooth", "tag default");
    assert.equal(chart.option("interactive"), true, "'*' default");
    assert.equal(chart.option("trendColor"), undefined, "nothing sets it");

    chart.preset = "flat dense";
    assert.equal(chart.getAttribute("preset"), "flat dense");
    assert.equal(chart.option("curve"), "step", "preset beats defaults");
    assert.equal(chart.option("points"), "none", "the rightmost preset wins");

    chart.options = { curve: "linear", points: "last" };
    assert.equal(chart.option("curve"), "linear", "options beat presets");
    assert.ok(Object.isFrozen(chart.options));

    chart.setAttribute("curve", "step-before");
    assert.equal(chart.curve, "step-before", "the attribute beats options");
    chart.curve = null;
    assert.equal(chart.hasAttribute("curve"), false);
    assert.equal(chart.curve, "linear");

    assert.deepEqual(chart.resolvedOptions(), { curve: "linear", points: "last", interactive: true });
  });

  test("properties reflect primitives, keep objects and accept `false` for flags", async () => {
    const gauge = await render("mini-gauge-chart", (el) => el.setAttribute("data", "[40]"));
    gauge.min = 10;
    assert.equal(gauge.getAttribute("min"), "10");
    assert.equal(gauge.min, 10);

    const zones = [{ upTo: 50, color: "green" }, { upTo: 100, color: "red" }];
    gauge.zones = zones;
    assert.equal(gauge.hasAttribute("zones"), false, "objects are not serialized to the attribute");
    assert.deepEqual(gauge.zones, zones);
    await flushMicrotasks();
    assert.equal(gauge.shadowRoot.querySelectorAll('[part="track"]').length, 2, "the zones are drawn");

    gauge.interactive = false;
    assert.equal(gauge.option("interactive"), false, "an explicit false beats the '*' default");
    gauge.setAttribute("zones", '[{"upTo":100,"color":"blue"}]');
    assert.equal(gauge.zones.length, 1, "a later attribute replaces the property object");

    const candle = await render("mini-candlestick-chart");
    candle.hollowBullish = false;
    assert.equal(candle.getAttribute("hollow-bullish"), "false", "default-true flags keep the 1.x \"false\" string");

    const stacked = await render("mini-stacked-area-chart");
    assert.equal(typeof stacked.normalize, "function", "`normalize` stays Node.prototype.normalize()");
    stacked.setAttribute("normalize", "");
    assert.equal(stacked.option("normalize"), true);
  });

  test("defineMiniCharts({ defaults }) re-renders connected charts", async () => {
    const bar = await render("mini-bar-chart", (el) => el.setAttribute("data", "[1, 2, 3, 4]"));
    const width = () => Number(bar.shadowRoot.querySelector("rect").getAttribute("width"));
    const before = width();
    main.defineMiniCharts({ defaults: { "mini-bar-chart": { gap: 0.6 } } });
    await flushMicrotasks();
    assert.ok(width() < before, "the configured gap narrows the bars");
    main.defineMiniCharts({ defaults: { "mini-bar-chart": { gap: undefined } } });
  });

  test("properties set before the definition are upgraded", async () => {
    const realm = await createRealm("config-upgrade");
    try {
      const chart = /** @type {any} */ (realm.document.createElement("mini-pie-chart"));
      chart.padAngle = 12;
      chart.options = { donut: 0.5 };
      realm.document.body.append(chart);
      realm.defineMiniCharts();
      await flushMicrotasks();
      assert.equal(chart.getAttribute("pad-angle"), "12");
      assert.equal(chart.option("donut"), 0.5);
    } finally {
      await realm.close();
    }
  });
});

describe("events", () => {
  test("hover and select carry the uniform detail; hover fires only when the point changes", async () => {
    const bar = await render("mini-bar-chart", (el) => el.setAttribute("data", "[-2, 7, 4]"));
    /** @type {CustomEvent[]} */
    const events = [];
    for (const type of ["sparkline-hover", "sparkline-select"]) bar.addEventListener(type, (/** @type {any} */ e) => events.push(e));

    const rects = bar.shadowRoot.querySelectorAll("rect[data-index]");
    const pointer = (/** @type {Element} */ target, /** @type {string} */ type) =>
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, clientX: 12, clientY: 5 }));

    pointer(rects[1], "pointerover");
    pointer(rects[1], "pointerover");
    pointer(rects[2], "pointerover");
    rects[2].dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, clientX: 30, clientY: 8 }));

    assert.deepEqual(events.map((e) => `${e.type}:${e.detail.index}`), ["sparkline-hover:1", "sparkline-hover:2", "sparkline-select:2"]);
    const { detail } = events[2];
    assert.equal(detail.chart, "mini-bar-chart");
    assert.equal(detail.seriesIndex, 0);
    assert.equal(detail.value, 4);
    assert.equal(detail.datum, 4);
    assert.equal(typeof detail.color, "string");
    assert.equal(detail.clientX, 30);
    assert.equal(detail.isPositive, true, "the 1.x keys are kept");
    assert.equal(detail.element, rects[2]);

    bar.shadowRoot.querySelector("svg").dispatchEvent(new PointerEvent("pointerleave"));
    pointer(rects[2], "pointerover");
    assert.equal(events.length, 4, "after a leave, the same point hovers again");
  });

  test("layer charts report the layer as seriesIndex and the datum of the column", async () => {
    const stacked = await render("mini-stacked-area-chart", (el) => el.setAttribute("data", "[[1, 2, 3], [4, 5, 6]]"));
    /** @type {any[]} */
    const details = [];
    stacked.addEventListener("sparkline-select", (/** @type {any} */ e) => details.push(e.detail));
    const layer = stacked.shadowRoot.querySelector('[data-layer-index="1"]');
    layer.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, clientX: 98, clientY: 10 }));
    assert.equal(details.length, 1);
    assert.equal(details[0].seriesIndex, 1);
    assert.equal(details[0].index, 2);
    assert.equal(details[0].value, 6);
    assert.equal(details[0].layerIndex, 1);
  });
});

describe("attributes that had no effect in 1.4", () => {
  test("pie pad-angle opens a gap between slices", async () => {
    const pie = await render("mini-pie-chart", (el) => el.setAttribute("data", "[1, 1]"));
    const path = () => pie.shadowRoot.querySelector('[part~="segment"]').getAttribute("d");
    const solid = path();
    pie.setAttribute("pad-angle", "10");
    await flushMicrotasks();
    assert.notEqual(path(), solid);
  });

  test("bar baseline makes bars grow from that value", async () => {
    const bar = await render("mini-bar-chart", (el) => {
      el.setAttribute("data", "[2, 8]");
      el.setAttribute("baseline", "5");
    });
    const [low, high] = bar.shadowRoot.querySelectorAll("rect[data-index]");
    assert.equal(low.getAttribute("part"), "bar negative");
    assert.equal(high.getAttribute("part"), "bar positive");
    assert.equal(Number(low.getAttribute("y")), Number(high.getAttribute("y")) + Number(high.getAttribute("height")), "both bars meet at the baseline");
  });

  test("radial-bar min is the value of an empty ring", async () => {
    const radial = await render("mini-radial-bar-chart", (el) => {
      el.setAttribute("data", "[50]");
      el.setAttribute("max", "100");
    });
    const offset = () => Number(radial.shadowRoot.querySelector('[part~="track-fg"]').style.strokeDashoffset);
    assert.equal(offset(), 50);
    radial.setAttribute("min", "40");
    await flushMicrotasks();
    assert.ok(Math.abs(offset() - (100 - (10 / 60) * 100)) < 1e-9);
  });

  test("win-loss colors beat the tokens through private variables", async () => {
    const chart = await render("mini-win-loss-chart", (el) => {
      el.setAttribute("data", "[1, -1, 0]");
      el.setAttribute("win-color", "#123456");
      el.setAttribute("loss-color", "not a color");
    });
    const svg = chart.shadowRoot.querySelector("svg");
    assert.equal(svg.style.getPropertyValue("--_mc-win"), "#123456");
    assert.equal(svg.style.getPropertyValue("--_mc-loss"), "", "a value that is not a color is ignored");
    assert.match(chart.shadowRoot.querySelector("style").textContent, /var\(--_mc-win, var\(--mini-chart-win-color/);
  });
});
