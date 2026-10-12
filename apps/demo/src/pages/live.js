// live.js — A streaming board: simulated metrics pushed every second with `appendData()` when the
// chart has it (else `el.data = array`). Paused with reduced motion and while the tab is hidden.

import { candle, outcome, walk } from "../catalog.js";
import { chart, h, pageHeader, prefersReducedMotion, segmented } from "../ui.js";

const WINDOW = 30;

/**
 * Pushes values to a chart: `appendData()` when the library provides it, else
 * the whole window through the `data` property.
 */
function push(element, buffer, values) {
  buffer.push(...values);
  if (buffer.length > WINDOW) buffer.splice(0, buffer.length - WINDOW);
  if (typeof element.appendData === "function") element.appendData(values, { maxLength: WINDOW });
  else element.data = buffer;
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const format = (value, digits = 0) => value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function mount(view) {
  const streams = [];

  /** A tile with a title, a live value and a chart. `next()` returns the new values and the text. */
  const tile = ({ title, tag, initial, attrs, next, center = false }) => {
    const buffer = [...initial];
    const element = chart(tag, buffer, { ...attrs, class: center ? null : "chart-fill" });
    const value = h("span", { "aria-hidden": "true" });
    streams.push({ element, buffer, next, value, append: !center });
    return h(
      "article",
      { class: "card live-tile" },
      h("div", { class: "tile-head" }, h("h2", { class: "kpi-title", text: title }), h("a", { href: `#/charts/${tag}`, class: "field-hint", "aria-label": `Configure the ${title} chart` }, "Configure →")),
      h("p", { class: "kpi-value" }, value),
      center ? h("div", { class: "chart-center" }, element) : element,
    );
  };

  let cpu = 42;
  let requests = 1200;
  let price = 118;
  let latency = 64;
  const memory = [58];

  const grid = h(
    "div",
    { class: "live-grid" },
    tile({
      title: "CPU usage",
      tag: "mini-line-chart",
      initial: walk(WINDOW, 42, 5).map((value) => clamp(Math.round(value), 5, 98)),
      attrs: { curve: "smooth", interactive: "", label: "CPU usage, last 30 seconds" },
      next: () => {
        cpu = clamp(cpu + (Math.random() - 0.5) * 14, 5, 98);
        return { values: [Math.round(cpu)], text: `${Math.round(cpu)}%` };
      },
    }),
    tile({
      title: "Requests / s",
      tag: "mini-area-chart",
      initial: walk(WINDOW, 1200, 120, 300).map(Math.round),
      attrs: { curve: "smooth", label: "Requests per second, last 30 seconds" },
      next: () => {
        requests = clamp(requests + (Math.random() - 0.48) * 220, 300, 3000);
        return { values: [Math.round(requests)], text: format(Math.round(requests)) };
      },
    }),
    tile({
      title: "Net flow",
      tag: "mini-bar-chart",
      initial: Array.from({ length: WINDOW }, () => Math.round((Math.random() - 0.4) * 40)),
      attrs: { radius: "1", gap: "0.25", label: "Net flow per second" },
      next: () => {
        const value = Math.round((Math.random() - 0.4) * 40);
        return { values: [value], text: `${value > 0 ? "+" : ""}${value}` };
      },
    }),
    tile({
      title: "Price",
      tag: "mini-candlestick-chart",
      initial: (() => {
        const rows = [];
        let close = 100;
        for (let index = 0; index < 20; index++) {
          const next = candle(close);
          rows.push(next);
          close = next[3];
        }
        price = close;
        return rows;
      })(),
      attrs: { interactive: "", label: "Price, one candle per second" },
      next: () => {
        const next = candle(price);
        price = next[3];
        return { values: [next], text: `$${format(price, 2)}` };
      },
    }),
    tile({
      title: "Health checks",
      tag: "mini-win-loss-chart",
      initial: Array.from({ length: WINDOW }, outcome),
      attrs: { mode: "status", gap: "0.2", label: "Health check results" },
      next: () => {
        const value = Math.random() < 0.9 ? 1 : -1;
        return { values: [value], text: value > 0 ? "Passing" : "Failed" };
      },
    }),
    tile({
      title: "Latency",
      tag: "mini-gauge-chart",
      initial: [latency, 0, 200],
      center: true,
      attrs: { label: "Latency in milliseconds" },
      next: () => {
        latency = clamp(latency + (Math.random() - 0.5) * 30, 10, 190);
        return { values: [Math.round(latency), 0, 200], text: `${Math.round(latency)} ms` };
      },
    }),
    tile({
      title: "Memory",
      tag: "mini-progress-chart",
      initial: memory,
      center: true,
      attrs: { "show-value": "", unit: "%", label: "Memory used" },
      next: () => {
        memory[0] = clamp(memory[0] + (Math.random() - 0.5) * 8, 20, 96);
        return { values: [Math.round(memory[0])], text: `${Math.round(memory[0])}%` };
      },
    }),
  );

  // --- Loop --------------------------------------------------------------------------

  let interval = 1000;
  let timer = 0;
  let running = false;
  let reason = prefersReducedMotion() ? "reduced motion" : "";
  let ticks = 0;

  const status = h("span", { class: "status-pill", role: "status" });
  const toggle = h("button", { type: "button", class: "btn btn-primary" });
  const counter = h("span", { class: "field-hint" });

  const tick = () => {
    ticks += 1;
    for (const stream of streams) {
      const { values, text } = stream.next();
      if (stream.append) push(stream.element, stream.buffer, values);
      else stream.element.data = values;
      stream.value.textContent = text;
    }
    counter.textContent = `${ticks} update${ticks === 1 ? "" : "s"} · ${typeof streams[0].element.appendData === "function" ? "appendData()" : "el.data = array"}`;
  };

  const render = () => {
    status.toggleAttribute("data-live", running);
    status.textContent = running ? "Live" : reason ? `Paused — ${reason}` : "Paused";
    toggle.textContent = running ? "Pause" : "Resume";
    toggle.setAttribute("aria-label", running ? "Pause the stream" : "Resume the stream");
  };

  const start = () => {
    window.clearInterval(timer);
    running = true;
    reason = "";
    timer = window.setInterval(tick, interval);
    render();
  };

  const stop = (why = "") => {
    window.clearInterval(timer);
    timer = 0;
    running = false;
    reason = why;
    render();
  };

  toggle.addEventListener("click", () => (running ? stop() : start()));

  // A hidden tab pauses the stream; it resumes on return only if it was running.
  let resumeOnShow = false;
  const onVisibility = () => {
    if (document.hidden && running) {
      resumeOnShow = true;
      stop("tab hidden");
    } else if (!document.hidden && resumeOnShow) {
      resumeOnShow = false;
      start();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const speed = segmented({
    legend: "Update every",
    small: true,
    options: [
      { value: "500", label: "0.5 s" },
      { value: "1000", label: "1 s" },
      { value: "2000", label: "2 s" },
    ],
    value: String(interval),
    onChange: (value) => {
      interval = Number(value);
      if (running) start();
    },
  });

  view.append(
    h(
      "div",
      { class: "container" },
      pageHeader({
        eyebrow: "Live",
        title: "Streaming board",
        lead: "Simulated metrics generated in your browser, pushed every second. Each chart takes the new point and transitions in place: nothing is recreated.",
      }),
      h("div", { class: "live-bar" }, h("div", { class: "row", style: { "flex-wrap": "wrap", gap: "12px" } }, toggle, status, counter), speed.element),
      grid,
    ),
  );

  // First values right away (one update, no timer), so the numbers are never empty.
  tick();
  ticks = 0;
  counter.textContent = typeof streams[0].element.appendData === "function" ? "Updates with appendData()" : "Updates with el.data = array";
  if (reason || document.hidden) {
    resumeOnShow = !reason && document.hidden;
    stop(reason || "tab hidden");
  } else {
    start();
  }

  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
