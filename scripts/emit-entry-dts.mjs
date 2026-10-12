// emit-entry-dts.mjs — Writes a top-level declaration stub for every build entry, then a CommonJS (.d.cts) twin of every declaration.

import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
 * Peer dependencies that ship only ESM. A CommonJS declaration file may reference
 * their types only with `resolution-mode: "import"` (TS1479/TS1542 otherwise); at
 * runtime the CommonJS build loads them through Node's `require(esm)`.
 */
const ESM_ONLY_PEERS = ["@angular/core"];

/** The import attribute that lets a CommonJS declaration reference an ES module's types. */
const IMPORT_MODE = `with { "resolution-mode": "import" }`;

/**
 * Rewrites a declaration file for CommonJS consumers:
 * - relative `.js` specifiers become `.cjs`, so a `.d.cts` copy resolves its siblings as
 *   `.d.cts` too (bare specifiers such as `react` are left alone);
 * - every static `import … from` / `export … from` of an ESM-only peer becomes type-only
 *   and carries `resolution-mode: "import"` (named, default, namespace and `type`
 *   imports, re-exports and `export *`). A re-exported value is then a type-only export
 *   of the `.d.cts`, which is the most a CommonJS declaration can say about it;
 * - inline `import("peer")` type references carry the same attribute.
 *
 * @param {string} source Contents of a `.d.ts` file.
 * @returns {string} The same declarations, pointing at CommonJS siblings.
 */
export function toCommonJsDeclaration(source) {
  let output = source.replace(/((?:\bfrom|\bimport|\bimport\()\s*)(["'])(\.{1,2}\/[^"']*?)\.js\2/g, "$1$2$3.cjs$2");

  for (const peer of ESM_ONLY_PEERS) {
    const name = peer.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    output = output
      .replace(
        // import [type] <clause> from "peer" [with {…}];   export [type] <clause> from "peer" [with {…}];
        new RegExp(
          `^(import|export)\\s+(?:type\\s+)?((?:[\\w$]+\\s*,\\s*)?(?:\\{[^}]*\\}|\\*(?:\\s+as\\s+[\\w$]+)?|[\\w$]+))\\s+from\\s*(["'])${name}\\3(?:\\s*(?:with|assert)\\s*\\{[^}]*\\})?\\s*;?`,
          "gm",
        ),
        (_, keyword, clause, quote) => {
          const from = `from ${quote}${peer}${quote} ${IMPORT_MODE};`;
          // A type-only import takes a default or named bindings, not both: split them.
          const both = /^([\w$]+)\s*,\s*([\s\S]+)$/.exec(clause.trim());
          if (both) return `${keyword} type ${both[1]} ${from}\n${keyword} type ${both[2]} ${from}`;
          return `${keyword} type ${clause.trim()} ${from}`;
        },
      )
      .replace(
        new RegExp(`\\bimport\\((["'])${name}\\1\\)`, "g"),
        `import($1${peer}$1, { with: { "resolution-mode": "import" } })`,
      );
  }

  return output;
}

/**
 * Writes a `.d.cts` copy next to every `.d.ts` in dist/. The `require` condition of
 * each export points at these, so TypeScript projects that `require()` the CommonJS
 * build get CommonJS types instead of ESM types "masquerading" as CommonJS.
 *
 * @returns {Promise<number>} How many `.d.cts` files were written.
 */
async function emitCommonJsDeclarations() {
  const files = (await readdir(distDir, { recursive: true })).filter((file) => file.endsWith(".d.ts"));

  for (const file of files) {
    const source = await readFile(resolve(distDir, file), "utf8");
    await writeFile(resolve(distDir, file.replace(/\.d\.ts$/, ".d.cts")), toCommonJsDeclaration(source));
  }

  return files.length;
}

/**
 * Collects every `types` path from a (possibly nested) exports condition object.
 *
 * @param {unknown} conditions An exports value.
 * @returns {string[]} The `types` paths found at any depth.
 */
function typesPaths(conditions) {
  if (!conditions || typeof conditions !== "object") return [];
  return Object.entries(conditions).flatMap(([key, value]) =>
    key === "types" && typeof value === "string" ? [value] : typesPaths(value),
  );
}

/**
 * Fails when any `types` condition in the package.json exports map, or any
 * `typesVersions` path, has no file in dist/.
 *
 * @returns {Promise<void>}
 */
async function checkExportTypes() {
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const typesVersions = Object.entries(pkg.typesVersions?.["*"] ?? {}).flatMap(([subpath, paths]) =>
    paths.map((/** @type {string} */ types) => ({ subpath: `typesVersions ${subpath}`, types })),
  );
  const missing = Object.entries(pkg.exports)
    .flatMap(([subpath, conditions]) => typesPaths(conditions).map((types) => ({ subpath, types })))
    .concat(typesVersions)
    .filter(({ types }) => !existsSync(resolve(root, types)));

  if (missing.length > 0) {
    const list = missing.map(({ subpath, types }) => `  ${subpath} -> ${types}`).join("\n");
    throw new Error(`package.json exports point at missing declaration files:\n${list}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const written = await emitEntryStubs();
  const commonJs = await emitCommonJsDeclarations();
  await checkExportTypes();
  console.log(`emit-entry-dts: wrote ${written.length} entry declaration stubs and ${commonJs} .d.cts copies`);
}
