// package-types.test.js — Compiles the TypeScript entry fixture against dist/ under Node16 and Bundler resolution (requires `pnpm build`).

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const typescriptDir = dirname(require.resolve("typescript/package.json"));
const tsc = resolve(typescriptDir, require("typescript/package.json").bin.tsc);

for (const resolution of ["node16", "bundler"]) {
  test(`entry fixture type-checks with moduleResolution ${resolution}`, () => {
    for (const types of ["dist/mini-line-chart.d.ts", "dist/math.d.ts"]) {
      assert.ok(existsSync(resolve(root, types)), `${types} is missing: run \`pnpm build\` before \`pnpm test:package\`.`);
    }

    // The fixture imports "sparkline-mini-charts/…" by name; TypeScript resolves it
    // through the package's own exports map (self-reference), so it checks dist/ as published.
    const result = spawnSync(process.execPath, [tsc, "-p", `test/types/tsconfig.${resolution}.json`], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `tsc failed:\n${result.stdout}${result.stderr}`);
  });
}
