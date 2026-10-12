// theming.js — Edit the main --mini-chart-* tokens on a preview board, pick a preset, copy the CSS.

import { SEGMENT_COLORS } from "sparkline-mini-charts";
import { chart, codeBlock, h, nextId, pageHeader, segmented } from "../ui.js";

const SERIES = 6;

/** The editable tokens. `also` tokens follow the same value (bars use their own positive/negative names). */
const TOKENS = [
  { name: "--mini-chart-color", label: "Accent", initial: "#4f46e5", hint: "Every single-series chart" },
  { name: "--mini-chart-bullish-color", label: "Positive", initial: "#10b981", hint: "Rising candles, wins, trend-color=auto", also: ["--mini-chart-positive-color"] },
  { name: "--mini-chart-bearish-color", label: "Negative", initial: "#ef4444", hint: "Falling candles, losses, negative bars", also: ["--mini-chart-negative-color"] },
  { name: "--mini-chart-track-color", label: "Track", initial: "#d4d8e2", hint: "Progress and radial-bar background" },
];

const PRESETS = {
  Default: {},
  Ocean: {
    "--mini-chart-color": "#0284c7",
    "--mini-chart-bullish-color": "#14b8a6",
    "--mini-chart-bearish-color": "#f43f5e",
    "--mini-chart-track-color": "#cfe3ee",
    series: ["#0284c7", "#06b6d4", "#14b8a6", "#38bdf8", "#0e7490", "#67e8f9"],
  },
  Sunset: {
    "--mini-chart-color": "#ea580c",
    "--mini-chart-bullish-color": "#ca8a04",
    "--mini-chart-bearish-color": "#be123c",
    "--mini-chart-track-color": "#f3dfd2",
    series: ["#ea580c", "#f59e0b", "#e11d48", "#fb7185", "#c2410c", "#facc15"],
  },
  Forest: {
    "--mini-chart-color": "#15803d",
    "--mini-chart-bullish-color": "#16a34a",
    "--mini-chart-bearish-color": "#b45309",
    "--mini-chart-track-color": "#dbe8d8",
    series: ["#15803d", "#65a30d", "#0f766e", "#a3e635", "#4d7c0f", "#84cc16"],
  },
  Mono: {
    "--mini-chart-color": "#334155",
    "--mini-chart-bullish-color": "#334155",
    "--mini-chart-bearish-color": "#94a3b8",
    "--mini-chart-track-color": "#e2e8f0",
    series: ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#475569"],
  },
  Neon: {
    "--mini-chart-color": "#a855f7",
    "--mini-chart-bullish-color": "#22d3ee",
    "--mini-chart-bearish-color": "#f472b6",
    "--mini-chart-track-color": "#3b2a55",
    series: ["#a855f7", "#22d3ee", "#f472b6", "#facc15", "#4ade80", "#fb923c"],
    "--mini-chart-stroke-width": "2.5",
  },
};

export function mount(view) {
  /** @type {Map<string, string>} Changed tokens only. */
  const values = new Map();
  const board = h("div", { class: "board", "aria-label": "Themed preview board", role: "group" });
  const css = codeBlock("", { label: "Theme CSS", caption: "theme.css" });
  /** @type {Map<string, (value: string | undefined) => void>} */
  const controls = new Map();

  const seriesName = (index) => `--mini-chart-color-${index}`;
  const defaults = new Map(TOKENS.map((token) => [token.name, token.initial]));
  for (let index = 1; index <= SERIES; index++) defaults.set(seriesName(index), SEGMENT_COLORS?.[index - 1] ?? "#888888");
  defaults.set("--mini-chart-stroke-width", "2");

  const followers = (name) => TOKENS.find((token) => token.name === name)?.also ?? [];

  const render = () => {
    board.removeAttribute("style");
    const lines = [];
    for (const [name, value] of values) {
      for (const token of [name, ...followers(name)]) {
        board.style.setProperty(token, value);
        lines.push(`  ${token}: ${value};`);
      }
    }
    css.set(lines.length ? `/* Any ancestor works: :root themes every chart on the page. */\n:root {\n${lines.join("\n")}\n}` : "/* Change a token to generate the CSS. */");
  };

  const set = (name, value) => {
    if (value === undefined || value === defaults.get(name)) values.delete(name);
    else values.set(name, value);
    controls.get(name)?.(value);
    render();
  };

  const colorRow = ({ name, label, hint }) => {
    const id = nextId("token");
    const input = h("input", { type: "color", class: "input-color", id, value: defaults.get(name) });
    const reset = h("button", { type: "button", class: "reset-btn", text: "Reset", hidden: true, "aria-label": `Reset ${label}` });
    input.addEventListener("input", () => set(name, input.value));
    reset.addEventListener("click", () => set(name, undefined));
    controls.set(name, (value) => {
      input.value = value ?? defaults.get(name);
      reset.hidden = !values.has(name);
    });
    return h(
      "div",
      { class: "token-row" },
      h("div", { class: "option-head field-label" }, h("label", { for: id, text: label }), reset),
      input,
      h("div", { style: { "min-width": "0" } }, h("code", { text: name }), h("p", { class: "field-hint", text: hint })),
    );
  };

  const seriesInputs = h(
    "div",
    { class: "swatches" },
    Array.from({ length: SERIES }, (_, offset) => {
      const name = seriesName(offset + 1);
      const id = nextId("series");
      const input = h("input", { type: "color", class: "input-color", id, value: defaults.get(name), "aria-label": `Series color ${offset + 1}` });
      input.addEventListener("input", () => set(name, input.value));
      controls.set(name, (value) => (input.value = value ?? defaults.get(name)));
      return h("label", { for: id }, input, h("span", { text: String(offset + 1), "aria-hidden": "true" }));
    }),
  );

  const strokeId = nextId("stroke");
  const strokeOutput = h("output", { for: strokeId, class: "option-type", text: "2" });
  const stroke = h("input", { type: "range", class: "range", id: strokeId, min: "1", max: "4", step: "0.25", value: "2" });
  stroke.addEventListener("input", () => set("--mini-chart-stroke-width", stroke.value));
  controls.set("--mini-chart-stroke-width", (value) => {
    stroke.value = value ?? "2";
    strokeOutput.textContent = stroke.value;
  });

  const applyPreset = (name) => {
    const preset = PRESETS[name];
    for (const key of [...values.keys()]) set(key, undefined);
    for (const [key, value] of Object.entries(preset)) {
      if (key === "series") value.forEach((color, index) => set(seriesName(index + 1), color));
      else set(key, value);
    }
    for (const button of presetButtons) button.setAttribute("aria-pressed", String(button.textContent === name));
  };
  const presetButtons = Object.keys(PRESETS).map((name) => h("button", { type: "button", class: "chip", "aria-pressed": String(name === "Default"), text: name, onclick: () => applyPreset(name) }));

  const scheme = segmented({
    legend: "Board background",
    small: true,
    options: [
      { value: "auto", label: "Page" },
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ],
    value: "auto",
    onChange: (value) => (value === "auto" ? board.removeAttribute("data-scheme") : board.setAttribute("data-scheme", value)),
  });

  // --- The board ------------------------------------------------------------------

  const card = (title, element, center = false) =>
    h("div", { class: "card tile" }, h("h3", { text: title }), center ? h("div", { class: "chart-center" }, element) : element);
  board.append(
    card("Line", chart("mini-line-chart", [12, 18, 15, 22, 19, 27, 24, 31], { class: "chart-fill", curve: "smooth", label: "Line chart" })),
    card("Area", chart("mini-area-chart", [8, 12, 10, 16, 14, 20, 18, 24], { class: "chart-fill", curve: "smooth", label: "Area chart" })),
    card("Bar", chart("mini-bar-chart", [6, -4, 9, 12, -7, 14, 5, -3, 10], { class: "chart-fill", radius: "1", label: "Bar chart" })),
    card("Candlestick", chart("mini-candlestick-chart", [[100, 105, 98, 103], [103, 108, 100, 107], [107, 110, 104, 105], [105, 109, 101, 102], [102, 112, 101, 110], [110, 114, 108, 112], [112, 113, 106, 107], [107, 118, 106, 116]], { class: "chart-fill", label: "Candlestick chart" })),
    card("Stacked area", chart("mini-stacked-area-chart", [[6, 8, 7, 10, 12, 11], [4, 5, 7, 6, 8, 9], [3, 4, 3, 5, 4, 6], [2, 2, 3, 3, 4, 4]], { class: "chart-fill", curve: "smooth", label: "Stacked area chart" })),
    card("Win / loss", chart("mini-win-loss-chart", [1, 1, -1, 1, 0, 1, -1, -1, 1, 1, 1, -1, 1], { class: "chart-fill", label: "Win-loss chart" })),
    card("Pie", chart("mini-pie-chart", [30, 22, 18, 14, 10, 6], { donut: "0.55", label: "Pie chart" }), true),
    card("Radial bar", chart("mini-radial-bar-chart", [82, 64, 45], { label: "Radial bar chart" }), true),
    card("Progress", chart("mini-progress-chart", [68], { "show-value": "", unit: "%", label: "Progress chart" }), true),
  );

  view.append(
    h(
      "div",
      { class: "container" },
      pageHeader({
        eyebrow: "Theming",
        title: "Theme with CSS custom properties",
        lead: "The --mini-chart-* tokens inherit through the Shadow DOM: set them on :root or on any container. Charts follow the page's color-scheme for their dark defaults.",
      }),
      h(
        "div",
        { class: "theming-layout" },
        h(
          "section",
          { class: "card panel", "aria-labelledby": "tokens-title" },
          h("div", { class: "panel-head" }, h("h2", { id: "tokens-title", text: "Tokens" }), h("button", { type: "button", class: "btn btn-sm", text: "Reset", onclick: () => applyPreset("Default") })),
          h(
            "div",
            { class: "panel-body" },
            h("div", { class: "field" }, h("span", { class: "field-label", id: "presets-label", text: "Presets" }), h("div", { class: "preset-list", role: "group", "aria-labelledby": "presets-label" }, presetButtons)),
            TOKENS.map(colorRow),
            h("div", { class: "field" }, h("span", { class: "field-label", text: "Series colors" }), h("code", { text: "--mini-chart-color-1 … --mini-chart-color-6" }), seriesInputs),
            h("div", { class: "field" }, h("div", { class: "option-head" }, h("label", { class: "field-label", for: strokeId, text: "Stroke width" }), strokeOutput), h("code", { text: "--mini-chart-stroke-width" }), stroke),
          ),
        ),
        h(
          "div",
          { class: "grid", style: { "min-width": "0" } },
          h("div", { class: "row", style: { "justify-content": "space-between", "flex-wrap": "wrap" } }, h("h2", { class: "kpi-title", text: "Preview" }), scheme.element),
          board,
          css.element,
        ),
      ),
    ),
  );
  render();
}
