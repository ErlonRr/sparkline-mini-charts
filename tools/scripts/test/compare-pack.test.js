// compare-pack.test.js — The pack comparison of tools/scripts/compare-pack.mjs (no packing: plain manifests and file lists).

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { comparePacks, coversCondition, flattenExports, isBreaking, withoutChunkHash } from "../compare-pack.mjs";

const nested = (name) => ({
  import: { types: `./dist/${name}.d.ts`, default: `./dist/${name}.js` },
  require: { types: `./dist/${name}.d.cts`, default: `./dist/${name}.cjs` },
});

const files = (...names) => names.flatMap((name) => [`dist/${name}.js`, `dist/${name}.cjs`, `dist/${name}.d.ts`, `dist/${name}.d.cts`]);

describe("compare-pack", () => {
  test("flattens subpaths and nested conditions, and the string sugar", () => {
    assert.deepEqual(
      [...flattenExports({ ".": nested("index"), "./package.json": "./package.json" })],
      [
        [". import.types", "./dist/index.d.ts"],
        [". import.default", "./dist/index.js"],
        [". require.types", "./dist/index.d.cts"],
        [". require.default", "./dist/index.cjs"],
        ["./package.json", "./package.json"],
      ],
    );
    assert.deepEqual([...flattenExports("./index.js")], [[".", "./index.js"]]);
    assert.deepEqual([...flattenExports(undefined)], []);
  });

  test("identical packs compare clean", () => {
    const pack = { files: ["package.json", ...files("index", "react")], manifest: { exports: { ".": nested("index"), "./react": nested("react") } } };
    const comparison = comparePacks(pack, structuredClone(pack));
    assert.equal(isBreaking(comparison), false);
    assert.deepEqual(comparison.removedFiles, []);
    assert.deepEqual(comparison.removedExports, []);
    assert.deepEqual(comparison.danglingExports, []);
  });

  test("a removed subpath, condition or file is breaking", () => {
    const reference = { files: ["package.json", ...files("index", "react")], manifest: { exports: { ".": nested("index"), "./react": nested("react") } } };
    const candidate = {
      files: ["package.json", ...files("index")],
      manifest: { exports: { ".": { import: nested("index").import } } },
    };
    const comparison = comparePacks(reference, candidate);
    assert.equal(isBreaking(comparison), true);
    assert.deepEqual(comparison.removedFiles, files("react"));
    assert.deepEqual(comparison.removedExports, [
      ". require.types",
      ". require.default",
      "./react import.types",
      "./react import.default",
      "./react require.types",
      "./react require.default",
    ]);
  });

  test("an export pointing at a file that is not packed is breaking", () => {
    const pack = { files: ["dist/index.js"], manifest: { exports: { ".": "./dist/index.js", "./x": "./dist/x.js" } } };
    const comparison = comparePacks(pack, pack);
    assert.deepEqual(comparison.danglingExports, ["./x → ./dist/x.js"]);
    assert.equal(isBreaking(comparison), true);
  });

  test("nesting the conditions of a subpath is a restructure, not a removal", () => {
    const reference = { files: files("index"), manifest: { exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js", require: "./dist/index.cjs" } } } };
    const candidate = { files: files("index"), manifest: { exports: { ".": nested("index") } } };
    const comparison = comparePacks(reference, candidate);
    assert.deepEqual(comparison.removedExports, []);
    assert.deepEqual(comparison.restructuredExports, [". types", ". import", ". require"]);
    assert.equal(isBreaking(comparison), false);
    assert.equal(coversCondition("./x import", ["./y import.default"]), false);
  });

  test("content-hashed chunks compare without their hash", () => {
    assert.equal(withoutChunkHash("dist/mini-chart-element-Cq_H17wK.cjs.map"), "dist/mini-chart-element-[hash].cjs.map");
    assert.equal(withoutChunkHash("dist/mini-line-chart.js"), "dist/mini-line-chart.js");
    const reference = { files: ["dist/index.js", "dist/shared-Cq_H17wK.js"], manifest: { exports: { ".": "./dist/index.js" } } };
    const candidate = { files: ["dist/index.js", "dist/shared-qj8Ie7iJ.js"], manifest: { exports: { ".": "./dist/index.js" } } };
    const comparison = comparePacks(reference, candidate);
    assert.deepEqual(comparison.removedFiles, []);
    assert.deepEqual(comparison.addedFiles, []);
  });

  test("changed entry fields are reported, not breaking", () => {
    const reference = { files: ["dist/index.js"], manifest: { main: "./dist/index.js", exports: "./dist/index.js" } };
    const candidate = { files: ["dist/index.js"], manifest: { main: "./dist/index.cjs", exports: "./dist/index.js" } };
    const comparison = comparePacks(reference, candidate);
    assert.deepEqual(comparison.changedFields, ["main"]);
    assert.equal(isBreaking(comparison), false);
  });
});
