// gallery.js — The 24 charts grouped by category, with a filter; each card opens the chart's configurator.

import { CATEGORIES, CHARTS } from "../catalog.js";
import { chart, chartRatio, h, pageHeader } from "../ui.js";

function card(entry) {
  const preview = chart(entry.tag, entry.datasets[0].data, { label: `${entry.name} chart preview`, ...previewAttributes(entry.tag) });
  return h(
    "li",
    { class: "card chart-card", "data-search": `${entry.name} ${entry.tag} ${entry.description}`.toLowerCase() },
    h("div", { class: "chart-card-preview", "aria-hidden": "true" }, preview),
    h(
      "div",
      { class: "chart-card-body" },
      h("h3", null, h("a", { href: `#/charts/${entry.tag}` }, entry.name)),
      h("code", { text: `<${entry.tag}>` }),
      h("p", { text: entry.description }),
    ),
  );
}

/** Size per chart shape: wide charts fill the card, round ones keep a square-ish box. */
function previewAttributes(tag) {
  const ratio = chartRatio(tag);
  const style = ratio >= 2.5 ? { "inline-size": "100%" } : { "block-size": ratio >= 1.5 ? "72px" : "96px" };
  const attributes = { style };
  for (const [name, value] of Object.entries(GALLERY_OPTIONS[tag] ?? {})) attributes[name] = value;
  return attributes;
}

/** A few attributes so every card shows the chart at its best. */
const GALLERY_OPTIONS = {
  "mini-line-chart": { curve: "smooth" },
  "mini-area-chart": { curve: "smooth" },
  "mini-stacked-area-chart": { curve: "smooth" },
  "mini-combo-chart": { curve: "smooth" },
  "mini-bar-chart": { radius: "1" },
  "mini-range-bar-chart": { radius: "2" },
  "mini-scatter-chart": { "trend-line": "" },
  "mini-pie-chart": { donut: "0.6" },
  "mini-half-pie-chart": { donut: "0.55" },
  "mini-progress-chart": { "show-value": "", unit: "%" },
  "mini-heatmap-chart": { layout: "calendar" },
  "mini-stacked-bar-chart": { radius: "2" },
  "mini-radar-chart": { points: "" },
};

export function mount(view) {
  const search = h("input", { class: "input", type: "search", id: "chart-filter", placeholder: "Filter by name or use…", autocomplete: "off" });
  const status = h("p", { class: "field-hint", "aria-live": "polite" });
  const empty = h("p", { class: "empty-state", hidden: true, text: "No chart matches this filter." });

  const sections = CATEGORIES.map((category) => {
    const entries = CHARTS.filter((entry) => entry.category === category.id);
    const headingId = `cat-${category.id}`;
    return h(
      "section",
      { class: "category", "aria-labelledby": headingId },
      h("h2", { id: headingId, text: category.name }),
      h("p", { text: category.blurb }),
      h("ul", { class: "chart-cards", role: "list", style: { padding: "0", margin: "0", "list-style": "none" } }, entries.map(card)),
    );
  });

  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    for (const section of sections) {
      let visible = 0;
      for (const item of section.querySelectorAll("li[data-search]")) {
        const match = !query || item.getAttribute("data-search").includes(query);
        item.hidden = !match;
        if (match) visible++;
      }
      section.hidden = visible === 0;
      shown += visible;
    }
    empty.hidden = shown > 0;
    status.textContent = query ? `${shown} of ${CHARTS.length} charts` : "";
  });

  view.append(
    h(
      "div",
      { class: "container" },
      pageHeader({
        eyebrow: "Charts",
        title: `${CHARTS.length} charts, one API`,
        lead: "Every chart is a custom element with typed options, CSS tokens and the same hover and select events. Open one to configure it live and export the code.",
      }),
      h("div", { class: "toolbar" }, h("div", { class: "field search" }, h("label", { class: "field-label", for: "chart-filter", text: "Filter charts" }), search), status),
      sections,
      empty,
    ),
  );
}
