// docs-snippets.test.js — Static checks on the framework code snippets in README, docs and demo.

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { describe, test } from "node:test";

const root = new URL("../", import.meta.url);

/** Fenced code languages that are always framework code. */
const frameworkLanguages = new Set(["tsx", "jsx", "vue", "svelte"]);

/** Content that marks a fenced block of another language (ts, js) as framework code. */
const frameworkMarker = /sparkline-mini-charts\/(?:react|vue|angular)|@angular\/core|<script setup/;

/**
 * Reads a repository file as UTF-8 text.
 *
 * @param {string} path Path relative to the repository root.
 * @returns {Promise<string>}
 */
function readText(path) {
  return readFile(new URL(path, root), "utf8");
}

/**
 * Lists README.md and every Markdown file under docs/.
 *
 * @returns {Promise<string[]>} Paths relative to the repository root.
 */
async function markdownFiles() {
  const entries = await readdir(new URL("docs/", root), { recursive: true });
  const docs = entries.filter((entry) => entry.endsWith(".md")).map((entry) => `docs/${entry}`);
  return ["README.md", ...docs.sort()];
}

/**
 * Extracts the framework code blocks from a Markdown document.
 *
 * @param {string} markdown Markdown source.
 * @returns {{ lang: string, code: string }[]}
 */
function frameworkBlocks(markdown) {
  const blocks = [];
  for (const match of markdown.matchAll(/^```(\w*)[^\n]*\n([\s\S]*?)^```/gm)) {
    const lang = match[1].toLowerCase();
    const code = match[2];
    if (frameworkLanguages.has(lang) || frameworkMarker.test(code)) blocks.push({ lang, code });
  }
  return blocks;
}

/**
 * Decodes the HTML entities used inside the demo's `<pre><code>` blocks.
 *
 * @param {string} html Escaped snippet text.
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
 * Extracts the code of each framework tab on the demo's Framework Integrations page.
 *
 * @param {string} html demo/index.html source.
 * @returns {Map<string, string>} Framework name to unescaped snippet.
 */
function demoTabSnippets(html) {
  const snippets = new Map();
  for (const framework of ["react", "vue", "angular", "svelte"]) {
    const start = html.indexOf(`id="tab-${framework}"`);
    if (start === -1) continue;
    const code = html.slice(start).match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/);
    if (code) snippets.set(framework, unescapeHtml(code[1]));
  }
  return snippets;
}

/**
 * Extracts the framework props of the demo catalog and the snippet templates built from them.
 *
 * @param {string} source demo/app.js source.
 * @returns {{ name: string, code: string }[]}
 */
function demoAppSnippets(source) {
  const snippets = [];
  for (const match of source.matchAll(/\b(reactProps|vueProps|angularProps):\s*(['"`])((?:\\.|(?!\2).)*)\2/g)) {
    snippets.push({ name: match[1], code: match[3] });
  }
  for (const match of source.matchAll(/const (reactSnippet|vueSnippet|angularSnippet) = `((?:\\.|[^`\\])*)`;/g)) {
    snippets.push({ name: match[1], code: match[2] });
  }
  return snippets;
}

describe("framework snippets bind data as a property", () => {
  test("README and docs framework blocks never JSON.stringify", async () => {
    let checked = 0;
    for (const path of await markdownFiles()) {
      for (const block of frameworkBlocks(await readText(path))) {
        checked++;
        assert.ok(!block.code.includes("JSON.stringify("), `${path} (${block.lang || "code"} block):\n${block.code}`);
      }
    }
    // React, Vue, Angular and Svelte in both README.md and docs/getting-started.md.
    assert.ok(checked >= 8, `expected at least 8 framework blocks, found ${checked}`);
  });

  test("demo Framework Integrations tabs never JSON.stringify", async () => {
    const snippets = demoTabSnippets(await readText("demo/index.html"));
    assert.deepEqual([...snippets.keys()], ["react", "vue", "angular", "svelte"]);
    for (const [framework, code] of snippets) {
      assert.ok(!code.includes("JSON.stringify("), `demo/index.html tab-${framework}:\n${code}`);
    }
  });

  test("demo catalog props and snippet templates never JSON.stringify", async () => {
    const snippets = demoAppSnippets(await readText("demo/app.js"));
    // 17 catalog entries x 3 frameworks, plus the gallery and detail templates for each framework.
    assert.ok(snippets.length >= 17 * 3 + 6, `expected at least 57 snippets, found ${snippets.length}`);
    for (const { name, code } of snippets) {
      assert.ok(!code.includes("JSON.stringify("), `demo/app.js ${name}: ${code}`);
    }
  });
});

describe("framework snippets are valid for their framework", () => {
  test("JSX snippets use JSX comments, not HTML comments", async () => {
    const jsx = [];
    for (const path of await markdownFiles()) {
      for (const block of frameworkBlocks(await readText(path))) {
        if (block.lang === "tsx" || block.lang === "jsx") jsx.push({ where: path, code: block.code });
      }
    }
    const react = demoTabSnippets(await readText("demo/index.html")).get("react");
    if (react) jsx.push({ where: "demo/index.html tab-react", code: react });
    for (const { name, code } of demoAppSnippets(await readText("demo/app.js"))) {
      if (name.startsWith("react")) jsx.push({ where: `demo/app.js ${name}`, code });
    }
    assert.ok(jsx.length > 0);
    for (const { where, code } of jsx) {
      assert.ok(!code.includes("<!--"), `${where}:\n${code}`);
    }
  });

  test("Angular snippets in the demo use the AOT-safe recipe", async () => {
    const angular = [demoTabSnippets(await readText("demo/index.html")).get("angular") ?? ""];
    for (const { name, code } of demoAppSnippets(await readText("demo/app.js"))) {
      if (name === "angularSnippet") angular.push(code);
    }
    assert.equal(angular.length, 3);
    for (const code of angular) {
      assert.match(code, /sparkline-mini-charts\/register/);
      assert.match(code, /CUSTOM_ELEMENTS_SCHEMA/);
      assert.doesNotMatch(code, /sparkline-mini-charts\/angular/, code);
    }
  });
});
