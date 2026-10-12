// check-docs.mjs — Fails when README, docs/ or the demo drift from the attributes, tokens, parts and events in src/.

import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { toAttributeName } from "../src/core/framework-attributes.js";

/** packages/core: src/ and the package README.md. */
const root = resolve(import.meta.dirname, "..");
/** The repository root: docs/ and apps/demo/. Page paths in reports are relative to it. */
const repoRoot = resolve(root, "../..");

/** Source files whose tokens and parts every chart shares. */
const SHARED_SOURCES = Object.freeze(["src/core/svg.js", "src/core/mini-chart-element.js"]);

/**
 * Pages besides docs/**.md whose `--mini-*`, `::part()` and `<mini-*>` usages are
 * checked, relative to the repository root. The root README.md is a copy of the
 * package one (tools/scripts/sync-root-files.mjs), so only the package one is read.
 */
const EXTRA_PAGES = Object.freeze(["packages/core/README.md", "apps/demo/index.html"]);

/** The demo's sources (every .js and .css under it) are checked like the pages above. */
const DEMO_SOURCES = "apps/demo/src";

/** Attributes any element accepts; they never need to be observed by a chart. */
const GLOBAL_ATTRIBUTES = new Set([
  "id",
  "class",
  "classname",
  "style",
  "hidden",
  "slot",
  "title",
  "lang",
  "dir",
  "tabindex",
  "role",
  "is",
  "key",
  "ref",
  "inert",
  "draggable",
  "children",
]);

/** Keys of an apps/demo/app.js catalog entry that hold attributes, and the syntax of each. */
const CATALOG_KEYS = Object.freeze({ attrs: "html", reactProps: "react", vueProps: "vue", angularProps: "angular" });

/**
 * Section headings of docs/components/<tag>.md and what each table lists. The
 * first column of every table row holds the names, each in backticks.
 */
export const SECTIONS = Object.freeze({
  attributes: "## Attributes",
  events: "## Events",
  tokens: "## CSS custom properties",
  parts: "## Parts",
});

/**
 * @typedef {Object} Problem
 * @property {string} file File the problem is reported against, relative to the repository root.
 * @property {string} message What is wrong.
 */

/**
 * @typedef {Object} ChartApi
 * @property {string[]} attributes The tag's `observedAttributes`.
 * @property {string[]} tokens `--mini-*` names its own source reads; names ending in `*` are prefixes.
 * @property {string[]} parts Part names its own source sets; names ending in `*` are prefixes.
 * @property {string[]} events Event types it dispatches.
 */

/**
 * Blanks out comments, keeping string contents (where the CSS lives) and line numbers.
 *
 * @param {string} source JavaScript source.
 * @returns {string}
 */
function stripComments(source) {
  const blank = (/** @type {string} */ text) => text.replace(/[^\n]/g, " ");
  return source.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/^[ \t]*\/\/.*$/gm, blank);
}

/**
 * Lists the `--mini-*` custom properties a source reads with `var()`. Properties it
 * only sets (a chart's own `--mini-chart-default-aspect-ratio`) are not listed. A
 * name cut short by a template expression (`var(--mini-chart-color-${i}, …)`)
 * becomes the prefix `--mini-chart-color-*`.
 *
 * @param {string} code Comment-free source.
 * @returns {string[]}
 */
function sourceTokens(code) {
  const tokens = new Set();
  for (const match of code.matchAll(/var\(\s*(--mini-[\w-]*)(\$\{)?/g)) {
    tokens.add(match[2] ? `${match[1]}*` : match[1]);
  }
  return [...tokens];
}

/**
 * Splits the string and template literals of a `part` value into part names.
 * A name with a template expression after a prefix (`segment-${i}`) becomes
 * the prefix `segment-*`; a name that is only an expression (`${item.type}`) is
 * skipped, since the stylesheet's `[part~="…"]` selectors name those parts.
 *
 * @param {string} expression Source text of the value.
 * @returns {string[]}
 */
function partNames(expression) {
  const names = [];
  for (const literal of expression.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)) {
    // Collapse `${…}` first: an expression such as `${index + 1}` holds spaces.
    for (const word of literal[2].replace(/\$\{[^}]*\}/g, "*").split(/\s+/)) {
      if (word === "" || word.startsWith("*")) continue;
      names.push(word.includes("*") ? `${word.slice(0, word.indexOf("*"))}*` : word);
    }
  }
  return names;
}

/**
 * Lists the part names a source sets: `part:` keys of attribute objects,
 * `setAttribute("part", …)` calls and `[part="…"]` / `[part~="…"]` selectors.
 *
 * @param {string} code Comment-free source.
 * @returns {string[]}
 */
function sourceParts(code) {
  const parts = new Set();
  for (const match of code.matchAll(/\bpart:\s*((["'`])(?:\\.|(?!\2).)*\2)/g)) {
    for (const name of partNames(match[1])) parts.add(name);
  }
  for (const match of code.matchAll(/setAttribute\(\s*["']part["']\s*,([^;]*?)\);/g)) {
    for (const name of partNames(match[1])) parts.add(name);
  }
  for (const match of code.matchAll(/\[part~?="([\w-]+)"\]/g)) parts.add(match[1]);
  return [...parts];
}

/**
 * Parses one chart source into the API it implements.
 *
 * @param {string} source Contents of src/components/<tag>.js.
 * @returns {ChartApi}
 */
export function parseChartSource(source) {
  const code = stripComments(source);
  const observed = code.match(/static observedAttributes\s*=\s*\[([^\]]*)\]/);
  // `static props = { name: { type: … }, … }`: the base class observes `data`, `label`, `preset` and each option.
  const props = code.match(/static props\s*=\s*\{([\s\S]*?)\n\s*\};/);
  const attributes = observed
    ? [...observed[1].matchAll(/["']([\w-]+)["']/g)].map((match) => match[1])
    : props
      ? ["data", "label", "preset", ...[...props[1].matchAll(/^\s*(\w+):\s*\{\s*type:/gm)].map((match) => toAttributeName(match[1]))]
      : [];
  const events = [
    ...new Set([...code.matchAll(/(?:new CustomEvent\(|\.dispatchPoint\(|\.#onPointer\(\s*\w+\s*,)\s*["']([\w-]+)["']/g)].map((match) => match[1])),
  ];
  return { attributes, tokens: sourceTokens(code), parts: sourceParts(code), events };
}

/**
 * Whether a name (or a documented placeholder such as `segment-N`) is covered by a
 * list of names and `*` prefixes.
 *
 * @param {readonly string[]} known Names, some ending in `*`.
 * @param {string} name Name to look up.
 * @returns {boolean}
 */
function covers(known, name) {
  return known.some((entry) =>
    entry.endsWith("*") ? name.startsWith(entry.slice(0, -1)) && name.length > entry.length - 1 : entry === name,
  );
}

/**
 * Whether a list of documented names covers one source name; a `*` prefix needs a
 * documented name that starts with it (`--mini-chart-color-N`, `segment-N`).
 *
 * @param {readonly string[]} documented Documented names.
 * @param {string} name Source name, possibly ending in `*`.
 * @returns {boolean}
 */
function documents(documented, name) {
  if (!name.endsWith("*")) return documented.includes(name);
  const prefix = name.slice(0, -1);
  return documented.some((entry) => entry.startsWith(prefix) && entry.length > prefix.length);
}

/**
 * Reads the backticked names in the first column of the table under a heading.
 *
 * @param {string} markdown Markdown source.
 * @param {string} heading Exact heading line, e.g. `## Parts`.
 * @returns {string[] | null} The names, or `null` when the heading is missing.
 */
export function tableNames(markdown, heading) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return null;

  const names = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2} /.test(line)) break;
    if (!line.startsWith("|") || /^\|[\s:|-]+\|?\s*$/.test(line)) continue;
    const firstCell = line.split("|")[1] ?? "";
    for (const match of firstCell.matchAll(/`([^`]+)`/g)) names.push(match[1].trim());
  }
  // The header row has no backticks, so it adds nothing.
  return names;
}

/**
 * Decodes the HTML entities the demo uses inside `<pre><code>` snippets.
 *
 * @param {string} html
 * @returns {string}
 */
function unescapeHtml(html) {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Reads the attribute names written on a tag, starting right after its name.
 * Quoted values, `{…}` expressions (JSX, Svelte) and `=>` inside them are skipped.
 *
 * @param {string} text Text that starts after `<mini-…`.
 * @returns {string[]} Attribute names as written (`curve`, `[data]`, `:label`, `@zone-change`).
 */
export function tagAttributes(text) {
  const names = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === ">" || (char === "/" && text[index + 1] === ">")) break;
    if (/\s/.test(char)) {
      index++;
      continue;
    }
    // A name runs until whitespace, `=`, `>` or `/>`.
    let end = index;
    while (end < text.length && !/[\s=>]/.test(text[end]) && !(text[end] === "/" && text[end + 1] === ">")) end++;
    if (end === index) {
      index++;
      continue;
    }
    names.push(text.slice(index, end));
    index = end;
    while (/\s/.test(text[index] ?? "")) index++;
    if (text[index] !== "=") continue;
    index++;
    while (/\s/.test(text[index] ?? "")) index++;
    const open = text[index];
    if (open === '"' || open === "'") {
      const close = text.indexOf(open, index + 1);
      index = close === -1 ? text.length : close + 1;
    } else if (open === "{") {
      let depth = 0;
      for (; index < text.length; index++) {
        if (text[index] === "{") depth++;
        else if (text[index] === "}" && --depth === 0) break;
      }
      index++;
    } else {
      while (index < text.length && !/[\s>]/.test(text[index])) index++;
    }
  }
  return names;
}

/**
 * Maps an attribute as written in a template to the chart attribute it sets, or
 * `null` when it is a global attribute, an event binding or a framework directive.
 *
 * @param {string} written Attribute name as written.
 * @returns {string | null}
 */
function chartAttribute(written) {
  let name = written;
  if (/^(?:\(|@|on:|v-on|\*|#|v-(?!bind)|bind:|use:|let:|ng)/.test(name)) return null;
  const angular = name.match(/^\[(?:attr\.)?([\w-]+)\]$/);
  if (angular) name = angular[1];
  name = name.replace(/^(?::|v-bind:)/, "");
  const lower = name.toLowerCase();
  if (GLOBAL_ATTRIBUTES.has(lower) || lower.startsWith("aria-") || lower.startsWith("data-") || lower.startsWith("xmlns")) {
    return null;
  }
  return name;
}

/**
 * @typedef {Object} TagUsage
 * @property {string} tag Chart tag.
 * @property {string[]} attributes Attribute and prop names as written.
 * @property {boolean} react Whether the names are React props (camelCase, `on*` event props).
 */

/**
 * Lists the charts in a page with the attributes written on each:
 *
 * - `<mini-…>` tags, in HTML and in Angular, Vue and Svelte templates;
 * - the `<Mini…Chart>` framework wrappers of React (`data={…}`) and Vue (`:data`), whose
 *   camelCase props map to kebab-case attributes;
 * - in apps/demo/app.js, the catalog entries (`tag: "…"`, then `attrs`, `reactProps`,
 *   `vueProps` and `angularProps`).
 *
 * @param {string} text Page contents.
 * @param {string} file Page path.
 * @returns {TagUsage[]}
 */
function pageTags(text, file) {
  const source = file.endsWith(".html") ? unescapeHtml(text) : text;
  /** @type {TagUsage[]} */
  const tags = [];
  for (const match of source.matchAll(/<(mini-[a-z-]*[a-z])(?=[\s>/])/g)) {
    tags.push({ tag: match[1], attributes: tagAttributes(source.slice(match.index + match[0].length)), react: false });
  }
  for (const match of source.matchAll(/<(Mini(?:[A-Z][a-z]+)+Chart)(?=[\s>/])/g)) {
    const attributes = tagAttributes(source.slice(match.index + match[0].length));
    // A React element writes `data={…}`; a Vue template writes `:data` and kebab-case names.
    const react = !attributes.some((name) => /^(?::|@|v-)/.test(name));
    tags.push({ tag: toAttributeName(match[1]), attributes, react });
  }
  if (file.endsWith(".js")) {
    const entries = [...source.matchAll(/\btag:\s*["'](mini-[a-z-]+)["']/g)];
    entries.forEach((entry, index) => {
      const body = source.slice(entry.index, entries[index + 1]?.index ?? source.length);
      for (const match of body.matchAll(/\b(attrs|reactProps|vueProps|angularProps):\s*(["'`])((?:\\.|(?!\2).)*)\2/g)) {
        const key = /** @type {keyof typeof CATALOG_KEYS} */ (match[1]);
        tags.push({ tag: entry[1], attributes: tagAttributes(`${match[3]}>`), react: CATALOG_KEYS[key] === "react" });
      }
    });
  }
  return tags;
}

/**
 * Splits an attribute as written into the chart attribute it sets or the event
 * it listens to. React props are camelCase and listen with `on*` props; their
 * event names come from the React wrapper's event map.
 *
 * @param {string} written Attribute or prop name as written.
 * @param {boolean} react Whether it is a React prop.
 * @param {ReadonlyMap<string, string>} reactEvents React event prop → event type.
 * @returns {{ attribute: string | null, event: string | null }}
 */
function classifyAttribute(written, react, reactEvents) {
  const event = written.match(/^(?:\(([\w-]+)\)|@([\w-]+)|v-on:([\w-]+)|on:([\w-]+))/);
  if (event) return { attribute: null, event: event[1] ?? event[2] ?? event[3] ?? event[4] };
  if (react && /^on[A-Z]/.test(written)) {
    // DOM event props (onClick, onPointerEnter) reach React, not the chart.
    const custom = reactEvents.get(written) ?? null;
    const guess = toAttributeName(written.slice(2));
    const family = [...reactEvents.values()].some((type) => guess.split("-")[0] === type.split("-")[0]);
    return { attribute: null, event: custom ?? (family ? guess : null) };
  }
  const name = chartAttribute(written);
  return { attribute: name === null ? null : react ? toAttributeName(name) : name, event: null };
}

/**
 * Resolves the chart a script expression refers to: `document.querySelector("mini-…")`,
 * `document.getElementById("id")` of a chart in the pages, `document.createElement("mini-…")`,
 * or a variable declared earlier in the page with one of those.
 *
 * @param {string} content Page contents.
 * @param {number} index Where the expression is used.
 * @param {string} expression The receiver expression.
 * @param {ReadonlyMap<string, string>} idTags Chart tag of each element id in the pages.
 * @returns {string | null} The tag, `"*"` for a chart of any tag, or `null` when unknown.
 */
function resolveChart(content, index, expression, idTags) {
  const direct = expression.match(/(?:querySelector|createElement)\(\s*["'](mini-[a-z-]+)["']/);
  if (direct) return direct[1];
  const byId = expression.match(/(?:getElementById\(\s*["']|querySelector\(\s*["']#)([\w-]+)["']/);
  if (byId) return idTags.get(byId[1]) ?? null;
  if (/createElement\(\s*[\w$.]+\.tag\s*\)/.test(expression)) return "*";

  const name = expression.match(/^[\w$]+$/)?.[0];
  if (!name) return null;
  const before = content.slice(0, index);
  const assignments = [...before.matchAll(new RegExp(`(?:\\b(?:const|let|var)\\s+|^\\s*|[;{]\\s*)${name.replace(/\$/g, "\\$")}\\s*=(?!=)\\s*([^;\\n]+)`, "gm"))];
  for (const assignment of assignments.reverse()) {
    const resolved = resolveChart(content, assignment.index, assignment[1], idTags);
    if (resolved !== null) return resolved;
  }
  return null;
}

/**
 * Lists the `setAttribute("…")` and `addEventListener("…")` calls in a page whose
 * receiver is a chart (see {@link resolveChart}).
 *
 * @param {string} content Page contents.
 * @param {ReadonlyMap<string, string>} idTags Chart tag of each element id in the pages.
 * @returns {{ tag: string, method: "setAttribute" | "addEventListener", name: string }[]}
 */
function scriptCalls(content, idTags) {
  const calls = [];
  const pattern =
    /((?:document\s*\.\s*(?:querySelector|getElementById)\(\s*["'][^"']+["']\s*\))|[\w$]+)\s*\??\.\s*(setAttribute|addEventListener)\(\s*(["'])([\w-]+)\3/g;
  for (const match of content.matchAll(pattern)) {
    const tag = resolveChart(content, match.index, match[1], idTags);
    if (tag !== null) calls.push({ tag, method: /** @type {"setAttribute" | "addEventListener"} */ (match[2]), name: match[4] });
  }
  return calls;
}

/**
 * Finds every drift between the sources and the pages.
 *
 * @param {Object} input
 * @param {Map<string, ChartApi>} input.charts Parsed chart sources by tag.
 * @param {string[]} input.sharedTokens `--mini-*` names the shared sources read.
 * @param {string[]} input.sharedParts Part names the shared sources set.
 * @param {Map<string, string>} input.pages Page contents by path from the repository root: the package README.md, docs/**.md, the demo files.
 * @param {Map<string, string>} [input.reactEvents] React event prop → event type, from src/react/index.ts.
 * @returns {Problem[]}
 */
export function findDocProblems({ charts, sharedTokens, sharedParts, pages, reactEvents = new Map() }) {
  /** @type {Problem[]} */
  const problems = [];
  const report = (/** @type {string} */ file, /** @type {string} */ message) => problems.push({ file, message });

  const allTokens = [...sharedTokens, ...[...charts.values()].flatMap((api) => api.tokens)];
  const allParts = [...sharedParts, ...[...charts.values()].flatMap((api) => api.parts)];
  const allAttributes = [...new Set([...charts.values()].flatMap((api) => api.attributes))];
  const allEvents = [...new Set([...charts.values()].flatMap((api) => api.events))];
  const tableRows = [...pages]
    .filter(([path]) => path.endsWith(".md"))
    .flatMap(([, text]) => text.split("\n").filter((line) => line.startsWith("|")));

  /** @type {Map<string, string>} */
  const idTags = new Map();
  for (const [file, text] of pages) {
    const content = file.endsWith(".html") ? unescapeHtml(text) : text;
    for (const match of content.matchAll(/<(mini-[a-z-]*[a-z])\b[^>]*?\sid=["']([\w-]+)["']/g)) idTags.set(match[2], match[1]);
  }

  /**
   * @param {string} file Page.
   * @param {string} tag Chart tag, or `"*"` for any chart.
   * @param {string} event Event type.
   * @param {string} written How the page names it.
   */
  const checkEvent = (file, tag, event, written) => {
    const known = tag === "*" ? allEvents : (charts.get(tag)?.events ?? []);
    // DOM event types have no dash; a dashed name is a chart event and must be dispatched.
    if (event.includes("-") && !known.includes(event)) {
      report(file, `${tag === "*" ? "a chart" : `<${tag}>`} ${written}: \`${event}\` is not an event ${tag === "*" ? "any chart" : `<${tag}>`} dispatches`);
    }
  };

  // Docs and demo → src: every token, part, tag and attribute they use exists.
  for (const [file, text] of pages) {
    const isMarkdown = file.endsWith(".md");
    const content = file.endsWith(".html") ? unescapeHtml(text) : text;

    for (const match of content.matchAll(/--mini-[\w-]*/g)) {
      const name = match[0];
      // `--mini-chart-*`, `--mini-chart-color-${i}`: a prefix, not a token.
      if (name.endsWith("-") || content[match.index + name.length] === "*") continue;
      if (!covers(allTokens, name)) report(file, `\`${name}\` is not read by any chart in src/`);
    }

    const partPatterns = [/::part\(\s*([\w-]+)\s*\)/g];
    if (isMarkdown) partPatterns.push(/\bpart="([\w-]+)"/g);
    for (const pattern of partPatterns) {
      for (const match of content.matchAll(pattern)) {
        const before = content.slice(Math.max(0, match.index - 40), match.index);
        const scoped = before.match(/(mini-[a-z-]+)\s*$/);
        const scopedApi = scoped ? charts.get(scoped[1]) : undefined;
        const known = scopedApi ? [...sharedParts, ...scopedApi.parts] : allParts;
        if (!covers(known, match[1])) {
          report(file, `part \`${match[1]}\`${scoped ? ` on <${scoped[1]}>` : ""} does not exist in src/`);
        }
      }
    }

    for (const { tag, attributes, react } of pageTags(text, file)) {
      const api = charts.get(tag);
      if (!api) {
        report(file, `<${tag}> is not a chart in src/components/`);
        continue;
      }
      for (const written of attributes) {
        const { attribute, event } = classifyAttribute(written, react, reactEvents);
        if (attribute !== null && !api.attributes.includes(attribute)) {
          report(file, `<${tag} ${written}>: \`${attribute}\` is not an observed attribute of <${tag}>`);
        }
        if (event !== null) checkEvent(file, tag, event, written);
      }
    }

    for (const { tag, method, name } of scriptCalls(content, idTags)) {
      if (method === "addEventListener") {
        checkEvent(file, tag, name, `addEventListener("${name}")`);
        continue;
      }
      const attribute = chartAttribute(name);
      const known = tag === "*" ? allAttributes : (charts.get(tag)?.attributes ?? []);
      if (attribute !== null && !known.includes(attribute)) {
        report(file, `${tag === "*" ? "a chart" : `<${tag}>`} setAttribute("${name}"): \`${name}\` is not an observed attribute`);
      }
    }
  }

  // src → docs: each chart page documents its whole API and nothing else.
  for (const [tag, api] of charts) {
    const file = `docs/components/${tag}.md`;
    const page = pages.get(file);
    if (page === undefined) {
      report(file, `missing page for <${tag}>`);
      continue;
    }

    /** @type {[keyof typeof SECTIONS, string[], string[], string][]} */
    const tables = [
      ["attributes", api.attributes, api.attributes, "observed attribute"],
      ["events", api.events, api.events, "dispatched event"],
      ["tokens", api.tokens, [...sharedTokens, ...api.tokens], "custom property"],
      ["parts", api.parts, [...sharedParts, ...api.parts], "part"],
    ];
    for (const [section, required, allowed, noun] of tables) {
      const documented = tableNames(page, SECTIONS[section]);
      if (documented === null) {
        if (required.length > 0) report(file, `missing "${SECTIONS[section]}" table`);
        continue;
      }
      for (const name of required) {
        if (!documents(documented, name)) report(file, `${noun} \`${name}\` of <${tag}> is not in the "${SECTIONS[section]}" table`);
      }
      for (const name of documented) {
        if (!covers(allowed, name)) report(file, `"${SECTIONS[section]}" lists \`${name}\`, which <${tag}> does not have`);
      }
    }
  }

  // Shared tokens (host color, aspect ratio, line, point, reference line, crosshair) are documented in a table.
  for (const token of sharedTokens) {
    // The exact name in backticks; a prefix (`--mini-chart-color-*`) needs a placeholder name after it.
    const name = token.endsWith("*")
      ? new RegExp(`\`${token.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\`\\s]+\``)
      : null;
    if (!tableRows.some((row) => (name ? name.test(row) : row.includes(`\`${token}\``)))) {
      report("docs/getting-started.md", `shared custom property \`${token}\` is not in any docs table`);
    }
  }

  return problems;
}

/**
 * Reads src/ and the pages from disk and checks them.
 *
 * @returns {Promise<Problem[]>}
 */
export async function checkDocs() {
  const read = (/** @type {string} */ path) => readFile(resolve(root, path), "utf8");
  const readPage = (/** @type {string} */ path) => readFile(resolve(repoRoot, path), "utf8");

  /** @type {Map<string, ChartApi>} */
  const charts = new Map();
  const componentFiles = (await readdir(resolve(root, "src/components"))).filter((file) => /^mini-.*\.js$/.test(file)).sort();
  for (const file of componentFiles) {
    charts.set(basename(file, ".js"), parseChartSource(await read(`src/components/${file}`)));
  }

  const shared = await Promise.all(SHARED_SOURCES.map(async (path) => stripComments(await read(path))));
  const sharedTokens = [...new Set(shared.flatMap(sourceTokens))];
  const sharedParts = [...new Set(shared.flatMap(sourceParts))];

  const docFiles = (await readdir(resolve(repoRoot, "docs"), { recursive: true }))
    .filter((file) => file.endsWith(".md"))
    .map((file) => `docs/${file.split("\\").join("/")}`)
    .sort();
  /** @type {Map<string, string>} */
  const pages = new Map();
  const demoFiles = (await readdir(resolve(repoRoot, DEMO_SOURCES), { recursive: true }))
    .filter((file) => /\.(?:js|css)$/.test(file))
    .map((file) => `${DEMO_SOURCES}/${file.split("\\").join("/")}`)
    .sort();
  for (const path of [...EXTRA_PAGES, ...demoFiles, ...docFiles]) pages.set(path, await readPage(path));

  const reactSource = stripComments(await read("src/react/index.ts"));
  const reactEvents = new Map([...reactSource.matchAll(/\b(on[A-Z]\w*):\s*["']([\w-]+)["']/g)].map((match) => [match[1], match[2]]));

  return findDocProblems({ charts, sharedTokens, sharedParts, pages, reactEvents });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const problems = await checkDocs();

  for (const { file, message } of problems) console.error(`${file}  ${message}`);

  if (problems.length > 0) {
    console.error(`\ncheck-docs: ${problems.length} problem(s).`);
    process.exitCode = 1;
  } else {
    console.log("check-docs: OK");
  }
}
