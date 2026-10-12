// compare-pack.mjs — Compares the files and the exports map that `npm pack` of packages/core would publish with a released version; fails when a file or an export is removed.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "../..");
const packageDir = resolve(root, "packages/core");
const cacheDir = resolve(root, "node_modules/.cache/compare-pack");

/** package.json fields, besides `exports`, that decide what a consumer resolves. */
const ENTRY_FIELDS = Object.freeze(["main", "module", "types", "typings", "browser", "bin", "typesVersions", "sideEffects"]);

const USAGE = `Usage: node tools/scripts/compare-pack.mjs [--against <version | file.tgz>] [--skip-build] [--json]

  --against <version>   a released version: the npm tarball when the version is on npm,
                        otherwise a tarball built from the git tag v<version>
  --against <file.tgz>  a tarball made by \`npm pack\` / \`pnpm pack\`
                        (default: the latest v* tag reachable from HEAD)
  --skip-build          pack the existing packages/core/dist/ without running prepack
  --json                print the comparison as JSON`;

/**
 * @typedef {Object} PackSnapshot
 * @property {string} label Where the tarball comes from.
 * @property {string} name Package name.
 * @property {string} version Package version.
 * @property {string[]} files Packed file paths, relative to the package root, sorted.
 * @property {Record<string, any>} manifest The packed package.json.
 */

/**
 * @typedef {Object} PackComparison
 * @property {string[]} removedFiles Files of the reference that are not packed any more (content-hashed
 *   chunks compare by name without the hash, see {@link withoutChunkHash}).
 * @property {string[]} addedFiles Files packed now that the reference did not have.
 * @property {string[]} removedChunks Internal content-hashed chunks of the reference that are gone (merged by the bundler; not breaking).
 * @property {string[]} removedExports Export conditions (`./react import.types`) the reference had and the
 *   package no longer answers (see {@link coversCondition}).
 * @property {string[]} restructuredExports Export conditions of the reference that are gone as written but
 *   still answered by a nested or flattened condition of the same subpath (`. import` → `. import.default`).
 * @property {string[]} addedExports Export conditions the reference did not have.
 * @property {{ key: string, from: string, to: string }[]} changedExports Export conditions whose target changed.
 * @property {string[]} danglingExports Export targets that point at no packed file.
 * @property {string[]} changedFields Other entry fields (`main`, `types`, `typesVersions`, ...) that changed.
 */

/**
 * Flattens an `exports` map into `subpath [condition.condition…]` → target. A
 * sugar string (`"exports": "./index.js"`) is the `.` subpath; arrays keep their index.
 *
 * @param {unknown} exportsField The `exports` value of a package.json.
 * @returns {Map<string, string>}
 */
export function flattenExports(exportsField) {
  /** @type {Map<string, string>} */
  const flat = new Map();
  if (exportsField === undefined || exportsField === null) return flat;

  /**
   * @param {unknown} value
   * @param {string} subpath
   * @param {string[]} conditions
   */
  const walk = (value, subpath, conditions) => {
    const key = conditions.length > 0 ? `${subpath} ${conditions.join(".")}` : subpath;
    if (value === null || typeof value === "string") flat.set(key, String(value));
    else if (Array.isArray(value)) value.forEach((item, index) => walk(item, subpath, [...conditions, `[${index}]`]));
    else if (typeof value === "object") {
      for (const [name, inner] of Object.entries(value)) walk(inner, subpath, [...conditions, name]);
    }
  };

  const isSubpathMap =
    typeof exportsField === "object" && !Array.isArray(exportsField) && Object.keys(exportsField).every((key) => key.startsWith("."));
  if (isSubpathMap) {
    for (const [subpath, value] of Object.entries(exportsField)) walk(value, subpath, []);
  } else {
    walk(exportsField, ".", []);
  }
  return flat;
}

/**
 * Replaces the content hash of a bundler chunk (`dist/mini-chart-element-Cq_H17wK.cjs`)
 * with `[hash]`. Chunks are internal: no export points at them, and their hash changes
 * with any source change, so a renamed chunk is not a removed file.
 *
 * @param {string} file Packed file path.
 * @returns {string}
 */
export function withoutChunkHash(file) {
  return file.replace(/-[\w-]{8}(?=\.(?:c?js|d\.c?ts)(?:\.map)?$)/, "-[hash]");
}

/**
 * Whether a candidate export condition still answers a reference condition of the same
 * subpath: one condition list contains the other, so a resolver that matched the
 * reference (`. import`, `. types`) still finds a target (`. import.default`,
 * `. import.types`).
 *
 * @param {string} referenceKey Flattened key, `subpath cond.cond`.
 * @param {Iterable<string>} candidateKeys
 * @returns {boolean}
 */
export function coversCondition(referenceKey, candidateKeys) {
  const split = (/** @type {string} */ key) => {
    const space = key.indexOf(" ");
    return space === -1 ? { subpath: key, conditions: [] } : { subpath: key.slice(0, space), conditions: key.slice(space + 1).split(".") };
  };
  const reference = split(referenceKey);
  for (const key of candidateKeys) {
    const candidate = split(key);
    if (candidate.subpath !== reference.subpath) continue;
    const refined = reference.conditions.every((condition) => candidate.conditions.includes(condition));
    const flattened = candidate.conditions.every((condition) => reference.conditions.includes(condition));
    if (refined || flattened) return true;
  }
  return false;
}

/**
 * Compares a candidate pack with a reference pack.
 *
 * @param {Pick<PackSnapshot, "files" | "manifest">} reference
 * @param {Pick<PackSnapshot, "files" | "manifest">} candidate
 * @returns {PackComparison}
 */
export function comparePacks(reference, candidate) {
  const referenceFiles = new Set(reference.files);
  const candidateFiles = new Set(candidate.files);
  const referenceExports = flattenExports(reference.manifest.exports);
  const candidateExports = flattenExports(candidate.manifest.exports);

  const danglingExports = [];
  for (const [key, target] of candidateExports) {
    // Patterns (`./*`) and null targets (blocked subpaths) point at no single file.
    if (target === "null" || target.includes("*")) continue;
    if (!candidateFiles.has(target.replace(/^\.\//, ""))) danglingExports.push(`${key} → ${target}`);
  }

  const referenceNames = new Set(reference.files.map(withoutChunkHash));
  const candidateNames = new Set(candidate.files.map(withoutChunkHash));
  const goneExports = [...referenceExports.keys()].filter((key) => !candidateExports.has(key));

  const goneFiles = reference.files.filter((file) => !candidateFiles.has(file) && !candidateNames.has(withoutChunkHash(file)));
  // A content-hashed chunk is internal (no export points at it): the bundler may merge it into
  // another chunk, so its disappearance is reported but never breaks consumers.
  const isChunk = (/** @type {string} */ file) => withoutChunkHash(file) !== file;

  return {
    removedFiles: goneFiles.filter((file) => !isChunk(file)),
    removedChunks: goneFiles.filter(isChunk),
    addedFiles: candidate.files.filter((file) => !referenceFiles.has(file) && !referenceNames.has(withoutChunkHash(file))),
    removedExports: goneExports.filter((key) => !coversCondition(key, candidateExports.keys())),
    restructuredExports: goneExports.filter((key) => coversCondition(key, candidateExports.keys())),
    addedExports: [...candidateExports.keys()].filter((key) => !referenceExports.has(key)),
    changedExports: [...referenceExports]
      .filter(([key, target]) => candidateExports.has(key) && candidateExports.get(key) !== target)
      .map(([key, from]) => ({ key, from, to: /** @type {string} */ (candidateExports.get(key)) })),
    danglingExports,
    changedFields: ENTRY_FIELDS.filter(
      (field) => JSON.stringify(reference.manifest[field]) !== JSON.stringify(candidate.manifest[field]),
    ),
  };
}

/**
 * Whether a comparison breaks consumers: a file or an export condition was removed,
 * or an export points at a file that is not packed.
 *
 * @param {PackComparison} comparison
 * @returns {boolean}
 */
export function isBreaking(comparison) {
  return comparison.removedFiles.length > 0 || comparison.removedExports.length > 0 || comparison.danglingExports.length > 0;
}

/**
 * Runs a command and returns its stdout. stderr goes to ours, so build logs stay visible.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string}
 */
function run(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Reads the file list and the package.json of a tarball made by `npm pack` or `pnpm pack`.
 *
 * @param {string} tarball Path of the .tgz.
 * @param {string} label Where it comes from.
 * @returns {PackSnapshot}
 */
export function readTarball(tarball, label) {
  const files = run("tar", ["-tzf", tarball], root)
    .split("\n")
    .filter((line) => line && !line.endsWith("/"))
    .map((line) => line.replace(/^[^/]+\//, ""))
    .sort();
  const manifest = JSON.parse(run("tar", ["-xzOf", tarball, "package/package.json"], root));
  return { label, name: manifest.name, version: manifest.version, files, manifest };
}

/**
 * Packs packages/core with `npm pack` (its prepack builds dist/ first, unless `skipBuild`).
 *
 * @param {string} workDir Folder that receives the tarball.
 * @param {{ skipBuild: boolean }} options
 * @returns {PackSnapshot}
 */
function packCandidate(workDir, { skipBuild }) {
  const args = ["pack", "--json", "--pack-destination", workDir];
  if (skipBuild) args.push("--ignore-scripts");
  const [result] = JSON.parse(run("npm", args, packageDir));
  return readTarball(join(workDir, result.filename), "packages/core (working tree)");
}

/**
 * Whether a version of the package is on the npm registry.
 *
 * @param {string} name
 * @param {string} version
 * @returns {boolean}
 */
function isPublished(name, version) {
  try {
    return run("npm", ["view", `${name}@${version}`, "version", "--json"], root).trim() !== "";
  } catch {
    return false;
  }
}

/**
 * Builds the tarball of a git tag in a detached worktree (`pnpm install`, then `pnpm pack`
 * in packages/core, or in the root for the single-package layout before 1.5), and caches
 * it under node_modules/.cache/compare-pack/ by commit.
 *
 * @param {string} tag
 * @param {string} workDir
 * @returns {string} Path of the tarball.
 */
function packTag(tag, workDir) {
  const commit = run("git", ["rev-parse", "--verify", `${tag}^{commit}`], root).trim();
  const cached = join(cacheDir, `${tag}-${commit.slice(0, 12)}.tgz`);
  if (existsSync(cached)) return cached;

  const worktree = join(workDir, `worktree-${tag}`);
  run("git", ["worktree", "add", "--detach", worktree, commit], root);
  try {
    run("pnpm", ["install", "--frozen-lockfile"], worktree);
    const dir = existsSync(join(worktree, "packages/core/package.json")) ? join(worktree, "packages/core") : worktree;
    // pnpm prints the tarball path last; its prepack builds dist/ first.
    const output = run("pnpm", ["pack", "--pack-destination", workDir], dir).trim().split("\n");
    const tarball = resolve(dir, output[output.length - 1].trim());
    mkdirSync(cacheDir, { recursive: true });
    copyFileSync(tarball, cached);
    return cached;
  } finally {
    run("git", ["worktree", "remove", "--force", worktree], root);
  }
}

/**
 * Resolves `--against` to a tarball.
 *
 * @param {string | undefined} against Version, tag or tarball path; the latest v* tag when omitted.
 * @param {string} name Package name.
 * @param {string} workDir
 * @returns {PackSnapshot}
 */
function packReference(against, name, workDir) {
  if (against && (against.endsWith(".tgz") || existsSync(resolve(against)))) {
    return readTarball(resolve(against), against);
  }
  const tag = against
    ? against.startsWith("v")
      ? against
      : `v${against}`
    : run("git", ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*", "HEAD"], root).trim();
  const version = tag.slice(1);

  if (isPublished(name, version)) {
    const [result] = JSON.parse(run("npm", ["pack", `${name}@${version}`, "--json", "--pack-destination", workDir], workDir));
    return readTarball(join(workDir, result.filename), `${name}@${version} from npm`);
  }
  return readTarball(packTag(tag, workDir), `${name}@${version} built from git tag ${tag} (not on npm)`);
}

/**
 * @param {string} title
 * @param {string[]} lines
 */
function printList(title, lines) {
  if (lines.length === 0) return;
  console.log(`  ${title}:`);
  for (const line of lines) console.log(`    ${line}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }
  const againstIndex = args.indexOf("--against");
  const against = againstIndex === -1 ? undefined : args[againstIndex + 1];
  if (againstIndex !== -1 && !against) {
    console.error(USAGE);
    process.exit(2);
  }

  const workDir = await mkdtemp(join(tmpdir(), "compare-pack-"));
  try {
    const candidate = packCandidate(workDir, { skipBuild: args.includes("--skip-build") });
    const reference = packReference(against, candidate.name, workDir);
    const comparison = comparePacks(reference, candidate);
    const breaking = isBreaking(comparison);

    if (args.includes("--json")) {
      console.log(JSON.stringify({ reference: reference.label, candidate: candidate.label, breaking, ...comparison }, null, 2));
    } else {
      const exportCount = (/** @type {PackSnapshot} */ pack) => flattenExports(pack.manifest.exports).size;
      console.log(`compare-pack: ${candidate.name}@${candidate.version} [${candidate.label}]`);
      console.log(`          vs  ${reference.name}@${reference.version} [${reference.label}]`);
      console.log(
        `  files: ${reference.files.length} → ${candidate.files.length} (removed ${comparison.removedFiles.length}, added ${comparison.addedFiles.length})`,
      );
      console.log(
        `  exports: ${exportCount(reference)} → ${exportCount(candidate)} conditions (removed ${comparison.removedExports.length}, ` +
          `restructured ${comparison.restructuredExports.length}, changed ${comparison.changedExports.length}, ` +
          `added ${comparison.addedExports.length})`,
      );
      printList("removed files", comparison.removedFiles);
      printList("merged internal chunks (not breaking)", comparison.removedChunks);
      printList("added files", comparison.addedFiles);
      printList("removed exports", comparison.removedExports);
      printList("restructured exports (still answered)", comparison.restructuredExports);
      printList("changed exports", comparison.changedExports.map(({ key, from, to }) => `${key}: ${from} → ${to}`));
      printList("added exports", comparison.addedExports);
      printList("exports pointing at no packed file", comparison.danglingExports);
      printList("changed entry fields", comparison.changedFields);
      console.log(breaking ? "\ncompare-pack: FAILED (a file or an export was removed)." : "\ncompare-pack: OK (no file or export removed).");
    }
    if (breaking) process.exitCode = 1;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
