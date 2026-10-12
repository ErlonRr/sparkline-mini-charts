// package-dist.test.js — Smoke tests for the built framework entry points in dist/ (requires `pnpm build`).

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const distUrl = new URL("../dist/", import.meta.url);

test("framework entry points export specialized wrappers for React, Vue, and Angular", async () => {
  for (const entry of ["react.js", "vue.js", "angular.js"]) {
    assert.ok(
      existsSync(new URL(entry, distUrl)),
      `dist/${entry} is missing: run \`pnpm build\` before \`pnpm test:package\`.`,
    );
  }

  const reactAdapters = await import("../dist/react.js");
  const vueAdapters = await import("../dist/vue.js");
  const angularAdapters = await import("../dist/angular.js");

  // React tests
  assert.equal(typeof reactAdapters.MiniLineChart, "object");
  assert.equal(typeof reactAdapters.MiniGaugeChart, "object");
  assert.equal(typeof reactAdapters.MiniBulletChart, "object");
  assert.equal(typeof reactAdapters.MiniProgressChart, "object");

  // Vue tests
  assert.equal(typeof vueAdapters.MiniLineChart, "object");
  assert.equal(typeof vueAdapters.MiniGaugeChart, "object");
  assert.equal(typeof vueAdapters.MiniBulletChart, "object");
  assert.equal(typeof vueAdapters.MiniProgressChart, "object");

  // Angular Signal Directives tests
  assert.equal(typeof angularAdapters.MiniLineChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniGaugeChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniBulletChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniProgressChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniRadialBarChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniChartDirective, "function");
  assert.equal(angularAdapters.SPARKLINE_DIRECTIVES.length, 17);
});
