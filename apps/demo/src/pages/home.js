// home.js — Value proposition, install command and the charts in real contexts: KPI cards, a data table, dashboard tiles.

import { CHARTS } from "../catalog.js";
import { INSTALL } from "../snippets.js";
import { chart, h, installBox } from "../ui.js";

const link = (tag) => `#/charts/${tag}`;

/** A KPI card: title, value, delta and a chart; the whole card links to the chart's configurator. */
function kpiCard({ title, value, delta, up, tag, chartElement }) {
  return h(
    "article",
    { class: "card kpi" },
    h("h3", { class: "kpi-title" }, h("a", { class: "stretched", href: link(tag) }, title)),
    h("p", { class: "kpi-value" }, value, h("span", { class: `delta ${up ? "up" : "down"}`, text: delta })),
    h("div", { class: "kpi-chart" }, chartElement),
  );
}

function kpis() {
  return h(
    "div",
    { class: "kpi-grid" },
    kpiCard({
      title: "Revenue",
      value: "$48.2k",
      delta: "▲ 12.4%",
      up: true,
      tag: "mini-line-chart",
      chartElement: chart("mini-line-chart", [21, 24, 22, 27, 26, 31, 29, 35, 38, 36, 42, 48], {
        class: "chart-fill",
        curve: "smooth",
        "trend-color": "auto",
        label: "Revenue, last 12 weeks, up 12.4%",
      }),
    }),
    kpiCard({
      title: "Active users",
      value: "12,904",
      delta: "▲ 4.1%",
      up: true,
      tag: "mini-area-chart",
      chartElement: chart("mini-area-chart", [8, 9, 8.5, 10, 11, 10.2, 11.8, 12.5, 12.1, 12.9], {
        class: "chart-fill",
        curve: "smooth",
        label: "Active users, last 10 days",
      }),
    }),
    kpiCard({
      title: "Conversion goal",
      value: "68%",
      delta: "▼ 2.0%",
      up: false,
      tag: "mini-bullet-chart",
      chartElement: chart("mini-bullet-chart", { value: 68, target: 75, ranges: [40, 70, 100] }, {
        class: "chart-fill",
        label: "Conversion 68% against a 75% target",
      }),
    }),
    kpiCard({
      title: "Storage",
      value: "742 GB",
      delta: "of 1 TB",
      up: true,
      tag: "mini-progress-chart",
      chartElement: chart("mini-progress-chart", [74], { style: { "block-size": "56px" }, "show-value": "", unit: "%", label: "Storage 74% used" }),
    }),
  );
}

const SERVICES = [
  { name: "API gateway", p95: 182, latency: [190, 186, 192, 185, 181, 179, 184, 180, 177, 182], requests: [42, 48, 51, 46, 58, 62, 55, 61, 66, 70], checks: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], change: -2.1 },
  { name: "Auth", p95: 96, latency: [88, 90, 87, 92, 95, 93, 97, 94, 98, 96], requests: [20, 22, 21, 25, 24, 27, 26, 29, 28, 31], checks: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], change: 4.3 },
  { name: "Payments", p95: 412, latency: [320, 340, 360, 330, 390, 420, 380, 400, 430, 412], requests: [12, 14, 13, 15, 18, 17, 16, 19, 21, 20], checks: [1, 1, 1, -1, 1, 1, 1, -1, 1, 1, 1, 1], change: 11.8, warn: true },
  { name: "Search", p95: 128, latency: [150, 146, 141, 139, 136, 132, 135, 130, 129, 128], requests: [33, 31, 35, 36, 34, 38, 40, 39, 42, 41], checks: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1], change: -6.4 },
  { name: "Storage", p95: 64, latency: [60, 62, 61, 63, 62, 64, 63, 65, 64, 64], requests: [18, 18, 19, 20, 19, 21, 22, 21, 23, 24], checks: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], change: 0.8 },
  { name: "Notifications", p95: 233, latency: [260, 250, 255, 245, 240, 238, 236, 240, 235, 233], requests: [9, 12, 8, 14, 10, 15, 11, 16, 12, 17], checks: [1, 1, 1, 1, 1, -1, 1, 1, 1, 1, 1, 1], change: -1.5 },
];

function serviceTable() {
  const rows = SERVICES.map((service) =>
    h(
      "tr",
      null,
      h("th", { scope: "row" }, h("span", { class: `status-dot${service.warn ? " warn" : ""}`, "aria-hidden": "true" }), service.name),
      h("td", { class: "num" }, `${service.p95} ms`),
      h("td", null, chart("mini-line-chart", service.latency, { class: "cell-chart", points: "none", label: `${service.name} p95 latency, last 10 minutes` })),
      h("td", null, chart("mini-bar-chart", service.requests, { class: "cell-chart", gap: "0.3", radius: "1", label: `${service.name} requests per minute` })),
      h("td", null, chart("mini-win-loss-chart", service.checks, { class: "cell-chart", mode: "status", gap: "0.25", label: `${service.name} last 12 health checks` })),
      h("td", { class: `num delta ${service.change <= 0 ? "up" : "down"}` }, `${service.change > 0 ? "+" : ""}${service.change.toFixed(1)}%`),
    ),
  );
  return h(
    "div",
    { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Service health table" },
    h(
      "table",
      { class: "data-table" },
      h("caption", null, "Every sparkline below is 24px tall — the size of a table row."),
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h("th", { scope: "col" }, "Service"),
          h("th", { scope: "col", class: "num" }, "p95"),
          h("th", { scope: "col" }, h("a", { href: link("mini-line-chart") }, "Latency")),
          h("th", { scope: "col" }, h("a", { href: link("mini-bar-chart") }, "Requests")),
          h("th", { scope: "col" }, h("a", { href: link("mini-win-loss-chart") }, "Health checks")),
          h("th", { scope: "col", class: "num" }, "Δ latency"),
        ),
      ),
      h("tbody", null, rows),
    ),
  );
}

function tile(title, tag, body) {
  return h(
    "article",
    { class: "card tile" },
    h("div", { class: "tile-head" }, h("h3", { text: title }), h("a", { href: link(tag), "aria-label": `Configure the chart of ${title}` }, "Configure →")),
    body,
  );
}

const SOURCES = [
  ["Organic", 42],
  ["Direct", 27],
  ["Referral", 18],
  ["Social", 13],
];

/** The pie and its legend read the same tokens, set on their container. */
const SOURCE_COLORS = Object.fromEntries(["#6366f1", "#14b8a6", "#f59e0b", "#ec4899"].map((color, index) => [`--mini-chart-color-${index + 1}`, color]));

/** 23 weeks of daily commits, deterministic: quieter weekends, busier recent weeks. */
const ACTIVITY = Array.from({ length: 23 * 7 }, (_, day) => {
  const weekday = day % 7;
  const base = weekday >= 5 ? 0.6 : 3 + (day / 161) * 4;
  return Math.max(0, Math.round(base + 2.6 * Math.sin(day * 1.7) * Math.cos(day * 0.31)));
});

function tiles() {
  const legend = h(
    "ul",
    { class: "legend" },
    SOURCES.map(([name, share], index) =>
      h("li", null, h("span", { class: "swatch", style: { background: `var(--mini-chart-color-${index + 1})` } }), name, h("b", { text: `${share}%` })),
    ),
  );
  return h(
    "div",
    { class: "tiles" },
    tile("Traffic sources", "mini-pie-chart", h("div", { class: "tile-body", style: SOURCE_COLORS }, chart("mini-pie-chart", SOURCES.map(([, share]) => share), { style: { "block-size": "112px" }, donut: "0.62", "pad-angle": "2", interactive: "", label: "Traffic sources share" }), legend)),
    tile("Server load", "mini-gauge-chart", h("div", { class: "tile-body", style: { "justify-content": "center" } }, chart("mini-gauge-chart", [72], { style: { "block-size": "112px" }, label: "Server load 72 of 100" }))),
    tile("Daily goals", "mini-radial-bar-chart", h("div", { class: "tile-body", style: { "justify-content": "center" } }, chart("mini-radial-bar-chart", [86, 64, 42], { style: { "block-size": "120px" }, interactive: "", label: "Move 86%, exercise 64%, stand 42%" }))),
    tile("Sales vs target", "mini-combo-chart", h("div", { class: "tile-body" }, chart("mini-combo-chart", [{ bar: 12, line: 14 }, { bar: 18, line: 15 }, { bar: 15, line: 17 }, { bar: 22, line: 18 }, { bar: 26, line: 20 }, { bar: 24, line: 22 }, { bar: 30, line: 24 }], { class: "chart-fill", curve: "smooth", interactive: "", label: "Monthly sales against target" }))),
    tile("Share price", "mini-candlestick-chart", h("div", { class: "tile-body" }, chart("mini-candlestick-chart", [[100, 105, 98, 103], [103, 108, 100, 107], [107, 110, 104, 106], [106, 112, 105, 110], [110, 114, 108, 112], [112, 118, 110, 117], [117, 120, 114, 115], [115, 122, 113, 120], [120, 123, 116, 118], [118, 126, 117, 125]], { class: "chart-fill", interactive: "", label: "Share price, last 10 sessions" }))),
    tile("Commit activity", "mini-heatmap-chart", h("div", { class: "tile-body" }, chart("mini-heatmap-chart", ACTIVITY, { class: "chart-fill", layout: "calendar", tooltip: "", label: "Daily commits over the last 23 weeks" }))),
    tile("Sign-up funnel", "mini-funnel-chart", h("div", { class: "tile-body" }, chart("mini-funnel-chart", [{ value: 12400, label: "Visits" }, { value: 5200, label: "Sign-ups" }, { value: 2300, label: "Trials" }, { value: 860, label: "Purchases" }], { class: "chart-fill", tooltip: "", label: "Sign-up funnel: 12,400 visits to 860 purchases" }))),
    tile("Profit & loss", "mini-waterfall-chart", h("div", { class: "tile-body" }, chart("mini-waterfall-chart", [{ value: 120, label: "Revenue" }, { value: -46, label: "Cost of sales" }, { value: -28, label: "Operating costs" }, { value: 14, label: "Other income" }, { value: -12, label: "Tax" }, { total: true, label: "Net profit" }], { class: "chart-fill", tooltip: "", label: "Profit and loss bridge from revenue to a net profit of 48" }))),
    tile("Listening by genre", "mini-stream-chart", h("div", { class: "tile-body" }, chart("mini-stream-chart", [[4, 8, 14, 18, 12, 8, 6, 9, 12, 10], [10, 12, 9, 7, 9, 14, 18, 15, 10, 9], [2, 4, 8, 12, 16, 12, 8, 6, 4, 6], [6, 5, 4, 6, 8, 10, 9, 12, 14, 12]], { class: "chart-fill", interactive: "", label: "Listening hours by genre" }))),
  );
}

const FEATURES = [
  ["Zero dependencies", "Custom Elements v1 and SVG paths. No canvas, no charting runtime, no stylesheet to import."],
  ["Fits anywhere", "Responsive viewBox scaling from a 24px table cell to a full-width hero."],
  ["Themed with CSS", "--mini-chart-* custom properties cross the Shadow DOM: one declaration themes every chart."],
  ["Configurable", "Every option is an attribute and a typed property, with app-wide defaults and named presets."],
  ["Interactive", "Opt-in hover and select events with a uniform detail: index, value, datum and color."],
  ["Accessible", "role=img or meter, labels and titles on every chart, and reduced motion respected."],
];

export function mount(view) {
  view.append(
    h(
      "div",
      { class: "container" },
      h(
        "section",
        { class: "hero", "aria-labelledby": "hero-title" },
        h(
          "div",
          { class: "hero-copy" },
          h("p", { class: "eyebrow", text: `${CHARTS.length} Web Components · 0 dependencies` }),
          h("h1", { id: "hero-title", tabindex: "-1", html: "Tiny charts for <em>every corner</em> of your UI." }),
          h("p", { class: "lead", text: "Sparklines, gauges, candlesticks and more as native SVG Web Components. Drop them in a table cell or a dashboard tile, theme them with CSS variables, use them in any framework." }),
          h("div", { class: "hero-install" }, installBox(INSTALL)),
          h("div", { class: "page-actions" }, h("a", { class: "btn btn-primary", href: "#/charts" }, `Browse the ${CHARTS.length} charts`), h("a", { class: "btn", href: "#/charts/mini-line-chart" }, "Open the configurator")),
          h("ul", { class: "hero-points" }, h("li", null, "React, Vue, Angular, Svelte"), h("li", null, "Shadow DOM"), h("li", null, "TypeScript types")),
        ),
        h("div", { class: "hero-board", "aria-label": "Example dashboard", role: "group" }, kpis()),
      ),
      h(
        "section",
        { class: "section", "aria-labelledby": "table-title" },
        h("div", { class: "section-head" }, h("h2", { id: "table-title", text: "In a data table" }), h("p", { text: "Line, bar and status strips inline with the numbers they explain." })),
        serviceTable(),
      ),
      h(
        "section",
        { class: "section", "aria-labelledby": "tiles-title" },
        h("div", { class: "section-head" }, h("h2", { id: "tiles-title", text: "In dashboard tiles" }), h("p", { text: "Part-to-whole, gauges, goals, activity, conversion, financial and flow charts. Hover the interactive ones." })),
        tiles(),
      ),
      h(
        "section",
        { class: "section", "aria-labelledby": "features-title" },
        h("div", { class: "section-head" }, h("h2", { id: "features-title", text: "Why it stays small" })),
        h("div", { class: "features" }, FEATURES.map(([title, text]) => h("div", { class: "card feature" }, h("h3", { text: title }), h("p", { text })))),
      ),
    ),
  );
}
