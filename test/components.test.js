// components.test.js — Lightweight DOM integration tests for all registered chart elements.

import assert from "node:assert/strict";
import test from "node:test";

class TestNode {
  attributes = new Map();
  children = [];
  dataset = {};
  style = {
    setProperty: () => {},
    removeProperty: () => {},
  };
  textContent = "";

  constructor(name) {
    this.name = name;
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  closest(selector) {
    if (selector.startsWith('[part~="') || selector.startsWith('[part="')) {
      const part = selector.match(/\[part[~=]*"([^"]+)"\]/)?.[1];
      if (part && this.getAttribute("part")?.includes(part)) return this;
    }
    return null;
  }

  querySelector(selector) {
    if (selector === "title") return this.children.find(n => n.name === "title") ?? null;
    if (selector === "defs") return this.children.find(n => n.name === "defs") ?? null;
    if (selector === "defs linearGradient" || selector === "linearGradient") {
      const defs = this.children.find(n => n.name === "defs");
      return defs?.children.find(n => n.name === "linearGradient") ?? null;
    }
    if (selector.startsWith('[part="') || selector.startsWith('[part~="')) {
      const part = selector.match(/\[part[~=]*"([^"]+)"\]/)?.[1];
      const findNode = (nodes) => {
        for (const n of nodes) {
          if (n.getAttribute("part")?.split(/\s+/).includes(part)) return n;
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
    if (selector.startsWith('[part="') || selector.startsWith('[part~="')) {
      const part = selector.match(/\[part[~=]*"([^"]+)"\]/)?.[1];
      const results = [];
      const findNodes = (nodes) => {
        for (const n of nodes) {
          if (n.getAttribute("part")?.split(/\s+/).includes(part)) results.push(n);
          findNodes(n.children || []);
        }
      };
      findNodes(this.children);
      return results;
    }
    if (selector === 'rect') {
      const results = [];
      const findNodes = (nodes) => {
        for (const n of nodes) {
          if (n.name === "rect") results.push(n);
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

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
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
  style = {
    setProperty: () => {},
    removeProperty: () => {},
  };

  constructor() {
    this.isConnected = false;
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }

  hasAttribute(name) {
    return this.#attributes.has(name);
  }

  removeAttribute(name) {
    this.#attributes.delete(name);
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
    "mini-bullet-chart",
    "mini-win-loss-chart",
    "mini-range-bar-chart",
    "mini-scatter-chart",
  ]);
});

test("line and bar elements append their expected SVG shapes", () => {
  const lineSvg = renderChart(charts.MiniLineChart, [2, 7, 4]);
  const barSvg = renderChart(charts.MiniBarChart, [-2, 7]);

  assert.equal(lineSvg.getAttribute("viewBox"), "0 0 100 30");
  assert.equal(lineSvg.querySelector('[part="line"]').name, "path");
  assert.equal(barSvg.querySelectorAll('[part="bar"]').length, 2);
});

test("pie and half-pie elements use their natural radial viewBoxes and support donut inner-radius", () => {
  const pieSvg = renderChart(charts.MiniPieChart, [3, 2, 1]);
  const halfPieSvg = renderChart(charts.MiniHalfPieChart, [3, 2, 1]);

  assert.equal(pieSvg.getAttribute("viewBox"), "0 0 100 100");
  assert.equal(halfPieSvg.getAttribute("viewBox"), "0 0 100 50");
  assert.equal(pieSvg.querySelector('[part="group"]').children.filter((node) => node.name === "path").length, 3);
  assert.equal(halfPieSvg.querySelector('[part="group"]').children.filter((node) => node.name === "path").length, 3);
});

test("area, stacked-area and stream elements construct multi-layer and gradient paths", () => {
  const areaSvg = renderChart(charts.MiniAreaChart, [10, 20, 15]);
  const stackedSvg = renderChart(charts.MiniStackedAreaChart, [[10, 20], [5, 15]]);
  const streamSvg = renderChart(charts.MiniStreamChart, [[10, 20], [5, 15]]);

  assert.equal(areaSvg.getAttribute("viewBox"), "0 0 100 30");
  assert.ok(areaSvg.querySelector('[part="area"]'));
  assert.equal(stackedSvg.querySelectorAll('[part~="layer"]').length, 2);
  assert.equal(streamSvg.querySelectorAll('[part~="layer"]').length, 2);
});

test("gauge and progress elements support semantic roles and values", () => {
  const gaugeSvg = renderChart(charts.MiniGaugeChart, [75, 0, 100]);
  const progressSvg = renderChart(charts.MiniProgressChart, [60]);

  assert.equal(gaugeSvg.getAttribute("role"), "meter");
  assert.equal(gaugeSvg.getAttribute("aria-valuenow"), "75");
  assert.equal(progressSvg.getAttribute("role"), "meter");
  assert.equal(progressSvg.getAttribute("aria-valuenow"), "60");
});

test("candlestick and ohlc elements render 2D financial data", () => {
  const candleSvg = renderChart(charts.MiniCandlestickChart, [
    [10, 15, 8, 12],
    [12, 18, 11, 17],
  ]);
  const ohlcSvg = renderChart(charts.MiniOhlcChart, [
    [10, 15, 8, 12],
    [12, 18, 11, 17],
  ]);

  assert.equal(candleSvg.querySelectorAll('[part~="candle"]').length, 2);
  assert.equal(ohlcSvg.querySelectorAll('[part~="bar"]').length, 2);
});

test("combo and radial-bar elements render complex layered and concentric structures", () => {
  const comboSvg = renderChart(charts.MiniComboChart, [
    { bar: 10, line: 20 },
    { bar: 15, line: 25 },
  ]);
  const radialSvg = renderChart(charts.MiniRadialBarChart, [80, 60, 40]);

  assert.equal(comboSvg.querySelectorAll('[part="bar"]').length, 2);
  assert.ok(comboSvg.querySelector('[part="line"]'));
  assert.equal(radialSvg.querySelectorAll('[part="track"]').length, 3);
});

test("bullet, win-loss, range-bar and scatter elements construct their specific SVG shapes", () => {
  const bulletSvg = renderChart(charts.MiniBulletChart, { value: 75, target: 85, ranges: [50, 80, 100] });
  const winLossSvg = renderChart(charts.MiniWinLossChart, [1, -1, 0, 1]);
  const rangeBarSvg = renderChart(charts.MiniRangeBarChart, [[10, 20, 15], [5, 25, 18]]);
  const scatterSvg = renderChart(charts.MiniScatterChart, [[1, 2], [2, 5], [3, 8]]);

  assert.equal(bulletSvg.getAttribute("role"), "meter");
  assert.ok(bulletSvg.querySelector('[part="measure"]'));
  assert.ok(bulletSvg.querySelector('[part="target"]'));
  assert.equal(winLossSvg.querySelectorAll('[part~="bar"]').length, 4);
  assert.equal(rangeBarSvg.querySelectorAll('[part~="range-bar"]').length, 2);
  assert.equal(scatterSvg.querySelectorAll('[part~="point"]').length, 3);
});

test("chart components gracefully clean up on disconnection", () => {
  const chart = new charts.MiniLineChart();
  chart.setAttribute("data", "[1, 2, 3]");
  chart.isConnected = true;
  chart.connectedCallback();
  
  // Trigger cleanup on disconnect
  chart.isConnected = false;
  chart.disconnectedCallback();
  assert.ok(true);
});

test("gauge, progress, radial-bar, and bullet support custom gradients and interactive attributes", () => {
  const gauge = new charts.MiniGaugeChart();
  gauge.setAttribute("data", "[80]");
  gauge.setAttribute("gradient", "true");
  gauge.setAttribute("interactive", "");
  gauge.isConnected = true;
  gauge.connectedCallback();
  const gaugeSvg = gauge.shadowRoot.children.find(c => c.name === "svg");
  assert.ok(gaugeSvg?.querySelector("defs linearGradient"));

  const progress = new charts.MiniProgressChart();
  progress.setAttribute("data", "[45]");
  progress.setAttribute("gradient", "true");
  progress.setAttribute("interactive", "");
  progress.isConnected = true;
  progress.connectedCallback();
  const progressSvg = progress.shadowRoot.children.find(c => c.name === "svg");
  assert.ok(progressSvg?.querySelector("defs linearGradient"));

  const bullet = new charts.MiniBulletChart();
  bullet.setAttribute("data", JSON.stringify({ value: 60, target: 80 }));
  bullet.setAttribute("gradient", "true");
  bullet.setAttribute("interactive", "");
  bullet.isConnected = true;
  bullet.connectedCallback();
  const bulletSvg = bullet.shadowRoot.children.find(c => c.name === "svg");
  assert.ok(bulletSvg?.querySelector("defs linearGradient"));

  const radial = new charts.MiniRadialBarChart();
  radial.setAttribute("data", "[90, 70, 50]");
  radial.setAttribute("gradient", "true");
  radial.setAttribute("interactive", "");
  radial.isConnected = true;
  radial.connectedCallback();
  const radialSvg = radial.shadowRoot.children.find(c => c.name === "svg");
  assert.ok(radialSvg?.querySelector("defs linearGradient"));
});

test("framework entry points export specialized wrappers for React, Vue, and Angular", async () => {
  const reactAdapters = await import("../dist/react.js");
  const vueAdapters = await import("../dist/vue.js");
  const angularAdapters = await import("../dist/angular.js");

  // React tests
  assert.equal(typeof reactAdapters.MiniLineChart, "object");
  assert.equal(typeof reactAdapters.MiniGaugeChart, "object");
  assert.equal(typeof reactAdapters.MiniBulletChart, "object");
  assert.equal(typeof reactAdapters.MiniProgressChart, "object");

  // Vue tests
  assert.equal(typeof vueAdapters.MiniLineChart, "object");
  assert.equal(typeof vueAdapters.MiniGaugeChart, "object");
  assert.equal(typeof vueAdapters.MiniBulletChart, "object");
  assert.equal(typeof vueAdapters.MiniProgressChart, "object");

  // Angular Signal Directives tests
  assert.equal(typeof angularAdapters.MiniLineChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniGaugeChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniBulletChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniProgressChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniRadialBarChartDirective, "function");
  assert.equal(typeof angularAdapters.MiniChartDirective, "function");
  assert.equal(angularAdapters.SPARKLINE_DIRECTIVES.length, 17);
});
