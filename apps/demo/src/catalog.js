// catalog.js — The 24 charts of the demo: category, one-line description, example datasets and random data.
// Options are never listed here: the configurator reads them from each class's `static props`.

/** Chart categories, in gallery order. */
export const CATEGORIES = Object.freeze([
  { id: "trends", name: "Trends over time", blurb: "Ordered series for the shape of a metric." },
  { id: "comparison", name: "Comparison & distribution", blurb: "Signed values, running totals, outcomes, spans, spreads and profiles." },
  { id: "composition", name: "Part-to-whole", blurb: "Shares of a total and concentric goals." },
  { id: "kpi", name: "KPIs & progress", blurb: "One value against a range, a target or zones, and conversion steps." },
  { id: "finance", name: "Financial", blurb: "Open, high, low and close per period." },
]);

// ---------------------------------------------------------------------------
// Random data helpers (pure, no DOM)
// ---------------------------------------------------------------------------

const round = (value, digits = 0) => Number(value.toFixed(digits));
const between = (low, high) => low + Math.random() * (high - low);
const int = (low, high) => Math.round(between(low, high));

/** A random walk of `length` values starting near `start`. */
export function walk(length = 14, start = 40, volatility = 8, floor = 2) {
  const values = [];
  let value = start;
  for (let index = 0; index < length; index++) {
    value = Math.max(floor, value + between(-volatility, volatility * 1.15));
    values.push(round(value, 1));
  }
  return values;
}

/** `layers` series of `length` positive values each. */
export function layers(count = 3, length = 12) {
  return Array.from({ length: count }, () => walk(length, int(10, 40), 6, 1).map((value) => round(value)));
}

/** One OHLC candle following `previous` close. */
export function candle(previous = 100) {
  const open = round(previous + between(-1.5, 1.5), 2);
  const close = round(open + between(-4, 4.4), 2);
  const high = round(Math.max(open, close) + between(0.2, 2.5), 2);
  const low = round(Math.min(open, close) - between(0.2, 2.5), 2);
  return [open, high, low, close];
}

/** `length` consecutive candles. */
export function candles(length = 14, start = 100) {
  const series = [];
  let close = start;
  for (let index = 0; index < length; index++) {
    const next = candle(close);
    series.push(next);
    close = next[3];
  }
  return series;
}

/** `count` random raw samples around `centre`, with a rare far outlier. */
export function samples(count = 24, centre = 50, spread = 12) {
  return Array.from({ length: count }, () => round(centre + (Math.random() + Math.random() + Math.random() - 1.5) * spread + (Math.random() < 0.06 ? spread * 3 : 0), 1));
}

/** A win (1), loss (-1) or tie (0) with a bias towards wins. */
export const outcome = () => {
  const roll = Math.random();
  return roll < 0.62 ? 1 : roll < 0.9 ? -1 : 0;
};

// ---------------------------------------------------------------------------
// The charts
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ChartEntry
 * @property {string} tag Custom element name.
 * @property {string} name Short display name.
 * @property {string} category Category id.
 * @property {string} description One line.
 * @property {string} shape Data shape, as shown in the data editor.
 * @property {string} label Default accessible label.
 * @property {{ name: string, data: unknown }[]} datasets Example datasets; the first one is the default.
 * @property {() => unknown} random Random dataset of the right shape.
 * @property {Record<string, unknown>} [initial] Options the configurator starts with.
 * @property {Record<string, string>} [examples] Example JSON for `json` options.
 */

/** @type {readonly ChartEntry[]} */
export const CHARTS = Object.freeze([
  {
    tag: "mini-line-chart",
    name: "Line",
    category: "trends",
    description: "The classic sparkline: one line through an ordered series, with optional markers.",
    shape: "number[]",
    label: "Weekly revenue",
    datasets: [
      { name: "Revenue", data: [18, 23, 20, 31, 27, 38, 35, 44, 41, 52] },
      { name: "Downtrend", data: [64, 60, 61, 52, 55, 47, 41, 43, 36, 30] },
      { name: "Flat with spike", data: [20, 21, 20, 22, 21, 48, 22, 21, 20, 21] },
    ],
    random: () => walk(16),
    initial: { interactive: true, curve: "smooth" },
  },
  {
    tag: "mini-area-chart",
    name: "Area",
    category: "trends",
    description: "A line with a filled, optionally gradient area underneath for volume-like metrics.",
    shape: "number[]",
    label: "Weekly active users",
    datasets: [
      { name: "Active users", data: [12, 18, 15, 27, 24, 34, 31, 40, 38, 46] },
      { name: "Seasonal", data: [30, 42, 51, 44, 30, 22, 28, 41, 53, 47, 33, 25] },
    ],
    random: () => walk(16, 30, 6),
    initial: { interactive: true, curve: "smooth" },
  },
  {
    tag: "mini-stacked-area-chart",
    name: "Stacked area",
    category: "trends",
    description: "Several layers stacked on top of each other to show a total and its parts.",
    shape: "number[][] (one array per layer)",
    label: "Traffic by channel",
    datasets: [
      { name: "Channels", data: [[10, 14, 18, 16, 22, 26, 24, 30], [8, 9, 12, 14, 13, 16, 19, 18], [4, 6, 5, 8, 9, 8, 11, 13]] },
      { name: "Two layers", data: [[30, 28, 35, 40, 38, 45], [10, 14, 12, 18, 20, 19]] },
    ],
    random: () => layers(3, 10),
    initial: { interactive: true, curve: "smooth" },
  },
  {
    tag: "mini-stream-chart",
    name: "Stream",
    category: "trends",
    description: "A ThemeRiver: layers flowing around a centre line, for organic volume over time.",
    shape: "number[][] (one array per layer)",
    label: "Listening by genre",
    datasets: [
      { name: "Genres", data: [[4, 8, 14, 18, 12, 8, 6, 9, 12], [10, 12, 9, 7, 9, 14, 18, 15, 10], [2, 4, 8, 12, 16, 12, 8, 6, 4], [6, 5, 4, 6, 8, 10, 9, 12, 14]] },
      { name: "Calm", data: [[10, 11, 12, 11, 10, 11], [8, 8, 9, 10, 9, 8], [5, 6, 6, 5, 6, 7]] },
    ],
    random: () => layers(4, 10),
    initial: { interactive: true },
  },
  {
    tag: "mini-combo-chart",
    name: "Combo",
    category: "trends",
    description: "Bars and a line on one axis, e.g. actual sales against a target.",
    shape: "{ bar: number, line: number }[]",
    label: "Sales vs target",
    datasets: [
      { name: "Sales vs target", data: [{ bar: 10, line: 12 }, { bar: 15, line: 14 }, { bar: 8, line: 15 }, { bar: 22, line: 18 }, { bar: 19, line: 20 }, { bar: 26, line: 22 }] },
      { name: "Diverging", data: [{ bar: 30, line: 10 }, { bar: 24, line: 16 }, { bar: 18, line: 22 }, { bar: 12, line: 28 }] },
    ],
    random: () => walk(8, 20, 6).map((bar, index, all) => ({ bar: Math.round(bar), line: Math.round((all[index - 1] ?? bar) * 0.9 + 3) })),
    initial: { interactive: true, curve: "smooth" },
  },
  {
    tag: "mini-heatmap-chart",
    name: "Heatmap",
    category: "trends",
    description: "Cells whose color follows the value: a matrix, or a contribution-style activity calendar.",
    shape: "number[] or number[][] (one array per row)",
    label: "Daily commits, last 12 weeks",
    datasets: [
      { name: "Activity calendar", data: [0, 2, 4, 1, 3, 0, 0, 1, 5, 6, 2, 4, 1, 0, 3, 4, 7, 5, 2, 0, 1, 2, 6, 8, 4, 3, 1, 0, 0, 3, 5, 9, 6, 2, 1, 4, 2, 7, 5, 3, 0, 0, 1, 4, 6, 8, 7, 2, 1, 3, 5, 9, 4, 6, 0, 1, 2, 6, 3, 7, 5, 1, 0, 4, 8, 6, 9, 7, 3, 2, 1, 5, 7, 4, 8, 6, 0, 0, 3, 6, 9, 8, 5, 2] },
      { name: "Hour × weekday", data: [[1, 2, 5, 8, 9, 7, 4, 2], [2, 3, 6, 9, 9, 8, 5, 2], [1, 3, 5, 8, 8, 7, 4, 1], [2, 4, 7, 9, 8, 6, 3, 1], [1, 2, 4, 6, 5, 4, 2, 1]] },
    ],
    random: () => Array.from({ length: 84 }, () => (Math.random() < 0.15 ? 0 : int(1, 9))),
    initial: { interactive: true, tooltip: true, layout: "calendar" },
  },
  {
    tag: "mini-bar-chart",
    name: "Bar",
    category: "comparison",
    description: "Columns growing from a baseline; negative values point down in their own color.",
    shape: "number[]",
    label: "Monthly net variance",
    datasets: [
      { name: "Net variance", data: [-12, 8, 19, -5, 13, 21, -3, 16] },
      { name: "All positive", data: [12, 19, 15, 24, 18, 28, 22, 31] },
    ],
    random: () => Array.from({ length: 12 }, () => int(-15, 30)),
    initial: { interactive: true, radius: 1 },
  },
  {
    tag: "mini-win-loss-chart",
    name: "Win / loss",
    category: "comparison",
    description: "A Tufte binary strip: only the sign counts — wins up, losses down, ties flat.",
    shape: "number[] (sign only: 1, 0, -1)",
    label: "Build history",
    datasets: [
      { name: "Builds", data: [1, 1, -1, 1, 0, 1, -1, 1, 1, 1, -1, 1] },
      { name: "Uptime", data: [1, 1, 1, 1, 1, -1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1] },
    ],
    random: () => Array.from({ length: 16 }, outcome),
    initial: { interactive: true },
  },
  {
    tag: "mini-range-bar-chart",
    name: "Range bar",
    category: "comparison",
    description: "Floating bars from a low to a high value, with an optional current marker.",
    shape: "[low, high, current?][]",
    label: "Daily temperature range",
    datasets: [
      { name: "Temperatures", data: [[12, 21, 18], [14, 24, 20], [11, 19, 15], [15, 27, 25], [16, 29, 22], [13, 22, 19]] },
      { name: "Without current", data: [[20, 45], [30, 60], [25, 52], [40, 80]] },
    ],
    random: () => Array.from({ length: 8 }, () => {
      const low = int(5, 30);
      const high = low + int(6, 30);
      return [low, high, int(low, high)];
    }),
    initial: { interactive: true, radius: 2 },
  },
  {
    tag: "mini-scatter-chart",
    name: "Scatter",
    category: "comparison",
    description: "Points on two axes, with an optional least-squares trend line.",
    shape: "[x, y, r?][] or { x, y, r? }[]",
    label: "Latency vs throughput",
    datasets: [
      { name: "Correlated", data: [[10, 25], [18, 42], [28, 30], [35, 65], [44, 52], [58, 80], [65, 74], [78, 90]] },
      { name: "Bubbles", data: [[10, 20, 2], [25, 35, 5], [40, 30, 3], [60, 70, 6], [80, 55, 4]] },
    ],
    random: () => Array.from({ length: 14 }, () => {
      const x = int(0, 100);
      return [x, Math.max(0, Math.round(x * 0.7 + between(-18, 18)))];
    }),
    initial: { interactive: true, trendLine: true },
  },
  {
    tag: "mini-waterfall-chart",
    name: "Waterfall",
    category: "comparison",
    description: "Floating bars that step a running total up and down, with optional total bars.",
    shape: "(number | { value, label?, total? })[]",
    label: "Profit and loss bridge",
    datasets: [
      { name: "P&L bridge", data: [{ value: 120, label: "Revenue" }, { value: -46, label: "Cost of sales" }, { value: -28, label: "Operating costs" }, { value: 14, label: "Other income" }, { value: -12, label: "Tax" }, { total: true, label: "Net profit" }] },
      { name: "Monthly cash", data: [30, -12, 18, -8, 22, -15, 9, { total: true }] },
    ],
    random: () => [int(20, 40), ...Array.from({ length: 6 }, () => int(-20, 25)), { total: true }],
    initial: { interactive: true, tooltip: true },
  },
  {
    tag: "mini-box-plot-chart",
    name: "Box plot",
    category: "comparison",
    description: "A distribution at a glance: quartile box, median, whiskers and outliers.",
    shape: "number[] (samples), a summary object, or one of those per box",
    label: "Response time distribution",
    datasets: [
      { name: "Response times", data: [212, 198, 240, 225, 260, 205, 231, 219, 248, 236, 201, 222, 245, 228, 214, 318, 233, 209, 251, 226] },
      { name: "Three regions", data: [[42, 48, 51, 46, 58, 62, 55, 49, 53, 47], [61, 66, 72, 58, 75, 69, 64, 71, 98], { min: 30, q1: 38, median: 44, q3: 52, max: 60, outliers: [78] }] },
    ],
    random: () => [samples(24, 50, 12), samples(24, 62, 10), samples(24, 44, 16)],
    initial: { interactive: true, tooltip: true },
  },
  {
    tag: "mini-radar-chart",
    name: "Radar",
    category: "comparison",
    description: "A spider chart: one or more profiles over radial axes, e.g. skills or product scores.",
    shape: "number[] or number[][] (one array per series)",
    label: "Product scores",
    datasets: [
      { name: "Two products", data: [[8, 6, 9, 5, 7, 6], [5, 8, 6, 8, 5, 7]] },
      { name: "One profile", data: [4, 3, 5, 2, 4] },
    ],
    random: () => Array.from({ length: int(1, 2) }, () => Array.from({ length: 6 }, () => int(2, 10))),
    initial: { interactive: true, tooltip: true, points: true },
  },
  {
    tag: "mini-pie-chart",
    name: "Pie",
    category: "composition",
    description: "A full circle split into slices, or a donut with a hole.",
    shape: "number[]",
    label: "Traffic sources",
    datasets: [
      { name: "Sources", data: [42, 27, 18, 13] },
      { name: "Two-way split", data: [64, 36] },
    ],
    random: () => Array.from({ length: int(3, 6) }, () => int(5, 40)),
    initial: { interactive: true, donut: 0.6 },
  },
  {
    tag: "mini-half-pie-chart",
    name: "Half pie",
    category: "composition",
    description: "A 180° semicircle of slices: compact shares for headers and cards.",
    shape: "number[]",
    label: "Plan adoption",
    datasets: [
      { name: "Plans", data: [58, 25, 17] },
      { name: "Five tiers", data: [30, 25, 20, 15, 10] },
    ],
    random: () => Array.from({ length: int(2, 5) }, () => int(5, 40)),
    initial: { interactive: true, donut: 0.55 },
  },
  {
    tag: "mini-radial-bar-chart",
    name: "Radial bar",
    category: "composition",
    description: "Concentric rings, each filled to its value — activity goals at a glance.",
    shape: "number[] or { value, color? }[]",
    label: "Daily goals",
    datasets: [
      { name: "Goals", data: [75, 55, 90] },
      { name: "Custom colors", data: [{ value: 85, color: "#f43f5e" }, { value: 62, color: "#84cc16" }, { value: 40, color: "#0ea5e9" }] },
    ],
    random: () => Array.from({ length: int(2, 4) }, () => int(15, 100)),
    initial: { interactive: true },
  },
  {
    tag: "mini-stacked-bar-chart",
    name: "Stacked bar",
    category: "composition",
    description: "One bar split into segments: the breakdown of a total such as disk usage or a budget.",
    shape: "(number | { value, label?, color? })[]",
    label: "Storage breakdown",
    datasets: [
      { name: "Storage", data: [{ value: 412, label: "Media" }, { value: 186, label: "Apps" }, { value: 94, label: "System" }, { value: 50, label: "Other" }] },
      { name: "Budget", data: [45, 30, 15, 10] },
    ],
    random: () => Array.from({ length: int(3, 5) }, () => int(5, 40)),
    initial: { interactive: true, tooltip: true, radius: 2 },
  },
  {
    tag: "mini-treemap-chart",
    name: "Treemap",
    category: "composition",
    description: "Tiles with areas proportional to their values, packed close to squares.",
    shape: "(number | { value, label?, color? })[]",
    label: "Traffic by source",
    datasets: [
      { name: "Sources", data: [{ value: 42, label: "Search" }, { value: 18, label: "Social" }, { value: 12, label: "Email" }, { value: 8, label: "Referral" }, { value: 5, label: "Ads" }, { value: 3, label: "Other" }] },
      { name: "Plain", data: [30, 25, 20, 12, 8, 5] },
    ],
    random: () => Array.from({ length: int(4, 8) }, () => int(2, 40)),
    initial: { interactive: true, tooltip: true },
  },
  {
    tag: "mini-progress-chart",
    name: "Progress",
    category: "kpi",
    description: "A semicircular meter that fills up to one value between a min and a max.",
    shape: "[value]",
    label: "Storage used",
    datasets: [
      { name: "78%", data: [78] },
      { name: "Almost full", data: [96] },
    ],
    random: () => [int(5, 100)],
    initial: { showValue: true, unit: "%" },
  },
  {
    tag: "mini-gauge-chart",
    name: "Gauge",
    category: "kpi",
    description: "A speedometer: a needle on a dial split into coloured zones.",
    shape: "[value, min?, max?]",
    label: "Server load",
    datasets: [
      { name: "65 / 100", data: [65] },
      { name: "Custom range", data: [142, 0, 200] },
    ],
    random: () => [int(0, 100)],
    initial: { interactive: true },
    examples: { zones: '[{"upTo": 60, "color": "#10b981"}, {"upTo": 85, "color": "#f59e0b"}, {"upTo": 100, "color": "#ef4444"}]' },
  },
  {
    tag: "mini-bullet-chart",
    name: "Bullet",
    category: "kpi",
    description: "Stephen Few's bullet graph: a measure, a target and qualitative bands.",
    shape: "[value, target?, ...ranges] or { value, target?, ranges? }",
    label: "Revenue vs target",
    datasets: [
      { name: "Object", data: { value: 78, target: 85, ranges: [50, 80, 100] } },
      { name: "Array", data: [62, 70, 40, 75, 100] },
    ],
    random: () => ({ value: int(30, 95), target: int(60, 95), ranges: [50, 80, 100] }),
    initial: { interactive: true },
    examples: { ranges: "[40, 75, 100]" },
  },
  {
    tag: "mini-funnel-chart",
    name: "Funnel",
    category: "kpi",
    description: "Conversion steps as centred bars joined by trapezoids that show each drop.",
    shape: "(number | { value, label? })[]",
    label: "Sign-up funnel",
    datasets: [
      { name: "Sign-up funnel", data: [{ value: 12400, label: "Visits" }, { value: 5200, label: "Sign-ups" }, { value: 2300, label: "Trials" }, { value: 860, label: "Purchases" }] },
      { name: "Sales pipeline", data: [480, 300, 160, 90, 40] },
    ],
    random: () => {
      let value = int(800, 1200);
      return Array.from({ length: int(3, 5) }, () => (value = Math.round(value * between(0.35, 0.8))));
    },
    initial: { interactive: true, tooltip: true },
  },
  {
    tag: "mini-candlestick-chart",
    name: "Candlestick",
    category: "finance",
    description: "Financial candles: a body from open to close and wicks to the high and low.",
    shape: "[open, high, low, close][]",
    label: "Share price",
    datasets: [
      { name: "Rally", data: [[100, 105, 98, 103], [103, 108, 100, 107], [107, 110, 104, 106], [106, 112, 105, 110], [110, 114, 108, 112], [112, 118, 110, 117], [117, 120, 114, 115], [115, 122, 113, 120]] },
      { name: "Random", data: candles(16) },
    ],
    random: () => candles(16),
    initial: { interactive: true },
  },
  {
    tag: "mini-ohlc-chart",
    name: "OHLC",
    category: "finance",
    description: "The tick-bar variant of candles: a vertical range with open and close ticks.",
    shape: "[open, high, low, close][]",
    label: "Asset price",
    datasets: [
      { name: "Rally", data: [[100, 105, 98, 103], [103, 108, 100, 107], [107, 110, 104, 106], [106, 112, 105, 110], [110, 114, 108, 112], [112, 118, 110, 117], [117, 120, 114, 115], [115, 122, 113, 120]] },
      { name: "Random", data: candles(16) },
    ],
    random: () => candles(16),
    initial: { interactive: true },
  },
]);

/** @type {ReadonlyMap<string, ChartEntry>} */
export const CHARTS_BY_TAG = new Map(CHARTS.map((entry) => [entry.tag, entry]));

/**
 * Checks parsed data against the chart's shape. Only the outer shape is checked:
 * the charts themselves skip entries they cannot draw.
 *
 * @param {string} tag Chart tag.
 * @param {unknown} data Parsed JSON.
 * @returns {string | null} A problem, or `null` when the data can be drawn.
 */
export function dataProblem(tag, data) {
  if (tag === "mini-bullet-chart") {
    if (typeof data === "number" || Array.isArray(data) || (data && typeof data === "object")) return null;
    return "Expected an array, an object or a number.";
  }
  if (tag === "mini-box-plot-chart" && data && typeof data === "object" && !Array.isArray(data)) return null;
  if (!Array.isArray(data)) return "Expected a JSON array.";
  const entry = CHARTS_BY_TAG.get(tag);
  if (!entry) return null;
  if (entry.shape.startsWith("number[][]") && data.some((layer) => !Array.isArray(layer))) {
    return "Expected one array per layer, e.g. [[1, 2], [3, 4]].";
  }
  if (entry.shape.startsWith("[open") && data.some((row) => !Array.isArray(row) && (typeof row !== "object" || row === null))) {
    return "Expected one [open, high, low, close] entry per candle.";
  }
  return null;
}

/**
 * Counts what the data holds, for the editor's status line.
 *
 * @param {unknown} data Parsed JSON.
 * @returns {string}
 */
export function describeData(data) {
  if (Array.isArray(data)) {
    if (data.length > 0 && data.every(Array.isArray) && data.every((row) => row.length > 4)) {
      return `${data.length} layers × ${data[0].length} values`;
    }
    return `${data.length} ${data.length === 1 ? "entry" : "entries"}`;
  }
  return typeof data === "object" ? "1 object" : "1 value";
}
