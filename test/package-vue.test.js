// package-vue.test.js — Behavior tests for the built Vue wrappers in dist/vue.js (requires `pnpm build`).

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, describe, test } from "node:test";
import { dispatchHover, flushMicrotasks, stubSvgLayout } from "./contract/dom.js";
import { installHappyDom } from "./adapters/happy-dom.js";

const distUrl = new URL("../dist/", import.meta.url);
const ssrScript = fileURLToPath(new URL("./adapters/vue-ssr.js", import.meta.url));

assert.ok(existsSync(new URL("vue.js", distUrl)), "dist/vue.js is missing: run `pnpm build` before `pnpm test:package`.");

// The DOM must exist before the chart classes are evaluated: they extend the global HTMLElement.
const dom = installHappyDom();
const restoreSvgLayout = stubSvgLayout(dom.window);

// With a window present, Vue's development build waits 3 s for the devtools
// extension and holds the process open; a no-op hook stands in for it.
Reflect.set(globalThis, "__VUE_DEVTOOLS_GLOBAL_HOOK__", { emit() {} });

const { defineComponent, nextTick } = await import("vue");
const { mount } = await import("@vue/test-utils");
const charts = await import("../dist/vue.js");

/** @type {string[]} */
const vueWarnings = [];
const consoleWarn = console.warn;
console.warn = (/** @type {unknown[]} */ ...args) => {
  vueWarnings.push(args.map(String).join(" "));
  consoleWarn(...args);
};

/** @type {import("@vue/test-utils").VueWrapper[]} */
const wrappers = [];

/**
 * Mounts a template in the document, so the chart elements connect and render.
 *
 * @param {string} template Vue template using the wrappers by their component names.
 * @param {() => Record<string, unknown>} [state] Reactive state for the template.
 * @returns {Promise<import("@vue/test-utils").VueWrapper<any>>} The mounted wrapper.
 */
async function mountTemplate(template, state = () => ({})) {
  const wrapper = mount(defineComponent({ components: charts, template, data: state }), { attachTo: document.body });
  wrappers.push(wrapper);
  await flushMicrotasks();
  return wrapper;
}

/**
 * @param {Element} element Chart element.
 * @returns {number} How many point circles are shown; the line chart hides pooled circles it does not need.
 */
const countVisiblePoints = (element) =>
  [...(element.shadowRoot?.querySelectorAll('[part~="point"]') ?? [])].filter(
    (point) => /** @type {SVGElement} */ (point).style.display !== "none",
  ).length;

/**
 * @param {Element} element Stacked-area chart element.
 * @returns {(string | null)[]} The `d` of every layer path.
 */
const layerPaths = (element) =>
  [...(element.shadowRoot?.querySelectorAll('[part~="layer"]') ?? [])].map((path) => path.getAttribute("d"));

/**
 * Renders a raw element with the given attributes, as a reference for what the wrapper must produce.
 *
 * @param {string} tag Chart tag name.
 * @param {Record<string, string>} attributes Attributes to set before connecting.
 * @returns {Promise<HTMLElement>} The connected element.
 */
async function renderRaw(tag, attributes) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.body.append(element);
  await flushMicrotasks();
  return element;
}

describe("Vue wrappers (dist/vue.js)", () => {
  after(async () => {
    for (const wrapper of wrappers) wrapper.unmount();
    console.warn = consoleWarn;
    restoreSvgLayout();
    await dom.close();
  });

  test(':data="[1,2,3]" renders 3 points and stays JSON text', async () => {
    const wrapper = await mountTemplate('<MiniLineChart :data="values" points="all" />', () => ({ values: [1, 2, 3] }));
    const element = wrapper.element;

    assert.equal(element.localName, "mini-line-chart");
    assert.equal(element.getAttribute("data"), "[1,2,3]");
    assert.equal(countVisiblePoints(element), 3);
    assert.deepEqual(/** @type {any} */ (element).data, [1, 2, 3]);

    await wrapper.setData({ values: [4, 5, 6, 7] });
    await flushMicrotasks();
    assert.equal(element.getAttribute("data"), "[4,5,6,7]");
    assert.equal(countVisiblePoints(element), 4);
  });

  test("data reaches the charts that parse their own shape", async () => {
    const wrapper = await mountTemplate(`<div>
      <MiniScatterChart :data="[[1, 2], [2, 5], [3, 8]]" />
      <MiniCandlestickChart :data="[[10, 15, 8, 12], [12, 18, 11, 17]]" />
      <MiniBulletChart :data="42" :target="80" />
    </div>`);
    const [scatter, candles, bullet] = wrapper.element.children;

    assert.equal(scatter?.shadowRoot?.querySelectorAll('[part~="point"]').length, 3);
    assert.equal(candles?.shadowRoot?.querySelectorAll('[part~="candle"][data-index]').length, 2);
    assert.equal(bullet?.getAttribute("data"), "42", "a bare number is accepted without a prop-type warning");
    assert.equal(bullet?.shadowRoot?.querySelector("svg")?.getAttribute("aria-valuenow"), "42");
  });

  test(':normalize="false" renders a stacked, not normalized, chart', async () => {
    const data = JSON.stringify([[10, 20, 15], [30, 5, 10]]);
    const wrapper = await mountTemplate(`<div>
      <MiniStackedAreaChart :data="data" :normalize="false" />
      <MiniStackedAreaChart :data="data" :normalize="on" />
      <MiniStackedAreaChart :data="data" normalize />
    </div>`, () => ({ data, on: true }));
    const [off, toggled, bare] = /** @type {HTMLElement[]} */ ([...wrapper.element.children]);

    // The Vue wrappers register a tag on first use, so the raw references come second.
    const normalizedReference = layerPaths(await renderRaw("mini-stacked-area-chart", { data, normalize: "" }));
    const stackedReference = layerPaths(await renderRaw("mini-stacked-area-chart", { data }));
    assert.equal(normalizedReference.length, 2);
    assert.notDeepEqual(normalizedReference, stackedReference);

    assert.equal(off.hasAttribute("normalize"), false);
    assert.deepEqual(layerPaths(off), stackedReference);

    for (const element of [toggled, bare]) {
      assert.equal(element.getAttribute("normalize"), "");
      assert.equal(Object.hasOwn(element, "normalize"), false, "no own property shadows Node.prototype.normalize");
      assert.equal(typeof element.normalize, "function");
      assert.deepEqual(layerPaths(element), normalizedReference);
    }

    await wrapper.setData({ on: false });
    await flushMicrotasks();
    assert.equal(toggled.hasAttribute("normalize"), false);
    assert.deepEqual(layerPaths(toggled), stackedReference);
  });

  test(":zones arrives as JSON and colors the gauge", async () => {
    const wrapper = await mountTemplate(
      `<MiniGaugeChart :data="[75]" :zones="[{ upTo: 50, color: 'green' }, { upTo: 100, color: 'red' }]" />`,
    );
    const element = wrapper.element;
    const trackColors = [...(element.shadowRoot?.querySelectorAll('[part~="track"]') ?? [])].map((track) => track.getAttribute("stroke"));

    assert.equal(element.getAttribute("zones"), '[{"upTo":50,"color":"green"},{"upTo":100,"color":"red"}]');
    assert.deepEqual(trackColors, ["green", "red"]);
  });

  test("other object and array options are serialized as JSON; camelCase options map to their attributes", async () => {
    const wrapper = await mountTemplate(`<div>
      <MiniBulletChart :data="[60]" :ranges="[50, 80, 100]" />
      <MiniAreaChart :data="[1, 2]" :gradient="['#f00', '#0f0']" :referenceValue="1.5" />
      <MiniGaugeChart :data="[75]" needleType="line" :showValue="true" />
    </div>`);
    const [bullet, area, gauge] = wrapper.element.children;

    assert.equal(bullet?.getAttribute("ranges"), "[50,80,100]");
    assert.equal(area?.getAttribute("gradient"), '["#f00","#0f0"]');
    assert.equal(area?.getAttribute("reference-value"), "1.5");
    assert.equal(gauge?.getAttribute("needle-type"), "line");
    assert.equal(gauge?.getAttribute("show-value"), "");
    for (const element of [area, gauge]) {
      assert.deepEqual([...(element?.attributes ?? [])].map(({ name }) => name).filter((name) => /[A-Z]|referencevalue|needletype|showvalue/.test(name)), []);
    }
  });

  test("false omits presence-only flags and writes \"false\" for default-true flags", async () => {
    const wrapper = await mountTemplate(`<div>
      <MiniLineChart :data="[1, 2]" :interactive="false" />
      <MiniProgressChart :data="[40]" :show-value="false" :gradient="false" />
      <MiniScatterChart :data="[[1, 2]]" :trend-line="false" />
      <MiniRadialBarChart :data="[30]" :round-caps="false" />
      <MiniCandlestickChart :data="[[10, 15, 8, 12]]" :hollow-bullish="false" />
      <MiniComboChart :data="[{ bar: 1, line: 2 }]" :shared-domain="false" />
      <MiniAreaChart :data="[1, 2]" :gradient="false" />
    </div>`);
    const [line, progress, scatter, radial, candles, combo, area] = wrapper.element.children;

    assert.equal(line?.hasAttribute("interactive"), false);
    assert.equal(progress?.hasAttribute("show-value"), false);
    assert.equal(progress?.hasAttribute("gradient"), false);
    assert.equal(scatter?.hasAttribute("trend-line"), false);
    assert.equal(radial?.getAttribute("round-caps"), "false");
    assert.match(radial?.shadowRoot?.querySelector("style")?.textContent ?? "", /stroke-linecap: butt/);
    assert.equal(candles?.getAttribute("hollow-bullish"), "false");
    assert.equal(combo?.getAttribute("shared-domain"), "false");
    assert.equal(area?.getAttribute("gradient"), "false");
  });

  test("attributes are applied once (inheritAttrs: false)", async () => {
    let clicks = 0;
    const wrapper = await mountTemplate(
      `<MiniBarChart :data="[1, 2]" class="spark" style="--mini-chart-color: #ff0000" id="revenue" aria-label="Revenue" data-testid="bar" @click="onClick" />`,
      () => ({ onClick: () => (clicks += 1) }),
    );
    const element = /** @type {HTMLElement} */ (wrapper.element);

    assert.equal(element.getAttribute("class"), "spark");
    assert.equal(element.style.getPropertyValue("--mini-chart-color"), "#ff0000");
    assert.equal(element.id, "revenue");
    assert.equal(element.getAttribute("aria-label"), "Revenue");
    assert.equal(element.getAttribute("data-testid"), "bar");

    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    assert.equal(clicks, 1, "a listener attribute is attached once, not twice");
  });

  test("every chart event is emitted once, sparkline-select and progress-complete included", async () => {
    const events = ["sparkline-hover", "sparkline-leave", "sparkline-select", "slice-select", "zone-change", "progress-complete"];
    const listeners = events.map((type) => `@${type}="received.push(['${type}', $event])"`).join(" ");
    const wrapper = await mountTemplate(`<MiniLineChart :data="[1, 2]" ${listeners} />`, () => ({ received: [] }));

    for (const type of events) wrapper.element.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail: { type } }));

    /** @type {[string, CustomEvent][]} */
    const received = wrapper.vm.received;
    assert.deepEqual(received.map(([type]) => type), events);
    for (const [type, event] of received) assert.equal(event.detail.type, type);
    assert.deepEqual(wrapper.findComponent(charts.MiniLineChart).vm.$options.emits, events);
  });

  test("events the charts dispatch reach the listeners, on mount and on hover", async () => {
    const wrapper = await mountTemplate(`<div>
      <MiniProgressChart :data="[100]" @progress-complete="completed.push($event)" />
      <MiniBarChart :data="[-2, 7, 4]" interactive @sparkline-hover="hovered.push($event)" />
    </div>`, () => ({ completed: [], hovered: [] }));
    const [, bar] = wrapper.element.children;

    assert.equal(wrapper.vm.completed.length, 1, "progress-complete from the first render is delivered");

    const dispatched = dispatchHover(/** @type {Element} */ (bar), { selector: "rect[data-index]" });
    await nextTick();
    assert.ok(dispatched.length > 0, "the chart dispatched sparkline-hover");
    assert.equal(wrapper.vm.hovered.length, dispatched.length);
  });

  test('the SSR HTML contains data="[1,2,3]", JSON options and flags as attributes', () => {
    const { html, warnings } = JSON.parse(execFileSync(process.execPath, [ssrScript], { encoding: "utf8" }));

    assert.match(html, /<mini-line-chart class="spark" curve="smooth" data="\[1,2,3\]">/);
    assert.match(html, /<mini-stacked-area-chart normalize data="\[\[1,2\],\[3,4\]\]">/);
    assert.match(html, /<mini-stacked-area-chart data="\[\[1,2\],\[3,4\]\]">/);
    assert.match(html, /<mini-gauge-chart zones="\[\{&quot;upTo&quot;:50,&quot;color&quot;:&quot;green&quot;\}\]" data="\[75\]">/);
    assert.match(html, /<mini-radial-bar-chart round-caps="false" data="\[30\]">/);
    assert.doesNotMatch(html, /\^normalize|show-value|\[object Object\]/);
    assert.deepEqual(warnings, []);
  });

  // Keep last: it covers every mount above.
  test("client renders log no Vue warnings", () => {
    assert.deepEqual(vueWarnings, []);
  });
});
