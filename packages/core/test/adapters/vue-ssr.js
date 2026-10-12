// vue-ssr.js — Server-renders the built Vue wrappers in a process without DOM globals, like Nuxt SSR.

// Run as a child process by package-vue.test.js; prints `{ html, warnings }` as JSON.

/** @type {string[]} */
const warnings = [];
console.warn = (/** @type {unknown[]} */ ...args) => warnings.push(args.map(String).join(" "));
console.error = console.warn;

const { createSSRApp, h } = await import("vue");
const { renderToString } = await import("@vue/server-renderer");
const { MiniGaugeChart, MiniLineChart, MiniRadialBarChart, MiniStackedAreaChart } = await import("../../dist/vue.js");

const app = createSSRApp({
  render: () =>
    h("main", [
      h(MiniLineChart, { data: [1, 2, 3], class: "spark", curve: "smooth" }),
      h(MiniStackedAreaChart, { data: [[1, 2], [3, 4]], normalize: true }),
      h(MiniStackedAreaChart, { data: [[1, 2], [3, 4]], normalize: false }),
      h(MiniGaugeChart, { data: [75], zones: [{ upTo: 50, color: "green" }], showValue: false }),
      h(MiniRadialBarChart, { data: [30], roundCaps: false }),
    ]),
});

process.stdout.write(JSON.stringify({ html: await renderToString(app), warnings }));
