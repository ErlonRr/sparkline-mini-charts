// dom.js — happy-dom realms and DOM helpers for the lifecycle contract suite.

import * as nodeModule from "node:module";
import { Window } from "happy-dom";

const srcUrl = new URL("../../src/", import.meta.url).href;

/** Browser globals the components (and their module evaluation) read from `globalThis`. */
const windowGlobals = [
  "window",
  "document",
  "customElements",
  "HTMLElement",
  "Node",
  "Element",
  "SVGElement",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "PointerEvent",
  "DOMRect",
  "DOMMatrix",
  "MutationObserver",
];

/** Window functions that must keep the window as `this` once copied onto `globalThis`. */
const windowFunctions = ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "queueMicrotask"];

/**
 * Whether this Node.js can load a fresh copy of the component modules per realm.
 * `module.registerHooks()` landed in Node 22.15 and 23.5.
 */
export const canIsolateRealms = typeof nodeModule.registerHooks === "function";

let realmHooksRegistered = false;
let realmCount = 0;

/**
 * Propagates the `?realm=` query of a module to every src/ module it imports.
 * ESM caches modules by URL, so each realm gets its own component classes, and
 * those classes extend the HTMLElement of the realm's window: src/core/mini-chart-element.js
 * reads `globalThis.HTMLElement` once, when it is evaluated.
 */
function registerRealmHooks() {
  if (realmHooksRegistered || !canIsolateRealms) return;
  realmHooksRegistered = true;

  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      const resolved = nextResolve(specifier, context);
      const realm = context.parentURL ? new URL(context.parentURL).searchParams.get("realm") : null;
      if (!realm || !resolved.url.startsWith(srcUrl)) return resolved;

      const url = new URL(resolved.url);
      url.searchParams.set("realm", realm);
      return { ...resolved, url: url.href };
    },
  });
}

/**
 * Copies a window's DOM globals onto `globalThis`.
 *
 * @param {Window} window happy-dom window.
 * @returns {() => void} Restores the previous globals.
 */
function installGlobals(window) {
  /** @type {[string, PropertyDescriptor | undefined][]} */
  const previous = [];
  const install = (/** @type {string} */ name, /** @type {unknown} */ value) => {
    previous.push([name, Object.getOwnPropertyDescriptor(globalThis, name)]);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };

  for (const name of windowGlobals) install(name, Reflect.get(window, name));
  for (const name of windowFunctions) install(name, Reflect.get(window, name).bind(window));

  return () => {
    for (const [name, descriptor] of previous.reverse()) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  };
}

/**
 * Makes upgrades follow the browser order. HTML §4.13.5 queues an
 * `attributeChangedCallback` for every attribute the element already has, and
 * then `connectedCallback`. happy-dom 20 upgrades in place but skips the
 * attribute reactions. They are what make an in-document upgrade render twice
 * in real browsers, so without them check (d) could never fail.
 *
 * happy-dom reads the lifecycle callbacks from the prototype once, inside
 * `define()`. The wrapper is visible during that call only, and the prototype
 * is restored before `define()` returns. It covers elements that are in the
 * document's light DOM when `define()` runs, which is what the checks use.
 *
 * @param {Window} window happy-dom window.
 * @returns {{ replayed: number }} How many upgrades had their attribute reactions replayed.
 */
function replayUpgradeAttributeReactions(window) {
  const stats = { replayed: 0 };
  const registry = window.customElements;
  const define = registry.define.bind(registry);

  registry.define = (name, constructor, options) => {
    const awaitingUpgrade = new WeakSet(window.document.querySelectorAll(name));
    const prototype = constructor.prototype;
    const ownDescriptor = Object.getOwnPropertyDescriptor(prototype, "connectedCallback");
    const connectedCallback = prototype.connectedCallback;
    const observed = new Set(/** @type {string[]} */ (Reflect.get(constructor, "observedAttributes") ?? []));

    Object.defineProperty(prototype, "connectedCallback", {
      configurable: true,
      writable: true,
      value: function (/** @type {unknown[]} */ ...args) {
        if (awaitingUpgrade.has(this)) {
          awaitingUpgrade.delete(this);
          stats.replayed += 1;
          for (const { name: attribute, value } of [...this.attributes]) {
            if (observed.has(attribute)) this.attributeChangedCallback?.(attribute, null, value);
          }
        }
        return connectedCallback?.apply(this, /** @type {[]} */ (args));
      },
    });

    try {
      define(name, constructor, options);
    } finally {
      if (ownDescriptor) Object.defineProperty(prototype, "connectedCallback", ownDescriptor);
      else Reflect.deleteProperty(prototype, "connectedCallback");
    }
  };

  return stats;
}

/**
 * Lists the `[tag, constructor]` pairs that `defineMiniCharts()` registers, without defining them.
 *
 * @param {(registry?: CustomElementRegistry) => void} defineMiniCharts Registration entry point.
 * @returns {Map<string, CustomElementConstructor>} Constructors by tag name, in registration order.
 */
function listComponents(defineMiniCharts) {
  /** @type {Map<string, CustomElementConstructor>} */
  const components = new Map();
  const recorder = {
    get: () => undefined,
    define: (/** @type {string} */ tag, /** @type {CustomElementConstructor} */ component) => {
      components.set(tag, component);
    },
  };

  defineMiniCharts(/** @type {CustomElementRegistry} */ (/** @type {unknown} */ (recorder)));
  return components;
}

/**
 * @typedef {Object} Realm
 * @property {Window} window The realm's happy-dom window.
 * @property {Document} document The realm's document.
 * @property {(registryOrOptions?: CustomElementRegistry | import("../../src/define.js").DefineMiniChartsOptions) => void} defineMiniCharts The realm's copy of src/define.js.
 * @property {Map<string, CustomElementConstructor>} components The realm's chart classes by tag.
 * @property {{ replayed: number }} upgrades Upgrade reactions replayed so far.
 * @property {() => Promise<void>} close Disconnects every element, closes the window and restores the previous globals.
 */

/**
 * Creates a fresh happy-dom window, makes it the global DOM, and loads a
 * private copy of src/define.js and every module it imports. Nothing is
 * defined yet: call `realm.defineMiniCharts()` when the test is ready.
 *
 * @param {string} label Readable realm name, used in module URLs.
 * @returns {Promise<Realm>} The realm.
 */
export async function createRealm(label) {
  registerRealmHooks();

  const window = new Window({ url: "http://localhost/" });
  const restoreGlobals = installGlobals(window);
  const upgrades = replayUpgradeAttributeReactions(window);
  realmCount += 1;

  try {
    const { defineMiniCharts } = await import(`${srcUrl}define.js?realm=${label}-${realmCount}`);

    return {
      window,
      document: /** @type {Document} */ (/** @type {unknown} */ (window.document)),
      defineMiniCharts,
      components: listComponents(defineMiniCharts),
      upgrades,
      async close() {
        window.document.body.replaceChildren();
        await window.happyDOM.close();
        restoreGlobals();
      },
    };
  } catch (error) {
    await window.happyDOM.close();
    restoreGlobals();
    throw error;
  }
}

/**
 * Creates a chart element in the current global document, lets `setup` configure it, then connects it.
 *
 * @param {string} tag Chart tag name.
 * @param {(element: HTMLElement) => void} [setup] Runs before the element is connected.
 * @returns {HTMLElement} The connected element.
 */
export function mount(tag, setup) {
  const element = document.createElement(tag);
  setup?.(element);
  document.body.append(element);
  return element;
}

/** Lets queued microtasks (the components' batched re-renders) run, without running animation frames. */
export async function flushMicrotasks() {
  for (let turn = 0; turn < 3; turn += 1) await Promise.resolve();
}

/**
 * Serializes a chart's rendered shadow tree for comparison: one line per
 * element, attributes sorted, random ids replaced by stable placeholders. The
 * `<style>` sheet is left out because it does not depend on the data.
 *
 * @param {Element} element Chart element.
 * @returns {string[]} The render signature.
 */
export function renderSignature(element) {
  const nodes = [...(element.shadowRoot?.querySelectorAll("*") ?? [])].filter((node) => node.localName !== "style");
  /** @type {Map<string, string>} */
  const ids = new Map();
  for (const node of nodes) {
    const id = node.getAttribute("id");
    if (id && !ids.has(id)) ids.set(id, `id${ids.size + 1}`);
  }

  const normalize = (/** @type {string} */ value) => {
    let normalized = value;
    for (const [id, placeholder] of ids) normalized = normalized.replaceAll(id, placeholder);
    return normalized;
  };

  return nodes.map((node) => {
    const attributes = [...node.attributes].map(({ name, value }) => `${name}="${normalize(value)}"`).sort();
    const text = node.childElementCount === 0 && node.textContent ? ` ${JSON.stringify(node.textContent)}` : "";
    return `<${[node.localName, ...attributes].join(" ")}>${text}`;
  });
}

/**
 * Moves a pointer onto a node of the chart's shadow tree the way a browser
 * does (`pointerover`, then `pointermove`) and collects the `sparkline-hover`
 * events the chart dispatches in response.
 *
 * @param {Element} element Chart element.
 * @param {import("./fixtures.js").HoverTarget} hover Target node and pointer position.
 * @returns {Event[]} The `sparkline-hover` events received on the host.
 */
export function dispatchHover(element, { selector, clientX = 0, clientY = 0 }) {
  const target = element.shadowRoot?.querySelector(selector);
  if (!target) throw new Error(`hover target "${selector}" not found in the shadow root`);

  /** @type {Event[]} */
  const events = [];
  const listener = (/** @type {Event} */ event) => events.push(event);
  element.addEventListener("sparkline-hover", listener);

  try {
    for (const type of ["pointerover", "pointermove"]) {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          composed: true,
          cancelable: true,
          clientX,
          clientY,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
        }),
      );
    }
  } finally {
    element.removeEventListener("sparkline-hover", listener);
  }

  return events;
}

/**
 * happy-dom has no layout, so every box is 0×0. Gives each SVG node the box
 * of its root `<svg>` at the viewBox size, placed at the client origin, and an
 * identity screen CTM. A viewBox unit is then one client pixel.
 *
 * @param {Window} window happy-dom window.
 * @returns {() => void} Restores the original methods.
 */
export function stubSvgLayout(window) {
  const prototype = window.SVGElement.prototype;
  const originals = ["getBoundingClientRect", "getScreenCTM"].map((name) => ({
    name,
    descriptor: Object.getOwnPropertyDescriptor(prototype, name),
  }));

  Object.defineProperty(prototype, "getBoundingClientRect", {
    configurable: true,
    writable: true,
    value: function () {
      const svg = this.ownerSVGElement ?? this;
      const [, , width = 0, height = 0] = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
      return new window.DOMRect(0, 0, width, height);
    },
  });
  Object.defineProperty(prototype, "getScreenCTM", {
    configurable: true,
    writable: true,
    value: () => new window.DOMMatrix(),
  });

  return () => {
    for (const { name, descriptor } of originals) {
      if (descriptor) Object.defineProperty(prototype, name, descriptor);
      else Reflect.deleteProperty(prototype, name);
    }
  };
}

/**
 * Runs `action`, flushes the re-renders it queued, and collects every error
 * it caused: thrown synchronously (happy-dom runs lifecycle callbacks
 * synchronously), reported by happy-dom from a microtask, or caught and
 * logged by an error boundary through `console.error`.
 *
 * @param {Window} window happy-dom window the action runs in.
 * @param {() => unknown} action Code under test.
 * @returns {Promise<unknown[]>} The collected errors.
 */
export async function collectErrors(window, action) {
  /** @type {unknown[]} */
  const errors = [];
  const onError = (/** @type {any} */ event) => errors.push(event.error ?? event.message);
  const consoleError = console.error;
  console.error = (/** @type {unknown[]} */ ...args) => errors.push(args.find((arg) => arg instanceof Error) ?? args[0]);
  window.addEventListener("error", onError);

  try {
    await action();
  } catch (error) {
    errors.push(error);
  } finally {
    await flushMicrotasks();
    window.removeEventListener("error", onError);
    console.error = consoleError;
  }

  return errors;
}
