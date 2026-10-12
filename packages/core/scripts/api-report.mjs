// api-report.mjs — Generates the API Extractor reports in api/ from the built declarations, or fails when they are out of date.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Extractor, ExtractorConfig, ExtractorLogLevel } from "@microsoft/api-extractor";

const root = resolve(import.meta.dirname, "..");
const apiDir = resolve(root, "api");
const packageJsonPath = resolve(root, "package.json");

/**
 * Compiler options for analysing dist/*.d.ts. API Extractor runs its bundled
 * TypeScript 5.x (the repository's TypeScript 7 has no JavaScript API), and only
 * reads declaration files, so these just need to resolve the DOM and the peers.
 */
const COMPILER_OPTIONS = Object.freeze({
  lib: ["ES2024", "DOM", "DOM.Iterable"],
  module: "ESNext",
  moduleResolution: "Bundler",
  target: "ES2022",
  strict: true,
  skipLibCheck: true,
  experimentalDecorators: true,
});

/**
 * @typedef {Object} ApiEntry
 * @property {string} subpath The `exports` key, such as `.` or `./react`.
 * @property {string} declaration Absolute path of the ESM declaration file of the entry.
 * @property {string} reportName Report file name in api/, without `.api.md`.
 */

/**
 * Lists every entry of the package `exports` map with its ESM declaration file. The
 * CommonJS `.d.cts` twins are copies written by scripts/emit-entry-dts.mjs, so one
 * report per entry covers both.
 *
 * @param {Record<string, any>} pkg Parsed package.json.
 * @returns {ApiEntry[]}
 */
export function listEntries(pkg) {
  return Object.entries(pkg.exports)
    .filter(([, target]) => typeof target === "object" && target?.import?.types)
    .map(([subpath, target]) => ({
      subpath,
      declaration: resolve(root, target.import.types),
      reportName: subpath === "." ? pkg.name : `${pkg.name}.${subpath.slice(2).replaceAll("/", "-")}`,
    }));
}

/**
 * Runs API Extractor on one entry and writes its report to `reportFolder`.
 *
 * @param {ApiEntry} entry
 * @param {string} reportFolder Folder that receives `<reportName>.api.md`.
 * @returns {string[]} Error and warning messages; empty when the analysis was clean.
 */
function extract(entry, reportFolder) {
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: root,
      newlineKind: "lf",
      mainEntryPointFilePath: entry.declaration,
      compiler: { overrideTsconfig: { compilerOptions: COMPILER_OPTIONS } },
      apiReport: {
        enabled: true,
        reportFileName: entry.reportName,
        reportFolder,
        reportTempFolder: reportFolder,
        // The chart classes extend the unexported MiniChartElement; its members
        // (data, render, renderChart, ...) are public API too.
        includeForgottenExports: true,
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      messages: {
        compilerMessageReporting: { default: { logLevel: ExtractorLogLevel.Warning } },
        extractorMessageReporting: {
          default: { logLevel: ExtractorLogLevel.Warning, addToApiReportFile: false },
          // The report tracks the API surface, not documentation style: the package
          // does not use release tags, the forgotten exports are included on purpose
          // (see includeForgottenExports), and the doc-comment rules are TSDoc conventions
          // the JSDoc-generated declarations do not follow.
          "ae-missing-release-tag": { logLevel: ExtractorLogLevel.None, addToApiReportFile: false },
          "ae-forgotten-export": { logLevel: ExtractorLogLevel.None, addToApiReportFile: false },
          "ae-undocumented": { logLevel: ExtractorLogLevel.None, addToApiReportFile: false },
          "ae-setter-with-docs": { logLevel: ExtractorLogLevel.None, addToApiReportFile: false },
          "ae-missing-getter": { logLevel: ExtractorLogLevel.None, addToApiReportFile: false },
        },
        tsdocMessageReporting: { default: { logLevel: ExtractorLogLevel.None, addToApiReportFile: false } },
      },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: packageJsonPath,
  });

  /** @type {string[]} */
  const problems = [];
  Extractor.invoke(config, {
    localBuild: true,
    messageCallback(message) {
      if (message.logLevel === ExtractorLogLevel.Error || message.logLevel === ExtractorLogLevel.Warning) {
        problems.push(message.formatMessageWithLocation(root));
      }
      // Progress and info messages ("Analysis will use the bundled TypeScript ...") stay quiet.
      message.handled = true;
    },
  });
  return problems;
}

/**
 * Prints a unified diff between the committed and the generated report.
 *
 * @param {string} expected Committed report path.
 * @param {string} actual Generated report path.
 */
function printDiff(expected, actual) {
  const result = spawnSync("git", ["diff", "--no-index", "--no-color", "--", relative(root, expected), actual], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.stdout) process.stderr.write(result.stdout);
}

/**
 * Generates every report into a temporary folder, then either copies them to api/
 * (`update`) or compares them with api/.
 *
 * @param {{ update: boolean }} options
 * @returns {Promise<string[]>} Problems found; empty when the reports are up to date.
 */
export async function runApiReport({ update }) {
  const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const entries = listEntries(pkg);
  const missingBuild = entries.filter((entry) => !existsSync(entry.declaration));
  if (missingBuild.length > 0) {
    return [
      `Missing declarations (${missingBuild.map((entry) => relative(root, entry.declaration)).join(", ")}). Run \`pnpm build\` first.`,
    ];
  }

  const tempDir = await mkdtemp(join(tmpdir(), "api-report-"));
  /** @type {string[]} */
  const problems = [];
  try {
    for (const entry of entries) {
      for (const problem of extract(entry, tempDir)) problems.push(`${entry.subpath}: ${problem}`);
    }
    if (problems.length > 0) return problems;
    if (update) await mkdir(apiDir, { recursive: true });

    const expectedFiles = new Set(entries.map((entry) => `${entry.reportName}.api.md`));
    const committedFiles = existsSync(apiDir)
      ? (await readdir(apiDir)).filter((file) => file.endsWith(".api.md"))
      : [];

    for (const file of expectedFiles) {
      const generatedPath = join(tempDir, file);
      const committedPath = join(apiDir, file);
      const generated = await readFile(generatedPath, "utf8");
      if (update) {
        await writeFile(committedPath, generated);
        continue;
      }
      if (!existsSync(committedPath)) {
        problems.push(`api/${file} is missing.`);
        continue;
      }
      if ((await readFile(committedPath, "utf8")) !== generated) {
        problems.push(`api/${file} does not match the public API of the build.`);
        printDiff(committedPath, generatedPath);
      }
    }

    for (const file of committedFiles) {
      if (expectedFiles.has(file)) continue;
      if (update) await rm(join(apiDir, file));
      else problems.push(`api/${file} belongs to no entry of package.json "exports".`);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const update = process.argv.includes("--update");
  const problems = await runApiReport({ update });
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    if (!update && problems.some((problem) => problem.startsWith("api/"))) {
      console.error(
        "\nThe public API changed. If the change is intended, run `pnpm build && pnpm api:update`, " +
          "commit the updated api/*.api.md and describe the change in a changeset.",
      );
    }
    process.exitCode = 1;
  } else {
    console.log(update ? "API reports updated in api/." : "API reports are up to date.");
  }
}
