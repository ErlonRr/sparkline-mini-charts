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
    "./mini-heatmap-chart",
    "./mini-stacked-bar-chart",
    "./mini-waterfall-chart",
    "./mini-funnel-chart",
    "./mini-box-plot-chart",
    "./mini-radar-chart",
    "./mini-treemap-chart",
    "./math",
    "./angular",
    "./react",
    "./vue",
    "./package.json",
  ]);

  assert.equal(packageManifest.exports["./package.json"], "./package.json");

  // Each format carries its own declarations: ESM types for `import`, CommonJS
  // (.d.cts) types for `require`, so neither "masquerades" as the other.
  for (const [subpath, exportPath] of Object.entries(packageManifest.exports)) {
    if (subpath === "./package.json") continue;
    assert.deepEqual(Object.keys(exportPath), ["import", "require"], subpath);
    assert.deepEqual(Object.keys(exportPath.import), ["types", "default"], subpath);
    assert.deepEqual(Object.keys(exportPath.require), ["types", "default"], subpath);
    assert.match(exportPath.import.types, /^\.\/dist\/.*\.d\.ts$/);
    assert.match(exportPath.import.default, /^\.\/dist\/.*\.js$/);
    assert.match(exportPath.require.types, /^\.\/dist\/.*\.d\.cts$/);
    assert.match(exportPath.require.default, /^\.\/dist\/.*\.cjs$/);
    assert.equal(exportPath.require.types.replace(/\.d\.cts$/, ""), exportPath.import.types.replace(/\.d\.ts$/, ""));
  }
});

test("typesVersions gives moduleResolution node10 the types of every subpath", () => {
  // TypeScript's legacy `node` (node10) resolution ignores `exports`; without this map
  // `import "sparkline-mini-charts/react"` has no types there. Node16 and bundler use `exports`.
  const subpaths = Object.keys(packageManifest.exports).filter((subpath) => subpath !== "." && subpath !== "./package.json");
  assert.deepEqual(Object.keys(packageManifest.typesVersions), ["*"]);
  assert.deepEqual(
    packageManifest.typesVersions["*"],
    Object.fromEntries(subpaths.map((subpath) => [subpath.slice(2), [packageManifest.exports[subpath].import.types]])),
  );
  assert.equal(packageManifest.types, packageManifest.exports["."].import.types);
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
