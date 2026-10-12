// options.test.js — Observed styling attributes stay reactive, never reach stylesheet text, and documented enum values and data shapes are accepted.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createRealm, flushMicrotasks, mount, renderSignature, stubSvgLayout } from "./dom.js";
import { chartFixtures } from "./fixtures.js";

const main = await createRealm("options");
main.defineMiniCharts();
const restoreLayout = stubSvgLayout(main.window);

after(async () => {
  restoreLayout();
  await main.close();
});

afterEach(() => {
  main.document.body.replaceChildren();
  main.document.head.replaceChildren();
});

const fixtures = new Map(chartFixtures.map((fixture) => [fixture.tag, fixture.data]));

/**
 * Mounts a chart with its fixture data and the given attributes, and waits for its batched render.
 *
 * @param {string} tag Chart tag name.
 * @param {Record<string, string>} [attributes] Attributes set before connecting.
 * @returns {Promise<HTMLElement>} The rendered element.
 */
async function render(tag, attributes = {}) {
  const element = mount(tag, (chart) => {
    chart.setAttribute("data", JSON.stringify(fixtures.get(tag)));
    for (const [name, value] of Object.entries(attributes)) chart.setAttribute(name, value);
  });
  await flushMicrotasks();
  return element;
}

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
 * @returns {SVGElement} The matching shadow node.
 */
function shadowNode(element, selector) {
  const node = element.shadowRoot?.querySelector(selector);
  assert.ok(node, `"${selector}" not found in the shadow root`);
  return /** @type {SVGElement} */ (node);
}

/** @returns {string} The text of a chart's shadow stylesheet. */
function sheetOf(/** @type {Element} */ element) {
  return element.shadowRoot?.querySelector("style")?.textContent ?? "";
}

/**
 * Length attributes that are written to a private custom property on the svg.
 *
 * @type {readonly { tag: string, attribute: string, property: string, unit: string, mark: string, cssProperty: string }[]}
 */
const lengthOptions = Object.freeze([
  { tag: "mini-candlestick-chart", attribute: "wick-width", property: "--_mc-wick", unit: "", mark: '[part="wick"]', cssProperty: "stroke-width" },
  { tag: "mini-ohlc-chart", attribute: "tick-width", property: "--_mc-tick", unit: "", mark: '[part~="bar"]', cssProperty: "stroke-width" },
  { tag: "mini-range-bar-chart", attribute: "radius", property: "--_mc-radius", unit: "px", mark: '[part~="range-bar"]', cssProperty: "rx" },
  { tag: "mini-win-loss-chart", attribute: "radius", property: "--_mc-radius", unit: "px", mark: '[part~="bar"]', cssProperty: "rx" },
]);

describe("styling attributes apply after the first render", () => {
  for (const { tag, attribute, property, unit, mark, cssProperty } of lengthOptions) {
    test(`<${tag}> ${attribute} changes the rendered output on every change`, async () => {
      const element = await render(tag);
      const svg = shadowNode(element, "svg");
      assert.equal(svg.style.getPropertyValue(property), "", "an absent attribute must leave the theme token in charge");

      await setAttribute(element, attribute, "2");
      assert.equal(svg.style.getPropertyValue(property), `2${unit}`);

      await setAttribute(element, attribute, "8");
      assert.equal(svg.style.getPropertyValue(property), `8${unit}`);
      assert.equal(
        main.window.getComputedStyle(/** @type {any} */ (shadowNode(element, mark))).getPropertyValue(cssProperty),
        `8${unit}`,
      );

      element.removeAttribute(attribute);
      await flushMicrotasks();
      assert.equal(svg.style.getPropertyValue(property), "");
    });

    test(`<${tag}> an explicit ${attribute} wins over the inherited token`, async () => {
      const token = cssProperty === "rx" ? "--mini-chart-bar-radius" : `--mini-chart-${attribute}`;
      const style = main.document.createElement("style");
      style.textContent = `${tag} { ${token}: 5${unit}; }`;
      main.document.head.append(style);

      const element = await render(tag, { [attribute]: "1" });
      assert.equal(
        main.window.getComputedStyle(/** @type {any} */ (shadowNode(element, mark))).getPropertyValue(cssProperty),
        `1${unit}`,
      );
    });

    test(`<${tag}> ignores an invalid ${attribute} and keeps the stylesheet intact`, async () => {
      const element = await render(tag, { [attribute]: "abc" });
      const svg = shadowNode(element, "svg");
      assert.equal(svg.style.getPropertyValue(property), "");

      await setAttribute(element, attribute, "-3");
      assert.equal(svg.style.getPropertyValue(property), "");

      await setAttribute(element, attribute, "3px");
      assert.equal(svg.style.getPropertyValue(property), `3${unit}`, "a unit suffix must not be doubled");
    });
  }

  test("<mini-candlestick-chart> hollow-bullish toggles the bullish body fill", async () => {
    const element = await render("mini-candlestick-chart");
    const svg = shadowNode(element, "svg");
    assert.equal(svg.hasAttribute("data-hollow-bullish"), true, "bullish bodies are hollow by default");

    await setAttribute(element, "hollow-bullish", "false");
    assert.equal(svg.hasAttribute("data-hollow-bullish"), false);
    const bullish = /** @type {any} */ (shadowNode(element, '[part="candle"][data-bullish]'));
    assert.equal(main.window.getComputedStyle(bullish).fill, "currentColor");

    await setAttribute(element, "hollow-bullish", "");
    assert.equal(svg.hasAttribute("data-hollow-bullish"), true);
    assert.equal(main.window.getComputedStyle(bullish).fill, "transparent");
  });

  test("<mini-radial-bar-chart> round-caps toggles the ring caps", async () => {
    const element = await render("mini-radial-bar-chart");
    const svg = shadowNode(element, "svg");
    const ring = /** @type {any} */ (shadowNode(element, '[part~="track-fg"]'));
    assert.equal(svg.hasAttribute("data-round-caps"), true, "caps are round by default");
    assert.equal(main.window.getComputedStyle(ring).strokeLinecap, "round");

    await setAttribute(element, "round-caps", "false");
    assert.equal(svg.hasAttribute("data-round-caps"), false);
    assert.equal(main.window.getComputedStyle(ring).strokeLinecap, "butt");

    await setAttribute(element, "round-caps", "true");
    assert.equal(main.window.getComputedStyle(ring).strokeLinecap, "round");
  });

  test("<mini-gauge-chart> needle-type swaps the needle shape", async () => {
    const element = await render("mini-gauge-chart");
    const needle = shadowNode(element, '[part="needle"]');
    const triangle = needle.getAttribute("d");

    await setAttribute(element, "needle-type", "line");
    const line = needle.getAttribute("d");
    assert.notEqual(line, triangle);

    await setAttribute(element, "needle-type", "triangle");
    assert.equal(needle.getAttribute("d"), triangle);
  });

  test("<mini-bar-chart> keeps one stylesheet text across renders", async () => {
    const element = await render("mini-bar-chart");
    const style = element.shadowRoot?.querySelector("style");
    const text = style?.textContent;

    /** @type {MutationRecord[]} */
    const records = [];
    const observer = new main.window.MutationObserver((list) => records.push(...list));
    observer.observe(/** @type {any} */ (style), { childList: true, characterData: true, subtree: true });

    await setAttribute(element, "data", "[4, 5, 6]");
    await setAttribute(element, "radius", "2");
    await setAttribute(element, "label", "Sales");
    records.push(...observer.takeRecords());
    observer.disconnect();

    assert.equal(element.shadowRoot?.querySelector("style"), style);
    assert.equal(style?.textContent, text);
    assert.deepEqual(records, [], "the stylesheet was rewritten");
  });
});

describe("attribute values never reach stylesheet text", () => {
  const injection = "1;} :host{display:none} x{";

  for (const { tag, attribute } of lengthOptions) {
    test(`<${tag}> ${attribute}='${injection}' leaves the stylesheet identical`, async () => {
      const plain = await render(tag);
      const injected = await render(tag, { [attribute]: injection });

      assert.equal(sheetOf(injected), sheetOf(plain));
      assert.doesNotMatch(sheetOf(injected), /display:none/);

      // The same holds when the value arrives after the first render.
      await setAttribute(plain, attribute, injection);
      assert.equal(sheetOf(plain), sheetOf(injected));
    });
  }

  for (const [tag, attributes] of /** @type {const} */ ([
    ["mini-candlestick-chart", { "hollow-bullish": "false" }],
    ["mini-radial-bar-chart", { "round-caps": "false" }],
    ["mini-gauge-chart", { "needle-type": "line" }],
  ])) {
    test(`<${tag}> ${Object.keys(attributes)[0]} leaves the stylesheet identical`, async () => {
      const plain = await render(tag);
      const configured = await render(tag, attributes);
      assert.equal(sheetOf(configured), sheetOf(plain));
    });
  }
});

describe("documented enum values and data shapes", () => {
  test("<mini-win-loss-chart> mode=\"uptime\" renders the status strip", async () => {
    const status = await render("mini-win-loss-chart", { mode: "status" });
    const uptime = await render("mini-win-loss-chart", { mode: "uptime" });
    const winLoss = await render("mini-win-loss-chart");

    assert.deepEqual(renderSignature(uptime), renderSignature(status));
    assert.notDeepEqual(renderSignature(status), renderSignature(winLoss));
  });

  test("<mini-win-loss-chart> mode=\"binary\" renders the default win-loss layout", async () => {
    const binary = await render("mini-win-loss-chart", { mode: "binary" });
    const winLoss = await render("mini-win-loss-chart", { mode: "win-loss" });
    const unset = await render("mini-win-loss-chart");

    assert.deepEqual(renderSignature(binary), renderSignature(unset));
    assert.deepEqual(renderSignature(winLoss), renderSignature(unset));
  });

  test("<mini-win-loss-chart> switching mode after the first render changes the layout", async () => {
    const element = await render("mini-win-loss-chart");
    const before = renderSignature(element);
    await setAttribute(element, "mode", "uptime");
    assert.notDeepEqual(renderSignature(element), before);
  });

  test("<mini-range-bar-chart> reads value, low and high as current, min and max", async () => {
    const canonical = mount("mini-range-bar-chart", (chart) => {
      chart.setAttribute("data", JSON.stringify([{ min: 10, max: 30, current: 22 }, { min: 5, max: 25, current: 18 }]));
    });
    const aliased = mount("mini-range-bar-chart", (chart) => {
      chart.setAttribute("data", JSON.stringify([{ low: 10, high: 30, value: 22 }, { low: 5, high: 25, value: 18 }]));
    });
    await flushMicrotasks();

    assert.deepEqual(renderSignature(aliased), renderSignature(canonical));
    const marker = /** @type {SVGElement} */ (aliased.shadowRoot?.querySelector('[part~="marker"]'));
    assert.notEqual(marker.style.display, "none", "the value marker is hidden");
  });
});
