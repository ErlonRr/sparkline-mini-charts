// gradient.test.js — Unit tests for the shared `gradient` attribute parser.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isGradientColor, parseGradient, resolveGradientColors } from "../src/core/gradient.js";

/**
 * Runs a callback with a stand-in for the browser's `CSS.supports()`.
 *
 * @param {(property: string, value: string) => boolean} supports Stand-in.
 * @param {() => void} callback Code to run.
 */
function withCssSupports(supports, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { configurable: true, writable: true, value: { supports } });
  try {
    callback();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "CSS", descriptor);
    else delete (/** @type {any} */ (globalThis)).CSS;
  }
}

describe("parseGradient", () => {
  test("null, \"false\" and \"0\" turn the gradient off", () => {
    for (const value of [null, undefined, "false", "0", " FALSE ", "False"]) {
      assert.equal(parseGradient(value), false, `${JSON.stringify(value)} is not off`);
    }
  });

  test("\"none\", \"off\" and \"no\" turn the gradient off too", () => {
    for (const value of ["none", "off", "no", " None ", "OFF"]) {
      assert.equal(parseGradient(value), false, `${JSON.stringify(value)} is not off`);
    }
  });

  test("the bare attribute and \"true\" select the default stops", () => {
    for (const value of ["", "true", " TRUE "]) {
      assert.equal(parseGradient(value), true, `${JSON.stringify(value)} is not the default`);
    }
  });

  test("commas inside color functions do not split a color", () => {
    assert.deepEqual(parseGradient("rgb(255,0,0), blue"), ["rgb(255,0,0)", "blue"]);
    assert.deepEqual(parseGradient("oklch(70% 0.1 200 / 50%), hsl(10, 50%, 50%)"), [
      "oklch(70% 0.1 200 / 50%)",
      "hsl(10, 50%, 50%)",
    ]);
    assert.deepEqual(parseGradient("var(--mini-chart-color-1, rgb(1, 2, 3)), color-mix(in srgb, red 20%, blue)"), [
      "var(--mini-chart-color-1, rgb(1, 2, 3))",
      "color-mix(in srgb, red 20%, blue)",
    ]);
  });

  test("JSON arrays, with double or single quotes", () => {
    assert.deepEqual(parseGradient('["#f00", "#00f"]'), ["#f00", "#00f"]);
    assert.deepEqual(parseGradient("['#3b82f6', '#06b6d4', '#10b981']"), ["#3b82f6", "#06b6d4", "#10b981"]);
    assert.deepEqual(parseGradient('["rgb(1, 2, 3)", "blue"]'), ["rgb(1, 2, 3)", "blue"]);
  });

  test("one color list per ring", () => {
    assert.deepEqual(parseGradient("[['red', 'blue'], ['green']]"), [["red", "blue"], ["green"]]);
  });

  test("bracketed lists that are not JSON fall back to the tokenizer", () => {
    assert.deepEqual(parseGradient("[rgb(1,2,3), 'blue']"), ["rgb(1,2,3)", "blue"]);
    // The quotes keep "a,b" in one token, which is then dropped as it is not a color.
    assert.deepEqual(parseGradient("'red', \"a,b\""), ["red"]);
  });

  test("a single color is a one-stop list", () => {
    assert.deepEqual(parseGradient("#f00"), ["#f00"]);
    assert.deepEqual(parseGradient('"#f00"'), ["#f00"]);
  });

  test("a value without a usable color turns the gradient off", () => {
    for (const value of ["[]", "[1, 2]", " , ", "[null]"]) {
      assert.equal(parseGradient(value), false, `${JSON.stringify(value)} is not off`);
    }
  });
});

describe("color validation", () => {
  test("without CSS.supports(), entries that do not look like colors are dropped", () => {
    assert.equal(globalThis.CSS, undefined, "this test needs the fallback path");
    for (const color of ["#f00", "#ff000080", "red", "currentColor", "rgb(1 2 3)", "oklch(70% 0.1 200)", "color-mix(in srgb, red, blue)", "var(--brand)"]) {
      assert.ok(isGradientColor(color), `${color} is rejected`);
    }
    for (const token of ["", "#ff", "#ggg", "red blue", "1px", "50%", "url(#x)", "-webkit-x", "{}"]) {
      assert.equal(isGradientColor(token), false, `${JSON.stringify(token)} is accepted`);
    }
    assert.deepEqual(parseGradient("red, 12px, #00f"), ["red", "#00f"]);
    assert.equal(parseGradient("12px"), false);
  });

  test("in a browser, the CSS parser decides, and var() is always kept", () => {
    const valid = new Set(["red", "#00f"]);
    withCssSupports((property, value) => property === "color" && valid.has(value), () => {
      assert.deepEqual(parseGradient("red, banana, #00f"), ["red", "#00f"]);
      assert.equal(parseGradient("banana"), false, "a single word that is not a color must not paint a black stop");
      assert.equal(/** @type {string[]} */ (parseGradient("['banana', ['red', 'kiwi']]")).length, 1);
      assert.deepEqual(parseGradient("var(--brand), red"), ["var(--brand)", "red"]);
    });
  });
});

describe("resolveGradientColors", () => {
  const defaults = Object.freeze(["#000", "#fff"]);

  test("off gives null, on gives a copy of the defaults", () => {
    assert.equal(resolveGradientColors(false, defaults), null);
    const colors = resolveGradientColors(true, defaults);
    assert.deepEqual(colors, ["#000", "#fff"]);
    assert.notEqual(colors, defaults);
  });

  test("a list keeps only its flat colors", () => {
    assert.deepEqual(resolveGradientColors(["red", ["green"], "blue"], defaults), ["red", "blue"]);
    assert.equal(resolveGradientColors([["green"]], defaults), null);
  });
});
