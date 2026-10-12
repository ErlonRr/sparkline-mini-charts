// changeset-changelog.mjs — Changesets changelog generator that keeps each changeset's Keep a Changelog sections intact.

/**
 * Changesets calls these functions while running `changeset version`. Each changeset
 * is written as Keep a Changelog sections (`### Fixed`, `### Changed`, ...), so its
 * summary is passed through unchanged; scripts/release-changelog.mjs then merges the
 * sections into a `## [x.y.z] - date` entry. A summary without a section heading is
 * filed under `### Changed`.
 */
const changelogFunctions = {
  /**
   * @param {{ summary: string }} changeset
   * @returns {Promise<string>}
   */
  async getReleaseLine(changeset) {
    const summary = changeset.summary.trim();
    if (!summary) return "";
    if (/^### /m.test(summary)) return `\n\n${summary}\n`;
    const [first, ...rest] = summary.split("\n");
    const continuation = rest.map((line) => (line ? `\n  ${line}` : "\n")).join("");
    return `\n\n### Changed\n\n- ${first}${continuation}\n`;
  },
  // Single-package repository: there are no internal dependency bumps to report.
  async getDependencyReleaseLine() {
    return "";
  },
};

export default changelogFunctions;
