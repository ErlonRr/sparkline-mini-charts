// react-suite.js — Behavior tests for the built React wrappers (dist/react.js), shared by React 18.3 and 19.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { SourceMap } from "node:module";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";
import { dispatchHover, flushMicrotasks, stubSvgLayout } from "../contract/dom.js";
import { installHappyDom } from "./happy-dom.js";

const distUrl = new URL("../../dist/", import.meta.url);
const ssrScript = fileURLToPath(new URL("./react-ssr.js", import.meta.url));
const react18Hooks = fileURLToPath(new URL("./react-18.js", import.meta.url));

/**
 * Registers the React wrapper suite against the React copy that `react`
 * resolves to in this process. Load it with a dynamic `import()` after any
 * resolve hook, so this module and dist/react.js see the same React.
 *
 * @param {{ major: 18 | 19 }} options React major version the process must be running.
 */
export async function runReactSuite({ major }) {
  assert.ok(
    existsSync(new URL("react.js", distUrl)),
    "dist/react.js is missing: run `pnpm build` before `pnpm test:package`.",
  );

  const dom = installHappyDom();
  const restoreSvgLayout = stubSvgLayout(dom.window);
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const charts = await import("../../dist/react.js");
  const { act, createElement, createRef } = React;

  /** @type {{ root: import("react-dom/client").Root, container: HTMLElement }[]} */
  let mounted = [];

  // React reports invalid props, key and hook misuse through console.error in development builds.
  /** @type {string[]} */
  const reactWarnings = [];
  const consoleError = console.error;

  /**
   * Renders a React element into a fresh container in the document.
   *
   * @param {import("react").ReactElement} element React element.
   * @returns {Promise<{ container: HTMLElement, rerender: (next: import("react").ReactElement) => Promise<void>, unmount: () => Promise<void> }>} The mounted tree.
   */
  async function render(element) {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mounted.push({ root, container });
    await act(() => root.render(element));

    return {
      container,
      rerender: (next) => act(() => root.render(next)),
      unmount: () => act(() => root.unmount()),
    };
  }

  /**
   * Renders one chart and returns its custom element.
   *
   * @param {import("react").ElementType} Chart React wrapper.
   * @param {Record<string, unknown>} props Wrapper props.
   * @returns {Promise<{ element: HTMLElement, rerender: (props: Record<string, unknown>) => Promise<void>, unmount: () => Promise<void> }>} The chart element and helpers.
   */
  async function renderChart(Chart, props) {
    const view = await render(createElement(Chart, props));
    const element = /** @type {HTMLElement} */ (view.container.firstElementChild);
    await flushMicrotasks();

    return {
      element,
      rerender: async (next) => {
        await view.rerender(createElement(Chart, next));
        await flushMicrotasks();
      },
      unmount: view.unmount,
    };
  }

  /**
   * @param {HTMLElement} element Chart element.
   * @param {string} selector Shadow-DOM selector.
   * @returns {number} How many shadow nodes match.
   */
  const countShadow = (element, selector) => element.shadowRoot?.querySelectorAll(selector).length ?? 0;

  /**
   * @param {HTMLElement} element Line chart element.
   * @returns {number} How many point circles are shown; the line chart hides pooled circles it does not need.
   */
  const countVisiblePoints = (element) =>
    [...(element.shadowRoot?.querySelectorAll('[part~="point"]') ?? [])].filter(
      (point) => /** @type {SVGElement} */ (point).style.display !== "none",
    ).length;

  /**
   * @param {Element} element Stacked-area chart element.
   * @returns {(string | null)[]} The `d` of every layer path; they are written synchronously, unlike the clip animation.
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

  describe(`React ${major} wrappers (dist/react.js)`, () => {
    before(() => {
      mounted = [];
      console.error = (/** @type {unknown[]} */ ...args) => {
        reactWarnings.push(args.map(String).join(" "));
        consoleError(...args);
      };
    });

    after(async () => {
      for (const { root } of mounted) await act(() => root.unmount());
      console.error = consoleError;
      restoreSvgLayout();
      await dom.close();
    });

    test(`runs on React ${major}`, () => {
      assert.equal(Number(React.version.split(".")[0]), major, `react resolved to ${React.version}`);
      if (major === 18) assert.match(React.version, /^18\.3\./);
    });

    test("an inline style with --mini-chart-color is applied to the element", async () => {
      // Bar, not line: line and area still rewrite the host's --mini-chart-color on every render (P1-4).
      const { element } = await renderChart(charts.MiniBarChart, {
        data: [1, 2, 3],
        style: { "--mini-chart-color": "#ff0000", width: 120 },
      });

      assert.equal(element.style.getPropertyValue("--mini-chart-color"), "#ff0000");
      assert.equal(element.style.width, "120px");
    });

    test("className becomes the class attribute", async () => {
      const { element } = await renderChart(charts.MiniLineChart, { data: [1, 2, 3], className: "spark h-8" });

      assert.equal(element.getAttribute("class"), "spark h-8");
      assert.equal(element.hasAttribute("classname"), false);
      assert.equal(element.hasAttribute("class-name"), false);
    });

    test("standard props reach React untouched", async () => {
      const view = await render(
        createElement(
          charts.MiniBarChart,
          { data: [1, 2], id: "revenue", slot: "chart", tabIndex: 0, title: "Revenue", "aria-label": "Revenue trend", "data-testid": "bar" },
          "fallback text",
        ),
      );
      const element = /** @type {HTMLElement} */ (view.container.firstElementChild);

      assert.equal(element.id, "revenue");
      assert.equal(element.getAttribute("slot"), "chart");
      assert.equal(element.getAttribute("tabindex"), "0");
      assert.equal(element.getAttribute("title"), "Revenue");
      assert.equal(element.getAttribute("aria-label"), "Revenue trend");
      assert.equal(element.getAttribute("data-testid"), "bar");
      assert.equal(element.textContent, "fallback text");
      for (const mangled of ["tab-index", "aria-label-", "data-testid-"]) assert.equal(element.hasAttribute(mangled), false);
    });

    test("an array in data renders one point per value and stays JSON text", async () => {
      const { element, rerender } = await renderChart(charts.MiniLineChart, { data: [3, 7, 4, 9, 6], points: "all" });

      assert.equal(element.getAttribute("data"), "[3,7,4,9,6]");
      assert.equal(countVisiblePoints(element), 5);
      assert.deepEqual(/** @type {any} */ (element).data, [3, 7, 4, 9, 6]);

      await rerender({ data: [1, 2, 3], points: "all" });
      assert.equal(element.getAttribute("data"), "[1,2,3]");
      assert.equal(countVisiblePoints(element), 3);

      await rerender({ data: "[5,6]", points: "all" });
      assert.equal(element.getAttribute("data"), "[5,6]", "a JSON string is passed unchanged");
      assert.equal(countVisiblePoints(element), 2);
    });

    test("data reaches the charts that parse their own shape", async () => {
      const scatter = await renderChart(charts.MiniScatterChart, { data: [[1, 2], [2, 5], [3, 8]] });
      assert.equal(countShadow(scatter.element, '[part~="point"]'), 3);

      const candles = await renderChart(charts.MiniCandlestickChart, { data: [[10, 15, 8, 12], [12, 18, 11, 17]] });
      assert.equal(countShadow(candles.element, '[part~="candle"][data-index]'), 2);

      const bullet = await renderChart(charts.MiniBulletChart, { data: { value: 42, target: 80 } });
      assert.equal(bullet.element.shadowRoot?.querySelector("svg")?.getAttribute("aria-valuenow"), "42");
    });

    test("onSparklineHover fires once per hover event", async () => {
      /** @type {Event[]} */
      const received = [];
      const { element, rerender, unmount } = await renderChart(charts.MiniBarChart, {
        data: [-2, 7, 4],
        interactive: true,
        onSparklineHover: (/** @type {Event} */ event) => received.push(event),
      });

      const dispatched = dispatchHover(element, { selector: "rect[data-index]" });
      assert.ok(dispatched.length > 0, "the chart dispatched sparkline-hover");
      assert.deepEqual(received, dispatched);

      // A new callback replaces the old one without adding a second listener.
      /** @type {Event[]} */
      const replaced = [];
      await rerender({ data: [-2, 7, 4], interactive: true, onSparklineHover: (/** @type {Event} */ event) => replaced.push(event) });
      element.dispatchEvent(new CustomEvent("sparkline-hover", { detail: { index: 1 } }));
      assert.equal(replaced.length, 1);
      assert.equal(received.length, dispatched.length);

      await unmount();
      element.dispatchEvent(new CustomEvent("sparkline-hover", { detail: { index: 1 } }));
      assert.equal(replaced.length, 1, "the listener is removed on unmount");
    });

    test("every event prop is delivered once, and none is written to the element", async () => {
      /** @type {Record<string, number>} */
      const calls = {};
      /** @type {Record<string, string>} */
      const eventProps = {
        onSparklineHover: "sparkline-hover",
        onSparklineLeave: "sparkline-leave",
        onSparklineSelect: "sparkline-select",
        onSliceSelect: "slice-select",
        onZoneChange: "zone-change",
        onProgressComplete: "progress-complete",
      };
      const handlers = Object.fromEntries(
        Object.keys(eventProps).map((prop) => [prop, () => (calls[prop] = (calls[prop] ?? 0) + 1)]),
      );
      const { element } = await renderChart(charts.MiniLineChart, { data: [1, 2], ...handlers });

      for (const type of Object.values(eventProps)) element.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }));
      assert.deepEqual(calls, Object.fromEntries(Object.keys(eventProps).map((prop) => [prop, 1])));

      assert.deepEqual([...element.attributes].map(({ name }) => name).filter((name) => name.startsWith("on")), []);
      for (const prop of Object.keys(eventProps)) assert.equal(Object.hasOwn(element, prop), false, prop);
    });

    test("events the charts dispatch after an update reach their props", async () => {
      let completed = 0;
      const progress = await renderChart(charts.MiniProgressChart, { data: [50], onProgressComplete: () => (completed += 1) });
      await progress.rerender({ data: [100], onProgressComplete: () => (completed += 1) });
      assert.equal(completed, 1);

      /** @type {CustomEvent[]} */
      const zoneChanges = [];
      const onZoneChange = (/** @type {CustomEvent} */ event) => zoneChanges.push(event);
      const gauge = await renderChart(charts.MiniGaugeChart, { data: [10], onZoneChange });
      await gauge.rerender({ data: [95], onZoneChange });
      assert.equal(zoneChanges.length, 1);
      assert.equal(zoneChanges[0].detail.value, 95);
    });

    test("roundCaps={false} produces round-caps=\"false\" and flat caps", async () => {
      const flat = await renderChart(charts.MiniRadialBarChart, { data: [30], roundCaps: false });
      assert.equal(flat.element.getAttribute("round-caps"), "false");
      assert.match(flat.element.shadowRoot?.querySelector("style")?.textContent ?? "", /stroke-linecap: butt/);

      const round = await renderChart(charts.MiniRadialBarChart, { data: [30], roundCaps: true });
      assert.equal(round.element.getAttribute("round-caps"), "");

      const unset = await renderChart(charts.MiniRadialBarChart, { data: [30] });
      assert.equal(unset.element.hasAttribute("round-caps"), false);
      assert.match(unset.element.shadowRoot?.querySelector("style")?.textContent ?? "", /stroke-linecap: round/);
    });

    test("default-true flags receive \"false\"; presence-only flags are omitted when false", async () => {
      const cases = [
        { Chart: charts.MiniCandlestickChart, props: { hollowBullish: false }, attribute: "hollow-bullish", expected: "false" },
        { Chart: charts.MiniComboChart, props: { sharedDomain: false }, attribute: "shared-domain", expected: "false" },
        { Chart: charts.MiniAreaChart, props: { gradient: false }, attribute: "gradient", expected: "false" },
        { Chart: charts.MiniLineChart, props: { interactive: false }, attribute: "interactive", expected: null },
        { Chart: charts.MiniProgressChart, props: { showValue: false }, attribute: "show-value", expected: null },
        { Chart: charts.MiniProgressChart, props: { gradient: false }, attribute: "gradient", expected: null },
        { Chart: charts.MiniScatterChart, props: { trendLine: false }, attribute: "trend-line", expected: null },
        { Chart: charts.MiniGaugeChart, props: { "show-value": true }, attribute: "show-value", expected: "" },
      ];

      for (const { Chart, props, attribute, expected } of cases) {
        const { element } = await renderChart(Chart, { data: [], ...props });
        assert.equal(element.getAttribute(attribute), expected, `${element.localName} ${JSON.stringify(props)}`);
      }
    });

    test("object options are serialized as JSON and camelCase options map to their attributes", async () => {
      const zones = [{ upTo: 50, color: "green" }, { upTo: 100, color: "red" }];
      const gauge = await renderChart(charts.MiniGaugeChart, { data: [75], zones, needleType: "line" });
      assert.equal(gauge.element.getAttribute("zones"), JSON.stringify(zones));
      assert.equal(gauge.element.getAttribute("needle-type"), "line");
      const trackColors = [...(gauge.element.shadowRoot?.querySelectorAll('[part~="track"]') ?? [])].map((track) => track.getAttribute("stroke"));
      assert.deepEqual(trackColors, ["green", "red"]);

      const bullet = await renderChart(charts.MiniBulletChart, { data: [60], ranges: [50, 80, 100] });
      assert.equal(bullet.element.getAttribute("ranges"), "[50,80,100]");

      const area = await renderChart(charts.MiniAreaChart, { data: [1, 2], gradient: ["#f00", "#0f0"], referenceValue: 1.5, "trend-color": "auto" });
      assert.equal(area.element.getAttribute("gradient"), '["#f00","#0f0"]');
      assert.equal(area.element.getAttribute("reference-value"), "1.5");
      assert.equal(area.element.getAttribute("trend-color"), "auto");
    });

    test("normalize is set as an attribute and does not shadow Node.prototype.normalize", async () => {
      const data = [[10, 20, 15], [30, 5, 10]];
      const normalizedReference = layerPaths(await renderRaw("mini-stacked-area-chart", { data: JSON.stringify(data), normalize: "" }));
      const stackedReference = layerPaths(await renderRaw("mini-stacked-area-chart", { data: JSON.stringify(data) }));
      assert.notDeepEqual(normalizedReference, stackedReference);

      const { element, rerender } = await renderChart(charts.MiniStackedAreaChart, { data, normalize: true });
      assert.equal(element.getAttribute("normalize"), "");
      assert.equal(Object.hasOwn(element, "normalize"), false);
      assert.equal(typeof element.normalize, "function");
      assert.deepEqual(layerPaths(element), normalizedReference);

      await rerender({ data, normalize: false });
      assert.equal(element.hasAttribute("normalize"), false);
      assert.deepEqual(layerPaths(element), stackedReference);
    });

    test("the forwarded ref receives the chart element", async () => {
      const objectRef = createRef();
      /** @type {unknown[]} */
      const callbackValues = [];
      const view = await render(createElement("div", null,
        createElement(charts.MiniLineChart, { data: [1, 2], ref: objectRef }),
        createElement(charts.MiniBarChart, { data: [1, 2], ref: (/** @type {unknown} */ value) => callbackValues.push(value) }),
      ));
      const [line, bar] = view.container.firstElementChild?.children ?? [];

      assert.equal(objectRef.current, line);
      assert.equal(line?.constructor, customElements.get("mini-line-chart"));
      assert.deepEqual(callbackValues, [bar]);

      await view.unmount();
      assert.equal(objectRef.current, null);
      assert.deepEqual(callbackValues, [bar, null]);
    });

    test("a callback ref that returns a cleanup gets the cleanup, not null (React 19)", { skip: major < 19 && "React 18 has no ref cleanups" }, async () => {
      /** @type {string[]} */
      const log = [];
      const cleanupRef = (/** @type {string} */ name) => (/** @type {HTMLElement | null} */ element) => {
        log.push(`${name} ${element?.localName ?? "null"}`);
        return () => log.push(`${name} cleanup`);
      };

      const view = await render(createElement(charts.MiniLineChart, { data: [1, 2], ref: cleanupRef("first") }));
      await view.rerender(createElement(charts.MiniLineChart, { data: [1, 2], ref: cleanupRef("second") }));
      await view.unmount();

      assert.deepEqual(log, ["first mini-line-chart", "first cleanup", "second mini-line-chart", "second cleanup"]);
    });

    test("hidden={false} leaves no hidden attribute, so :host([hidden]) does not hide the chart", async () => {
      const { element, rerender } = await renderChart(charts.MiniLineChart, { data: [1, 2], hidden: false });
      assert.equal(element.hasAttribute("hidden"), false);
      assert.equal(element.hidden, false);

      await rerender({ data: [1, 2], hidden: true });
      assert.equal(element.hidden, true);

      await rerender({ data: [1, 2], hidden: false });
      assert.equal(element.hasAttribute("hidden"), false);
      assert.equal(element.hidden, false);
    });

    /** @type {string} */
    let serverHtml = "";

    test("renderToString keeps data, class, style, default-true flags and normalize", () => {
      const args = major === 18 ? ["--import", react18Hooks, ssrScript] : [ssrScript];
      const { version, html, errors } = JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8" }));
      serverHtml = html;

      assert.equal(Number(version.split(".")[0]), major);
      assert.match(html, /<mini-line-chart data="\[1,2,3\]" class="spark" style="--mini-chart-color:#ff0000" curve="smooth">/);
      assert.match(html, /<mini-radial-bar-chart data="\[30\]" round-caps="false">/);
      assert.match(html, /<mini-stacked-area-chart data="\[\[1,2\],\[3,4\]\]" normalize="">/);
      assert.doesNotMatch(html, /onSparklineHover|onsparklinehover/i);
      assert.deepEqual(errors, [], "server rendering logs no React warnings");
    });

    test("the server HTML hydrates without warnings and keeps normalize", async () => {
      assert.ok(serverHtml, "the renderToString test ran first");
      const { hydrateRoot } = await import("react-dom/client");
      const container = document.createElement("div");
      container.innerHTML = /<mini-stacked-area-chart\b.*?<\/mini-stacked-area-chart>/.exec(serverHtml)?.[0] ?? "";
      document.body.append(container);

      const warningsBefore = reactWarnings.length;
      /** @type {import("react-dom/client").Root | undefined} */
      let root;
      await act(() => {
        root = hydrateRoot(container, createElement(charts.MiniStackedAreaChart, { data: [[1, 2], [3, 4]], normalize: true }));
      });
      await flushMicrotasks();

      assert.deepEqual(reactWarnings.slice(warningsBefore), []);
      const stacked = container.querySelector("mini-stacked-area-chart");
      assert.equal(stacked?.getAttribute("normalize"), "");
      assert.equal(Object.hasOwn(/** @type {object} */ (stacked), "normalize"), false);
      await act(() => root?.unmount());
    });

    test("the built files open a 'use client' boundary and keep accurate source maps", () => {
      for (const file of ["react.js", "react.cjs"]) {
        const code = readFileSync(new URL(file, distUrl), "utf8");
        assert.ok(code.startsWith('"use client";'), `dist/${file} starts with "use client"`);

        // The banner shifts the code; a token must still map back to its line in src/react/index.ts.
        const mapUrl = new URL(`${file}.map`, distUrl);
        const map = new SourceMap(JSON.parse(readFileSync(mapUrl, "utf8")));
        const offset = code.indexOf("sparkline-hover");
        const lines = code.slice(0, offset).split("\n");
        const entry = map.findEntry(lines.length - 1, /** @type {string} */ (lines.at(-1)).length);
        assert.ok("originalSource" in entry, `dist/${file}.map maps the token`);

        const sourceUrl = new URL(entry.originalSource, mapUrl);
        assert.ok(sourceUrl.pathname.endsWith("/src/react/index.ts"), `dist/${file}.map points at ${sourceUrl.pathname}`);
        const sourceLine = readFileSync(sourceUrl, "utf8").split("\n")[entry.originalLine];
        assert.match(sourceLine ?? "", /onSparklineHover: "sparkline-hover"/);
      }

      for (const file of ["vue.js", "index.js", "define.js"]) {
        assert.equal(readFileSync(new URL(file, distUrl), "utf8").includes("use client"), false, `dist/${file} has no client boundary`);
      }
    });

    // Keep last: it covers every render above.
    test("client renders log no React warnings", () => {
      assert.deepEqual(reactWarnings, []);
    });
  });
}
