// geometry.test.js — Rendered geometry: combo alignment, positional stacks, OHLCV rows, gauge zones and radial-bar guards.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { createRealm, dispatchHover, flushMicrotasks, mount, renderSignature, stubSvgLayout } from "./dom.js";

const main = await createRealm("geometry");
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
 * Mounts a chart with the given attributes and waits for its batched render.
 *
 * @param {string} tag Chart tag name.
 * @param {Record<string, string>} attributes Attributes set before connecting.
 * @returns {Promise<Element>} The connected element.
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
 * @returns {SVGElement[]} Every matching shadow node.
 */
function shadowAll(element, selector) {
  return /** @type {SVGElement[]} */ ([...(element.shadowRoot?.querySelectorAll(selector) ?? [])]);
}

describe("combo: the line sits on the bar centres", () => {
  const data = [
    { bar: 4, line: 2 },
    { bar: 6, line: 5 },
    { bar: 3, line: 4 },
    { bar: 8, line: 7 },
    { bar: 5, line: 6 },
  ];

  test("with n=5 every line vertex x is the centre of its bar", async () => {
    const element = await render("mini-combo-chart", { data: JSON.stringify(data) });

    const centres = shadowAll(element, '[part="bar"]').map(
      (bar) => Number(bar.getAttribute("x")) + Number(bar.getAttribute("width")) / 2,
    );
    const d = shadowAll(element, '[part="line"]')[0].getAttribute("d") ?? "";
    const vertexX = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+-?[\d.]+/g)].map((match) => Number(match[1]));

    assert.equal(centres.length, 5);
    assert.deepEqual(vertexX, centres);

    const lastPoint = shadowAll(element, '[part="point"]')[0];
    assert.equal(Number(lastPoint.getAttribute("cx")), centres[4]);
  });

  test("hover snaps to the bar under the pointer and puts the crosshair on its centre", async () => {
    const element = await render("mini-combo-chart", { data: JSON.stringify(data), interactive: "" });
    const [firstBar] = shadowAll(element, '[part="bar"]');
    const firstCentre = Number(firstBar.getAttribute("x")) + Number(firstBar.getAttribute("width")) / 2;

    // x = 15 lies inside the first bar's slot; the old point scale put index 1 (x = 26) closer than index 0 (x = 2).
    const [event] = dispatchHover(element, { selector: "svg", clientX: 15 });
    const detail = /** @type {CustomEvent} */ (event).detail;

    assert.equal(detail.index, 0);
    assert.equal(detail.x, firstCentre);
    const crosshair = shadowAll(element, '[part="crosshair"]')[0];
    assert.equal(Number(crosshair.getAttribute("x1")), firstCentre);
  });
});

describe("stacked and stream charts keep invalid entries in place", () => {
  for (const tag of ["mini-stacked-area-chart", "mini-stream-chart"]) {
    test(`${tag}: [[1, null, 3], [2, 2, 2]] keeps the 3 at index 2`, async () => {
      const element = await render(tag, { data: "[[1, null, 3], [2, 2, 2]]" });
      assert.deepEqual(/** @type {any} */ (element).data, [[1, 0, 3], [2, 2, 2]]);

      const reference = await render(tag, { data: "[[1, 0, 3], [2, 2, 2]]" });
      const paths = shadowAll(element, '[part~="layer"]').map((layer) => layer.getAttribute("d"));
      assert.equal(paths.length, 2);
      assert.ok(paths.every(Boolean), "every layer has a path");
      assert.deepEqual(paths, shadowAll(reference, '[part~="layer"]').map((layer) => layer.getAttribute("d")));
    });
  }
});

describe("candlestick and OHLC ignore extra tuple columns", () => {
  const ohlc = [[10, 12, 9, 11], [11, 14, 10, 13], [13, 13, 8, 9]];
  const ohlcv = ohlc.map((row, index) => [...row, 50_000 * (index + 1)]);

  for (const tag of ["mini-candlestick-chart", "mini-ohlc-chart"]) {
    test(`${tag}: OHLCV rows render the same geometry as OHLC rows`, async () => {
      const plain = await render(tag, { data: JSON.stringify(ohlc), label: "Prices" });
      const withVolume = await render(tag, { data: JSON.stringify(ohlcv), label: "Prices" });
      assert.deepEqual(renderSignature(withVolume), renderSignature(plain));
    });
  }
});

describe("gauge zones", () => {
  test("a zone past max is cut at the end of the dial", async () => {
    const element = await render("mini-gauge-chart", {
      data: "[50, 0, 100]",
      zones: '[{"upTo": 40, "color": "green"}, {"upTo": 150, "color": "red"}]',
    });
    const tracks = shadowAll(element, '[part="track"]');

    assert.equal(tracks.length, 2);
    // The dial ends at the right of the pivot: (50 + 40, 50).
    assert.match(tracks[1].getAttribute("d") ?? "", / 90 50$/);
    assert.match(tracks[1].getAttribute("d") ?? "", / 0 0 1 /, "a half-dial arc, never a large arc wrapping below");
  });

  test("numeric strings are read as numbers", async () => {
    const numbers = await render("mini-gauge-chart", {
      data: "[50, 0, 100]",
      zones: '[{"upTo": 40, "color": "green"}, {"upTo": 100, "color": "red"}]',
    });
    const strings = await render("mini-gauge-chart", {
      data: "[50, 0, 100]",
      zones: '[{"upTo": "40", "color": "green"}, {"upTo": " 100 ", "color": "red"}]',
    });
    assert.deepEqual(renderSignature(strings), renderSignature(numbers));
  });

  test("zones with no valid entry fall back to the default bands", async () => {
    const fallback = await render("mini-gauge-chart", {
      data: "[50, 0, 100]",
      zones: '[{"upTo": "abc", "color": "red"}, {"upTo": 50}]',
    });
    const defaults = await render("mini-gauge-chart", { data: "[50, 0, 100]" });

    assert.equal(shadowAll(fallback, '[part="track"]').length, 3);
    assert.deepEqual(renderSignature(fallback), renderSignature(defaults));
  });
});

describe("radial-bar guards", () => {
  test("max ≤ 0 keeps the default scale (the data maximum)", async () => {
    for (const max of ["0", "-10"]) {
      const element = await render("mini-radial-bar-chart", { data: "[50, 100]", max });
      const offsets = shadowAll(element, '[part="track-fg"]').map((ring) => ring.style.strokeDashoffset);
      assert.deepEqual(offsets, ["50", "0"], `max="${max}"`);
    }
  });

  test("a sweep outside (0, 360] is clamped or replaced by the default", async () => {
    const arcs = async (/** @type {Record<string, string>} */ attributes) =>
      shadowAll(await render("mini-radial-bar-chart", { data: "[50]", ...attributes }), '[part="track-bg"]').map(
        (ring) => ring.getAttribute("d"),
      );

    assert.deepEqual(await arcs({ sweep: "-90" }), await arcs({}));
    assert.deepEqual(await arcs({ sweep: "0" }), await arcs({}));
    assert.deepEqual(await arcs({ sweep: "400" }), await arcs({ sweep: "360" }));

    const full = await render("mini-radial-bar-chart", { data: "[50, 100]", sweep: "400" });
    const offsets = shadowAll(full, '[part="track-fg"]').map((ring) => ring.style.strokeDashoffset);
    assert.deepEqual(offsets, ["50", "0"], "progress is measured against the clamped 360° ring");
  });
});
