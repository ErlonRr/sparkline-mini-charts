// react-ssr.js — Server-renders the built React wrappers in a process without DOM globals, like Next.js SSR.

// Run as a child process by react-suite.js; prints `{ version, html, errors }` as JSON.
// With `--import ./react-18.js`, `react` and `react-dom` resolve to React 18.3.

/** @type {string[]} */
const errors = [];
console.error = (/** @type {unknown[]} */ ...args) => errors.push(args.map(String).join(" "));

const { createElement, version } = await import("react");
const { renderToString } = await import("react-dom/server");
const { MiniLineChart, MiniRadialBarChart, MiniStackedAreaChart } = await import("../../dist/react.js");

const html = renderToString(
  createElement(
    "main",
    null,
    createElement(MiniLineChart, {
      data: [1, 2, 3],
      className: "spark",
      // Custom properties are valid React styles; CSSProperties does not list them.
      style: /** @type {import("react").CSSProperties} */ ({ "--mini-chart-color": "#ff0000" }),
      curve: "smooth",
      onSparklineHover: () => {},
    }),
    createElement(MiniRadialBarChart, { data: [30], roundCaps: false }),
    createElement(MiniStackedAreaChart, { data: [[1, 2], [3, 4]], normalize: true }),
  ),
);

process.stdout.write(JSON.stringify({ version, html, errors }));
