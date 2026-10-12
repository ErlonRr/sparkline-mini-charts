// new-treemap.test.js — <mini-treemap-chart>: squarified layout, rendering, events, empty data and node reuse.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { installHappyDom } from "../adapters/happy-dom.js";
import { dispatchHover, flushMicrotasks, stubSvgLayout } from "./dom.js";

const dom = installHappyDom();
const restoreLayout = stubSvgLayout(dom.window);
// The chart class extends the HTMLElement it finds when its module is evaluated.
const { MiniTreemapChart } = await import("../../src/components/mini-treemap-chart.js");
const { createTreemapLayout, squarify } = await import("../../src/core/layouts/treemap.js");
if (!customElements.get("mini-treemap-chart")) customElements.define("mini-treemap-chart", MiniTreemapChart);

after(async () => {
  restoreLayout();
  await dom.close();
});

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Mounts a treemap chart and lets its first render run.
 *
 * @param {Record<string, string>} attributes Attributes to set before connecting.
 * @returns {Promise<any>} The connected element.
 */
async function mountTreemap(attributes) {
  const element = document.createElement("mini-treemap-chart");
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.body.append(element);
  await flushMicrotasks();
  return element;
}

/**
 * @param {Element} element Chart element.
 * @returns {SVGRectElement[]} The visible tiles.
 */
const visibleTiles = (element) =>
  /** @type {SVGRectElement[]} */ ([...(element.shadowRoot?.querySelectorAll('[part~="tile"]') ?? [])]).filter((tile) => tile.style.display !== "none");

/**
 * @param {Element} tile Tile.
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
const box = (tile) => ({
  x: Number(tile.getAttribute("x")),
  y: Number(tile.getAttribute("y")),
  width: Number(tile.getAttribute("width")),
  height: Number(tile.getAttribute("height")),
});

/**
 * Asserts that tiles stay inside a box and do not overlap.
 *
 * @param {Array<{ x: number, y: number, width: number, height: number }>} tiles Tiles.
 * @param {number} width Box width.
 * @param {number} height Box height.
 */
function assertPacked(tiles, width, height) {
  const eps = 1e-9;
  for (const tile of tiles) {
    assert.ok(tile.x >= -eps && tile.y >= -eps, "tile starts inside the box");
    assert.ok(tile.x + tile.width <= width + eps && tile.y + tile.height <= height + eps, "tile ends inside the box");
  }
  tiles.forEach((a, i) => {
    tiles.slice(i + 1).forEach((b) => {
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      assert.ok(overlapX <= eps || overlapY <= eps, "tiles do not overlap");
    });
  });
}

describe("squarified layout", () => {
  test("tile areas are proportional to the values and fill the box", () => {
    // The example of Bruls, Huizing and van Wijk: 6 × 4 with values summing to the area.
    const values = [6, 6, 4, 3, 2, 2, 1];
    const tiles = squarify(values.map((value, index) => ({ index, value })), { x: 0, y: 0, width: 6, height: 4 });
    assert.equal(tiles.length, values.length);
    tiles.forEach((tile, i) => assert.ok(Math.abs(tile.width * tile.height - values[i]) < 1e-9, `tile ${i} area`));
    assertPacked(tiles, 6, 4);
    // Squarified: no tile is thinner than 1 : 3 here.
    for (const tile of tiles) assert.ok(Math.max(tile.width / tile.height, tile.height / tile.width) <= 3);
  });

  test("skips zero, negative values, sorts the largest first and keeps gaps inside the box", () => {
    const entries = [3, 0, 9, -2, 6].map((value, index) => ({ index, value }));
    const { tiles, total, skipped } = createTreemapLayout(entries, { width: 100, height: 50, gap: 2 });
    assert.equal(total, 18);
    assert.deepEqual(skipped, [1, 3]);
    assert.deepEqual(tiles.map((tile) => tile.index), [2, 4, 0]);
    assertPacked(tiles, 100, 50);

    const flush = createTreemapLayout(entries, { width: 100, height: 50, gap: 0 });
    for (const tile of flush.tiles) assert.ok(Math.abs(tile.width * tile.height - (tile.value / 18) * 5000) < 1e-6);
    assert.deepEqual(createTreemapLayout(entries, { width: 100, height: 50, sort: false }).tiles.map((tile) => tile.index), [0, 2, 4]);
  });
});

describe("<mini-treemap-chart>", () => {
  test("draws one tile per positive value and reports the skipped ones in its label", async () => {
    const element = await mountTreemap({ data: "[5, 0, 3, -2, 2]", gap: "0" });
    const svg = element.shadowRoot.querySelector("svg");
    assert.equal(svg.getAttribute("viewBox"), "0 0 100 50");
    assert.equal(svg.getAttribute("aria-label"), "Treemap chart with 3 values (2 zero or negative values not shown)");

    const tiles = visibleTiles(element);
    assert.deepEqual(tiles.map((tile) => tile.getAttribute("data-index")), ["0", "2", "4"]);
    assertPacked(tiles.map(box), 100, 50);
    const area = tiles.map(box).reduce((sum, tile) => sum + tile.width * tile.height, 0);
    assert.ok(Math.abs(area - 5000) < 1e-6);
    assert.match(tiles[1].style.fill, /--mini-chart-color-3/);
    assert.deepEqual(element.keyboardTargets().map((/** @type {{ node: Element }} */ t) => t.node.getAttribute("data-index")), ["0", "2", "4"]);
  });

  test("hover reports the value, its percent of the total and the entry", async () => {
    const element = await mountTreemap({
      data: JSON.stringify([{ value: 6, label: "A", color: "#f00" }, 2, { value: 2, label: "C" }]),
      interactive: "",
    });
    const [event] = dispatchHover(element, { selector: '[data-index="0"]' });
    const detail = /** @type {CustomEvent} */ (event).detail;
    assert.equal(detail.chart, "mini-treemap-chart");
    assert.equal(detail.index, 0);
    assert.equal(detail.seriesIndex, 0);
    assert.equal(detail.value, 6);
    assert.deepEqual(detail.datum, { value: 6, label: "A", color: "#f00", percent: 60 });
    assert.equal(detail.percentage, 60);
    assert.equal(detail.label, "A");

    const [second] = dispatchHover(element, { selector: '[data-index="1"]' });
    assert.deepEqual(/** @type {CustomEvent} */ (second).detail.datum, { value: 2, percent: 20 });
  });

  test("colors=accent shades the accent by value", async () => {
    const element = await mountTreemap({ data: "[8, 4, 0]", colors: "accent" });
    const [large, small] = visibleTiles(element);
    assert.equal(large.style.fill, "");
    assert.equal(large.style.fillOpacity, "1");
    assert.equal(small.style.fillOpacity, "0.675");
  });

  test("renders empty and invalid data as an accessible empty chart", async () => {
    for (const [data, label] of [
      ["[]", "Empty Treemap chart"],
      ["not json", "Empty Treemap chart"],
      ["[0, -1]", "Empty Treemap chart (2 zero or negative values not shown)"],
    ]) {
      const element = await mountTreemap({ data });
      assert.equal(element.shadowRoot.querySelector("svg").getAttribute("aria-label"), label);
      assert.equal(visibleTiles(element).length, 0);
    }
  });

  test("tiles grow from their centers on entrance, unless motion is reduced", async () => {
    for (const motion of ["auto", "reduce"]) {
      const element = document.createElement("mini-treemap-chart");
      // A laid-out host, so motion is allowed.
      element.getBoundingClientRect = () => new DOMRect(0, 0, 100, 50);
      element.setAttribute("data", "[1]");
      element.setAttribute("motion", motion);
      document.body.append(element);
      await flushMicrotasks();
      assert.equal(visibleTiles(element)[0].getAttribute("width"), motion === "reduce" ? "100" : "0");
    }
  });

  test("updates reuse the tile of each data index", async () => {
    const element = await mountTreemap({ data: "[1, 2, 3]" });
    const tile = element.shadowRoot.querySelector('[data-index="0"]');
    const before = box(tile);
    element.data = [6, 2, 3];
    await flushMicrotasks();
    assert.equal(element.shadowRoot.querySelector('[data-index="0"]'), tile);
    assert.ok(box(tile).width * box(tile).height > before.width * before.height);

    element.data = [6, 0, 3];
    await flushMicrotasks();
    assert.equal(visibleTiles(element).length, 2);
    element.data = [6];
    await flushMicrotasks();
    assert.equal(element.shadowRoot.querySelectorAll('[part~="tile"]').length, 1);
  });
});
