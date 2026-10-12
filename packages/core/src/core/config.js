// config.js — Global chart defaults and named presets shared by every chart element.

/**
 * Option values for one chart, keyed by camelCase option name (`curve`,
 * `referenceValue`); kebab-case attribute names are accepted too.
 *
 * @typedef {Readonly<Record<string, unknown>>} ChartOptionValues
 */

/**
 * Option values per chart tag. The `"*"` key applies to every chart.
 *
 * @typedef {Readonly<Record<string, ChartOptionValues>>} ChartOptionsByTag
 */

/**
 * A patch for the global chart configuration.
 *
 * @typedef {Object} MiniChartsConfig
 * @property {ChartOptionsByTag} [defaults] Default options per tag (`"*"` for every chart), merged into the current ones.
 * @property {Readonly<Record<string, ChartOptionsByTag>>} [presets] Named presets, each with options per tag; a name replaces any preset of the same name.
 * @property {boolean} [reflectData] Whether `el.data = values` also writes the `data` attribute (the 1.x behaviour, on by default). Turn it off for streaming: the values are then kept on the element only.
 */

/** @type {Record<string, Record<string, unknown>>} */
const defaults = Object.create(null);

/** @type {Record<string, ChartOptionsByTag>} */
const presets = Object.create(null);

/** Whether `el.data = values` reflects the values to the `data` attribute. */
let reflectData = true;

/**
 * Whether `el.data = values` reflects the values to the `data` attribute.
 *
 * @returns {boolean}
 */
export function dataReflection() {
  return reflectData;
}

/**
 * Connected charts, re-rendered when the configuration changes.
 *
 * @type {Set<{ requestRender(): void }>}
 */
const connectedCharts = new Set();

/**
 * Adds or removes a chart from the set re-rendered on configuration changes.
 *
 * @param {{ requestRender(): void }} chart Chart element.
 * @param {boolean} connected Whether the chart is connected.
 */
export function trackChart(chart, connected) {
  if (connected) connectedCharts.add(chart);
  else connectedCharts.delete(chart);
}

/**
 * Lists the configuration layers of a chart, highest precedence first:
 * each preset named in `presetNames` (rightmost first), then the tag
 * defaults, then the `"*"` defaults.
 *
 * @param {string | undefined} tag Chart tag name.
 * @param {readonly string[]} presetNames Preset names in attribute order.
 * @returns {Readonly<Record<string, unknown>>[]} The layers.
 */
export function configLayers(tag, presetNames) {
  /** @type {Readonly<Record<string, unknown>>[]} */
  const layers = [];
  for (let index = presetNames.length - 1; index >= 0; index -= 1) {
    const preset = presets[presetNames[index]];
    if (!preset) continue;
    if (tag && preset[tag]) layers.push(preset[tag]);
    if (preset["*"]) layers.push(preset["*"]);
  }
  if (tag && defaults[tag]) layers.push(defaults[tag]);
  if (defaults["*"]) layers.push(defaults["*"]);
  return layers;
}

/** Re-renders every connected chart once (each chart batches its own render). */
function rerenderCharts() {
  for (const chart of connectedCharts) chart.requestRender();
}

/**
 * Updates the global chart configuration and re-renders the connected charts.
 * Defaults are merged per tag into the current ones; a preset replaces any
 * preset of the same name. Precedence on each chart, highest first: explicit
 * attribute or property, `el.options`, presets named in `preset`, defaults of
 * its tag, defaults of `"*"`, the chart's built-in default.
 *
 * @example
 * configureMiniCharts({ defaults: { "*": { interactive: true }, "mini-bar-chart": { gap: 0.1 } } });
 *
 * @param {MiniChartsConfig} [patch] Defaults and presets to apply.
 * @returns {void}
 */
export function configureMiniCharts(patch = {}) {
  if (typeof patch.reflectData === "boolean") reflectData = patch.reflectData;
  for (const [tag, values] of Object.entries(patch.defaults ?? {})) {
    if (values && typeof values === "object") defaults[tag] = { ...defaults[tag], ...values };
  }
  for (const [name, map] of Object.entries(patch.presets ?? {})) {
    if (map && typeof map === "object") presets[name] = Object.freeze({ ...map });
  }
  rerenderCharts();
}

/**
 * Defines (or replaces) a named preset, used by charts with `preset="name"`.
 *
 * @example
 * defineChartPreset("dense", { "mini-bar-chart": { gap: 0.05 }, "mini-line-chart": { points: "none" } });
 *
 * @param {string} name Preset name, a single word.
 * @param {ChartOptionsByTag} map Options per tag (`"*"` for every chart).
 * @returns {void}
 */
export function defineChartPreset(name, map) {
  configureMiniCharts({ presets: { [name]: map } });
}
