// release-changelog.test.js — The Changesets changelog generator and the Keep a Changelog rewrite run by `pnpm version-packages`.

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, test } from "node:test";

import changelogFunctions from "../scripts/changeset-changelog.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { releaseChangelog, releaseNotes } from "../scripts/release-changelog.mjs";

const root = resolve(import.meta.dirname, "..");

/** What Changesets inserts after the first line of CHANGELOG.md for a patch release. */
const CHANGESETS_ENTRY = [
  "",
  "## 1.4.2",
  "",
  "### Patch Changes",
  "",
  "### Fixed",
  "",
  "- Fix A.",
  "",
  "### Changed",
  "",
  "- Change B.",
  "",
  "### Fixed",
  "",
  "- Fix C.",
  "",
];

const CHANGELOG = [
  "<!-- CHANGELOG.md — history. -->",
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "Intro paragraph.",
  "",
  "### Fixed",
  "",
  "- Old fix.",
  "",
  "### Known issues",
  "",
  "- Issue.",
  "",
  "## [1.4.0] - 2026-08-17",
  "",
  "- Reverted in [Unreleased].",
  "",
  "[Unreleased]: https://example.test/repo/compare/v1.4.0...HEAD",
  "[1.4.0]: https://example.test/repo/compare/v1.3.0...v1.4.0",
  "",
];

/**
 * Inserts an entry the way `changeset version` does when the file has no unbracketed
 * version heading: after the first line, as "\n\n<entry>\n".
 *
 * @param {string} changelog
 * @param {string[]} entry Lines of the entry.
 * @returns {string}
 */
const insertEntry = (changelog, entry) => {
  const index = changelog.indexOf("\n");
  return `${changelog.slice(0, index)}\n\n${entry.join("\n").trim()}\n${changelog.slice(index + 1)}`;
};

/**
 * @param {string[]} entry Lines of the entry.
 * @returns {string} The fixture CHANGELOG after `changeset version`.
 */
const withEntry = (entry) => insertEntry(CHANGELOG.join("\n"), entry);

describe("changeset changelog generator", () => {
  test("passes Keep a Changelog sections through", async () => {
    const line = await changelogFunctions.getReleaseLine({ summary: "### Fixed\n\n- Fix A.\n" });
    assert.equal(line.trim(), "### Fixed\n\n- Fix A.");
  });

  test("files a plain summary under Changed", async () => {
    const line = await changelogFunctions.getReleaseLine({ summary: "Plain change.\nMore detail." });
    assert.equal(line.trim(), "### Changed\n\n- Plain change.\n  More detail.");
  });

  test("an empty summary adds nothing", async () => {
    assert.equal(await changelogFunctions.getReleaseLine({ summary: "  " }), "");
    assert.equal(await changelogFunctions.getDependencyReleaseLine(), "");
  });
});

describe("releaseChangelog", () => {
  test("merges the changesets into the [Unreleased] notes as one release section", () => {
    const result = releaseChangelog(withEntry(CHANGESETS_ENTRY), { version: "1.4.2", date: "2026-10-12" });
    assert.equal(
      result,
      [
        "<!-- CHANGELOG.md — history. -->",
        "# Changelog",
        "",
        "## [Unreleased]",
        "",
        "## [1.4.2] - 2026-10-12",
        "",
        "Intro paragraph.",
        "",
        "### Changed",
        "",
        "- Change B.",
        "",
        "### Fixed",
        "",
        "- Old fix.",
        "- Fix A.",
        "- Fix C.",
        "",
        "### Known issues",
        "",
        "- Issue.",
        "",
        "## [1.4.0] - 2026-08-17",
        "",
        "- Reverted in [1.4.2].",
        "",
        "[Unreleased]: https://example.test/repo/compare/v1.4.2...HEAD",
        "[1.4.2]: https://example.test/repo/compare/v1.4.0...v1.4.2",
        "[1.4.0]: https://example.test/repo/compare/v1.3.0...v1.4.0",
        "",
      ].join("\n"),
    );
  });

  test("releases the [Unreleased] notes alone when the changesets have no notes", () => {
    const entry = ["", "## 1.4.1", "", "No changes in this release.", ""];
    const result = releaseChangelog(withEntry(entry), { version: "1.4.1", date: "2026-10-12" });
    assert.match(result, /## \[Unreleased\]\n\n## \[1\.4\.1\] - 2026-10-12\n\nIntro paragraph\.\n\n### Fixed\n\n- Old fix\.\n/);
    assert.doesNotMatch(result, /^## 1\.4\.1$/m);
    assert.doesNotMatch(result, /No changes in this release/);
  });

  test("refuses to release a version twice or with nothing to release", () => {
    const released = releaseChangelog(withEntry(CHANGESETS_ENTRY), { version: "1.4.2", date: "2026-10-12" });
    assert.throws(() => releaseChangelog(released, { version: "1.4.2", date: "2026-10-12" }), /already has/);
    assert.throws(() => releaseChangelog(released, { version: "1.4.3", date: "2026-10-12" }), /Nothing to release/);
  });

  test("the repository CHANGELOG and pending changesets produce a release section", async () => {
    const changelog = await readFile(resolve(root, "CHANGELOG.md"), "utf8");
    const changesetDir = resolve(root, ".changeset");
    const files = (await readdir(changesetDir)).filter((file) => file.endsWith(".md") && file !== "README.md");
    const releaseLines = [];
    for (const file of files) {
      const summary = (await readFile(resolve(changesetDir, file), "utf8")).replace(/^---\n[\s\S]*?\n---\n/, "");
      releaseLines.push(await changelogFunctions.getReleaseLine({ summary }));
    }
    const entry = ["", "## 9.9.9", "", "### Patch Changes", ...releaseLines.join("").split("\n"), ""];
    const result = releaseChangelog(insertEntry(changelog, entry), { version: "9.9.9", date: "2026-10-12" });

    assert.match(result, /^## \[Unreleased\]\n\n## \[9\.9\.9\] - 2026-10-12\n/m);
    assert.doesNotMatch(result, /^### Patch Changes$/m);
    assert.doesNotMatch(result, /^## 9\.9\.9$/m);
    assert.ok(result.startsWith(changelog.slice(0, changelog.indexOf("## [Unreleased]"))));
    // One heading per section in the new release.
    const section = result.slice(result.indexOf("## [9.9.9]"), result.indexOf("## [1.4.0]"));
    for (const name of ["Added", "Changed", "Fixed"]) {
      assert.ok((section.match(new RegExp(`^### ${name}$`, "gm")) ?? []).length <= 1, name);
    }
  });
});

describe("releaseNotes", () => {
  const released = () => releaseChangelog(withEntry(CHANGESETS_ENTRY), { version: "1.4.2", date: "2026-10-12" });

  test("returns the body of one [x.y.z] section with the link definitions it uses", () => {
    const notes = releaseNotes(released(), "1.4.2");
    assert.ok(notes.startsWith("Intro paragraph.\n\n### Changed\n\n- Change B."), notes);
    assert.doesNotMatch(notes, /^## /m, "the notes include a release heading");
    assert.doesNotMatch(notes, /Reverted in/, "the notes run into the next release");

    assert.equal(
      releaseNotes(released(), "1.4.0"),
      ["- Reverted in [1.4.2].", "", "[1.4.2]: https://example.test/repo/compare/v1.4.0...v1.4.2"].join("\n"),
    );
  });

  test("does not match a longer version or the Changesets heading form", () => {
    const changelog = ["## [1.4.20] - 2026-10-12", "", "- Other.", "", "## 1.4.2", "", "- Raw."].join("\n");
    assert.throws(() => releaseNotes(changelog, "1.4.2"), /no \[1\.4\.2\] section/);
    assert.throws(() => releaseNotes(["## [1.4.2] - 2026-10-12", "", "## [1.4.1]"].join("\n"), "1.4.2"), /is empty/);
  });

  test("the CLI prints the notes of a version of the repository CHANGELOG", async () => {
    const { stdout } = await promisify(execFile)(process.execPath, [resolve(root, "scripts/release-changelog.mjs"), "--notes", "1.4.0"]);
    const changelog = await readFile(resolve(root, "CHANGELOG.md"), "utf8");
    assert.equal(stdout, `${releaseNotes(changelog, "1.4.0")}\n`);
    assert.match(stdout, /^### Added$/m);
    assert.doesNotMatch(stdout, /^## \[1\.3\.1\]/m);
  });
});
