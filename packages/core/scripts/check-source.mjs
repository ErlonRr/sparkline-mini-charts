// check-source.mjs — Rejects source patterns that break the components' contract with the page.

import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const srcDir = resolve(root, "src");

/**
 * @typedef {Object} SourceRule
 * @property {string} id Short rule name.
 * @property {RegExp} pattern Global pattern; every match is a violation.
 * @property {string} message Why the pattern is rejected and what to use instead.
 */

/** @type {readonly SourceRule[]} */
export const rules = Object.freeze([
  {
    id: "host-style",
    pattern:
      /\bthis\.(?:style\b|attributeStyleMap\b)|\bthis\.(?:setAttribute|removeAttribute|toggleAttribute|setAttributeNS|removeAttributeNS)\(\s*(?:null\s*,\s*)?(["'`])style\1/g,
    message:
      "the host's style belongs to the page: express chart state on internal nodes (e.g. a data attribute on the svg) and map it in the shadow stylesheet",
  },
  {
    id: "html-sink",
    pattern: /\.(?:innerHTML|outerHTML)\b|\binsertAdjacentHTML\b/g,
    message: "HTML string sinks throw under Trusted Types: build nodes and use replaceChildren() / append()",
  },
  {
    id: "foreign-custom-property",
    pattern: /var\(\s*--(?!mini-|_mc-)[\w-]*|\bgetPropertyValue\(\s*(["'`])--(?!mini-|_mc-)[\w-]*/g,
    message:
      "custom properties inherit into the shadow root: read only --mini-* tokens (or private --_mc-* variables), never the app's own variables",
  },
]);

/** Characters after which a `/` starts a regular expression literal, not a division. */
const REGEX_PRECEDERS = new Set([..."(,=:[!&|?{};+-*%<>~^"]);

/** Keywords after which a `/` starts a regular expression literal. */
const REGEX_KEYWORDS = /\b(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;

/**
 * Blanks out comment text so documentation can mention a forbidden pattern.
 * A small scanner walks the code, so a comment marker inside a string, a
 * template literal (where the CSS lives) or a regular expression is not a
 * comment, and string contents are kept. Line numbers are preserved.
 *
 * @param {string} source File contents.
 * @returns {string} The source with comments replaced by spaces.
 */
export function stripComments(source) {
  let output = "";
  let index = 0;
  let lastSignificant = "";
  /**
   * Open template literals and `${…}` substitutions, innermost last. A
   * substitution counts its own `{` depth, so the `}` that closes it is found.
   * @type {({ kind: "template" } | { kind: "substitution", depth: number })[]}
   */
  const stack = [];

  const blank = (/** @type {string} */ text) => text.replace(/[^\n]/g, " ");
  const take = (/** @type {number} */ end) => {
    output += source.slice(index, end);
    index = end;
  };

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    const context = stack.at(-1);

    if (context?.kind === "template") {
      if (char === "\\") take(index + 2);
      else if (char === "`") {
        take(index + 1);
        stack.pop();
        lastSignificant = "`";
      } else if (char === "$" && next === "{") {
        take(index + 2);
        stack.push({ kind: "substitution", depth: 0 });
        lastSignificant = "{";
      } else take(index + 1);
      continue;
    }

    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      output += blank(source.slice(index, stop));
      index = stop;
      continue;
    }
    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      output += blank(source.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === '"' || char === "'") {
      let end = index + 1;
      while (end < source.length && source[end] !== char && source[end] !== "\n") end += source[end] === "\\" ? 2 : 1;
      take(Math.min(end + 1, source.length));
      lastSignificant = char;
      continue;
    }
    if (char === "`") {
      take(index + 1);
      stack.push({ kind: "template" });
      continue;
    }

    if (char === "/" && (REGEX_PRECEDERS.has(lastSignificant) || lastSignificant === "" || REGEX_KEYWORDS.test(output.trimEnd()))) {
      let end = index + 1;
      let inClass = false;
      while (end < source.length && source[end] !== "\n") {
        const current = source[end];
        if (current === "\\") end += 1;
        else if (current === "[") inClass = true;
        else if (current === "]") inClass = false;
        else if (current === "/" && !inClass) break;
        end += 1;
      }
      take(Math.min(end + 1, source.length));
      lastSignificant = "/";
      continue;
    }

    if (context?.kind === "substitution") {
      if (char === "{") context.depth += 1;
      else if (char === "}" && context.depth === 0) {
        take(index + 1);
        stack.pop();
        lastSignificant = "`";
        continue;
      } else if (char === "}") context.depth -= 1;
    }

    if (!/\s/.test(char)) lastSignificant = /[\w$]/.test(char) ? "a" : char;
    take(index + 1);
  }

  return output;
}

/**
 * @typedef {Object} Violation
 * @property {string} file File path, relative to the repository root.
 * @property {number} line One-based line number.
 * @property {string} rule Rule id.
 * @property {string} match The offending text.
 * @property {string} message The rule's explanation.
 */

/**
 * Lists every rule violation in one source text.
 *
 * @param {string} source File contents.
 * @param {string} [file] File name used in the report.
 * @returns {Violation[]} The violations, in source order per rule.
 */
export function findViolations(source, file = "<source>") {
  const code = stripComments(source);
  /** @type {Violation[]} */
  const violations = [];

  for (const { id, pattern, message } of rules) {
    for (const match of code.matchAll(pattern)) {
      const line = code.slice(0, match.index).split("\n").length;
      violations.push({ file, line, rule: id, match: match[0], message });
    }
  }

  return violations;
}

/**
 * Checks every .js and .ts file under src/.
 *
 * @param {string} [directory] Directory to scan.
 * @returns {Promise<Violation[]>} Every violation found.
 */
export async function checkSources(directory = srcDir) {
  const files = (await readdir(directory, { recursive: true })).filter((file) => /\.[cm]?[jt]s$/.test(file)).sort();
  /** @type {Violation[]} */
  const violations = [];

  for (const file of files) {
    const path = resolve(directory, file);
    const source = await readFile(path, "utf8");
    violations.push(...findViolations(source, relative(root, path)));
  }

  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const violations = await checkSources();

  for (const { file, line, rule, match, message } of violations) {
    console.error(`${file}:${line}  ${rule}  "${match}" — ${message}`);
  }

  if (violations.length > 0) {
    console.error(`\ncheck-source: ${violations.length} violation(s).`);
    process.exitCode = 1;
  } else {
    console.log("check-source: OK");
  }
}
