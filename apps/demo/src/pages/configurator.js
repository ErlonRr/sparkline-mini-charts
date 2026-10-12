// configurator.js — One chart, configured live. The controls are generated at runtime from
// `customElements.get(tag).props`, so options added to the library show up here by themselves.
// The preview element is created once and updated through its properties; it is never recreated.

import { CHARTS, CHARTS_BY_TAG, dataProblem, describeData } from "../catalog.js";
import { DEMO_PRESETS } from "../presets.js";
import { EXPORTS, kebab, literal } from "../snippets.js";
import { announce, chartRatio, codeBlock, copyText, debounce, h, nextId, pageHeader, segmented, tabSet } from "../ui.js";

/** Events logged by the Events panel. Charts that never dispatch one simply never log it. */
const EVENT_TYPES = ["sparkline-hover", "sparkline-select", "sparkline-leave", "zone-change", "slice-select", "progress-complete"];
const MAX_EVENTS = 40;

/** Slider ranges [min, max, step] for options whose scale does not depend on the data. */
const NUMBER_RANGES = {
  gap: [0, 0.8, 0.05],
  barGap: [0, 0.8, 0.05],
  radius: [0, 8, 0.5],
  innerRadius: [0, 0.9, 0.05],
  donut: [0, 0.9, 0.05],
  padAngle: [0, 12, 0.5],
  startAngle: [-180, 180, 5],
  sweep: [30, 360, 5],
  pointRadius: [0.5, 8, 0.5],
  wickWidth: [0.25, 3, 0.25],
  tickWidth: [0.25, 3, 0.25],
};

const SIZES = [
  { value: "row", label: "Table row" },
  { value: "card", label: "Card" },
  { value: "large", label: "Large" },
];

const SCHEMES = [
  { value: "auto", label: "Page" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Built-in default of an option; flags without one are off. */
const defaultOf = (descriptor) => descriptor.default ?? (descriptor.type === "boolean" ? false : undefined);

/** "referenceValue" → "Reference value". */
const humanize = (name) => {
  const words = kebab(name).split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** All finite numbers in the data, for slider ranges. */
function numbersIn(value, out = []) {
  if (typeof value === "number" && Number.isFinite(value)) out.push(value);
  else if (Array.isArray(value)) for (const item of value) numbersIn(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) numbersIn(item, out);
  return out;
}

/** A round step for a span: 0.01, 0.05, 0.1, 0.5, 1, 5, 10… */
function niceStep(span) {
  const raw = span / 100;
  if (!(raw > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  return (normalized < 2 ? 1 : normalized < 5 ? 2 : 5) * magnitude;
}

/** Slider range for a number option. */
function numberRange(name, descriptor, data) {
  if (NUMBER_RANGES[name]) return NUMBER_RANGES[name];
  const fallback = defaultOf(descriptor);
  if (/min|max|baseline|reference|target|value/i.test(name)) {
    const values = numbersIn(data);
    if (typeof fallback === "number") values.push(fallback);
    if (values.length > 0) {
      let low = Math.min(...values);
      let high = Math.max(...values);
      const span = high - low || Math.abs(high) || 50;
      low -= span * 0.5;
      high += span * 0.5;
      const step = niceStep(high - low);
      return [Math.floor(low / step) * step, Math.ceil(high / step) * step, step];
    }
  }
  if (typeof fallback === "number" && fallback !== 0) {
    const high = Math.abs(fallback) * 4;
    return [Math.min(0, fallback * 4), high, niceStep(high)];
  }
  return [0, 100, 1];
}

/** A short summary of the data for the card and row mockups. */
function summary(data, total = false) {
  const format = (value) => (typeof value === "number" ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—");
  if (typeof data === "number") return format(data);
  if (!Array.isArray(data)) return format(data?.value);
  if (total) return format(data.reduce((sum, item) => sum + (Number(typeof item === "object" ? item?.value : item) || 0), 0));
  const last = data.at(-1);
  if (typeof last === "number") return format(last);
  if (Array.isArray(last)) {
    if (data.every((row) => Array.isArray(row) && row.length > 4)) return format(data.reduce((sum, layer) => sum + (Number(layer.at(-1)) || 0), 0));
    return format(last.length === 4 ? last[3] : last.at(-1));
  }
  if (last && typeof last === "object") return format(last.value ?? last.bar ?? last.y);
  return "—";
}

/** Reads a query parameter as the option's type; `undefined` when it does not parse. */
function fromParam(descriptor, text) {
  switch (descriptor.type) {
    case "number": {
      const number = Number.parseFloat(text);
      return Number.isFinite(number) ? number : undefined;
    }
    case "boolean":
      return text !== "false";
    case "json":
      try {
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    case "colorList":
      return text === "true" ? true : text === "false" ? false : text;
    default:
      return text;
  }
}

const toParam = (value) => (typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value));

/** JSON replacer for event details: elements become `<tag>`, long decimals are rounded. */
function detailReplacer(_key, value) {
  if (typeof Element !== "undefined" && value instanceof Element) return `<${value.localName}>`;
  if (typeof value === "number" && !Number.isInteger(value)) return Math.round(value * 100) / 100;
  return value;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function mount(view, { params, query }) {
  const tag = params[0];
  const entry = CHARTS_BY_TAG.get(tag);
  const ChartClass = customElements.get(tag);
  if (!entry || !ChartClass) {
    view.append(
      h(
        "div",
        { class: "container not-found" },
        pageHeader({ eyebrow: "Charts", title: "Chart not found", lead: `There is no chart called “${tag}”.` }),
        h("a", { class: "btn btn-primary", href: "#/charts" }, "See all charts"),
      ),
    );
    return undefined;
  }

  /** @type {Record<string, { type: string, default?: unknown, values?: string[], presence?: boolean, deprecated?: boolean }>} */
  const props = ChartClass.props ?? {};
  // Deprecated options are accepted by the chart but have no effect: no control for them.
  const names = Object.keys(props).filter((name) => !props[name].deprecated);
  const disposers = [];

  // A camelCase property exists unless the name collides with an HTMLElement member (`normalize`).
  const hasProperty = (name) => {
    for (let proto = ChartClass.prototype; proto && proto !== HTMLElement.prototype; proto = Object.getPrototypeOf(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      if (descriptor) return typeof descriptor.set === "function";
    }
    return false;
  };

  // --- State -----------------------------------------------------------------

  const state = {
    /** @type {Map<string, unknown>} Explicit, non-default option values. */
    values: new Map(),
    data: /** @type {unknown} */ (entry.datasets[0].data),
    label: entry.label,
    preset: "",
    size: "large",
    scheme: "auto",
  };

  const setValue = (name, value) => {
    const descriptor = props[name];
    if (value === undefined || value === null || value === "" || same(value, defaultOf(descriptor))) state.values.delete(name);
    else state.values.set(name, value);
  };

  const loadInitial = () => {
    state.values.clear();
    for (const [name, value] of Object.entries(entry.initial ?? {})) if (props[name]) setValue(name, value);
    state.data = entry.datasets[0].data;
    state.label = entry.label;
    state.preset = "";
  };

  if ([...query.keys()].length > 0) {
    for (const name of names) {
      if (query.has(name)) setValue(name, fromParam(props[name], /** @type {string} */ (query.get(name))));
    }
    try {
      if (query.has("data")) state.data = JSON.parse(/** @type {string} */ (query.get("data")));
    } catch {
      // A broken shared link keeps the example data.
    }
    if (query.has("label")) state.label = /** @type {string} */ (query.get("label"));
    if (query.has("preset") && DEMO_PRESETS[/** @type {string} */ (query.get("preset"))]) state.preset = /** @type {string} */ (query.get("preset"));
    if (SIZES.some((size) => size.value === query.get("size"))) state.size = /** @type {string} */ (query.get("size"));
    if (SCHEMES.some((scheme) => scheme.value === query.get("bg"))) state.scheme = /** @type {string} */ (query.get("bg"));
  } else {
    loadInitial();
  }

  // --- The preview element (created once) ---------------------------------------

  const preview = /** @type {any} */ (document.createElement(tag));
  preview.classList.add("preview-chart");
  preview.id = "preview-chart";

  const applyOption = (name) => {
    const value = state.values.get(name);
    if (hasProperty(name)) {
      preview[name] = value ?? null;
      return;
    }
    const attribute = kebab(name);
    if (value === undefined || value === false) {
      if (value === false && props[name].default === true) preview.setAttribute(attribute, "false");
      else preview.removeAttribute(attribute);
    } else {
      preview.setAttribute(attribute, value === true ? "" : toParam(value));
    }
  };

  const applyAll = () => {
    preview.data = state.data;
    preview.setAttribute("label", state.label || entry.label);
    preview.preset = state.preset;
    for (const name of names) applyOption(name);
  };
  applyAll();

  // --- Stage ---------------------------------------------------------------------

  const ratio = chartRatio(tag);
  const wide = ratio >= 2.5;
  const frame = h("div", { class: "frame", "data-size": state.size });
  const stage = h("div", { class: "stage", "data-scheme": state.scheme === "auto" ? null : state.scheme }, frame);
  const sizeReadout = h("span", { class: "stage-size", "aria-hidden": "true" });
  stage.append(sizeReadout);
  preview.style.setProperty("--card-h", wide ? "64px" : "96px");
  preview.style.setProperty("--large-w", wide ? "100%" : `${Math.round(280 * ratio)}px`);

  const summaryText = h("span");
  const titleText = h("span");
  const renderFrame = () => {
    frame.dataset.size = state.size;
    preview.dataset.size = state.size;
    frame.style.removeProperty("width");
    summaryText.textContent = summary(state.data, entry.category === "composition");
    titleText.textContent = state.label || entry.label;
    let content;
    if (state.size === "row") {
      content = h("div", { class: "mock-row" }, titleText, summaryText, preview);
    } else if (state.size === "card") {
      content = h("div", { class: "mock-card" }, h("span", { class: "kpi-title" }, titleText), h("span", { class: "kpi-value" }, summaryText), h("div", { class: "chart-slot" }, preview));
    } else {
      content = h("div", { class: "frame-content" }, preview);
    }
    frame.replaceChildren(content);
  };
  renderFrame();

  const resizeObserver = new ResizeObserver(([item]) => {
    const box = item.borderBoxSize?.[0];
    const width = Math.round(box ? box.inlineSize : item.contentRect.width);
    const height = Math.round(box ? box.blockSize : item.contentRect.height);
    sizeReadout.textContent = `${width} × ${height} px`;
  });
  resizeObserver.observe(preview);
  disposers.push(() => resizeObserver.disconnect());

  const sizeControl = segmented({
    legend: "Preview size",
    options: SIZES,
    value: state.size,
    small: true,
    onChange: (value) => {
      state.size = value;
      renderFrame();
      changed({ code: false });
    },
  });
  const schemeControl = segmented({
    legend: "Background",
    options: SCHEMES,
    value: state.scheme,
    small: true,
    onChange: (value) => {
      state.scheme = value;
      if (value === "auto") stage.removeAttribute("data-scheme");
      else stage.setAttribute("data-scheme", value);
      changed({ code: false });
    },
  });

  const stageCard = h(
    "section",
    { class: "card panel", "aria-labelledby": "stage-title", style: { order: "1" } },
    h("div", { class: "panel-head" }, h("h2", { id: "stage-title", text: "Preview" }), h("span", { class: "field-hint", text: "Drag the frame's corner to resize it." })),
    h("div", { class: "stage-toolbar" }, sizeControl.element, schemeControl.element),
    stage,
  );

  // --- Options panel (generated from static props) -------------------------------

  const optionList = h("div", { class: "option-list" });
  /** @type {Map<string, () => void>} Re-syncs each control from the state (after a reset). */
  const syncers = new Map();

  const optionRow = (name, descriptor, control, sync) => {
    const reset = h("button", { type: "button", class: "reset-btn", text: "Reset", "aria-label": `Reset ${humanize(name)}` });
    const row = h(
      "div",
      { class: "option", "data-option": name },
      h(
        "div",
        { class: "option-head" },
        h("span", { class: "option-name" }, control.label),
        h("span", { class: "row" }, h("span", { class: "option-type", text: `${kebab(name)} · ${descriptor.type}${descriptor.presence ? " (presence)" : ""}` }), reset),
      ),
      control.element,
    );
    const refresh = () => {
      const set = state.values.has(name);
      row.toggleAttribute("data-set", set);
      reset.hidden = !set;
    };
    reset.addEventListener("click", () => {
      state.values.delete(name);
      sync();
      refresh();
      applyOption(name);
      changed();
      control.focus?.();
    });
    syncers.set(name, () => {
      sync();
      refresh();
    });
    refresh();
    return { row, refresh };
  };

  const buildControl = (name, descriptor) => {
    const id = nextId(`opt-${name}`);
    const fallback = defaultOf(descriptor);
    const current = () => (state.values.has(name) ? state.values.get(name) : fallback);
    let refresh = () => {};
    const commit = (value) => {
      setValue(name, value);
      applyOption(name);
      refresh();
      changed();
    };

    let control;
    let sync;

    switch (descriptor.type) {
      case "boolean": {
        const input = h("input", { type: "checkbox", role: "switch", id });
        input.addEventListener("change", () => commit(input.checked));
        sync = () => (input.checked = Boolean(current()));
        control = {
          label: h("label", { for: id, text: humanize(name) }),
          element: h("span", { class: "switch" }, input),
          focus: () => input.focus(),
        };
        break;
      }
      case "enum": {
        const values = [...(descriptor.values ?? [])];
        const choices = [...(fallback === undefined ? [{ value: "", label: "unset" }] : []), ...values.map((value) => ({ value, label: value }))];
        const compact = choices.length <= 5 && choices.reduce((sum, choice) => sum + choice.label.length, 0) <= 40;
        if (compact) {
          const control2 = segmented({ legend: humanize(name), hideLegend: true, options: choices, value: String(current() ?? ""), small: true, onChange: (value) => commit(value || undefined) });
          sync = () => control2.set(String(current() ?? ""));
          control = { label: h("span", { class: "option-label", text: humanize(name), "aria-hidden": "true" }), element: control2.element, focus: () => control2.element.querySelector("input:checked")?.focus() };
        } else {
          const select = h("select", { class: "select", id }, choices.map((choice) => h("option", { value: choice.value, text: choice.label })));
          select.addEventListener("change", () => commit(select.value || undefined));
          sync = () => (select.value = String(current() ?? ""));
          control = { label: h("label", { for: id, text: humanize(name) }), element: select, focus: () => select.focus() };
        }
        break;
      }
      case "number": {
        const [min, max, step] = numberRange(name, descriptor, state.data);
        const range = h("input", { type: "range", class: "range", min, max, step, "aria-label": `${humanize(name)} slider` });
        const number = h("input", { type: "number", class: "input input-number", id, step: "any", placeholder: fallback === undefined ? "auto" : String(fallback) });
        range.addEventListener("input", () => {
          number.value = range.value;
          range.removeAttribute("data-unset");
          commit(Number(range.value));
        });
        number.addEventListener("input", () => {
          const value = number.value === "" ? undefined : Number(number.value);
          if (value !== undefined && !Number.isFinite(value)) return;
          if (value !== undefined) range.value = String(value);
          commit(value);
        });
        sync = () => {
          const value = state.values.get(name);
          number.value = value === undefined ? "" : String(value);
          range.value = String(value ?? fallback ?? (min + max) / 2);
          range.toggleAttribute("data-unset", value === undefined && fallback === undefined);
        };
        control = { label: h("label", { for: id, text: humanize(name) }), element: h("div", { class: "row" }, range, number), focus: () => number.focus() };
        break;
      }
      case "json": {
        const example = entry.examples?.[name];
        const area = h("textarea", { class: "textarea", id, rows: "3", spellcheck: "false", placeholder: example ?? "JSON" });
        const message = h("p", { class: "validation", id: `${id}-msg`, "aria-live": "polite" });
        area.setAttribute("aria-describedby", message.id);
        const parse = debounce(() => {
          const text = area.value.trim();
          if (text === "") {
            area.removeAttribute("aria-invalid");
            message.textContent = "";
            commit(undefined);
            return;
          }
          try {
            const value = JSON.parse(text);
            area.removeAttribute("aria-invalid");
            message.dataset.state = "ok";
            message.textContent = "Valid JSON";
            commit(value);
          } catch (error) {
            area.setAttribute("aria-invalid", "true");
            message.dataset.state = "error";
            message.textContent = `Invalid JSON: ${error instanceof Error ? error.message : error}`;
          }
        }, 300);
        disposers.push(parse.cancel);
        area.addEventListener("input", parse);
        sync = () => {
          const value = state.values.get(name);
          area.value = value === undefined ? "" : JSON.stringify(value, null, 1).replace(/\n\s*/g, " ");
          area.removeAttribute("aria-invalid");
          message.textContent = "";
        };
        const insert = example
          ? h("button", { type: "button", class: "btn btn-sm", text: "Insert example", onclick: () => {
            area.value = example;
            area.dispatchEvent(new Event("input"));
          } })
          : null;
        control = { label: h("label", { for: id, text: humanize(name) }), element: h("div", { class: "field" }, area, h("div", { class: "row", style: { "justify-content": "space-between" } }, message, insert)), focus: () => area.focus() };
        break;
      }
      case "colorList": {
        const text = h("input", { class: "input", id, type: "text", placeholder: "#22d3ee, #6366f1", spellcheck: "false", "aria-label": `${humanize(name)} colors` });
        const mode = () => {
          const value = current();
          return value === true ? "on" : value === false || value === undefined ? "off" : "custom";
        };
        const modes = segmented({
          legend: humanize(name),
          hideLegend: true,
          small: true,
          options: [
            { value: "off", label: "Off" },
            { value: "on", label: "Default" },
            { value: "custom", label: "Custom" },
          ],
          value: mode(),
          onChange: (value) => {
            text.hidden = value !== "custom";
            if (value === "custom") {
              if (!text.value) text.value = "#22d3ee, #6366f1";
              commit(text.value);
              text.focus();
            } else commit(value === "on");
          },
        });
        text.addEventListener("input", debounce(() => text.value.trim() && commit(text.value.trim()), 250));
        sync = () => {
          const value = current();
          modes.set(mode());
          text.hidden = mode() !== "custom";
          if (typeof value === "string") text.value = value;
        };
        control = { label: h("span", { class: "option-label", text: humanize(name), "aria-hidden": "true" }), element: h("div", { class: "field" }, modes.element, text), focus: () => modes.element.querySelector("input:checked")?.focus() };
        break;
      }
      default: {
        // string, and any type a future version adds: a plain text field.
        const input = h("input", { class: "input", id, type: "text", spellcheck: "false", placeholder: fallback ? String(fallback) : "" });
        input.addEventListener("input", debounce(() => commit(input.value || undefined), 200));
        let picker = null;
        if (/color$/i.test(name)) {
          picker = h("input", { type: "color", class: "input-color", "aria-label": `${humanize(name)} picker` });
          picker.addEventListener("input", () => {
            input.value = picker.value;
            commit(picker.value);
          });
        }
        sync = () => {
          const value = state.values.get(name);
          input.value = value === undefined ? "" : String(value);
          if (picker && /^#[\da-f]{6}$/i.test(input.value)) picker.value = input.value;
        };
        control = { label: h("label", { for: id, text: humanize(name) }), element: picker ? h("div", { class: "row" }, picker, input) : input, focus: () => input.focus() };
      }
    }

    sync();
    const built = optionRow(name, descriptor, control, sync);
    refresh = built.refresh;
    return built.row;
  };

  const renderOptions = () => {
    syncers.clear();
    optionList.replaceChildren(...names.map((name) => buildControl(name, props[name])));
  };
  renderOptions();

  // Label and preset: observed attributes that are not in `props`.
  const labelInput = h("input", { class: "input", id: "opt-label", type: "text", value: state.label });
  labelInput.addEventListener(
    "input",
    debounce(() => {
      state.label = labelInput.value;
      preview.setAttribute("label", state.label || entry.label);
      titleText.textContent = state.label || entry.label;
      changed();
    }, 200),
  );
  const presetSelect = h(
    "select",
    { class: "select", id: "opt-preset" },
    h("option", { value: "", text: "None" }),
    Object.keys(DEMO_PRESETS).map((name) => h("option", { value: name, text: name })),
  );
  presetSelect.value = state.preset;
  presetSelect.addEventListener("change", () => {
    state.preset = presetSelect.value;
    preview.preset = state.preset;
    changed();
  });

  const optionsCard = h(
    "section",
    { class: "card panel", "aria-labelledby": "options-title", style: { order: "2" } },
    h(
      "div",
      { class: "panel-head" },
      h("h2", { id: "options-title" }, "Options", h("span", { class: "count", text: String(names.length), "aria-label": `${names.length} options` })),
      h("button", { type: "button", class: "btn btn-sm", text: "Reset all", onclick: () => resetAll() }),
    ),
    h(
      "div",
      { class: "panel-body" },
      h("p", { class: "field-hint", html: `Generated from <code>customElements.get("${tag}").props</code>. A dot marks a value that differs from the default.` }),
      h("div", { class: "field" }, h("label", { class: "field-label", for: "opt-label", text: "Label" }), labelInput),
      h(
        "div",
        { class: "field" },
        h("label", { class: "field-label", for: "opt-preset", text: "Preset" }),
        presetSelect,
        h("p", { class: "field-hint", html: "Registered by the demo with <code>defineChartPreset()</code>. Explicit options win over presets." }),
      ),
      optionList,
    ),
  );

  // --- Data panel ----------------------------------------------------------------

  const dataArea = h("textarea", { class: "textarea", id: "data-editor", rows: "7", spellcheck: "false", "aria-describedby": "data-status data-shape" });
  const dataStatus = h("p", { class: "validation", id: "data-status", "aria-live": "polite" });
  const formatData = (value) => {
    const compact = literal(value, "json");
    return compact.length <= 64 ? compact : JSON.stringify(value, null, 2)
          .replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, inner) => `[${inner.replace(/\s*\n\s*/g, " ")}]`)
          .replace(/\{\s+([^[\]{}]*?)\s+\}/g, (_, inner) => `{ ${inner.replace(/\s*\n\s*/g, " ")} }`);
  };
  const chipButtons = entry.datasets.map((dataset) =>
    h("button", { type: "button", class: "chip", "aria-pressed": "false", text: dataset.name, onclick: () => setData(dataset.data) }),
  );
  const markChips = () => entry.datasets.forEach((dataset, index) => chipButtons[index].setAttribute("aria-pressed", String(same(dataset.data, state.data))));

  const showStatus = (problem) => {
    if (problem) {
      dataArea.setAttribute("aria-invalid", "true");
      dataStatus.dataset.state = "error";
      dataStatus.textContent = problem;
    } else {
      dataArea.removeAttribute("aria-invalid");
      dataStatus.dataset.state = "ok";
      dataStatus.textContent = `Valid · ${describeData(state.data)}`;
    }
  };

  const setData = (value, { fromEditor = false } = {}) => {
    state.data = value;
    preview.data = value;
    if (!fromEditor) dataArea.value = formatData(value);
    summaryText.textContent = summary(value, entry.category === "composition");
    showStatus(null);
    markChips();
    changed();
  };

  const parseData = debounce(() => {
    let value;
    try {
      value = JSON.parse(dataArea.value);
    } catch (error) {
      showStatus(`Invalid JSON: ${error instanceof Error ? error.message : error}`);
      return;
    }
    const problem = dataProblem(tag, value);
    if (problem) showStatus(problem);
    else setData(value, { fromEditor: true });
  }, 250);
  disposers.push(parseData.cancel);
  dataArea.addEventListener("input", parseData);
  dataArea.value = formatData(state.data);
  showStatus(null);
  markChips();

  const dataCard = h(
    "section",
    { class: "card panel", "aria-labelledby": "data-title", style: { order: "3" } },
    h("div", { class: "panel-head" }, h("h2", { id: "data-title", text: "Data" }), h("button", { type: "button", class: "btn btn-sm", text: "Random data", onclick: () => setData(entry.random()) })),
    h(
      "div",
      { class: "panel-body" },
      h("div", { class: "field" }, h("span", { class: "field-label", text: "Examples", id: "examples-label" }), h("div", { class: "chips", role: "group", "aria-labelledby": "examples-label" }, chipButtons)),
      h(
        "div",
        { class: "field" },
        h("label", { class: "field-label", for: "data-editor", text: "JSON" }),
        h("p", { class: "field-hint", id: "data-shape", html: `Shape: <code>${entry.shape.replace(/</g, "&lt;")}</code> · set through <code>chart.data</code>` }),
        dataArea,
        dataStatus,
      ),
    ),
  );

  // --- Code panel ------------------------------------------------------------------

  /** @type {Map<string, (text: string) => void>} */
  const codeSetters = new Map();
  const config = () => ({
    tag,
    data: state.data,
    label: state.label || entry.label,
    preset: state.preset || undefined,
    presetMap: state.preset ? DEMO_PRESETS[state.preset] : undefined,
    options: names.filter((name) => state.values.has(name)).map((name) => ({ name, value: state.values.get(name), type: props[name].type, property: hasProperty(name) })),
  });
  const resolvedText = () => `chart.resolvedOptions();\n// →\n${JSON.stringify(preview.resolvedOptions?.() ?? {}, null, 2)}`;

  const codeTabs = tabSet(
    [
      ...EXPORTS.map((format) => ({
        id: format.id,
        label: format.name,
        panel: () => {
          const block = codeBlock(format.generate(config()), { label: `${format.name} code`, caption: `${format.name} · only non-default options` });
          codeSetters.set(format.id, (text) => block.set(text));
          return block.element;
        },
      })),
      {
        id: "resolved",
        label: "resolvedOptions()",
        panel: () => {
          const block = codeBlock(resolvedText(), { label: "Resolved options", caption: "Every option after attributes, options, presets and defaults" });
          codeSetters.set("resolved", (text) => block.set(text));
          return block.element;
        },
      },
    ],
    { label: "Code format" },
  );
  const refreshCode = () => {
    const current = config();
    for (const format of EXPORTS) codeSetters.get(format.id)?.(format.generate(current));
    // resolvedOptions() reads the attributes, which the setters above already wrote.
    codeSetters.get("resolved")?.(resolvedText());
  };

  const codeCard = h(
    "section",
    { class: "card panel", "aria-labelledby": "code-title", style: { order: "4" } },
    h("div", { class: "panel-head" }, h("h2", { id: "code-title", text: "Code" }), h("span", { class: "field-hint", text: "Updates as you configure." })),
    h("div", { class: "panel-body" }, codeTabs.element),
  );

  // --- Events panel ----------------------------------------------------------------

  const log = h("ol", { class: "events-log", "aria-label": "Event log, newest first" });
  const countBadge = h("span", { class: "count", text: "0" });
  const interactiveHint = h("p", { class: "hint", hidden: true });
  let paused = false;
  let total = 0;
  const pauseButton = h("button", { type: "button", class: "btn btn-sm", "aria-pressed": "false", text: "Pause" });
  pauseButton.addEventListener("click", () => {
    paused = !paused;
    pauseButton.setAttribute("aria-pressed", String(paused));
    pauseButton.textContent = paused ? "Resume" : "Pause";
  });
  const clearButton = h("button", { type: "button", class: "btn btn-sm", text: "Clear" });
  clearButton.addEventListener("click", () => {
    log.replaceChildren(emptyLog);
    total = 0;
    countBadge.textContent = "0";
  });
  const emptyLog = h("li", { class: "field-hint", text: "Hover or click the preview: events appear here with their detail." });
  log.append(emptyLog);

  const onEvent = (event) => {
    if (paused) return;
    emptyLog.remove();
    total += 1;
    countBadge.textContent = String(total);
    const detail = /** @type {CustomEvent} */ (event).detail ?? {};
    const time = new Date().toISOString().slice(11, 23);
    const color = typeof detail.color === "string" && detail.color ? h("span", { class: "swatch-color", style: { background: detail.color }, "aria-hidden": "true" }) : null;
    log.prepend(
      h(
        "li",
        { class: "event-item" },
        h("div", { class: "event-meta" }, h("span", { class: "event-type", "data-type": event.type, text: event.type }), h("span", null, color, time)),
        h("pre", { text: JSON.stringify(detail, detailReplacer, 2) }),
      ),
    );
    while (log.children.length > MAX_EVENTS) log.lastElementChild?.remove();
  };
  for (const type of EVENT_TYPES) preview.addEventListener(type, onEvent);

  const refreshHint = () => {
    const interactive = "interactive" in props ? Boolean(preview.option?.("interactive")) : true;
    interactiveHint.hidden = interactive;
    interactiveHint.innerHTML = "Turn on <strong>Interactive</strong> in Options: hover and select events are opt-in.";
  };

  const eventsCard = h(
    "section",
    { class: "card panel", "aria-labelledby": "events-title", style: { order: "5" } },
    h("div", { class: "panel-head" }, h("h2", { id: "events-title" }, "Events", countBadge), h("div", { class: "row" }, pauseButton, clearButton)),
    h(
      "div",
      { class: "panel-body" },
      h("p", { class: "field-hint", html: "<code>sparkline-hover</code>, <code>sparkline-select</code> and <code>sparkline-leave</code> bubble from the chart with a uniform <code>detail</code>." }),
      interactiveHint,
      log,
    ),
  );

  // --- Change propagation & URL -----------------------------------------------------

  const writeUrl = () => {
    const params = new URLSearchParams();
    for (const [name, value] of state.values) params.set(name, toParam(value));
    if (!same(state.data, entry.datasets[0].data)) params.set("data", JSON.stringify(state.data));
    if (state.label !== entry.label) params.set("label", state.label);
    if (state.preset) params.set("preset", state.preset);
    params.set("size", state.size);
    params.set("bg", state.scheme);
    history.replaceState(null, "", `#/charts/${tag}?${params}`);
  };
  const syncUrl = debounce(writeUrl, 300);
  disposers.push(syncUrl.cancel);

  // Code and the resolved options are refreshed after the chart has taken the change.
  const scheduleCode = debounce(refreshCode, 60);
  disposers.push(scheduleCode.cancel);

  function changed({ code = true } = {}) {
    if (code) scheduleCode();
    refreshHint();
    syncUrl();
  }

  function resetAll() {
    loadInitial();
    applyAll();
    for (const sync of syncers.values()) sync();
    labelInput.value = state.label;
    presetSelect.value = state.preset;
    dataArea.value = formatData(state.data);
    showStatus(null);
    markChips();
    renderFrame();
    changed();
    announce("Options reset");
  }

  // --- Header ------------------------------------------------------------------------

  const index = CHARTS.indexOf(entry);
  const previous = CHARTS[(index - 1 + CHARTS.length) % CHARTS.length];
  const next = CHARTS[(index + 1) % CHARTS.length];
  const switcher = h(
    "select",
    { class: "select", id: "chart-switcher", style: { width: "auto" } },
    CHARTS.map((item) => h("option", { value: item.tag, text: `${item.name} — <${item.tag}>` })),
  );
  switcher.value = tag;
  switcher.addEventListener("change", () => (location.hash = `#/charts/${switcher.value}`));

  const shareButton = h("button", { type: "button", class: "btn", text: "Copy share link" });
  shareButton.addEventListener("click", async () => {
    syncUrl.cancel();
    writeUrl();
    const ok = await copyText(location.href);
    shareButton.textContent = ok ? "Link copied" : "Copy failed";
    announce(ok ? "Share link copied" : "Copy failed");
    setTimeout(() => (shareButton.textContent = "Copy share link"), 1600);
  });

  view.append(
    h(
      "div",
      { class: "container" },
      h("nav", { "aria-label": "Breadcrumb" }, h("ol", { class: "breadcrumb" }, h("li", null, h("a", { href: "#/charts" }, "Charts")), h("li", { "aria-current": "page", text: entry.name }))),
      h(
        "div",
        { class: "config-title" },
        pageHeader({ title: `${entry.name} chart`, lead: entry.description }),
        h("div", { class: "page-actions" }, h("label", { class: "visually-hidden", for: "chart-switcher", text: "Switch chart" }), switcher, shareButton),
      ),
      h("div", { class: "config-layout" }, h("div", { class: "config-main" }, stageCard, codeCard, eventsCard), h("div", { class: "config-side" }, optionsCard, dataCard)),
      h(
        "nav",
        { class: "pager", "aria-label": "Other charts" },
        h("a", { href: `#/charts/${previous.tag}` }, h("small", { text: "Previous" }), previous.name),
        h("a", { href: `#/charts/${next.tag}` }, h("small", { text: "Next" }), next.name),
      ),
    ),
  );

  refreshHint();
  refreshCode();
  syncUrl();

  return () => {
    for (const dispose of disposers) dispose();
    for (const type of EVENT_TYPES) preview.removeEventListener(type, onEvent);
  };
}
