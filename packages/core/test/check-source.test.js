// check-source.test.js — The source guard in scripts/check-source.mjs, and src/ passing it.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { checkSources, findViolations, stripComments } from "../scripts/check-source.mjs";

/**
 * @param {string} source Source text.
 * @returns {string[]} The rule id of every violation.
 */
const ruleIds = (source) => findViolations(source).map((violation) => violation.rule);

describe("check-source", () => {
  test("src/ has no violations", async () => {
    const violations = await checkSources();
    assert.deepEqual(
      violations.map(({ file, line, rule, match }) => `${file}:${line} ${rule} ${match}`),
      [],
    );
  });

  test("writes to the host's style are rejected", () => {
    assert.deepEqual(ruleIds('this.style.setProperty("--mini-chart-color", "red");'), ["host-style"]);
    assert.deepEqual(ruleIds('this.style.removeProperty("--mini-chart-color");'), ["host-style"]);
    assert.deepEqual(ruleIds('this.#svg.style.display = "none";'), []);
  });

  test("every other way to write the host's style is rejected", () => {
    assert.deepEqual(ruleIds('this.style = "color: red";'), ["host-style"]);
    assert.deepEqual(ruleIds('this.style["color"] = "red";'), ["host-style"]);
    assert.deepEqual(ruleIds("this.style.cssText += x;"), ["host-style"]);
    assert.deepEqual(ruleIds('this.attributeStyleMap.set("color", "red");'), ["host-style"]);
    assert.deepEqual(ruleIds('this.setAttribute("style", "color: red");'), ["host-style"]);
    assert.deepEqual(ruleIds("this.setAttribute( 'style', css);"), ["host-style"]);
    assert.deepEqual(ruleIds('this.removeAttribute("style");'), ["host-style"]);
    assert.deepEqual(ruleIds('this.setAttributeNS(null, "style", css);'), ["host-style"]);
    assert.deepEqual(ruleIds('this.setAttribute("data-style", "x"); this.styles = 1; svg.setAttribute("style", css);'), []);
  });

  test("HTML string sinks are rejected", () => {
    assert.deepEqual(ruleIds('group.innerHTML = "";'), ["html-sink"]);
    assert.deepEqual(ruleIds("node.outerHTML = markup;"), ["html-sink"]);
    assert.deepEqual(ruleIds('node.insertAdjacentHTML("beforeend", markup);'), ["html-sink"]);
    assert.deepEqual(ruleIds("group.replaceChildren();"), []);
  });

  test("var(--…) without the --mini- prefix is rejected", () => {
    assert.deepEqual(ruleIds("fill: color-mix(in srgb, var(--primary, #3b82f6) 12%, transparent);"), [
      "foreign-custom-property",
    ]);
    assert.deepEqual(ruleIds("stroke: var(--surface, #fff);"), ["foreign-custom-property"]);
    assert.deepEqual(ruleIds("stroke: var( --brand);"), ["foreign-custom-property"]);
    assert.deepEqual(ruleIds("fill: var(--mini-chart-color, var(--mini-chart-bullish-color, #10b981));"), []);
    assert.deepEqual(ruleIds("stroke-width: var(--_mc-wick, 1);"), []);
  });

  test("reading an app-level custom property from script is rejected", () => {
    assert.deepEqual(ruleIds('getComputedStyle(this).getPropertyValue("--primary");'), ["foreign-custom-property"]);
    assert.deepEqual(ruleIds("style.getPropertyValue( '--surface')"), ["foreign-custom-property"]);
    assert.deepEqual(ruleIds('style.getPropertyValue("--mini-chart-color"); node.style.getPropertyValue("--_mc-wick");'), []);
  });

  test("comment markers inside strings, templates and regular expressions do not hide code", () => {
    assert.deepEqual(ruleIds('const glob = "src/*"; node.innerHTML = ""; const end = "*/";'), ["html-sink"]);
    assert.deepEqual(ruleIds("const url = 'https://example.test'; this.style.color = 'red';"), ["host-style"]);
    assert.deepEqual(ruleIds("const css = `a /* b`; node.innerHTML = css; // */"), ["html-sink"]);
    assert.deepEqual(ruleIds("const re = /\\/\\*/; node.innerHTML = ''; /* x */"), ["html-sink"]);
    assert.deepEqual(ruleIds("const q = /[\"'`]/; node.innerHTML = '';"), ["html-sink"]);
    assert.deepEqual(ruleIds("const t = `${a ? `x${{ b: 1 }.b}` : '/*'}`; node.innerHTML = '';"), ["html-sink"]);
    assert.deepEqual(ruleIds("const half = total / 2; node.innerHTML = ''; // a / b"), ["html-sink"]);
  });

  test("stripComments blanks comments only, keeping offsets and lines", () => {
    const source = "a(); // one\n/* two\n three */ b(`/* kept */ ${c /* gone */}`);\nconst s = '// kept';";
    const stripped = stripComments(source);
    assert.equal(stripped.length, source.length);
    assert.equal(stripped.split("\n").length, source.split("\n").length);
    assert.equal(stripped.replace(/\s+/g, " ").trim(), "a(); b(`/* kept */ ${c }`); const s = '// kept';");
  });

  test("comments may name a forbidden pattern", () => {
    assert.deepEqual(ruleIds("// never use innerHTML or this.style.x here\n/* var(--primary) */\n/**\n * innerHTML\n */"), []);
    assert.deepEqual(ruleIds("group.replaceChildren(); // not innerHTML"), []);
  });

  test("violations carry their line", () => {
    const [violation] = findViolations('const a = 1;\n\nnode.innerHTML = "";', "src/x.js");
    assert.equal(violation.file, "src/x.js");
    assert.equal(violation.line, 3);
  });
});
