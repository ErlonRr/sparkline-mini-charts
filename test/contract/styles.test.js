// styles.test.js — Static checks on the shared Shadow DOM stylesheet and every reduced-motion block.

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { chartStyles } from "../../src/core/svg.js";

const srcDir = new URL("../../src/", import.meta.url);

/** Properties that carry chart values (progress and radial-bar encode them in stroke-dashoffset). */
const dataProperties = ["stroke-dashoffset", "d", "width", "height", "r"];

/**
 * Finds every `@media (prefers-reduced-motion: reduce) { ... }` block, matching braces.
 *
 * @param {string} css Stylesheet text (or source text that contains stylesheets).
 * @returns {string[]} The body of each block.
 */
function reducedMotionBlocks(css) {
  /** @type {string[]} */
  const blocks = [];
  const pattern = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/g;

  for (const match of css.matchAll(pattern)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let end = start;
    while (end < css.length && depth > 0) {
      if (css[end] === "{") depth += 1;
      if (css[end] === "}") depth -= 1;
      end += 1;
    }
    blocks.push(css.slice(start, end - 1));
  }

  return blocks;
}

/**
 * @param {string} css Declarations, possibly inside nested rules.
 * @returns {{ property: string, value: string }[]} Every declaration, comments removed.
 */
function declarations(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...withoutComments.matchAll(/([-\w]+)\s*:\s*([^;{}]+)/g)].map(([, property, value]) => ({
    property: property.toLowerCase(),
    value: value.trim(),
  }));
}

/** @returns {Promise<{ file: string, block: string }[]>} Reduced-motion blocks in src/, plus the shared stylesheet. */
async function allReducedMotionBlocks() {
  const blocks = reducedMotionBlocks(chartStyles).map((block) => ({ file: "chartStyles", block }));
  const files = (await readdir(srcDir, { recursive: true })).filter((file) => /\.(js|ts)$/.test(file));

  for (const file of files) {
    const source = await readFile(new URL(file, srcDir), "utf8");
    for (const block of reducedMotionBlocks(source)) blocks.push({ file: `src/${file}`, block });
  }

  return blocks;
}

describe("reduced motion", () => {
  test("the shared stylesheet has a reduced-motion block", () => {
    assert.equal(reducedMotionBlocks(chartStyles).length, 1);
  });

  test("no reduced-motion block overrides a property that encodes data", async () => {
    for (const { file, block } of await allReducedMotionBlocks()) {
      const found = declarations(block).filter(({ property }) => dataProperties.includes(property));
      assert.deepEqual(found, [], `${file} overrides data geometry under reduced motion`);
    }
  });

  test("reduced-motion blocks only change animation and transition timing", async () => {
    for (const { file, block } of await allReducedMotionBlocks()) {
      const found = declarations(block).filter(
        ({ property }) => !/^(animation|transition)(-|$)/.test(property) && !property.startsWith("--"),
      );
      assert.deepEqual(found, [], `${file} changes more than motion timing under reduced motion`);
    }
  });

  test("the shared block also removes transition and animation delays", () => {
    const [block] = reducedMotionBlocks(chartStyles);
    const values = new Map(declarations(block).map(({ property, value }) => [property, value]));
    assert.equal(values.get("transition-delay"), "0s !important");
    assert.equal(values.get("animation-delay"), "0s !important");
  });
});

describe("hidden attribute", () => {
  test(":host([hidden]) hides the chart", () => {
    const rule = chartStyles.match(/:host\(\[hidden\]\)\s*\{([^}]*)\}/);
    assert.ok(rule, "chartStyles has no :host([hidden]) rule");
    assert.deepEqual(declarations(rule[1]), [{ property: "display", value: "none" }]);
  });
});
