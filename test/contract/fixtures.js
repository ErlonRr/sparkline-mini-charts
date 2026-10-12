// fixtures.js — Per-tag data fixtures and hover targets for the lifecycle contract suite.

/**
 * @typedef {Object} HoverTarget
 * @property {string} selector Shadow-DOM selector for the node that receives the pointer events.
 * @property {number} [clientX] Pointer x in client pixels (the test stubs a 1:1 viewBox-to-client mapping).
 * @property {number} [clientY] Pointer y in client pixels.
 */

/**
 * @typedef {Object} ChartFixture
 * @property {string} tag Custom Element tag name, as registered by src/define.js.
 * @property {unknown} data Valid, non-empty data that renders at least one data mark.
 * @property {HoverTarget} hover Where a pointer has to be for the chart to emit `sparkline-hover`.
 */

/**
 * One valid fixture per tag. The contract suite fails if a tag registered by
 * src/define.js has no entry here, so a new chart cannot skip the safety net.
 *
 * @type {readonly ChartFixture[]}
 */
export const chartFixtures = Object.freeze([
  {
    tag: "mini-line-chart",
    data: [3, 7, 4, 9, 6],
    hover: { selector: "svg", clientX: 50, clientY: 15 },
  },
  {
    tag: "mini-area-chart",
    data: [10, 20, 15, 25],
    hover: { selector: "svg", clientX: 50, clientY: 15 },
  },
  {
    tag: "mini-stacked-area-chart",
    data: [
      [10, 20, 15],
      [5, 15, 10],
    ],
    hover: { selector: "[data-layer-index]" },
  },
  {
    tag: "mini-stream-chart",
    data: [
      [10, 20, 15],
      [5, 15, 10],
    ],
    hover: { selector: "[data-layer-index]" },
  },
  {
    tag: "mini-bar-chart",
    data: [-2, 7, 4],
    hover: { selector: "rect[data-index]" },
  },
  {
    tag: "mini-gauge-chart",
    data: [75, 0, 100],
    hover: { selector: "svg", clientX: 50, clientY: 25 },
  },
  {
    tag: "mini-progress-chart",
    data: [60],
    hover: { selector: "svg", clientX: 50, clientY: 50 },
  },
  {
    tag: "mini-candlestick-chart",
    data: [
      [10, 15, 8, 12],
      [12, 18, 11, 17],
      [17, 19, 13, 14],
    ],
    hover: { selector: '[part~="candle"][data-index]' },
  },
  {
    tag: "mini-ohlc-chart",
    data: [
      [10, 15, 8, 12],
      [12, 18, 11, 17],
      [17, 19, 13, 14],
    ],
    hover: { selector: '[part~="bar"][data-index]' },
  },
  {
    tag: "mini-combo-chart",
    data: [
      { bar: 10, line: 20 },
      { bar: 15, line: 25 },
      { bar: 12, line: 18 },
    ],
    hover: { selector: "svg", clientX: 50, clientY: 15 },
  },
  {
    tag: "mini-radial-bar-chart",
    data: [80, 60, 40],
    hover: { selector: "[data-track-index]" },
  },
  {
    tag: "mini-pie-chart",
    data: [3, 2, 1],
    hover: { selector: "path[data-index]" },
  },
  {
    tag: "mini-half-pie-chart",
    data: [3, 2, 1],
    hover: { selector: "path[data-index]" },
  },
  {
    tag: "mini-bullet-chart",
    data: { value: 75, target: 85, ranges: [50, 80, 100] },
    hover: { selector: '[part~="measure"]' },
  },
  {
    tag: "mini-win-loss-chart",
    data: [1, -1, 0, 1],
    hover: { selector: '[part~="bar"][data-index]' },
  },
  {
    tag: "mini-range-bar-chart",
    data: [
      [10, 20, 15],
      [5, 25, 18],
    ],
    hover: { selector: '[part~="range-group"][data-index]' },
  },
  {
    tag: "mini-scatter-chart",
    data: [
      [1, 2],
      [2, 5],
      [3, 8],
    ],
    hover: { selector: '[part~="point"][data-index]' },
  },
]);

/**
 * Malformed or loading-state values that every chart must survive (check f).
 * Each one reaches the element as `JSON.stringify(value)` in the `data` attribute.
 *
 * @type {readonly { name: string, value: unknown }[]}
 */
export const invalidData = Object.freeze([
  { name: "null", value: null },
  { name: "[null]", value: [null] },
  { name: "[[1,2],null]", value: [[1, 2], null] },
  { name: '"abc"', value: "abc" },
  { name: "{}", value: {} },
  { name: "42", value: 42 },
]);
