// theming.test.js — Host style ownership, trend colors, gradient paint and token isolation, through happy-dom's cascade.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createRealm, flushMicrotasks, mount, stubSvgLayout } from "./dom.js";
import { chartFixtures } from "./fixtures.js";

const main = await createRealm("theming");
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
 * Adds a page-level stylesheet, outside every shadow root.
 *
 * @param {string} css Stylesheet text.
 */
function addPageStyles(css) {
  const style = main.document.createElement("style");
  style.textContent = css;
  main.document.head.append(style);
}

/**
 * @param {Element} element Chart element.
 * @param {string} selector Shadow-DOM selector.
 * @returns {Element} The matching shadow node.
 */
function shadowNode(element, selector) {
  const node = element.shadowRoot?.querySelector(selector);
  assert.ok(node, `"${selector}" not found in the shadow root`);
  return node;
}

/**
 * @param {Element} node Element.
 * @returns {import("happy-dom").CSSStyleDeclaration} Its computed style in the realm.
 */
function computed(node) {
  return main.window.getComputedStyle(/** @type {any} */ (node));
}

/** @returns {string} The text of every shadow stylesheet of a chart. */
function sheetOf(/** @type {Element} */ element) {
  return element.shadowRoot?.querySelector("style")?.textContent ?? "";
}

const bulletData = JSON.stringify({ value: 75, target: 85, ranges: [50, 80, 100] });

describe("the host's style is never written", () => {
  for (const { tag, data } of chartFixtures) {
    test(`<${tag}> leaves an inline --mini-chart-color in place across renders`, async () => {
      const element = mount(tag, (chart) => {
        chart.setAttribute("style", "--mini-chart-color: rgb(255, 0, 0)");
        chart.setAttribute("data", JSON.stringify(data));
      });
      await flushMicrotasks();

      /** @type {import("happy-dom").MutationRecord[]} */
      const records = [];
      const observer = new main.window.MutationObserver((list) => records.push(...list));
      observer.observe(/** @type {any} */ (element), { attributes: true, attributeFilter: ["style"] });

      const renders = [
        ["trend-color", "auto"],
        ["data", JSON.stringify(data)],
        ["label", "Revenue"],
        ["interactive", ""],
        ["data", "[]"],
        ["trend-color", "none"],
        ["data", JSON.stringify(data)],
        ["trend-color", "auto"],
      ];
      for (const [name, value] of renders) await setAttribute(element, name, value);
      element.remove();
      main.document.body.append(element);
      await flushMicrotasks();

      assert.deepEqual(
        (await takeRecords(observer, records)).map((record) => record.attributeName),
        [],
        "the chart wrote its host's style attribute",
      );
      assert.equal(/** @type {HTMLElement} */ (element).style.getPropertyValue("--mini-chart-color").trim(), "rgb(255, 0, 0)");

      // The observer does see style writes: a write from the page is recorded.
      /** @type {HTMLElement} */ (element).style.setProperty("--mini-chart-color", "blue");
      assert.equal((await takeRecords(observer, records)).length, 1, "the MutationObserver missed a style write");
      observer.disconnect();
    });
  }
});

/**
 * Collects the records delivered so far and the pending ones, then empties the list.
 *
 * @param {import("happy-dom").MutationObserver} observer Observer.
 * @param {import("happy-dom").MutationRecord[]} records Records already delivered to the callback.
 * @returns {Promise<import("happy-dom").MutationRecord[]>} Every record since the last call.
 */
async function takeRecords(observer, records) {
  await flushMicrotasks();
  const all = [...records, ...observer.takeRecords()];
  records.length = 0;
  return all;
}

describe("trend-color=\"auto\" marks the internal svg", () => {
  for (const tag of ["mini-line-chart", "mini-area-chart"]) {
    test(`<${tag}> sets data-trend and colors the svg from the bullish and bearish tokens`, async () => {
      addPageStyles(`${tag} { --mini-chart-bullish-color: rgb(0, 128, 0); --mini-chart-bearish-color: rgb(128, 0, 0); }`);
      const element = mount(tag, (chart) => {
        chart.setAttribute("style", "--mini-chart-color: rgb(0, 0, 255)");
        chart.setAttribute("trend-color", "auto");
        chart.setAttribute("data", "[1, 2, 3]");
      });
      await flushMicrotasks();
      const svg = shadowNode(element, "svg");

      assert.equal(svg.getAttribute("data-trend"), "up");
      assert.equal(computed(svg).color, "rgb(0, 128, 0)");

      await setAttribute(element, "data", "[3, 2, 1]");
      assert.equal(svg.getAttribute("data-trend"), "down");
      assert.equal(computed(svg).color, "rgb(128, 0, 0)");

      await setAttribute(element, "data", "[]");
      assert.equal(svg.hasAttribute("data-trend"), false, "empty data left a stale trend");

      await setAttribute(element, "data", "[1, 2, 3]");
      element.removeAttribute("trend-color");
      await flushMicrotasks();
      assert.equal(svg.hasAttribute("data-trend"), false);
      assert.equal(computed(svg).color, "rgb(0, 0, 255)", "the page's inline --mini-chart-color no longer applies");
      assert.equal(/** @type {HTMLElement} */ (element).getAttribute("style"), "--mini-chart-color: rgb(0, 0, 255)");
    });
  }

  test("a single value has no trend", async () => {
    const element = mount("mini-line-chart", (chart) => {
      chart.setAttribute("trend-color", "auto");
      chart.setAttribute("data", "[5]");
    });
    await flushMicrotasks();
    assert.equal(shadowNode(element, "svg").hasAttribute("data-trend"), false);
  });
});

describe("gradient=\"false\" keeps the theme color", () => {
  /** @type {{ tag: string, data: string, part: string, property: "fill" | "stroke" }[]} */
  const meters = [
    { tag: "mini-bullet-chart", data: bulletData, part: '[part="measure"]', property: "fill" },
    { tag: "mini-progress-chart", data: "[60]", part: '[part="value"]', property: "stroke" },
  ];

  for (const { tag, data, part, property } of meters) {
    test(`<${tag}> paints its ${property} from the tokens for every "off" value`, async () => {
      addPageStyles(`${tag} { --mini-chart-color: rgb(1, 2, 3); }`);
      const element = mount(tag, (chart) => chart.setAttribute("data", data));
      await flushMicrotasks();
      const node = /** @type {SVGElement} */ (shadowNode(element, part));

      assert.doesNotMatch(sheetOf(element), /:host\(\[gradient\]\)/, "the stylesheet still keys paint on the gradient attribute");

      for (const off of ["false", "0", "FALSE", "none", "off", "no", "12px", "[]"]) {
        await setAttribute(element, "gradient", off);
        assert.equal(node.style.getPropertyValue(property), "", `gradient="${off}" left an inline ${property}`);
        assert.equal(computed(node)[property], "rgb(1, 2, 3)", `gradient="${off}" lost the theme color`);
      }

      await setAttribute(element, "gradient", "true");
      assert.match(computed(node)[property], /^url\(#/, "gradient=\"true\" does not paint the gradient");

      element.removeAttribute("gradient");
      await flushMicrotasks();
      assert.equal(computed(node)[property], "rgb(1, 2, 3)");
    });
  }

  test("<mini-gauge-chart> falls back to zones", async () => {
    const element = mount("mini-gauge-chart", (chart) => {
      chart.setAttribute("data", "[50, 0, 100]");
      chart.setAttribute("gradient", "false");
    });
    await flushMicrotasks();
    const tracks = [...(element.shadowRoot?.querySelectorAll('[part="track"]') ?? [])];
    assert.equal(tracks.length, 3);
    assert.ok(tracks.every((track) => !track.getAttribute("stroke")?.startsWith("url(")));
  });

  test("<mini-radial-bar-chart> strokes each ring with its own color", async () => {
    const element = mount("mini-radial-bar-chart", (chart) => {
      chart.setAttribute("data", JSON.stringify([80, { value: 60, color: "rgb(9, 9, 9)" }]));
      chart.setAttribute("gradient", "false");
    });
    await flushMicrotasks();
    const rings = /** @type {SVGElement[]} */ ([...(element.shadowRoot?.querySelectorAll('[part="track-fg"]') ?? [])]);
    assert.match(rings[0].style.stroke, /^var\(--mini-chart-color-1,/);
    assert.equal(rings[1].style.stroke, "rgb(9, 9, 9)");
  });

  test("<mini-area-chart> switches to a flat themed fill", async () => {
    const element = mount("mini-area-chart", (chart) => {
      chart.setAttribute("data", "[1, 3, 2]");
      chart.setAttribute("gradient", "false");
    });
    await flushMicrotasks();
    const area = /** @type {SVGElement} */ (shadowNode(element, '[part="area"]'));
    assert.equal(area.hasAttribute("fill"), false);
    assert.equal(area.style.fill, "var(--mini-chart-fill, currentColor)");
    assert.equal(area.style.opacity, "0.2");

    await setAttribute(element, "gradient", "true");
    assert.match(area.getAttribute("fill") ?? "", /^url\(#/);
    assert.equal(area.style.fill, "");

    for (const on of ["true", ""]) {
      await setAttribute(element, "gradient", on);
      const stops = [...(element.shadowRoot?.querySelectorAll("linearGradient stop") ?? [])];
      assert.deepEqual(
        stops.map((stop) => [/** @type {SVGStopElement} */ (stop).style.getPropertyValue("stop-color"), stop.getAttribute("stop-opacity")]),
        [
          ["currentColor", "0.45"],
          ["currentColor", "0.02"],
        ],
        `gradient="${on}" lost the default stops`,
      );
    }
  });
});

describe("area gradient with one color", () => {
  test("fades from the top to the baseline like the default gradient", async () => {
    const element = mount("mini-area-chart", (chart) => {
      chart.setAttribute("data", "[1, 3, 2]");
      chart.setAttribute("gradient", "red");
    });
    await flushMicrotasks();
    const stops = [...(element.shadowRoot?.querySelectorAll("linearGradient[id^='area-grad'] stop") ?? [])];
    assert.deepEqual(
      stops.map((stop) => [/** @type {SVGStopElement} */ (stop).style.getPropertyValue("stop-color"), stop.getAttribute("offset"), stop.getAttribute("stop-opacity")]),
      [
        ["red", "0%", "0.45"],
        ["red", "100%", "0.02"],
      ],
    );
  });
});

describe("gradient color lists", () => {
  /**
   * @param {Element} gradient Gradient element.
   * @returns {string[]} Its stop colors, whitespace removed.
   */
  const colorsOf = (gradient) =>
    [...gradient.querySelectorAll("stop")].map((stop) =>
      /** @type {SVGStopElement} */ (stop).style.getPropertyValue("stop-color").replace(/\s+/g, ""),
    );

  /**
   * @param {Element} element Chart element.
   * @param {string} [selector] Gradient selector.
   * @returns {string[]} The stop colors of the first matching gradient.
   */
  const stopColors = (element, selector = "linearGradient") => colorsOf(shadowNode(element, selector));

  /** @type {{ tag: string, data: string, gradient?: string }[]} */
  const charts = [
    { tag: "mini-area-chart", data: "[1, 3, 2]", gradient: "linearGradient[id^='area-grad']" },
    { tag: "mini-bullet-chart", data: bulletData },
    { tag: "mini-gauge-chart", data: "[50, 0, 100]" },
    { tag: "mini-progress-chart", data: "[60]" },
    { tag: "mini-radial-bar-chart", data: "[80, 60]" },
  ];

  for (const { tag, data, gradient } of charts) {
    test(`<${tag}> keeps commas inside color functions`, async () => {
      const element = mount(tag, (chart) => {
        chart.setAttribute("data", data);
        chart.setAttribute("gradient", "rgb(255,0,0), blue");
      });
      await flushMicrotasks();

      assert.deepEqual(stopColors(element, gradient), ["rgb(255,0,0)", "blue"]);
    });
  }

  test("radial-bar takes one color list per ring", async () => {
    const element = mount("mini-radial-bar-chart", (chart) => {
      chart.setAttribute("data", "[80, 60]");
      chart.setAttribute("gradient", "[['red', 'blue'], ['green', 'rgb(1,2,3)']]");
    });
    await flushMicrotasks();
    const gradients = [...(element.shadowRoot?.querySelectorAll("linearGradient") ?? [])];
    assert.deepEqual(gradients.map(colorsOf), [
      ["red", "blue"],
      ["green", "rgb(1,2,3)"],
    ]);
  });
});

describe("only --mini-* tokens reach the shadow styles", () => {
  test("an app-level --primary in HSL channels leaves bullet bands and the scatter trend line visible", async () => {
    addPageStyles(":root { --primary: 222.2 47.4% 11.2%; --surface: oops; }");
    const bullet = mount("mini-bullet-chart", (chart) => chart.setAttribute("data", bulletData));
    const scatter = mount("mini-scatter-chart", (chart) => {
      chart.setAttribute("trend-line", "");
      chart.setAttribute("data", "[[1, 2], [2, 5], [3, 8]]");
    });
    await flushMicrotasks();

    for (const element of [bullet, scatter]) {
      assert.doesNotMatch(sheetOf(element), /var\(\s*--(?!mini-|_mc-)/, `<${element.localName}> reads an app-level variable`);
    }
    for (const band of bullet.shadowRoot?.querySelectorAll('[part~="range"]') ?? []) {
      assert.doesNotMatch(computed(band).fill, /222\.2/, "a bullet band picked up --primary");
    }
    const trendLine = scatter.shadowRoot?.querySelector('[part="trend-line"]');
    if (trendLine) assert.doesNotMatch(computed(trendLine).stroke, /222\.2/, "the scatter trend line picked up --primary");
    for (const point of scatter.shadowRoot?.querySelectorAll('[part~="point"]') ?? []) {
      // The surface default: white, or white for light pages through light-dark() (the built-in dark mode).
      assert.match(computed(point).stroke, /^(?:#ffffff|light-dark\(#ffffff,)/, "a scatter point picked up --surface");
    }
  });
});
