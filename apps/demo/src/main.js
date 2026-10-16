// main.js — Demo entry: registers the charts, then runs the theme switch and the hash router.
// Each view is a lazily loaded module that mounts its own charts and returns a cleanup function.

// The demo depends on the workspace package through its `exports`, so dev and build
// both run the built packages/core/dist/ (vite.config.js stops with the fix when it is missing).
import "sparkline-mini-charts/register";
import { defineChartPreset } from "sparkline-mini-charts/define";
import { DEMO_PRESETS } from "./presets.js";

for (const [name, map] of Object.entries(DEMO_PRESETS)) defineChartPreset(name, map);

const VERSION = import.meta.env.SMC_VERSION;
const GITHUB_URL = import.meta.env.SMC_GITHUB_URL;

// --- Theme -----------------------------------------------------------------

const THEME_KEY = "smc-theme";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function storedTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

const effectiveTheme = () => storedTheme() ?? (systemDark.matches ? "dark" : "light");

/** Applies a theme: `color-scheme` on the page, so the charts' dark defaults follow too. */
function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
  }
}

document.getElementById("theme-toggle")?.addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  applyTheme(next);
});
systemDark.addEventListener("change", () => {
  if (!storedTheme()) applyTheme(effectiveTheme());
});
applyTheme(effectiveTheme());

// --- Shell -----------------------------------------------------------------

for (const element of document.querySelectorAll("[data-version]")) element.textContent = `v${VERSION}`;
for (const element of document.querySelectorAll("[data-github]")) element.setAttribute("href", GITHUB_URL);

const main = /** @type {HTMLElement} */ (document.getElementById("main"));

// The skip link must not change the hash, which is the route.
document.querySelector(".skip-link")?.addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
});

// --- Router ----------------------------------------------------------------

const ROUTES = [
  { pattern: /^\/?$/, nav: "home", load: () => import("./pages/home.js") },
  { pattern: /^\/charts\/?$/, nav: "charts", load: () => import("./pages/gallery.js") },
  { pattern: /^\/charts\/(mini-[a-z-]+)$/, nav: "charts", load: () => import("./pages/configurator.js") },
  { pattern: /^\/live\/?$/, nav: "live", load: () => import("./pages/live.js") },
  { pattern: /^\/theming\/?$/, nav: "theming", load: () => import("./pages/theming.js") },
  { pattern: /^\/frameworks\/?$/, nav: "frameworks", load: () => import("./pages/frameworks.js") },
];

/** @type {(() => void) | null} */
let cleanup = null;
let navigation = 0;
let firstRender = true;

/** Splits `#/charts/mini-line-chart?curve=smooth` into its path and query. */
function parseHash() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = hash.split("?");
  return { path, params: new URLSearchParams(query) };
}

async function render() {
  const { path, params } = parseHash();
  // Fragment links that are not routes (`#main`) keep the current view.
  if (!path.startsWith("/")) return;
  const current = ++navigation;
  const route = ROUTES.find((item) => item.pattern.test(path));
  const match = route ? path.match(route.pattern) : null;

  for (const link of document.querySelectorAll(".primary-nav a")) {
    if (link.getAttribute("data-nav") === route?.nav) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  main.setAttribute("aria-busy", "true");
  let page;
  try {
    page = route ? await route.load() : await import("./pages/not-found.js");
  } catch (error) {
    console.error(error);
    page = await import("./pages/not-found.js");
  }
  if (current !== navigation) return;

  cleanup?.();
  cleanup = null;
  main.replaceChildren();
  const view = document.createElement("div");
  view.className = "view";
  main.append(view);
  const result = page.mount(view, { params: match?.slice(1) ?? [], query: params });
  cleanup = typeof result === "function" ? result : null;
  main.removeAttribute("aria-busy");

  const heading = view.querySelector("h1");
  document.title = `${heading?.textContent ?? "Not found"} · Sparkline Mini Charts`;
  if (firstRender) {
    firstRender = false;
  } else {
    window.scrollTo({ top: 0 });
    /** @type {HTMLElement | null} */ (heading)?.focus({ preventScroll: true });
  }
}

window.addEventListener("hashchange", render);
render();
