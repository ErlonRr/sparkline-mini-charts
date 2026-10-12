// sync-root-files.mjs — Copies the package README.md and LICENSE of packages/core to the repository root, or (`--check`) fails when the root copies drift.

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "../..");

/**
 * Notice at the top of the root README.md. GitHub hides HTML comments, so the landing
 * page shows the package README as it is published to npm.
 */
export const README_NOTICE =
  "<!-- Generated from packages/core/README.md by `pnpm sync-root-files`: edit that file, not this copy. -->\n";

/**
 * @typedef {Object} RootFile
 * @property {string} source Canonical file, relative to the repository root.
 * @property {string} target Root copy, relative to the repository root.
 * @property {(source: string) => string} render Root copy contents from the canonical contents.
 */

/**
 * Files published with packages/core that GitHub also expects at the repository root:
 * the README is the landing page, the LICENSE is what GitHub detects. The package
 * copies are canonical because `npm pack` only reads files inside the package.
 *
 * @type {readonly RootFile[]}
 */
export const ROOT_FILES = Object.freeze([
  { source: "packages/core/README.md", target: "README.md", render: (source) => README_NOTICE + source },
  { source: "packages/core/LICENSE", target: "LICENSE", render: (source) => source },
]);

/**
 * Compares (or, with `write`, rewrites) every root copy.
 *
 * @param {{ write: boolean }} options
 * @returns {Promise<string[]>} Root copies that differ from their source (before writing).
 */
export async function syncRootFiles({ write }) {
  const stale = [];
  for (const { source, target, render } of ROOT_FILES) {
    const expected = render(await readFile(resolve(root, source), "utf8"));
    const actual = await readFile(resolve(root, target), "utf8").catch(() => null);
    if (actual === expected) continue;
    stale.push(target);
    if (write) await writeFile(resolve(root, target), expected);
  }
  return stale;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const check = process.argv.includes("--check");
  const stale = await syncRootFiles({ write: !check });
  if (check && stale.length > 0) {
    for (const target of stale) {
      const { source } = ROOT_FILES.find((file) => file.target === target) ?? {};
      console.error(`${target} differs from ${source}: edit ${source}, then run \`pnpm sync-root-files\`.`);
    }
    process.exitCode = 1;
  } else if (check) {
    console.log("sync-root-files: OK");
  } else {
    console.log(stale.length > 0 ? `sync-root-files: updated ${stale.join(", ")}.` : "sync-root-files: already up to date.");
  }
}
