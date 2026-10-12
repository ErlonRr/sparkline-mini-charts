// release-changelog.mjs — After `changeset version`, turns the new entry and the [Unreleased] notes into one Keep a Changelog release section; `--notes` prints the notes of one release.

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");

/** Keep a Changelog section order; any other section follows, in order of appearance. */
const SECTION_ORDER = Object.freeze(["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"]);

/** Lines Changesets writes around the release lines: bump-type headings, and the placeholder of an entry without notes. */
const CHANGESETS_FILLER = /^(### (Major|Minor|Patch) Changes|No changes in this release\.)$/;

/**
 * @typedef {Object} Notes
 * @property {string[]} intro Lines before the first `###` heading.
 * @property {Map<string, string[]>} sections Lines of each `###` section, keyed by heading.
 */

/**
 * Splits Markdown lines into an intro and `###` sections, merging repeated headings.
 *
 * @param {string[]} lines
 * @returns {Notes}
 */
function parseNotes(lines) {
  /** @type {Notes} */
  const notes = { intro: [], sections: new Map() };
  /** @type {string[]} */
  let current = notes.intro;
  for (const line of lines) {
    if (CHANGESETS_FILLER.test(line)) continue;
    const heading = /^### (.+)$/.exec(line);
    if (heading) {
      const name = heading[1].trim();
      if (!notes.sections.has(name)) notes.sections.set(name, []);
      current = /** @type {string[]} */ (notes.sections.get(name));
      // A blank line separates the bullets of two changesets merged into one section.
      if (current.length > 0) current.push("");
      continue;
    }
    current.push(line);
  }
  return notes;
}

/**
 * Trims blank lines at both ends and collapses runs of blank lines.
 *
 * @param {string[]} lines
 * @returns {string}
 */
function tidy(lines) {
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Joins bullet lists without the blank line that separated their sources, so a merged
 * section reads as one list.
 *
 * @param {string} text
 * @returns {string}
 */
function joinLists(text) {
  return text.replace(/^(- .*(?:\n {2}.*)*)\n\n(?=- )/gm, "$1\n");
}

/**
 * Renders notes as a Keep a Changelog section body.
 *
 * @param {Notes} notes
 * @returns {string}
 */
function renderNotes(notes) {
  const names = [
    ...SECTION_ORDER.filter((name) => notes.sections.has(name)),
    ...[...notes.sections.keys()].filter((name) => !SECTION_ORDER.includes(name)),
  ];
  const parts = [];
  const intro = tidy(notes.intro);
  if (intro) parts.push(intro);
  for (const name of names) {
    const body = joinLists(tidy(/** @type {string[]} */ (notes.sections.get(name))));
    if (body) parts.push(`### ${name}\n\n${body}`);
  }
  return parts.join("\n\n");
}

/**
 * Finds the `##` section that starts at the line matching `heading`.
 *
 * @param {string[]} lines
 * @param {RegExp} heading
 * @returns {{ start: number, end: number } | null} Line range, `end` exclusive.
 */
function findSection(lines, heading) {
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && !/^#{1,2} /.test(lines[end]) && !/^\[[^\]]+\]: /.test(lines[end])) end += 1;
  return { start, end };
}

/**
 * Rewrites CHANGELOG.md after `changeset version`:
 *
 * - removes the `## x.y.z` entry Changesets inserted (above `# Changelog`, since the
 *   file has no unbracketed version heading) and drops its "Patch Changes" headings
 *   and its "No changes in this release." placeholder;
 * - merges its sections with the notes under `## [Unreleased]` into a new
 *   `## [x.y.z] - date` section below an empty `## [Unreleased]`;
 * - points the `[Unreleased]` link at the new tag, adds the `[x.y.z]` compare link, and
 *   turns the other `[Unreleased]` references in the text into `[x.y.z]`.
 *
 * @param {string} changelog Contents of CHANGELOG.md.
 * @param {{ version: string, date: string }} release New version and its date (YYYY-MM-DD).
 * @returns {string} The rewritten changelog.
 */
export function releaseChangelog(changelog, { version, date }) {
  const escaped = version.replaceAll(".", "\\.");
  let lines = changelog.split("\n");

  if (lines.some((line) => new RegExp(`^## \\[${escaped}\\]`).test(line))) {
    throw new Error(`CHANGELOG.md already has a [${version}] section.`);
  }

  /** @type {string[]} */
  let generated = [];
  const inserted = findSection(lines, new RegExp(`^## ${escaped}$`));
  if (inserted) {
    generated = lines.slice(inserted.start + 1, inserted.end);
    lines = [...lines.slice(0, inserted.start), ...lines.slice(inserted.end)];
    // Changesets inserts "\n\n<entry>\n" after the first line: drop the blank line it added.
    if (inserted.start === 2 && lines[1] === "") lines.splice(1, 1);
  }

  const unreleased = findSection(lines, /^## \[Unreleased\]\s*$/);
  if (!unreleased) throw new Error("CHANGELOG.md has no `## [Unreleased]` section.");

  const unreleasedNotes = parseNotes(lines.slice(unreleased.start + 1, unreleased.end));
  const generatedNotes = parseNotes(generated);
  const notes = {
    intro: [...unreleasedNotes.intro, "", ...generatedNotes.intro],
    sections: new Map(unreleasedNotes.sections),
  };
  for (const [name, body] of generatedNotes.sections) {
    const existing = notes.sections.get(name);
    notes.sections.set(name, existing ? [...existing, "", ...body] : body);
  }

  const body = renderNotes(notes);
  if (!body) throw new Error(`Nothing to release: no changesets and no notes under [Unreleased].`);

  const releaseSection = ["## [Unreleased]", "", `## [${version}] - ${date}`, "", body, ""];
  lines = [...lines.slice(0, unreleased.start), ...releaseSection, ...lines.slice(unreleased.end)];

  // Link definitions and references.
  const linkIndex = lines.findIndex((line) => /^\[Unreleased\]: /.test(line));
  if (linkIndex !== -1) {
    const match = /^\[Unreleased\]: (.+)\/compare\/(.+)\.\.\.HEAD$/.exec(lines[linkIndex]);
    if (match) {
      const [, base, previous] = match;
      lines.splice(
        linkIndex,
        1,
        `[Unreleased]: ${base}/compare/v${version}...HEAD`,
        `[${version}]: ${base}/compare/${previous}...v${version}`,
      );
    }
  }
  return lines
    .map((line) =>
      /^## \[Unreleased\]/.test(line) || /^\[Unreleased\]: /.test(line)
        ? line
        : line.replaceAll("[Unreleased]", `[${version}]`),
    )
    .join("\n");
}

/**
 * Extracts the notes of one release: the body of its `## [x.y.z] - date`
 * section, followed by the link definitions it references. Changesets looks for
 * a heading that is exactly the version, which this changelog does not use, so
 * the release workflow creates the GitHub release and the "Version Packages"
 * pull request body from these notes instead.
 *
 * @param {string} changelog Contents of CHANGELOG.md.
 * @param {string} version Released version, without the `v` prefix.
 * @returns {string} The release notes, as Markdown.
 */
export function releaseNotes(changelog, version) {
  const escaped = version.replaceAll(".", "\\.");
  const lines = changelog.split("\n");
  const section = findSection(lines, new RegExp(`^## \\[${escaped}\\](?:\\s|$)`));
  if (!section) throw new Error(`CHANGELOG.md has no [${version}] section.`);

  const body = tidy(lines.slice(section.start + 1, section.end));
  if (!body) throw new Error(`The [${version}] section of CHANGELOG.md is empty.`);

  // Reference-style links keep working outside the file: copy the definitions they use.
  const definitions = new Map(
    lines.flatMap((line) => {
      const match = /^\[([^\]]+)\]: \S/.exec(line);
      return match ? [[match[1].toLowerCase(), line]] : [];
    }),
  );
  const used = [...body.matchAll(/\[([^\]]+)\](?!\(|:)/g)]
    .map((match) => definitions.get(match[1].toLowerCase()))
    .filter((line) => line !== undefined);
  const links = [...new Set(used)];
  return links.length > 0 ? `${body}\n\n${links.join("\n")}` : body;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const changelogPath = resolve(root, "CHANGELOG.md");
  const { version } = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const changelog = await readFile(changelogPath, "utf8");

  if (process.argv[2] === "--notes") {
    // `node scripts/release-changelog.mjs --notes [version]`: prints the notes of a
    // released version (default: the version in package.json) to stdout.
    process.stdout.write(`${releaseNotes(changelog, process.argv[3] ?? version)}\n`);
  } else {
    const date = process.env.RELEASE_DATE ?? new Date().toISOString().slice(0, 10);
    await writeFile(changelogPath, releaseChangelog(changelog, { version, date }));
    console.log(`CHANGELOG.md: released [Unreleased] and the changesets as [${version}] - ${date}.`);
  }
}
