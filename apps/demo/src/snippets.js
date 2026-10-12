// snippets.js — Pure code generation: install commands, the framework guides and the configurator's export.
// No DOM access, so packages/core/test/docs-snippets.test.js can import it in Node.

export const PACKAGE = "sparkline-mini-charts";

export const INSTALL = Object.freeze({
  pnpm: `pnpm add ${PACKAGE}`,
  npm: `npm install ${PACKAGE}`,
  yarn: `yarn add ${PACKAGE}`,
});

/** `mini-ohlc-chart` → `MiniOhlcChart`, the wrapper name in the React and Vue entries. */
export function componentName(tag) {
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/** `referenceValue` → `reference-value`. */
export function kebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Writes a value as compact source text: JSON (`json`) or a JavaScript literal
 * with unquoted keys (`js`), with a space after each comma.
 *
 * @param {unknown} value
 * @param {"json" | "js"} [style]
 * @returns {string}
 */
export function literal(value, style = "js") {
  if (Array.isArray(value)) return `[${value.map((item) => literal(item, style)).join(", ")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, item]) => {
      const name = style === "js" && IDENTIFIER.test(key) ? key : JSON.stringify(key);
      return `${name}: ${literal(item, style)}`;
    });
    return entries.length === 0 ? "{}" : `{ ${entries.join(", ")} }`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Quotes an HTML attribute value; JSON with double quotes goes in single quotes. */
function htmlValue(text) {
  return text.includes('"') ? `'${text.replace(/&/g, "&amp;").replace(/'/g, "&#39;")}'` : `"${text.replace(/&/g, "&amp;")}"`;
}

/**
 * @typedef {Object} OptionValue
 * @property {string} name camelCase option name.
 * @property {unknown} value Explicit value (never the default).
 * @property {string} type Descriptor type: number, string, enum, boolean, json or colorList.
 * @property {boolean} property Whether the element has a camelCase property for it.
 */

/**
 * @typedef {Object} ChartConfig
 * @property {string} tag Chart tag.
 * @property {unknown} data Chart data.
 * @property {string} [label] Accessible label.
 * @property {string} [preset] Preset name.
 * @property {unknown} [presetMap] Definition of that preset, for `defineChartPreset()`.
 * @property {OptionValue[]} options Non-default options.
 */

/** Whether an option value is written as a bare boolean attribute or flag. */
const isFlag = (option) => option.value === true;
const isOff = (option) => option.value === false;
const isObject = (option) => option.value !== null && typeof option.value === "object";

/** Variable name for an object option in framework snippets (`zones`). */
const variable = (option) => option.name;

const indent = (lines, by = "  ") => lines.map((line) => (line ? by + line : line));

/** Lines of a `defineChartPreset()` call, when the config uses a preset. */
function presetLines(config) {
  if (!config.preset || !config.presetMap) return [];
  return [`defineChartPreset(${JSON.stringify(config.preset)}, ${literal(config.presetMap)});`];
}

// --- HTML -------------------------------------------------------------------

function htmlAttributes(config) {
  const attributes = [`data=${htmlValue(literal(config.data, "json"))}`];
  for (const option of config.options) {
    const name = kebab(option.name);
    if (isFlag(option)) attributes.push(name);
    else if (isOff(option)) attributes.push(`${name}="false"`);
    else if (isObject(option)) attributes.push(`${name}=${htmlValue(literal(option.value, "json"))}`);
    else attributes.push(`${name}=${htmlValue(String(option.value))}`);
  }
  if (config.preset) attributes.push(`preset=${htmlValue(config.preset)}`);
  if (config.label) attributes.push(`label=${htmlValue(config.label)}`);
  return attributes;
}

/** @param {ChartConfig} config */
export function htmlSnippet(config) {
  const preset = presetLines(config);
  const script = [
    `<script type="module">`,
    `  import "${PACKAGE}/register";`,
    ...(preset.length ? [`  import { defineChartPreset } from "${PACKAGE}/define";`, ...indent(preset)] : []),
    `</script>`,
  ];
  return [...script, "", `<${config.tag}`, ...indent(htmlAttributes(config)), `></${config.tag}>`].join("\n");
}

// --- Vanilla JavaScript -----------------------------------------------------

/** @param {ChartConfig} config */
export function jsSnippet(config) {
  const lines = [`import "${PACKAGE}/register";`];
  if (config.preset && config.presetMap) lines.push(`import { defineChartPreset } from "${PACKAGE}/define";`, "", ...presetLines(config));
  lines.push("", `const chart = document.querySelector("${config.tag}");`, `chart.data = ${literal(config.data)};`);
  const asProperties = config.options.filter((option) => option.property);
  for (const option of asProperties) lines.push(`chart.${option.name} = ${literal(option.value)};`);
  for (const option of config.options.filter((item) => !item.property)) {
    // Names an HTMLElement already has (`normalize`) stay attributes.
    lines.push(option.value === false ? `chart.removeAttribute("${kebab(option.name)}");` : `chart.setAttribute("${kebab(option.name)}", ${JSON.stringify(option.value === true ? "" : String(option.value))});`);
  }
  if (config.preset) lines.push(`chart.preset = ${JSON.stringify(config.preset)};`);
  if (config.label) lines.push(`chart.setAttribute("label", ${JSON.stringify(config.label)});`);
  if (asProperties.length > 1) {
    const options = Object.fromEntries(asProperties.map((option) => [option.name, option.value]));
    lines.push("", "// …or every option at once (kept on the instance, never written to attributes):", `// chart.options = ${literal(options)};`);
  }
  lines.push(
    "",
    `chart.addEventListener("sparkline-select", (event) => {`,
    "  const { index, seriesIndex, value, datum, color } = event.detail;",
    "  console.log(index, seriesIndex, value, datum, color);",
    "});",
  );
  return lines.join("\n");
}

// --- React ------------------------------------------------------------------

/** @param {ChartConfig} config */
export function reactSnippet(config) {
  const component = componentName(config.tag);
  const props = [`data={${literal(config.data)}}`];
  for (const option of config.options) {
    if (isFlag(option)) props.push(option.name);
    else if (typeof option.value === "string") props.push(`${option.name}=${JSON.stringify(option.value)}`);
    else props.push(`${option.name}={${literal(option.value)}}`);
  }
  if (config.preset) props.push(`preset=${JSON.stringify(config.preset)}`);
  if (config.label) props.push(`label=${JSON.stringify(config.label)}`);
  props.push("onSparklineSelect={(event) => console.log(event.detail)}");
  return [
    `"use client";`,
    "",
    `import { ${component} } from "${PACKAGE}/react";`,
    "",
    "export function Example() {",
    "  return (",
    `    <${component}`,
    ...indent(props, "      "),
    "    />",
    "  );",
    "}",
  ].join("\n");
}

// --- Vue --------------------------------------------------------------------

/** @param {ChartConfig} config */
export function vueSnippet(config) {
  const component = componentName(config.tag);
  const script = [`import { ${component} } from "${PACKAGE}/vue";`, "", `const data = ${literal(config.data)};`];
  const attributes = [`:data="data"`];
  for (const option of config.options) {
    const name = kebab(option.name);
    if (isFlag(option)) attributes.push(name);
    else if (isObject(option)) {
      script.push(`const ${variable(option)} = ${literal(option.value)};`);
      attributes.push(`:${name}="${variable(option)}"`);
    } else if (typeof option.value === "string") attributes.push(`${name}=${htmlValue(option.value)}`);
    else attributes.push(`:${name}="${String(option.value)}"`);
  }
  if (config.preset) attributes.push(`preset=${htmlValue(config.preset)}`);
  if (config.label) attributes.push(`label=${htmlValue(config.label)}`);
  attributes.push(`@sparkline-select="(event) => console.log(event.detail)"`);
  return [
    `<script setup lang="ts">`,
    ...script,
    `</script>`,
    "",
    "<template>",
    `  <${component}`,
    ...indent(attributes, "    "),
    "  />",
    "</template>",
  ].join("\n");
}

// --- Angular ----------------------------------------------------------------

/** @param {ChartConfig} config */
export function angularSnippet(config) {
  const fields = [`data = ${literal(config.data)};`];
  const attributes = [`[data]="data"`];
  for (const option of config.options) {
    const name = kebab(option.name);
    if (isFlag(option)) attributes.push(name);
    else if (isOff(option)) attributes.push(`${name}="false"`);
    else if (isObject(option)) {
      // The element has a property of that name: Angular sets it, so objects need no JSON text.
      fields.push(`${variable(option)} = ${literal(option.value)};`);
      attributes.push(`[${option.name}]="${variable(option)}"`);
    } else attributes.push(`${name}=${htmlValue(String(option.value))}`);
  }
  if (config.preset) attributes.push(`preset=${htmlValue(config.preset)}`);
  if (config.label) attributes.push(`label=${htmlValue(config.label)}`);
  attributes.push(`(sparkline-select)="onSelect($event)"`);
  return [
    `import "${PACKAGE}/register";`,
    `import { CUSTOM_ELEMENTS_SCHEMA, Component } from "@angular/core";`,
    "",
    "@Component({",
    `  selector: "app-chart",`,
    "  schemas: [CUSTOM_ELEMENTS_SCHEMA],",
    "  template: `",
    `    <${config.tag}`,
    ...indent(attributes, "      "),
    `    ></${config.tag}>`,
    "  `,",
    "})",
    "export class ChartComponent {",
    ...indent(fields),
    "",
    "  onSelect(event: Event) {",
    "    console.log((event as CustomEvent).detail);",
    "  }",
    "}",
  ].join("\n");
}

// --- Svelte -----------------------------------------------------------------

/** @param {ChartConfig} config */
export function svelteSnippet(config) {
  const script = [`  import "${PACKAGE}/register";`, `  let data = ${literal(config.data)};`];
  const attributes = ["data={data}"];
  for (const option of config.options) {
    const name = kebab(option.name);
    if (isFlag(option)) attributes.push(name);
    else if (isOff(option)) attributes.push(`${name}="false"`);
    else if (isObject(option)) {
      script.push(`  let ${variable(option)} = ${literal(option.value)};`);
      attributes.push(`${option.name}={${variable(option)}}`);
    } else attributes.push(`${name}=${htmlValue(String(option.value))}`);
  }
  if (config.preset) attributes.push(`preset=${htmlValue(config.preset)}`);
  if (config.label) attributes.push(`label=${htmlValue(config.label)}`);
  return ["<script>", ...script, "</script>", "", `<${config.tag}`, ...indent(attributes), `></${config.tag}>`].join("\n");
}

/** The configurator's export formats, in tab order. */
export const EXPORTS = Object.freeze([
  { id: "html", name: "HTML", generate: htmlSnippet },
  { id: "js", name: "JavaScript", generate: jsSnippet },
  { id: "react", name: "React", generate: reactSnippet },
  { id: "vue", name: "Vue", generate: vueSnippet },
  { id: "angular", name: "Angular", generate: angularSnippet },
  { id: "svelte", name: "Svelte", generate: svelteSnippet },
]);

// --- Framework guides (Frameworks page) -------------------------------------

/** Usage per framework, consistent with the package README. */
export const FRAMEWORK_GUIDES = Object.freeze([
  {
    id: "vanilla",
    name: "Vanilla",
    install: INSTALL.npm,
    intro: "Register the elements once, then write them as HTML. Every option is an attribute and a camelCase property.",
    files: [
      {
        name: "index.html",
        code: `<script type="module">
  import "sparkline-mini-charts/register";
</script>

<mini-line-chart
  data="[12, 18, 15, 27]"
  curve="smooth"
  interactive
  label="Weekly revenue"
></mini-line-chart>`,
      },
      {
        name: "main.js",
        code: `import "sparkline-mini-charts/register";

const chart = document.querySelector("mini-line-chart");
chart.data = [12, 18, 15, 27, 31]; // arrays and objects go straight to the property
chart.curve = "step";
chart.addEventListener("sparkline-select", (event) => console.log(event.detail));`,
      },
    ],
    notes: [
      "Import <code>sparkline-mini-charts/define</code> and call <code>defineMiniCharts()</code> to choose when the elements register.",
      "Import a single chart (<code>sparkline-mini-charts/mini-line-chart</code>) with <code>defineMiniChart()</code> for the smallest bundle.",
    ],
  },
  {
    id: "react",
    name: "React",
    install: INSTALL.npm,
    intro: "Typed wrappers for React 18.3 and 19. Props are the chart options in camelCase; events are on* props.",
    files: [
      {
        name: "RevenueChart.tsx",
        code: `"use client";

import { MiniLineChart } from "sparkline-mini-charts/react";

export function RevenueChart() {
  return (
    <MiniLineChart
      data={[12, 18, 15, 27]}
      curve="smooth"
      interactive
      label="Weekly revenue"
      onSparklineSelect={(event) => console.log(event.detail)}
    />
  );
}`,
      },
    ],
    notes: [
      "The wrappers also take <code>options</code> and <code>preset</code> props.",
      "Charts render in the browser: server components import them safely and draw after hydration.",
    ],
  },
  {
    id: "vue",
    name: "Vue",
    install: INSTALL.npm,
    intro: "Typed components for Vue 3.5+. Bind data with :data, listen with @sparkline-select.",
    files: [
      {
        name: "RevenueChart.vue",
        code: `<script setup lang="ts">
import { MiniLineChart } from "sparkline-mini-charts/vue";

const revenue = [12, 18, 15, 27];
</script>

<template>
  <MiniLineChart
    :data="revenue"
    curve="smooth"
    interactive
    label="Weekly revenue"
    @sparkline-select="(event) => console.log(event.detail)"
  />
</template>`,
      },
    ],
    notes: ["The components also take <code>options</code> and <code>preset</code> props."],
  },
  {
    id: "angular",
    name: "Angular",
    install: INSTALL.npm,
    intro: "Angular CLI apps compile ahead of time: register the elements once and bind to the raw tags.",
    files: [
      {
        name: "revenue-card.component.ts",
        code: `import "sparkline-mini-charts/register";
import { CUSTOM_ELEMENTS_SCHEMA, Component } from "@angular/core";

@Component({
  selector: "app-revenue-card",
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`<mini-line-chart
    [data]="revenue"
    curve="smooth"
    interactive
    label="Weekly revenue"
    (sparkline-select)="onSelect($event)"
  ></mini-line-chart>\`,
})
export class RevenueCard {
  revenue = [12, 18, 15, 27];

  onSelect(event: Event) {
    console.log((event as CustomEvent).detail);
  }
}`,
      },
    ],
    notes: [
      "<code>[data]</code> sets the element's <code>data</code> property, so arrays and objects need no JSON text.",
      "In 1.4.x the per-chart Angular directives do not work from <code>node_modules</code>; use this recipe.",
    ],
  },
  {
    id: "svelte",
    name: "Svelte",
    install: INSTALL.npm,
    intro: "Svelte works with custom elements as they are: no wrapper needed.",
    files: [
      {
        name: "RevenueChart.svelte",
        code: `<script>
  import "sparkline-mini-charts/register";
  let revenue = [12, 18, 15, 27];
</script>

<mini-line-chart data={revenue} curve="smooth" label="Weekly revenue"></mini-line-chart>`,
      },
    ],
    notes: ["Svelte assigns <code>data={…}</code> to the element's <code>data</code> property, so arrays and objects pass as they are."],
  },
]);

/** App-wide configuration, shown on the Frameworks page. */
export const CONFIGURATION_SNIPPET = `import { defineMiniCharts, configureMiniCharts } from "sparkline-mini-charts/define";

defineMiniCharts({
  defaults: { "*": { interactive: true }, "mini-line-chart": { curve: "smooth" } },
  presets: { dense: { "mini-bar-chart": { gap: 0.05 } } },
});
configureMiniCharts({ defaults: { "mini-bar-chart": { radius: 1 } } }); // re-renders connected charts

const chart = document.querySelector("mini-bar-chart");
chart.preset = "dense";
chart.options = { baseline: 10 };
chart.resolvedOptions(); // { gap: 0.05, radius: 1, baseline: 10, interactive: true }`;
