// transitions.test.js — State events, entrance animations and listener lifetime across re-renders and moves.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import { ENTRANCE_STAGGER_MS, entranceDelay, pointerToViewBoxX } from "../../src/core/svg.js";
import { createRealm, dispatchHover, flushMicrotasks, mount, stubSvgLayout } from "./dom.js";
import { chartFixtures } from "./fixtures.js";

const main = await createRealm("transitions");
main.defineMiniCharts();
const restoreLayout = stubSvgLayout(main.window);

after(async () => {
  restoreLayout();
  await main.close();
});

afterEach(() => {
  main.document.body.replaceChildren();
});

/**
 * Counts the events of one type that reach the host.
 *
 * @param {Element} element Chart element.
 * @param {string} type Event type.
 * @returns {{ count: number, details: unknown[] }} The live count and the event details.
 */
function recordEvents(element, type) {
  const record = { count: 0, details: /** @type {unknown[]} */ ([]) };
  element.addEventListener(type, (event) => {
    record.count += 1;
    record.details.push(/** @type {CustomEvent} */ (event).detail);
  });
  return record;
}

/**
 * Sets one attribute and lets the batched re-render run.
 *
 * @param {Element} element Chart element.
 * @param {string} name Attribute name.
 * @param {string} value Attribute value.
 */
async function setAttribute(element, name, value) {
  element.setAttribute(name, value);
  await flushMicrotasks();
}

/** Runs the pending animation frames (and timers) of the realm. */
async function runFrames() {
  await main.window.happyDOM.waitUntilComplete();
}

/**
 * Lists the control-point y values of every `cubic-bezier()` in a CSS text.
 *
 * @param {string} css CSS text.
 * @returns {number[]} The y1 and y2 values.
 */
function bezierYs(css) {
  return [...css.matchAll(/cubic-bezier\(([^)]*)\)/g)].flatMap((match) => {
    const [, y1, , y2] = match[1].split(",").map(Number);
    return [y1, y2];
  });
}

describe("progress-complete fires on transitions only", () => {
  test("50 → 100 → 150 → 50 → 100 dispatches two events", async () => {
    const element = mount("mini-progress-chart", (chart) => chart.setAttribute("data", "[50]"));
    const complete = recordEvents(element, "progress-complete");
    await flushMicrotasks();

    // 150 stays complete (clamped to max): without the transition guard it would fire a third time.
    for (const value of [100, 150, 50, 100]) await setAttribute(element, "data", `[${value}]`);

    assert.equal(complete.count, 2);
    assert.deepEqual(complete.details, [
      { value: 100, max: 100 },
      { value: 100, max: 100 },
    ]);
  });

  test("re-renders of a complete value, moves and repeated values dispatch nothing", async () => {
    const element = mount("mini-progress-chart", (chart) => chart.setAttribute("data", "[100]"));
    await flushMicrotasks();
    const complete = recordEvents(element, "progress-complete");

    await setAttribute(element, "label", "Upload");
    await setAttribute(element, "unit", "%");
    await setAttribute(element, "show-value", "");
    await setAttribute(element, "gradient", "");
    await setAttribute(element, "interactive", "");
    await setAttribute(element, "min", "10");
    await setAttribute(element, "data", "[100]");
    await setAttribute(element, "data", "[150]");
    element.remove();
    main.document.body.append(element);
    await flushMicrotasks();

    assert.equal(complete.count, 0);
  });

  test("a lower max that completes the value in place dispatches nothing", async () => {
    const element = mount("mini-progress-chart", (chart) => {
      chart.setAttribute("data", "[50]");
      chart.setAttribute("max", "200");
    });
    await flushMicrotasks();
    const complete = recordEvents(element, "progress-complete");

    await setAttribute(element, "max", "50");
    assert.equal(complete.count, 0, "a change of max alone is not a transition of the value");

    await setAttribute(element, "max", "200");
    await setAttribute(element, "data", "[200]");
    assert.equal(complete.count, 1, "the value reaching max still dispatches");
  });

  test("a value that starts complete dispatches once", async () => {
    const element = /** @type {HTMLElement} */ (main.document.createElement("mini-progress-chart"));
    element.setAttribute("data", "[100]");
    const complete = recordEvents(element, "progress-complete");
    main.document.body.append(element);
    await flushMicrotasks();

    assert.equal(complete.count, 1);
  });
});

describe("zone-change fires on transitions only", () => {
  test("the value crossing zones dispatches one event per crossing", async () => {
    const element = mount("mini-gauge-chart", (chart) => chart.setAttribute("data", "[50, 0, 100]"));
    const zoneChange = recordEvents(element, "zone-change");
    await flushMicrotasks();
    assert.equal(zoneChange.count, 0, "the first reading is not a transition");

    for (const value of [90, 50, 60, 90]) await setAttribute(element, "data", `[${value}, 0, 100]`);

    assert.deepEqual(
      zoneChange.details.map((detail) => /** @type {{ zoneIndex: number }} */ (detail).zoneIndex),
      [2, 1, 2],
    );
  });

  test("re-renders from other attributes and moves dispatch nothing", async () => {
    const element = mount("mini-gauge-chart", (chart) => chart.setAttribute("data", "[50, 0, 100]"));
    await flushMicrotasks();
    const zoneChange = recordEvents(element, "zone-change");

    await setAttribute(element, "label", "CPU");
    await setAttribute(element, "needle-type", "line");
    await setAttribute(element, "interactive", "");
    await setAttribute(element, "gradient", "");
    await setAttribute(element, "zones", JSON.stringify([{ upTo: 40, color: "green" }, { upTo: 100, color: "red" }]));
    await setAttribute(element, "data", "[50, 0, 100]");
    element.remove();
    main.document.body.append(element);
    await flushMicrotasks();

    assert.equal(zoneChange.count, 0);
  });

  test("a range change that unclamps an out-of-range value dispatches nothing", async () => {
    const element = mount("mini-gauge-chart", (chart) => {
      chart.setAttribute("data", "[150]");
      chart.setAttribute("max", "100");
    });
    await flushMicrotasks();
    const zoneChange = recordEvents(element, "zone-change");

    await setAttribute(element, "max", "300");
    assert.equal(zoneChange.count, 0, "the value did not move, only the dial did");
  });
});

describe("entrance animations", () => {
  test("the progress arc animates from empty to the value", async () => {
    const element = mount("mini-progress-chart", (chart) => chart.setAttribute("data", "[60]"));
    await flushMicrotasks();
    const arc = /** @type {SVGPathElement} */ (element.shadowRoot?.querySelector('[part="value"]'));

    assert.equal(arc.style.strokeDashoffset, "100", "the arc does not start empty");
    assert.equal(arc.style.transition, "none");

    await runFrames();
    assert.equal(arc.style.strokeDashoffset, "40");
    assert.match(arc.style.transition, /stroke-dashoffset/);
  });

  test("the progress entrance restarts when data arrives before it played", async () => {
    const element = mount("mini-progress-chart");
    await flushMicrotasks();
    await setAttribute(element, "data", "[60]");
    const arc = /** @type {SVGPathElement} */ (element.shadowRoot?.querySelector('[part="value"]'));

    assert.equal(arc.style.strokeDashoffset, "100", "the arc jumped to the value");
    await runFrames();
    assert.equal(arc.style.strokeDashoffset, "40");
  });

  test("the progress arc easing does not overshoot", async () => {
    const element = mount("mini-progress-chart", (chart) => chart.setAttribute("data", "[100]"));
    await runFrames();
    const arc = /** @type {SVGPathElement} */ (element.shadowRoot?.querySelector('[part="value"]'));
    const sheet = element.shadowRoot?.querySelector("style")?.textContent ?? "";
    const rule = sheet.match(/\[part="value"\] \{[^}]*\}/)?.[0] ?? "";
    const ys = bezierYs(`${rule}\n${arc.style.transition}`);

    assert.ok(ys.length > 0, "no cubic-bezier easing found");
    for (const y of ys) assert.ok(y >= 0 && y <= 1, `easing control point y=${y} overshoots`);
  });

  test("bars grow in when the first values arrive after an empty render", async () => {
    const element = mount("mini-bar-chart");
    await flushMicrotasks();
    await setAttribute(element, "data", "[1, 2, 3]");
    const bars = /** @type {SVGRectElement[]} */ ([...(element.shadowRoot?.querySelectorAll("rect") ?? [])]);

    assert.equal(bars.length, 3);
    for (const bar of bars) assert.match(bar.style.transition, /^all 0\.4s/, "the bar did not play its entrance");

    await setAttribute(element, "data", "[3, 2, 1]");
    for (const bar of bars) assert.equal(bar.style.transition, "", "an update replayed the entrance");
  });
});

/**
 * Lists the timing of every transition in a `transition` shorthand.
 *
 * @param {string} transition Inline `transition` value.
 * @returns {{ duration: number, delay: number }[]} Duration and delay of each item, in milliseconds.
 */
function transitionTimings(transition) {
  // Split on commas outside parentheses, so cubic-bezier() arguments stay together.
  return transition.split(/,(?![^(]*\))/).map((item) => {
    const [duration = 0, delay = 0] = [...item.matchAll(/(\d*\.?\d+)(ms|s)\b/g)].map(([, value, unit]) =>
      unit === "s" ? Number(value) * 1000 : Number(value),
    );
    return { duration, delay };
  });
}

/**
 * Collects the timing of the inline transitions a chart set for its entrance.
 * Range-bar markers fade in a fixed 200 ms after their bar, so they are left out.
 *
 * @param {Element} element Chart element.
 * @returns {{ duration: number, delay: number }[]} Every transition item on a shadow node.
 */
function entranceTimings(element) {
  return [...(element.shadowRoot?.querySelectorAll(':not([part~="marker"])') ?? [])]
    .map((node) => /** @type {SVGElement} */ (node).style?.transition ?? "")
    .filter((transition) => transition !== "" && transition !== "none")
    .flatMap(transitionTimings);
}

/** 365 daily values for every chart that staggers its entrance. */
const yearOfData = /** @type {Record<string, unknown[]>} */ ({
  "mini-bar-chart": Array.from({ length: 365 }, (_, i) => (i % 7) - 3),
  "mini-candlestick-chart": Array.from({ length: 365 }, (_, i) => [10 + (i % 5), 16 + (i % 5), 8, 12 + (i % 3)]),
  "mini-ohlc-chart": Array.from({ length: 365 }, (_, i) => [10 + (i % 5), 16 + (i % 5), 8, 12 + (i % 3)]),
  "mini-combo-chart": Array.from({ length: 365 }, (_, i) => ({ bar: (i % 9) + 1, line: (i % 4) + 2 })),
  "mini-range-bar-chart": Array.from({ length: 365 }, (_, i) => [i % 10, (i % 10) + 5, (i % 10) + 2]),
  "mini-scatter-chart": Array.from({ length: 365 }, (_, i) => [i, (i * 7) % 13]),
  "mini-win-loss-chart": Array.from({ length: 365 }, (_, i) => (i % 3) - 1),
  "mini-radial-bar-chart": Array.from({ length: 365 }, (_, i) => (i % 90) + 5),
});

describe("entrance stagger has a capped total", () => {
  test("delays keep their step for few marks and spread over 300 ms for many", () => {
    assert.equal(ENTRANCE_STAGGER_MS, 300);
    assert.deepEqual([0, 1, 2].map((i) => entranceDelay(i, 3, 30)), [0, 30, 60]);
    assert.equal(entranceDelay(364, 365, 30), 300);
    assert.deepEqual([0, 1, 2, 3].map((i) => entranceDelay(i, 4, 100)), [0, 100, 200, 300], "a stagger that fits keeps its step");
    assert.deepEqual([0, 1, 2, 3, 4].map((i) => entranceDelay(i, 5, 100)), [0, 75, 150, 225, 300]);
    assert.equal(entranceDelay(0, 1, 30), 0);
    assert.equal(entranceDelay(0, 0, 30), 0);
  });

  test("365 bars finish their entrance within 700 ms", async () => {
    const element = mount("mini-bar-chart", (chart) => chart.setAttribute("data", JSON.stringify(yearOfData["mini-bar-chart"])));
    await flushMicrotasks();
    const timings = entranceTimings(element);

    assert.equal(timings.length, 365, "not every bar played its entrance");
    const end = Math.max(...timings.map(({ duration, delay }) => duration + delay));
    assert.ok(end <= 700, `the last bar finishes after ${end} ms`);
  });

  test("365 range bars finish their entrance, markers included, within 700 ms", async () => {
    const element = mount("mini-range-bar-chart", (chart) => chart.setAttribute("data", JSON.stringify(yearOfData["mini-range-bar-chart"])));
    await flushMicrotasks();
    const timings = [...(element.shadowRoot?.querySelectorAll('[part~="marker"]') ?? [])]
      .map((node) => /** @type {SVGElement} */ (node).style.transition)
      .filter((transition) => transition !== "" && transition !== "none")
      .flatMap(transitionTimings);

    assert.equal(timings.length, 365, "not every marker played its entrance");
    const end = Math.max(...timings.map(({ duration, delay }) => duration + delay));
    assert.ok(end <= 700, `the last marker finishes after ${end} ms`);
  });

  for (const [tag, data] of Object.entries(yearOfData)) {
    test(`<${tag}> spreads 365 entrance delays over at most ${ENTRANCE_STAGGER_MS} ms`, async () => {
      const element = mount(tag, (chart) => chart.setAttribute("data", JSON.stringify(data)));
      await flushMicrotasks();
      const timings = entranceTimings(element);

      assert.ok(timings.length >= 365, "the chart did not stagger its entrance");
      const last = Math.max(...timings.map(({ delay }) => delay));
      assert.ok(last <= ENTRANCE_STAGGER_MS, `the last mark starts after ${last} ms`);
    });
  }

  for (const tag of ["mini-pie-chart", "mini-half-pie-chart"]) {
    test(`<${tag}> reveals its slices when the first values arrive after an empty render`, async () => {
      const element = mount(tag);
      await flushMicrotasks();
      const mask = /** @type {SVGCircleElement} */ (element.shadowRoot?.querySelector("mask circle"));
      assert.notEqual(mask.style.strokeDashoffset, "0", "the empty render used up the reveal");

      await setAttribute(element, "data", "[3, 2, 1]");
      assert.equal(mask.style.strokeDashoffset, "0", "the slices did not play their reveal");
    });
  }
});

describe("pointer to index through the screen CTM", () => {
  /** Host 400×100 px (4:1) around a 100×30 viewBox: "meet" scales by 10/3 and centers it 100/3 px from the left. */
  const scale = 10 / 3;
  const offsetX = 100 / 3;

  test("pointerToViewBoxX uses the inverse CTM, then the rect, then gives up", () => {
    const rect = { left: 0, top: 0, width: 400, height: 100 };
    const ctm = new main.window.DOMMatrix([scale, 0, 0, scale, offsetX, 0]);
    const svg = /** @type {any} */ ({ getScreenCTM: () => ctm, getBoundingClientRect: () => rect });
    assert.ok(Math.abs(/** @type {number} */ (pointerToViewBoxX(svg, { clientX: offsetX + scale * 20, clientY: 50 }, 100)) - 20) < 1e-9);

    const singular = /** @type {any} */ ({ getScreenCTM: () => new main.window.DOMMatrix([0, 0, 0, 0, 0, 0]), getBoundingClientRect: () => rect });
    assert.equal(pointerToViewBoxX(singular, { clientX: 100, clientY: 50 }, 100), 25);

    const detached = /** @type {any} */ ({ getScreenCTM: () => null, getBoundingClientRect: () => ({ left: 0, width: 0 }) });
    assert.equal(pointerToViewBoxX(detached, { clientX: 100, clientY: 50 }, 100), null);
  });

  for (const [tag, data] of /** @type {const} */ ([
    ["mini-line-chart", Array.from({ length: 50 }, (_, i) => (i * 7) % 11)],
    ["mini-area-chart", Array.from({ length: 50 }, (_, i) => (i * 7) % 11)],
    ["mini-combo-chart", Array.from({ length: 50 }, (_, i) => ({ bar: (i % 5) + 1, line: (i % 3) + 1 }))],
  ])) {
    test(`<${tag}> puts the crosshair under the cursor on a 4:1 host`, async () => {
      const element = mount(tag, (chart) => {
        chart.setAttribute("interactive", "");
        chart.setAttribute("data", JSON.stringify(data));
      });
      await flushMicrotasks();
      const svg = /** @type {any} */ (element.shadowRoot?.querySelector("svg"));
      svg.getBoundingClientRect = () => new main.window.DOMRect(0, 0, 400, 100);
      svg.getScreenCTM = () => new main.window.DOMMatrix([scale, 0, 0, scale, offsetX, 0]);

      // viewBox x = 20; the rect math would read 25, about two points to the right.
      const events = dispatchHover(element, { selector: "svg", clientX: offsetX + scale * 20, clientY: 50 });
      assert.ok(events.length > 0, "no sparkline-hover");
      const crosshairX = Number(element.shadowRoot?.querySelector('[part="crosshair"]')?.getAttribute("x1"));
      assert.ok(Math.abs(crosshairX - 20) <= 1.1, `the crosshair is at x=${crosshairX}, not under the cursor at x=20`);
    });
  }
});

describe("interaction listeners survive moves", () => {
  for (const { tag, data, hover } of chartFixtures) {
    test(`<${tag}> emits the same events after repeated moves`, async () => {
      const element = mount(tag, (chart) => {
        chart.setAttribute("interactive", "");
        chart.setAttribute("data", JSON.stringify(data));
      });
      await flushMicrotasks();
      const leave = recordEvents(element, "sparkline-leave");
      const before = dispatchHover(element, hover).length;
      assert.ok(before > 0, "no sparkline-hover before the moves");

      for (let move = 0; move < 3; move += 1) {
        element.remove();
        main.document.body.append(element);
        await flushMicrotasks();
      }

      assert.equal(dispatchHover(element, hover).length, before, "listeners were lost or attached twice");
      element.shadowRoot?.querySelector("svg")?.dispatchEvent(new PointerEvent("pointerleave", { pointerId: 1 }));
      assert.equal(leave.count, 1, "no single sparkline-leave after the moves");
    });
  }
});
