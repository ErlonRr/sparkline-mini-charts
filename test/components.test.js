// components.test.js — Lightweight DOM integration tests for all registered chart elements.

import assert from "node:assert/strict";
import test from "node:test";

class TestNode {
  attributes = new Map();
  children = [];
  dataset = {};
  style = { setProperty: () => {} };
  textContent = "";

  constructor(name) {
    this.name = name;
  }

  querySelector(selector) {
    if (selector === "title") return this.children.find(n => n.name === "title") ?? null;
    if (selector.startsWith('[part="')) {
      const part = selector.match(/\[part="(.*)"\]/)[1];
      const findNode = (nodes) => {
        for (const n of nodes) {
          if (n.getAttribute("part") === part) return n;
          const found = findNode(n.children || []);
          if (found) return found;
        }
        return null;
      };
      return findNode(this.children);
    }
    if (selector === "mask circle") {
        const defs = this.children.find(n => n.name === "defs");
        const mask = defs?.children.find(n => n.name === "mask");
        return mask?.children.find(n => n.name === "circle") ?? null;
    }
    return null;
  }

  querySelectorAll(selector) {
    if (selector.startsWith('[part="')) {
      const part = selector.match(/\[part="(.*)"\]/)[1];
      const results = [];
      const findNodes = (nodes) => {
        for (const n of nodes) {
          if (n.getAttribute("part") === part) results.push(n);
          findNodes(n.children || []);
        }
      };
      findNodes(this.children);
      return results;
    }
    if (selector === '[part]') {
      const results = [];
      const findNodes = (nodes) => {
        for (const n of nodes) {
          if (n.getAttribute("part")) results.push(n);
          findNodes(n.children || []);
        }
      };
      findNodes(this.children);
      return results;
    }
    return [];
  }

  getBoundingClientRect() {
    return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0 };
  }

  append(...nodes) {
    for (const node of nodes) {
        node.parentNode = this;
        this.children.push(node);
    }
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  removeChild(node) {
    this.children = this.children.filter(n => n !== node);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }
}

class TestElement {
  #attributes = new Map();

  constructor() {
    this.isConnected = false;
  }

  attachShadow() {
    this.shadowRoot = {
      children: [],
      replaceChildren: (...nodes) => {
        this.shadowRoot.children = nodes;
      },
      querySelector: (selector) => {
        if (selector === "style") return this.shadowRoot.children.find(n => n.name === "style") ?? null;
        if (selector === "svg") return this.shadowRoot.children.find(n => n.name === "svg") ?? null;
        return null;
      }
    };
    return this.shadowRoot;
  }

  setAttribute(name, value) {
    const previous = this.#attributes.get(name) ?? null;
    this.#attributes.set(name, String(value));
    this.attributeChangedCallback?.(name, previous, String(value));
  }

  getAttribute(name) {
    return this.#attributes.get(name) ?? null;
  }
}

class TestCustomElementRegistry {
  definitions = new Map();

  define(name, constructor) {
    this.definitions.set(name, constructor);
  }

  get(name) {
    return this.definitions.get(name);
  }
}

globalThis.HTMLElement = TestElement;
globalThis.customElements = new TestCustomElementRegistry();
globalThis.document = {
  createElement: (name) => new TestNode(name),
  createElementNS: (_namespace, name) => new TestNode(name),
};

const charts = await import("../src/index.js");

function renderChart(Component, data) {
  const chart = new Component();
  chart.setAttribute("data", JSON.stringify(data));
  chart.isConnected = true;
  chart.connectedCallback();
  return chart.shadowRoot.children[1];
}

test("root entry point is side-effect free", () => {
  assert.equal(globalThis.customElements.definitions.size, 0);
});

test("registration entry point defines every chart element exactly once", async () => {
  await import("../src/register.js");
  const { defineMiniCharts } = await import("../src/define.js");
  defineMiniCharts();

  assert.deepEqual([...globalThis.customElements.definitions.keys()], [
    "mini-line-chart",
    "mini-area-chart",
    "mini-stacked-area-chart",
    "mini-stream-chart",
    "mini-bar-chart",
    "mini-gauge-chart",
    "mini-progress-chart",
    "mini-candlestick-chart",
    "mini-ohlc-chart",
    "mini-combo-chart",
    "mini-radial-bar-chart",
    "mini-pie-chart",
    "mini-half-pie-chart",
  ]);
});

test("line and bar elements append their expected SVG shapes", () => {
  const lineSvg = renderChart(charts.MiniLineChart, [2, 7, 4]);
  const barSvg = renderChart(charts.MiniBarChart, [-2, 7]);

  assert.equal(lineSvg.getAttribute("viewBox"), "0 0 100 30");
  assert.equal(lineSvg.querySelector('[part="line"]').name, "path");
  assert.equal(barSvg.querySelectorAll('[part="bar"]').length, 2);
});

test("pie and half-pie elements use their natural radial viewBoxes", () => {
  const pieSvg = renderChart(charts.MiniPieChart, [3, 2, 1]);
  const halfPieSvg = renderChart(charts.MiniHalfPieChart, [3, 2, 1]);

  assert.equal(pieSvg.getAttribute("viewBox"), "0 0 100 100");
  assert.equal(halfPieSvg.getAttribute("viewBox"), "0 0 100 50");
  assert.equal(pieSvg.querySelector('[part="group"]').children.filter((node) => node.name === "path").length, 3);
  assert.equal(halfPieSvg.querySelector('[part="group"]').children.filter((node) => node.name === "path").length, 3);
});
