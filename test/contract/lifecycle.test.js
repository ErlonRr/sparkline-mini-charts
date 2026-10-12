// lifecycle.test.js — Lifecycle contract checks (a)-(g) for every tag registered by src/define.js.
//
// Each check runs once per tag. Pairs that fail on the current code are listed
// in `knownFailures` and reported as TODO until the backlog item that fixes
// them removes their entry. Run with LIFECYCLE_STRICT=1 to ignore the table
// and see the real status of every pair.

import assert from "node:assert/strict";
import { after, afterEach, describe, test } from "node:test";
import {
  canIsolateRealms,
  collectErrors,
  createRealm,
  dispatchHover,
  flushMicrotasks,
  mount,
  renderSignature,
  stubSvgLayout,
} from "./dom.js";
import { chartFixtures, invalidData } from "./fixtures.js";

/** Charts whose hover picks the nearest x from the pointer position. */
const nearestXTags = ["mini-line-chart", "mini-area-chart", "mini-combo-chart"];

/**
 * Tag/check pairs that fail today, with the backlog item that fixes them. The
 * first entry that lists a tag wins, and `"*"` matches every tag. Delete an
 * entry, or a whole check, when the fix lands.
 *
 * @type {Record<string, { reason: string, tags: readonly string[] | "*" }[]>}
 */
const knownFailures = {
  d: [{ reason: "fixed by P1-2", tags: "*" }],
  e: [
    { reason: "nearest-x hover: TODO until browser mode (P2)", tags: nearestXTags },
    { reason: "fixed by P1-1", tags: "*" },
  ],
};

const strict = process.env.LIFECYCLE_STRICT === "1";

/**
 * @param {string} check Check letter.
 * @param {string} tag Chart tag name.
 * @returns {string | false} The TODO reason, or false when the pair must pass.
 */
function todo(check, tag) {
  if (strict) return false;
  return knownFailures[check]?.find((entry) => entry.tags === "*" || entry.tags.includes(tag))?.reason ?? false;
}

const isolationSkip = !canIsolateRealms && "needs module.registerHooks() (Node.js 22.15 or newer)";

const main = await createRealm("main");
main.defineMiniCharts();
const restoreLayout = stubSvgLayout(main.window);

after(async () => {
  restoreLayout();
  await main.close();
});

afterEach(() => {
  main.document.body.replaceChildren();
});

const tags = [...main.components.keys()];
const fixtures = new Map(chartFixtures.map((fixture) => [fixture.tag, fixture]));

/**
 * @param {string} tag Chart tag name.
 * @returns {import("./fixtures.js").ChartFixture} The tag's fixture.
 */
function fixtureFor(tag) {
  const fixture = fixtures.get(tag);
  if (!fixture) throw new Error(`test/contract/fixtures.js has no fixture for <${tag}>`);
  return fixture;
}

/**
 * Asserts that `assign` renders the fixture exactly like `setAttribute("data", JSON)`,
 * both before the element connects and as an update after it rendered empty.
 *
 * @param {string} tag Chart tag name.
 * @param {(element: any, data: unknown) => void} assign Sets the data under test.
 */
async function assertRendersLikeAttribute(tag, assign) {
  const { data } = fixtureFor(tag);
  const json = JSON.stringify(data);

  const viaProperty = mount(tag, (element) => assign(element, data));
  const viaAttribute = mount(tag, (element) => element.setAttribute("data", json));
  await flushMicrotasks();
  assert.deepEqual(renderSignature(viaProperty), renderSignature(viaAttribute), "first render differs");

  const updatedViaProperty = mount(tag);
  const updatedViaAttribute = mount(tag);
  await flushMicrotasks();
  assign(updatedViaProperty, data);
  updatedViaAttribute.setAttribute("data", json);
  await flushMicrotasks();
  assert.deepEqual(renderSignature(updatedViaProperty), renderSignature(updatedViaAttribute), "update differs");
}

/**
 * Wraps a prototype method to count its calls.
 *
 * @param {object} prototype Prototype that owns or inherits the method.
 * @param {string} name Method name.
 * @returns {{ count: number }} The live call count.
 */
function countCalls(prototype, name) {
  const calls = { count: 0 };
  const method = Reflect.get(prototype, name);
  Object.defineProperty(prototype, name, {
    configurable: true,
    writable: true,
    value: function (/** @type {unknown[]} */ ...args) {
      calls.count += 1;
      return method.apply(this, args);
    },
  });
  return calls;
}

/**
 * @param {unknown} error Collected error.
 * @returns {string} One-line description.
 */
function describeError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

describe("contract fixtures", () => {
  test("cover exactly the tags registered by src/define.js", () => {
    assert.deepEqual(chartFixtures.map((fixture) => fixture.tag).sort(), [...tags].sort());
  });

  for (const tag of tags) {
    test(`<${tag}> renders its fixture through the data attribute`, async () => {
      const empty = mount(tag);
      const filled = mount(tag, (element) => element.setAttribute("data", JSON.stringify(fixtureFor(tag).data)));
      await flushMicrotasks();
      assert.notDeepEqual(renderSignature(filled), renderSignature(empty));
    });
  }

  for (const tag of tags) {
    test(`<${tag}> emits sparkline-hover from its hover target`, async () => {
      const { data, hover } = fixtureFor(tag);
      const element = mount(tag, (chart) => {
        chart.setAttribute("interactive", "");
        chart.setAttribute("data", JSON.stringify(data));
      });
      await flushMicrotasks();
      assert.ok(dispatchHover(element, hover).length > 0, "no sparkline-hover event");
    });
  }
});

describe("(a) el.data = value renders like setAttribute('data', JSON)", () => {
  for (const tag of tags) {
    test(`<${tag}>`, { todo: todo("a", tag) }, async () => {
      await assertRendersLikeAttribute(tag, (element, data) => {
        element.data = data;
      });
    });
  }
});

describe("(b) el.data = JSON string renders like setAttribute('data', JSON)", () => {
  for (const tag of tags) {
    test(`<${tag}>`, { todo: todo("b", tag) }, async () => {
      await assertRendersLikeAttribute(tag, (element, data) => {
        element.data = JSON.stringify(data);
      });
    });
  }
});

describe("(c) el.data set before define survives the upgrade", () => {
  for (const tag of tags) {
    test(`<${tag}>`, { todo: todo("c", tag), skip: isolationSkip }, async () => {
      const { data } = fixtureFor(tag);
      const realm = await createRealm(`c-${tag}`);

      try {
        // Both elements wait in the document for the definition, so they share the same upgrade path.
        const viaProperty = /** @type {any} */ (realm.document.createElement(tag));
        const viaAttribute = realm.document.createElement(tag);
        viaProperty.data = data;
        viaAttribute.setAttribute("data", JSON.stringify(data));
        realm.document.body.append(viaProperty, viaAttribute);
        realm.defineMiniCharts();
        await flushMicrotasks();
        assert.deepEqual(renderSignature(viaProperty), renderSignature(viaAttribute), "upgrade render differs");

        viaProperty.data = [];
        viaAttribute.setAttribute("data", "[]");
        await flushMicrotasks();
        assert.deepEqual(
          renderSignature(viaProperty),
          renderSignature(viaAttribute),
          "el.data = [] after the upgrade did not render like the attribute: an own property set before define shadows the accessor",
        );
      } finally {
        await realm.close();
      }
    });
  }
});

describe("(d) upgrading an element already in the document renders once", () => {
  for (const tag of tags) {
    test(`<${tag}>`, { todo: todo("d", tag), skip: isolationSkip }, async () => {
      const { data } = fixtureFor(tag);
      const realm = await createRealm(`d-${tag}`);

      try {
        const element = realm.document.createElement(tag);
        element.setAttribute("data", JSON.stringify(data));
        realm.document.body.append(element);
        const component = /** @type {CustomElementConstructor} */ (realm.components.get(tag));
        const renders = countCalls(component.prototype, "render");
        realm.defineMiniCharts();
        await flushMicrotasks();

        assert.equal(realm.upgrades.replayed, 1, "harness: the upgrade attribute reactions were not replayed");
        assert.equal(renders.count, 1);
      } finally {
        await realm.close();
      }
    });
  }
});

describe("(e) hover still emits sparkline-hover after disconnect and reconnect", () => {
  for (const tag of tags) {
    test(`<${tag}>`, { todo: todo("e", tag) }, async () => {
      const { data, hover } = fixtureFor(tag);
      const element = mount(tag, (chart) => {
        chart.setAttribute("interactive", "");
        chart.setAttribute("data", JSON.stringify(data));
      });
      await flushMicrotasks();
      assert.ok(dispatchHover(element, hover).length > 0, "no sparkline-hover before the move");

      element.remove();
      main.document.body.append(element);
      await flushMicrotasks();
      assert.ok(dispatchHover(element, hover).length > 0, "no sparkline-hover after reconnecting");
    });
  }
});

describe("(f) invalid data does not throw", () => {
  for (const tag of tags) {
    test(`<${tag}>`, { todo: todo("f", tag) }, async () => {
      const fixtureJson = JSON.stringify(fixtureFor(tag).data);
      /** @type {string[]} */
      const failures = [];

      for (const { name, value } of invalidData) {
        const json = JSON.stringify(value);
        const firstRender = await collectErrors(main.window, () => {
          mount(tag, (element) => element.setAttribute("data", json));
        });
        const update = await collectErrors(main.window, async () => {
          const element = mount(tag, (chart) => chart.setAttribute("data", fixtureJson));
          await flushMicrotasks();
          element.setAttribute("data", json);
        });
        try {
          main.document.body.replaceChildren();
        } catch {
          // A chart that failed mid-render may also fail to disconnect; the render error is what counts.
        }

        if (firstRender.length > 0) failures.push(`${name} on first render: ${describeError(firstRender[0])}`);
        if (update.length > 0) failures.push(`${name} on update: ${describeError(update[0])}`);
      }

      assert.deepEqual(failures, []);
    });
  }
});

describe("(g) no chart prototype owns a data descriptor", () => {
  for (const tag of tags) {
    test(`<${tag}>`, { todo: todo("g", tag) }, () => {
      const component = /** @type {CustomElementConstructor} */ (main.components.get(tag));
      assert.equal(Object.getOwnPropertyDescriptor(component.prototype, "data"), undefined);
    });
  }
});

// Locally an older Node.js only skips checks (c) and (d); on CI it must fail the run instead.
test("CI runs a Node.js that can isolate realms", { skip: !process.env.CI && "not on CI" }, () => {
  assert.ok(canIsolateRealms, `checks (c) and (d) ${isolationSkip}; CI runs Node.js ${process.versions.node}`);
});
