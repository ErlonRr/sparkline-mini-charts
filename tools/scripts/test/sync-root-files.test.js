// sync-root-files.test.js — The root README.md and LICENSE are copies of the packages/core ones.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, test } from "node:test";

import { README_NOTICE, ROOT_FILES, syncRootFiles } from "../sync-root-files.mjs";

const root = resolve(import.meta.dirname, "../../..");

describe("sync-root-files", () => {
  test("the root copies match packages/core", async () => {
    assert.deepEqual(await syncRootFiles({ write: false }), [], "run `pnpm sync-root-files`");
  });

  test("the root README is the package README behind a hidden notice", async () => {
    const readme = ROOT_FILES.find((file) => file.target === "README.md");
    assert.ok(readme);
    const source = await readFile(resolve(root, readme.source), "utf8");
    assert.equal(readme.render(source), README_NOTICE + source);
    assert.match(README_NOTICE, /^<!--[^\n]*-->\n$/);
  });

  test("the package README links only to absolute URLs and anchors, so the root copy and npm resolve them alike", async () => {
    const source = await readFile(resolve(root, "packages/core/README.md"), "utf8");
    const relative = [...source.matchAll(/\]\(([^)\s]+)\)|\b(?:href|src)="([^"]+)"/g)]
      .map((match) => match[1] ?? match[2])
      .filter((target) => !/^(?:https?:|mailto:|#)/.test(target));
    assert.deepEqual(relative, []);
  });
});
