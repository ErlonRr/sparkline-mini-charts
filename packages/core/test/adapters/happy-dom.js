// happy-dom.js — Installs a happy-dom window as the global DOM for the framework adapter tests.

import { Window } from "happy-dom";

/** Node.js has its own versions of these; DOM nodes need the window's. */
const replacedGlobals = ["Event", "CustomEvent"];

/** Window values and methods the frameworks and the charts read from `globalThis`. */
const windowValues = ["window", "document", "customElements", "location", "history", "navigator"];
const windowMethods = ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "matchMedia", "getSelection"];

/**
 * Creates a happy-dom window and copies its DOM onto `globalThis`: every DOM
 * class Node.js lacks (HTMLElement, SVGElement, PointerEvent…), plus the
 * window values and methods above. Call it before importing a framework or a
 * dist/ entry: react-dom checks for a DOM when it is evaluated, and the chart
 * classes extend the `HTMLElement` they find at that moment.
 *
 * @returns {{ window: Window, close: () => Promise<void> }} The window, and a function that closes it.
 */
export function installHappyDom() {
  const window = new Window({ url: "http://localhost/" });
  const define = (/** @type {string} */ name, /** @type {unknown} */ value) =>
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });

  for (const name of Object.getOwnPropertyNames(window)) {
    if (/^[A-Z]/.test(name) && !(name in globalThis)) define(name, Reflect.get(window, name));
  }
  for (const name of replacedGlobals) define(name, Reflect.get(window, name));
  for (const name of windowValues) define(name, Reflect.get(window, name));
  for (const name of windowMethods) define(name, Reflect.get(window, name).bind(window));

  return {
    window,
    async close() {
      window.document.body.replaceChildren();
      await window.happyDOM.close();
    },
  };
}
