// ssr-import.test.js — Ensures package modules can be evaluated without browser globals.

import assert from "node:assert/strict";
import test from "node:test";

test("pure and registration entry points evaluate safely during SSR", async () => {
  const originalHTMLElement = globalThis.HTMLElement;
  const originalRegistry = globalThis.customElements;

  try {
    globalThis.HTMLElement = undefined;
    globalThis.customElements = undefined;

    const library = await import(`../src/index.js?ssr=${Date.now()}`);
    await import(`../src/register.js?ssr=${Date.now()}`);

    assert.equal(typeof library.MiniLineChart, "function");
    assert.equal(typeof library.defineMiniChart, "function");
  } finally {
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.customElements = originalRegistry;
  }
});
