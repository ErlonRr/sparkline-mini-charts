// package-angular.test.js — Behavior tests for the built Angular directives in dist/angular.js, in JIT mode (requires `pnpm build`).

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { after, describe, test } from "node:test";
import { dispatchHover, flushMicrotasks, stubSvgLayout } from "./contract/dom.js";
import { chartFixtures } from "./contract/fixtures.js";
import { installHappyDom } from "./adapters/happy-dom.js";

const distUrl = new URL("../dist/", import.meta.url);

assert.ok(existsSync(new URL("angular.js", distUrl)), "dist/angular.js is missing: run `pnpm build` before `pnpm test:package`.");

// The DOM must exist before the chart classes are evaluated: they extend the global HTMLElement.
const dom = installHappyDom();
const restoreSvgLayout = stubSvgLayout(dom.window);

// Loading the compiler turns on JIT: Angular compiles decorated classes when they are first used,
// which is what happens to this package in an app that is not built ahead of time.
await import("@angular/compiler");
const ng = await import("@angular/core");
const { SIGNAL } = await import("@angular/core/primitives/signals");
const { TestBed } = await import("@angular/core/testing");
const { BrowserTestingModule, platformBrowserTesting } = await import("@angular/platform-browser/testing");
const angular = await import("../dist/angular.js");

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

/** Every tag src/define.js registers; the contract suite keeps the fixtures in sync with it. */
const chartTags = chartFixtures.map(({ tag }) => tag);

/** @type {string[]} */
const angularErrors = [];
const consoleError = console.error;
console.error = (/** @type {unknown[]} */ ...args) => {
  angularErrors.push(args.map(String).join(" "));
  consoleError(...args);
};

after(async () => {
  console.error = consoleError;
  TestBed.resetTestingModule();
  restoreSvgLayout();
  await dom.close();
});

/**
 * Compiles a host component in JIT mode and renders it into the document.
 *
 * @param {object} options Host component definition.
 * @param {string} options.template Template using the chart tags.
 * @param {unknown[]} [options.imports] Directives the host imports.
 * @param {unknown[]} [options.schemas] Template schemas.
 * @param {new () => object} [options.state] Class with the host's fields.
 * @returns {Promise<import("@angular/core/testing").ComponentFixture<any>>} The rendered fixture.
 */
async function renderHost({ template, imports = [], schemas = [], state = class {} }) {
  const Host = ng.Component({ selector: "test-host", imports, schemas, template })(class extends state {});
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [Host] });
  const fixture = TestBed.createComponent(Host);
  await settle(fixture);
  return fixture;
}

/**
 * Runs change detection, then the charts' batched re-renders.
 *
 * @param {import("@angular/core/testing").ComponentFixture<any>} fixture Fixture to update.
 * @returns {Promise<void>}
 */
async function settle(fixture) {
  fixture.detectChanges();
  await fixture.whenStable();
  await flushMicrotasks();
}

/**
 * @param {import("@angular/core/testing").ComponentFixture<any>} fixture Rendered fixture.
 * @param {string} tag Chart tag name.
 * @returns {HTMLElement & { data: unknown }} The first chart element with that tag.
 */
const chartIn = (fixture, tag) => {
  const element = fixture.nativeElement.querySelector(tag);
  assert.ok(element, `<${tag}> was not rendered`);
  return element;
};

/**
 * @param {Element} element Line chart element.
 * @returns {string | null | undefined} The `d` of the rendered line.
 */
const linePath = (element) => element.shadowRoot?.querySelector('[part~="line"]')?.getAttribute("d");

/**
 * Creates MiniChartDirective for an element the way Angular does, with the element as its ElementRef.
 *
 * @param {HTMLElement} element Host element.
 * @returns {any} The directive instance.
 */
const createDirective = (element) => {
  const injector = ng.Injector.create({ providers: [{ provide: ng.ElementRef, useValue: new ng.ElementRef(element) }] });
  return ng.runInInjectionContext(injector, () => new angular.MiniChartDirective());
};

// Runs first: registration is global, so the tags must still be undefined here.
describe("MiniChartDirective outside a template", () => {
  test("creating it registers all 17 tags, and data assigns the element property", () => {
    assert.equal(chartTags.length, 17);
    for (const tag of chartTags) assert.equal(customElements.get(tag), undefined, `${tag} is defined before the directive`);

    // Angular has already inserted the element when it creates the directive, so define() upgrades it.
    const element = document.createElement("mini-bar-chart");
    document.body.append(element);
    const directive = createDirective(element);

    for (const tag of chartTags) assert.ok(customElements.get(tag), `${tag} is not defined`);
    assert.ok(element instanceof /** @type {CustomElementConstructor} */ (customElements.get("mini-bar-chart")));

    directive.data = [1, 2, 3];
    assert.equal(element.getAttribute("data"), "[1,2,3]");
    assert.deepEqual(/** @type {any} */ (element).data, [1, 2, 3]);
    assert.equal(Object.hasOwn(element, "data"), false, "data must not become an own property");

    directive.data = "[4,5]";
    assert.equal(element.getAttribute("data"), "[4,5]", "a string is stored unchanged");

    directive.data = null;
    assert.equal(element.hasAttribute("data"), false);

    directive.label = "Sales";
    directive.min = 0;
    directive.max = "10";
    directive.gradient = ["#f00", "#00f"];
    directive.interactive = "";
    assert.equal(element.getAttribute("label"), "Sales");
    assert.equal(element.getAttribute("min"), "0");
    assert.equal(element.getAttribute("max"), "10");
    assert.equal(element.getAttribute("gradient"), '["#f00","#00f"]');
    assert.equal(element.getAttribute("interactive"), "");

    directive.label = undefined;
    directive.interactive = false;
    assert.equal(element.hasAttribute("label"), false);
    assert.equal(element.hasAttribute("interactive"), false);
    element.remove();
  });

  test("data set on a detached element reaches the chart once it is inserted", async () => {
    // Inside @if or @for, Angular creates the directive before inserting the element.
    // Browsers upgrade it at once (customElements.upgrade); happy-dom does not, so this
    // also covers the fallback: the chart adopts the own property when it connects.
    const element = document.createElement("mini-line-chart");
    const directive = createDirective(element);
    directive.data = [3, 7, 4];
    document.body.append(element);
    await flushMicrotasks();

    assert.equal(element.getAttribute("data"), "[3,7,4]");
    assert.equal(Object.hasOwn(element, "data"), false);
    assert.ok(linePath(element), "the line is drawn");
    element.remove();
  });

  test("declares the 1.4.0 inputs and outputs as decorator metadata, which JIT reads at runtime", () => {
    const definition = /** @type {any} */ (angular.MiniChartDirective).ɵdir;
    assert.deepEqual(Object.keys(definition.inputs).sort(), ["curve", "data", "gradient", "interactive", "label", "max", "min", "points"]);
    assert.deepEqual(Object.keys(definition.outputs).sort(), [
      "progressComplete",
      "sliceSelect",
      "sparklineHover",
      "sparklineLeave",
      "sparklineSelect",
      "zoneChange",
    ]);
    assert.ok(definition.standalone);
  });
});

describe("MiniChartDirective in a JIT template, without CUSTOM_ELEMENTS_SCHEMA", () => {
  test("[data] renders the chart and re-renders it on change", async () => {
    angularErrors.length = 0;
    const fixture = await renderHost({
      imports: [angular.MiniChartDirective],
      template: `<mini-line-chart [data]="values()" [label]="label" curve="smooth" [min]="0" [max]="20" interactive></mini-line-chart>`,
      state: class {
        values = ng.signal([3, 7, 4, 9, 6]);
        label = "Sales";
      },
    });
    const element = chartIn(fixture, "mini-line-chart");

    assert.equal(element.getAttribute("data"), "[3,7,4,9,6]");
    assert.equal(Object.hasOwn(element, "data"), false);
    assert.equal(element.getAttribute("label"), "Sales");
    assert.equal(element.getAttribute("curve"), "smooth");
    assert.equal(element.getAttribute("min"), "0");
    assert.equal(element.getAttribute("max"), "20");
    assert.equal(element.getAttribute("interactive"), "");
    assert.equal(element.shadowRoot?.querySelector("svg")?.getAttribute("aria-label"), "Sales");
    const firstPath = linePath(element);
    assert.ok(firstPath, "the line is drawn");

    fixture.componentInstance.values.set([1, 2]);
    await settle(fixture);
    assert.equal(element.getAttribute("data"), "[1,2]");
    assert.notEqual(linePath(element), firstPath, "the line is redrawn");

    assert.deepEqual(angularErrors, [], "no NG0303/NG0304 template errors");
  });

  test("outputs emit the chart events once each", async () => {
    angularErrors.length = 0;
    const fixture = await renderHost({
      imports: [angular.MiniChartDirective],
      template: `
        <mini-line-chart [data]="[3, 7, 4, 9, 6]" interactive
          (sparklineHover)="log('hover', $event)" (sparklineLeave)="log('leave', $event)"></mini-line-chart>
        <mini-candlestick-chart [data]="[[10, 12, 9, 11]]"
          (sparklineSelect)="log('select', $event)" (sliceSelect)="log('slice', $event)"></mini-candlestick-chart>
        <mini-gauge-chart [data]="gauge()" (zoneChange)="log('zone', $event)"></mini-gauge-chart>
        <mini-progress-chart [data]="[100]" (progressComplete)="log('complete', $event)"></mini-progress-chart>
      `,
      state: class {
        gauge = ng.signal([20]);
        /** @type {[string, Event][]} */
        events = [];
        log(/** @type {string} */ name, /** @type {Event} */ event) {
          this.events.push([name, event]);
        }
      },
    });
    const host = fixture.componentInstance;
    const names = () => host.events.map(([name]) => name);

    // The progress chart reached its maximum on the first render.
    assert.deepEqual(names(), ["complete"]);
    assert.equal(host.events[0][1].type, "progress-complete");

    const line = chartIn(fixture, "mini-line-chart");
    const hovers = dispatchHover(line, { selector: "svg", clientX: 50, clientY: 15 });
    assert.equal(hovers.length, 1, "the chart emitted one sparkline-hover");
    assert.deepEqual(names().slice(1), ["hover"]);
    assert.equal(host.events[1][1], hovers[0], "the output carries the chart's own event");

    line.dispatchEvent(new CustomEvent("sparkline-leave"));
    const candle = chartIn(fixture, "mini-candlestick-chart");
    candle.dispatchEvent(new CustomEvent("sparkline-select", { detail: { index: 0 } }));
    candle.dispatchEvent(new CustomEvent("slice-select", { detail: { index: 0 } }));

    host.gauge.set([90]);
    await settle(fixture);

    assert.deepEqual(names(), ["complete", "hover", "leave", "select", "slice", "zone"]);
    assert.equal(host.events.at(-1)?.[1].type, "zone-change");
    assert.deepEqual(angularErrors, []);
  });
});

describe("AOT-safe recipe: raw elements, CUSTOM_ELEMENTS_SCHEMA and [data]", () => {
  test("[data] on a raw tag sets the element property and renders", async () => {
    // The recipe imports the side-effect entry; here every tag is already registered, which it tolerates.
    await import("../dist/register.js");
    angularErrors.length = 0;
    const fixture = await renderHost({
      schemas: [ng.CUSTOM_ELEMENTS_SCHEMA],
      template: `
        <mini-line-chart [data]="values()" label="Sales"></mini-line-chart>
        <mini-gauge-chart [data]="[42]" [attr.zones]="zones"></mini-gauge-chart>
      `,
      state: class {
        values = ng.signal([3, 7, 4]);
        zones = JSON.stringify([{ upTo: 50, color: "green" }, { upTo: 100, color: "red" }]);
      },
    });
    const line = chartIn(fixture, "mini-line-chart");
    const gauge = chartIn(fixture, "mini-gauge-chart");

    assert.equal(line.getAttribute("data"), "[3,7,4]");
    assert.equal(Object.hasOwn(line, "data"), false);
    assert.ok(linePath(line));
    assert.equal(gauge.getAttribute("data"), "[42]");
    assert.equal(gauge.getAttribute("zones"), '[{"upTo":50,"color":"green"},{"upTo":100,"color":"red"}]');

    fixture.componentInstance.values.set([5, 1]);
    await settle(fixture);
    assert.equal(line.getAttribute("data"), "[5,1]");
    assert.deepEqual(angularErrors, []);
  });
});

describe("documented limitation of the signal-based per-chart directives", () => {
  // README.md and docs/getting-started.md say these directives do not work from
  // node_modules until the dedicated Angular package (1.5). If this test starts
  // failing, the limitation has changed: update those docs and the JSDoc.
  test("JIT sees no inputs or outputs on them", () => {
    for (const directive of angular.SPARKLINE_DIRECTIVES) {
      const definition = /** @type {any} */ (directive).ɵdir;
      const tag = definition.selectors[0][0];
      assert.deepEqual(definition.inputs, {}, `the ${tag} directive unexpectedly has inputs`);
      assert.deepEqual(definition.outputs, {}, `the ${tag} directive unexpectedly has outputs`);
    }
  });
});

describe("signal-based per-chart directives: options that are on by default", () => {
  // JIT cannot bind these directives from the package (see the test above), so
  // each one is created in an injection context and its input signal is set
  // directly, as Angular would set it once the dedicated package ships metadata.
  /** @type {{ directive: string, tag: string, input: string, attribute: string, svgFlag?: string }[]} */
  const flags = [
    { directive: "MiniCandlestickChartDirective", tag: "mini-candlestick-chart", input: "hollowBullish", attribute: "hollow-bullish", svgFlag: "data-hollow-bullish" },
    { directive: "MiniRadialBarChartDirective", tag: "mini-radial-bar-chart", input: "roundCaps", attribute: "round-caps", svgFlag: "data-round-caps" },
    { directive: "MiniComboChartDirective", tag: "mini-combo-chart", input: "sharedDomain", attribute: "shared-domain" },
  ];

  for (const { directive, tag, input, attribute, svgFlag } of flags) {
    test(`[${input}]="false" writes ${attribute}="false", which turns the option off`, async () => {
      const element = /** @type {HTMLElement & { data: unknown }} */ (document.createElement(tag));
      document.body.append(element);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: ng.ElementRef, useValue: new ng.ElementRef(element) }] });
      const instance = TestBed.runInInjectionContext(() => new (/** @type {any} */ (angular)[directive])());
      const node = instance[input][SIGNAL];
      const setInput = (/** @type {unknown} */ value) => {
        node.applyValueToInputSignal(node, node.transformFn(value));
        TestBed.tick();
      };
      element.data = chartFixtures.find((fixture) => fixture.tag === tag)?.data;
      TestBed.tick();
      await flushMicrotasks();

      assert.equal(element.getAttribute(attribute), "", "unbound, the option stays on");
      if (svgFlag) assert.ok(element.shadowRoot?.querySelector("svg")?.hasAttribute(svgFlag));

      setInput(false);
      await flushMicrotasks();
      assert.equal(element.getAttribute(attribute), "false");
      if (svgFlag) assert.equal(element.shadowRoot?.querySelector("svg")?.hasAttribute(svgFlag), false, "the chart ignored the off value");

      setInput("");
      await flushMicrotasks();
      assert.equal(element.getAttribute(attribute), "", "the bare attribute turns it back on");
      element.remove();
    });
  }
});
