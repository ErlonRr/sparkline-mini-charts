// emit-entry-dts.mjs — Writes a top-level declaration stub for every build entry whose types vite-plugin-dts emits elsewhere.

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import viteConfig from "../vite.config.js";

const root = resolve(import.meta.dirname, "..");
const srcDir = resolve(root, "src");
const distDir = resolve(root, "dist");

/**
 * Turns a source file path into the path of the declaration vite-plugin-dts emits for it.
 * With `rollupTypes: false` the plugin mirrors `src/` under `dist/`, so
 * `src/components/mini-line-chart.js` becomes `dist/components/mini-line-chart.d.ts`.
 *
 * @param {string} source Absolute path of an entry source file.
 * @returns {string} Absolute path of its emitted declaration file.
 */
function emittedDeclaration(source) {
  return resolve(distDir, relative(srcDir, source)).replace(/\.[cm]?[jt]s$/, ".d.ts");
}

/**
 * Writes `dist/<entry>.d.ts` stubs that re-export the mirrored declarations, so that
 * every `exports[*].types` path in package.json points at a real file.
 *
 * @returns {Promise<string[]>} The stub paths written, relative to the repository root.
 */
async function emitEntryStubs() {
  const entries = viteConfig.build.lib.entry;
  const written = [];

  for (const [name, source] of Object.entries(entries)) {
    const stub = resolve(distDir, `${name}.d.ts`);
    const target = emittedDeclaration(source);
    // Entries at the top of src/ (index, define, register, react, vue, angular) already
    // land on their stub path.
    if (stub === target) continue;
    if (!existsSync(target)) {
      throw new Error(`No declaration emitted for entry "${name}": expected ${relative(root, target)}`);
    }
    const specifier = `./${relative(distDir, target).replace(/\.d\.ts$/, ".js")}`;
    await writeFile(stub, `export * from "${specifier}";\n`);
    written.push(relative(root, stub));
  }

  return written;
}

/**
 * Fails when any `types` condition in the package.json exports map has no file in dist/.
 *
 * @returns {Promise<void>}
 */
async function checkExportTypes() {
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const missing = Object.entries(pkg.exports)
    .filter(([, conditions]) => typeof conditions === "object" && conditions.types)
    .map(([subpath, conditions]) => ({ subpath, types: conditions.types }))
    .filter(({ types }) => !existsSync(resolve(root, types)));

  if (missing.length > 0) {
    const list = missing.map(({ subpath, types }) => `  ${subpath} -> ${types}`).join("\n");
    throw new Error(`package.json exports point at missing declaration files:\n${list}`);
  }
}

const written = await emitEntryStubs();
await checkExportTypes();
console.log(`emit-entry-dts: wrote ${written.length} entry declaration stubs`);
