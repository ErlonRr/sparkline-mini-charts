// package.test.js — Guards the tree-shakeable public package metadata contract.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageUrl = new URL("../package.json", import.meta.url);
const packageManifest = JSON.parse(await readFile(packageUrl, "utf8"));

test("package metadata exposes granular distribution entry points", () => {
  assert.deepEqual(Object.keys(packageManifest.exports), [
    ".",
    "./define",
    "./register",
    "./mini-area-chart",
    "./mini-bar-chart",
    "./mini-candlestick-chart",
    "./mini-combo-chart",
    "./mini-gauge-chart",
    "./mini-half-pie-chart",
    "./mini-line-chart",
    "./mini-ohlc-chart",
    "./mini-pie-chart",
    "./mini-progress-chart",
    "./mini-radial-bar-chart",
    "./mini-stacked-area-chart",
    "./mini-stream-chart",
    "./mini-bullet-chart",
    "./mini-win-loss-chart",
    "./mini-range-bar-chart",
    "./mini-scatter-chart",
    "./math",
    "./angular",
    "./react",
    "./vue",
  ]);



  for (const exportPath of Object.values(packageManifest.exports)) {
    assert.match(exportPath.types, /^\.\/dist\/.*\.d\.ts$/);
    assert.match(exportPath.import, /^\.\/dist\/.*\.js$/);
    assert.match(exportPath.require, /^\.\/dist\/.*\.cjs$/);
  }
});

test("only registration-oriented distribution files are marked as side-effectful", () => {
  assert.deepEqual(packageManifest.sideEffects, [
    "./dist/register.js",
    "./dist/register.cjs",
    "./dist/react.js",
    "./dist/react.cjs",
  ]);
  assert.ok(packageManifest.files.includes("dist"));
  assert.ok(packageManifest.files.includes("CHANGELOG.md"));
});
