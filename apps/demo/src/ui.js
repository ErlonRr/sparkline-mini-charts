// ui.js — Small DOM helpers shared by the pages: element builder, copy buttons, code blocks, tabs and segmented controls.

let uid = 0;

/** A unique id for label/aria wiring. */
export const nextId = (prefix = "id") => `${prefix}-${++uid}`;

/**
 * Creates an element. `attrs` keys: `class`, `text`, `html`, `on<Event>` listeners,
 * `props` (assigned as properties, e.g. a chart's `data`), `style` (object or text),
 * and any other key as an attribute (`true` → empty attribute, `false`/`null` → omitted).
 *
 * @param {string} tag
 * @param {Record<string, any> | null} [attrs]
 * @param {...(Node | string | null | undefined | false | (Node | string | null | undefined | false)[])} children
 * @returns {any}
 */
export function h(tag, attrs, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") element.className = value;
    else if (key === "text") element.textContent = value;
    else if (key === "html") element.innerHTML = value;
    else if (key === "props") Object.assign(element, value);
    else if (key === "style" && typeof value === "object") {
      for (const [name, item] of Object.entries(value)) element.style.setProperty(name, String(item));
    } else if (key.startsWith("on") && typeof value === "function") element.addEventListener(key.slice(2).toLowerCase(), value);
    else element.setAttribute(key, value === true ? "" : String(value));
  }
  append(element, children);
  return element;
}

function append(parent, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else parent.append(child);
  }
}

/** Creates a chart element with its data set through the `data` property. */
export function chart(tag, data, attrs = {}) {
  const element = h(tag, attrs);
  element.data = data;
  return element;
}

/** Announces a short message to screen readers through the page's live region. */
export function announce(message) {
  const region = document.getElementById("announcer");
  if (!region) return;
  region.textContent = "";
  // A fresh text node, so the same message twice is announced twice.
  requestAnimationFrame(() => (region.textContent = message));
}

/** Copies text, with a textarea fallback when the async clipboard is unavailable. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = h("textarea", { class: "visually-hidden", "aria-hidden": "true", tabindex: "-1" });
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

const COPY_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

/**
 * A copy button. `getText` is read on click, so it always copies the current value.
 *
 * @param {() => string} getText
 * @param {string} [label] Accessible name.
 */
export function copyButton(getText, label = "Copy code") {
  const text = h("span", { class: "copy-label", text: "Copy" });
  const button = h("button", { type: "button", class: "btn btn-ghost btn-sm copy-btn", "aria-label": label, html: COPY_ICON }, text);
  let timer = 0;
  button.addEventListener("click", async () => {
    const ok = await copyText(getText());
    text.textContent = ok ? "Copied" : "Copy failed";
    button.dataset.state = ok ? "ok" : "error";
    announce(ok ? "Copied to clipboard" : "Copy failed: select the text and copy it manually");
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      text.textContent = "Copy";
      delete button.dataset.state;
    }, 1600);
  });
  return button;
}

/**
 * A code block with a copy button. Returns the block and a setter for the code.
 *
 * @param {string} code
 * @param {{ label?: string, caption?: string }} [options]
 */
export function codeBlock(code, { label = "Code", caption } = {}) {
  const codeElement = h("code", { text: code });
  const pre = h("pre", { tabindex: "0", "aria-label": label }, codeElement);
  const block = h(
    "div",
    { class: "code-block" },
    h("div", { class: "code-head" }, h("span", { class: "code-caption", text: caption ?? label }), copyButton(() => codeElement.textContent ?? "", `Copy ${label}`)),
    pre,
  );
  return {
    element: block,
    set(text) {
      if (codeElement.textContent !== text) codeElement.textContent = text;
    },
  };
}

/** An install command with copy, one tab per package manager. */
export function installBox(commands) {
  const entries = Object.entries(commands);
  const tabs = tabSet(
    entries.map(([manager, command]) => ({
      id: manager,
      label: manager,
      panel: () => h("div", { class: "install-line" }, h("code", { text: command }), copyButton(() => command, `Copy ${manager} command`)),
    })),
    { label: "Package manager", className: "install" },
  );
  return tabs.element;
}

/**
 * ARIA tabs with roving focus (arrow keys, Home, End). Panels are created lazily.
 *
 * @param {{ id: string, label: string, panel: () => Node }[]} items
 * @param {{ label: string, className?: string, selected?: string, onChange?: (id: string) => void }} options
 */
export function tabSet(items, { label, className = "", selected, onChange }) {
  const base = nextId("tabs");
  const list = h("div", { class: "tab-list", role: "tablist", "aria-label": label });
  const panels = h("div", { class: "tab-panels" });
  /** @type {Map<string, { tab: HTMLButtonElement, panel: HTMLElement, built: boolean }>} */
  const parts = new Map();

  const select = (id, focus = false) => {
    for (const [key, part] of parts) {
      const active = key === id;
      part.tab.setAttribute("aria-selected", String(active));
      part.tab.tabIndex = active ? 0 : -1;
      part.panel.hidden = !active;
      if (active && !part.built) {
        part.panel.append(items.find((item) => item.id === key).panel());
        part.built = true;
      }
      if (active && focus) part.tab.focus();
    }
    onChange?.(id);
  };

  for (const item of items) {
    const tab = h("button", { type: "button", role: "tab", id: `${base}-${item.id}-tab`, "aria-controls": `${base}-${item.id}`, class: "tab", text: item.label });
    const panel = h("div", { role: "tabpanel", id: `${base}-${item.id}`, "aria-labelledby": tab.id, class: "tab-panel", hidden: true });
    tab.addEventListener("click", () => select(item.id));
    parts.set(item.id, { tab, panel, built: false });
    list.append(tab);
    panels.append(panel);
  }

  list.addEventListener("keydown", (event) => {
    const ids = items.map((item) => item.id);
    const current = ids.findIndex((id) => parts.get(id).tab === document.activeElement);
    if (current === -1) return;
    const moves = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: ids.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(ids[(moves[event.key] + ids.length) % ids.length], true);
  });

  select(selected ?? items[0].id);
  return { element: h("div", { class: `tabs ${className}` }, list, panels), select };
}

/**
 * A segmented control built on native radio buttons (keyboard support for free).
 *
 * @param {{ legend: string, name?: string, options: { value: string, label: string }[], value: string, onChange: (value: string) => void, hideLegend?: boolean, small?: boolean }} config
 */
export function segmented({ legend, name = nextId("seg"), options, value, onChange, hideLegend = false, small = false }) {
  const fieldset = h("fieldset", { class: `segmented${small ? " segmented-sm" : ""}` }, h("legend", { class: hideLegend ? "visually-hidden" : "field-label", text: legend }));
  const group = h("div", { class: "segmented-group" });
  for (const option of options) {
    const input = h("input", { type: "radio", name, value: option.value, checked: option.value === value });
    input.addEventListener("change", () => input.checked && onChange(option.value));
    group.append(h("label", { class: "segment" }, input, h("span", { text: option.label })));
  }
  fieldset.append(group);
  return {
    element: fieldset,
    set(next) {
      for (const input of group.querySelectorAll("input")) input.checked = input.value === next;
    },
  };
}

/** Runs `fn` at most once per `wait` ms after the last call. */
export function debounce(fn, wait = 200) {
  let timer = 0;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/** Whether the user asks for reduced motion. */
export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A page header block: eyebrow, h1 (focus target on navigation) and lead. */
export function pageHeader({ eyebrow, title, lead, actions }) {
  return h(
    "header",
    { class: "page-header" },
    eyebrow ? h("p", { class: "eyebrow", text: eyebrow }) : null,
    h("h1", { tabindex: "-1", text: title }),
    lead ? h("p", { class: "lead", text: lead }) : null,
    actions ? h("div", { class: "page-actions" }, actions) : null,
  );
}

/** @type {Map<string, number>} */
const ratios = new Map();

/** The chart's viewBox aspect ratio (width / height), read once per tag from a detached instance. */
export function chartRatio(tag) {
  if (!ratios.has(tag)) {
    const element = /** @type {any} */ (document.createElement(tag));
    const ratio = Number(element.chartWidth) / Number(element.chartHeight);
    ratios.set(tag, Number.isFinite(ratio) && ratio > 0 ? ratio : 10 / 3);
  }
  return /** @type {number} */ (ratios.get(tag));
}
