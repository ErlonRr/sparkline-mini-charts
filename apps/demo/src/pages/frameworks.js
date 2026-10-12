// frameworks.js — Install and usage per framework (vanilla, React, Vue, Angular, Svelte), plus app-wide configuration.

import { CONFIGURATION_SNIPPET, FRAMEWORK_GUIDES, INSTALL } from "../snippets.js";
import { chart, codeBlock, h, installBox, pageHeader, tabSet } from "../ui.js";

function guidePanel(guide) {
  return h(
    "div",
    { class: "fw-layout" },
    h("div", { class: "fw-intro" }, h("p", { class: "lead", text: guide.intro }), installBox({ npm: INSTALL.npm, pnpm: INSTALL.pnpm, yarn: INSTALL.yarn })),
    guide.files.map((file) => codeBlock(file.code, { label: `${guide.name} ${file.name}`, caption: file.name }).element),
    h(
      "div",
      { class: "card kpi fw-result" },
      h("span", { class: "kpi-title", text: "Result" }),
      chart("mini-line-chart", [12, 18, 15, 27], { class: "chart-fill", curve: "smooth", interactive: "", label: "Weekly revenue" }),
    ),
    h("ul", { class: "fw-notes" }, guide.notes.map((note) => h("li", { html: note }))),
  );
}

export function mount(view) {
  const tabs = tabSet(
    FRAMEWORK_GUIDES.map((guide) => ({ id: guide.id, label: guide.name, panel: () => guidePanel(guide) })),
    { label: "Framework", className: "fw-tabs" },
  );

  view.append(
    h(
      "div",
      { class: "container" },
      pageHeader({
        eyebrow: "Frameworks",
        title: "Use it with any framework",
        lead: "The charts are standard custom elements. React and Vue get typed wrappers; Angular and Svelte use the elements directly.",
      }),
      h("section", { "aria-label": "Framework guides" }, tabs.element),
      h(
        "section",
        { class: "section", "aria-labelledby": "config-title" },
        h(
          "div",
          { class: "section-head" },
          h("h2", { id: "config-title", text: "App-wide configuration" }),
          h("p", { html: "Defaults and presets apply to every chart. Precedence: attribute or property &gt; <code>options</code> &gt; <code>preset</code> &gt; tag defaults &gt; <code>\"*\"</code> defaults &gt; built-in default." }),
        ),
        codeBlock(CONFIGURATION_SNIPPET, { label: "Configuration example", caption: "main.js" }).element,
      ),
      h(
        "section",
        { class: "section", "aria-labelledby": "events-title" },
        h(
          "div",
          { class: "section-head" },
          h("h2", { id: "events-title", text: "Events" }),
          h("p", { html: "With <code>interactive</code> on, every chart dispatches <code>sparkline-hover</code>, <code>sparkline-select</code> and <code>sparkline-leave</code>. They bubble and cross the shadow boundary." }),
        ),
        codeBlock(
          `document.addEventListener("sparkline-select", (event) => {
  const { chart, index, seriesIndex, value, datum, color, clientX, clientY } = event.detail;
  console.log(\`\${chart} #\${index}: \${value}\`);
});`,
          { label: "Events example", caption: "events.js" },
        ).element,
      ),
    ),
  );
}
