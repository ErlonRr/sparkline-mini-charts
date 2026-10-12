// check-docs.test.js — The docs drift check in scripts/check-docs.mjs, and the repository passing it.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { checkDocs, findDocProblems, parseChartSource, tagAttributes } from "../scripts/check-docs.mjs";

/** A chart source in the shape of src/components/*.js. */
const LINE_SOURCE = `
export class MiniLineChart extends MiniChartElement {
  static observedAttributes = ["data", "label", "points", "interactive"];
  #createDOM() {
    style.textContent = \`[part="active-point"] { fill: var(--mini-chart-point-fill, currentColor); }\`;
    createSvgElement("path", { part: "line" });
    circle.setAttribute("part", \`point point-\${item.type}\`);
    // var(--mini-chart-commented-out) is ignored.
    this.dispatchEvent(new CustomEvent("sparkline-hover", { detail }));
  }
}`;

/** A page that documents LINE_SOURCE completely. */
const LINE_PAGE = `# Line Chart (\`<mini-line-chart>\`)

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| \`data\` | JSON | \`[]\` | Values. |
| \`label\` | string | | Name. |
| \`points\` | \`last\` \\| \`all\` | \`last\` | Markers. |
| \`interactive\` | boolean | off | Events. |

## Events

| Event | \`detail\` | When |
| --- | --- | --- |
| \`sparkline-hover\` | \`{ index }\` | Hover. |

## CSS custom properties

| Property | Default | What it styles |
| --- | --- | --- |
| \`--mini-chart-point-fill\` | \`currentColor\` | Markers. |
| \`--mini-chart-color\` | \`#2563eb\` | Line. |

## Parts

| Part | Element | Description |
| --- | --- | --- |
| \`svg\` | svg | Root. |
| \`line\` | path | Line. |
| \`point\`, \`point-last\` | circle | Markers. |
| \`active-point\` | circle | Hover point. |
`;

/** The shared tokens table, as in docs/getting-started.md. */
const SHARED_PAGE = `| Property | Default |
| --- | --- |
| \`--mini-chart-color\` | \`#2563eb\` |
`;

/**
 * Runs the check on the line chart fixture plus extra page content.
 *
 * @param {Object} [overrides]
 * @param {string} [overrides.source] Chart source.
 * @param {string} [overrides.page] docs/components/mini-line-chart.md.
 * @param {string} [overrides.demo] apps/demo/index.html.
 * @param {string} [overrides.app] apps/demo/app.js.
 * @param {string} [overrides.shared] The shared docs page.
 * @param {string[]} [overrides.sharedTokens] `--mini-*` names the shared sources read.
 * @returns {string[]} `file  message` for each problem.
 */
function problems({ source = LINE_SOURCE, page = LINE_PAGE, demo = "", app = "", shared = SHARED_PAGE, sharedTokens = ["--mini-chart-color"] } = {}) {
  return findDocProblems({
    charts: new Map([["mini-line-chart", parseChartSource(source)]]),
    sharedTokens,
    sharedParts: ["svg"],
    pages: new Map([
      ["docs/getting-started.md", shared],
      ["docs/components/mini-line-chart.md", page],
      ["apps/demo/index.html", demo],
      ["apps/demo/app.js", app],
    ]),
    reactEvents: new Map([
      ["onSparklineHover", "sparkline-hover"],
      ["onSliceSelect", "slice-select"],
    ]),
  }).map(({ file, message }) => `${file}  ${message}`);
}

describe("check-docs", () => {
  test("README, docs/ and the demo match src/", async () => {
    const found = await checkDocs();
    assert.deepEqual(
      found.map(({ file, message }) => `${file}  ${message}`),
      [],
    );
  });

  test("a chart source is parsed into attributes, var() tokens, parts and events", () => {
    assert.deepEqual(parseChartSource(LINE_SOURCE), {
      attributes: ["data", "label", "points", "interactive"],
      tokens: ["--mini-chart-point-fill"],
      parts: ["line", "point", "point-*", "active-point"],
      events: ["sparkline-hover"],
    });
  });

  test("the fixture page passes", () => {
    assert.deepEqual(problems(), []);
  });

  test("an attribute that is not observed fails, in docs and demo", () => {
    assert.deepEqual(problems({ demo: '<mini-line-chart data="[1, 2]" endpoint="last"></mini-line-chart>' }), [
      "apps/demo/index.html  <mini-line-chart endpoint>: `endpoint` is not an observed attribute of <mini-line-chart>",
    ]);
    assert.deepEqual(problems({ demo: "&lt;mini-line-chart [attr.curve]=\"c\"&gt;&lt;/mini-line-chart&gt;" }), [
      "apps/demo/index.html  <mini-line-chart [attr.curve]>: `curve` is not an observed attribute of <mini-line-chart>",
    ]);
    assert.deepEqual(
      problems({ page: `${LINE_PAGE}\n<mini-line-chart :data="d" @sparkline-hover="h" points="last" class="x" aria-hidden="true"></mini-line-chart>\n` }),
      [],
    );
  });

  test("an observed attribute missing from the page fails", () => {
    const source = LINE_SOURCE.replace('"interactive"]', '"interactive", "curve"]');
    assert.deepEqual(problems({ source }), [
      'docs/components/mini-line-chart.md  observed attribute `curve` of <mini-line-chart> is not in the "## Attributes" table',
    ]);
  });

  test("a documented attribute, token or part the chart does not have fails", () => {
    const page = LINE_PAGE.replace("| `data` |", "| `data`, `smooth` |")
      .replace("| `--mini-chart-color` |", "| `--mini-chart-color`, `--mini-chart-glow` |")
      .replace("| `line` |", "| `line`, `mask-line` |");
    assert.deepEqual(problems({ page }), [
      "docs/components/mini-line-chart.md  `--mini-chart-glow` is not read by any chart in src/",
      '"## Attributes" lists `smooth`, which <mini-line-chart> does not have',
      '"## CSS custom properties" lists `--mini-chart-glow`, which <mini-line-chart> does not have',
      '"## Parts" lists `mask-line`, which <mini-line-chart> does not have',
    ].map((message) => (message.startsWith("docs/") ? message : `docs/components/mini-line-chart.md  ${message}`)));
  });

  test("a token, part or event of the chart missing from the page fails", () => {
    const page = LINE_PAGE.replace("| `--mini-chart-point-fill` | `currentColor` | Markers. |\n", "")
      .replace("| `point`, `point-last` | circle | Markers. |\n", "| `point` | circle | Markers. |\n")
      .replace("| `sparkline-hover` | `{ index }` | Hover. |\n", "");
    assert.deepEqual(problems({ page }), [
      'docs/components/mini-line-chart.md  dispatched event `sparkline-hover` of <mini-line-chart> is not in the "## Events" table',
      'docs/components/mini-line-chart.md  custom property `--mini-chart-point-fill` of <mini-line-chart> is not in the "## CSS custom properties" table',
      'docs/components/mini-line-chart.md  part `point-*` of <mini-line-chart> is not in the "## Parts" table',
    ]);
  });

  test("a token or part used in the demo must exist", () => {
    assert.deepEqual(
      problems({
        demo: `<style>.board { --mini-chart-transition-duration: 0s; }
mini-line-chart::part(point-last) {} mini-line-chart::part(wick) {}</style>`,
      }),
      [
        "apps/demo/index.html  `--mini-chart-transition-duration` is not read by any chart in src/",
        "apps/demo/index.html  part `wick` on <mini-line-chart> does not exist in src/",
      ],
    );
  });

  test("an unknown tag fails", () => {
    assert.deepEqual(problems({ demo: "<mini-sparkline data='[1]'></mini-sparkline>" }), [
      "apps/demo/index.html  <mini-sparkline> is not a chart in src/components/",
    ]);
  });

  test("tag attributes are read across quoting and framework syntaxes", () => {
    assert.deepEqual(tagAttributes(' data="[1, 2]" curve=\'smooth\' interactive>…'), ["data", "curve", "interactive"]);
    assert.deepEqual(tagAttributes(" [data]=\"rows()\" (zone-change)=\"on($event)\" [attr.zones]=\"z\"></x>"), [
      "[data]",
      "(zone-change)",
      "[attr.zones]",
    ]);
    assert.deepEqual(tagAttributes(" data={rows.map((r) => r.v)} label=\"A > B\" />"), ["data", "label"]);
  });

  test("demo catalog entries are checked in their HTML, React, Vue and Angular forms", () => {
    const entry = (/** @type {string} */ key, /** @type {string} */ value) =>
      `export const COMPONENTS_CATALOG = [\n  {\n    tag: "mini-line-chart",\n    data: [1, 2],\n    ${key}: '${value}',\n  },\n];`;
    assert.deepEqual(problems({ app: entry("reactProps", 'data={[1, 2]} points="last" className="x" onSparklineHover={(e) => log(e)} onClick={go}') }), []);
    assert.deepEqual(problems({ app: entry("reactProps", "data={[{ a: 1 }]} endPoint=\"last\"") }), [
      "apps/demo/app.js  <mini-line-chart endPoint>: `end-point` is not an observed attribute of <mini-line-chart>",
    ]);
    assert.deepEqual(problems({ app: entry("vueProps", ':data="d" :end-point="p"') }), [
      "apps/demo/app.js  <mini-line-chart :end-point>: `end-point` is not an observed attribute of <mini-line-chart>",
    ]);
    assert.deepEqual(problems({ app: entry("angularProps", '[data]="d" [attr.endpoint]="p"') }), [
      "apps/demo/app.js  <mini-line-chart [attr.endpoint]>: `endpoint` is not an observed attribute of <mini-line-chart>",
    ]);
    assert.deepEqual(problems({ app: entry("attrs", 'endpoint="last"') }), [
      "apps/demo/app.js  <mini-line-chart endpoint>: `endpoint` is not an observed attribute of <mini-line-chart>",
    ]);
  });

  test("React and Vue wrapper snippets map their props to the tag's attributes", () => {
    const page = (/** @type {string} */ snippet) => `${LINE_PAGE}\n\`\`\`jsx\n${snippet}\n\`\`\`\n`;
    assert.deepEqual(problems({ page: page('<MiniLineChart data={[1, 2]} points="last" interactive onSparklineHover={h} />') }), []);
    assert.deepEqual(problems({ page: page("<MiniLineChart data={[1, 2]} endPoint=\"last\" />") }), [
      "docs/components/mini-line-chart.md  <mini-line-chart endPoint>: `end-point` is not an observed attribute of <mini-line-chart>",
    ]);
    assert.deepEqual(problems({ page: page('<MiniLineChart :data="d" trend-color="auto" @sparkline-hover="h" />') }), [
      "docs/components/mini-line-chart.md  <mini-line-chart trend-color>: `trend-color` is not an observed attribute of <mini-line-chart>",
    ]);
    assert.deepEqual(problems({ page: page("<MiniSparklineChart data={[1]} />") }), [
      "docs/components/mini-line-chart.md  <mini-sparkline-chart> is not a chart in src/components/",
    ]);
  });

  test("setAttribute() on a chart in a script must use an observed attribute", () => {
    const demo = '<mini-line-chart id="trend"></mini-line-chart><div id="box"></div>';
    const app = [
      'const trend = document.getElementById("trend");',
      'trend.setAttribute("points", "last");',
      'trend?.setAttribute("aria-label", "Trend");',
      'document.getElementById("box").setAttribute("endpoint", "x");',
      'trend.setAttribute("endpoint", "last");',
      'document.querySelector("mini-line-chart").setAttribute("curve", "smooth");',
      "const el = document.createElement(item.tag);",
      'el.setAttribute("smooth", "");',
    ].join("\n");
    assert.deepEqual(problems({ demo, app }), [
      'apps/demo/app.js  <mini-line-chart> setAttribute("endpoint"): `endpoint` is not an observed attribute',
      'apps/demo/app.js  <mini-line-chart> setAttribute("curve"): `curve` is not an observed attribute',
      'apps/demo/app.js  a chart setAttribute("smooth"): `smooth` is not an observed attribute',
    ]);
  });

  test("events used in docs and demo must be dispatched", () => {
    const page = `${LINE_PAGE}
\`\`\`js
const chart = document.querySelector("mini-line-chart");
chart.addEventListener("sparkline-hover", onHover);
chart.addEventListener("click", onClick);
chart.addEventListener("zone-change", onZone);
window.addEventListener("resize", onResize);
\`\`\`

<mini-line-chart (sparkline-leave)="l($event)" @sparkline-hover="h" (click)="c()"></mini-line-chart>

\`\`\`jsx
<MiniLineChart data={[1]} onSliceSelect={s} onSparklineClick={c} onMouseEnter={m} />
\`\`\`
`;
    assert.deepEqual(problems({ page }), [
      "docs/components/mini-line-chart.md  <mini-line-chart> (sparkline-leave): `sparkline-leave` is not an event <mini-line-chart> dispatches",
      "docs/components/mini-line-chart.md  <mini-line-chart> onSliceSelect: `slice-select` is not an event <mini-line-chart> dispatches",
      "docs/components/mini-line-chart.md  <mini-line-chart> onSparklineClick: `sparkline-click` is not an event <mini-line-chart> dispatches",
      'docs/components/mini-line-chart.md  <mini-line-chart> addEventListener("zone-change"): `zone-change` is not an event <mini-line-chart> dispatches',
    ]);
  });

  test("shared tokens must appear in a docs table by their exact name", () => {
    const shared = "| Property | Default |\n| --- | --- |\n| `--mini-chart-color-N` | palette |\n";
    const page = LINE_PAGE.replace("| `--mini-chart-color` | `#2563eb` | Line. |\n", "");
    assert.deepEqual(problems({ page, shared, sharedTokens: ["--mini-chart-color", "--mini-chart-color-*"] }), [
      "docs/getting-started.md  shared custom property `--mini-chart-color` is not in any docs table",
    ]);
    assert.deepEqual(problems({ sharedTokens: ["--mini-chart-color", "--mini-chart-color-*"] }), [
      "docs/getting-started.md  shared custom property `--mini-chart-color-*` is not in any docs table",
    ]);
  });
});
