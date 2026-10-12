// screenshots.mjs — Captures the README images in assets/img/ with Playwright: demo pages served by `vite preview`, plus a generated sheet of the 24 charts.
//
// Run `pnpm build && pnpm build:demo` first; this script builds nothing. Then, from the repository root:
//
//   pnpm screenshots                   # every image
//   pnpm screenshots hero live         # only these (names without .png)
//   pnpm screenshots --no-optimize     # skip pngquant + oxipng (run through `pnpm dlx`)
//
// Every page is captured at deviceScaleFactor 2 with reduced motion, so charts are drawn
// in their final state (no entrance or update transition mid-frame).

import { spawn, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "../..");
const demoDir = resolve(root, "apps/demo");
const distDir = resolve(root, "packages/core/dist");
const outDir = resolve(root, "assets/img");

/** Not 4173 (`pnpm preview`) nor 4183 (the e2e tests), so a server left running there is never reused. */
const PORT = 4193;
const DEMO_URL = `http://127.0.0.1:${PORT}/`;
/** Origin of the generated pages; Playwright answers its requests from memory and packages/core/dist/. */
const SHEET_ORIGIN = "http://sheet.localhost";

// @playwright/test and vite are devDependencies of the demo: resolve them from there.
const demoRequire = createRequire(resolve(demoDir, "package.json"));
const { chromium } = demoRequire("@playwright/test");

// ---------------------------------------------------------------------------
// Generated pages: the 24-chart sheet and the tooltip close-up
// ---------------------------------------------------------------------------

/** Converts a catalog option (`trendLine: true`) to an attribute (`trend-line=""`). */
const attributeName = (key) => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/** Options of the catalog's `initial` that change how a chart looks (not how it reacts). */
const LOOK_OPTIONS = new Set(["curve", "radius", "trendLine", "donut", "showValue", "unit", "layout", "points"]);

/** Example dataset shown in the sheet when it is not the first: three boxes read better than one. */
const GALLERY_DATASET = { "mini-box-plot-chart": 1 };

/** Shared styles of the generated pages: tokens for light and dark, cards. */
const SHEET_STYLES = `
  :root {
    color-scheme: light;
    --bg: #f6f7fb;
    --card: #ffffff;
    --card-2: #f8fafc;
    --border: #e2e6ef;
    --text: #0f172a;
    --muted: #64748b;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  :root.dark {
    color-scheme: dark;
    --bg: #0b0e14;
    --card: #121722;
    --card-2: #0f141e;
    --border: #232a38;
    --text: #e6eaf2;
    --muted: #94a3b8;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--text); }
  body { padding: 28px; inline-size: max-content; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
`;

/**
 * The sheet of the 24 charts, in the demo's gallery order, each with an example dataset of the demo catalog.
 *
 * @param {readonly any[]} charts The demo catalog.
 * @param {"light" | "dark"} scheme Color scheme.
 * @returns {string} HTML document.
 */
function gallerySheet(charts, scheme) {
  const entries = charts.map((entry) => ({
    tag: entry.tag,
    name: entry.name,
    data: entry.datasets[GALLERY_DATASET[entry.tag] ?? 0].data,
    label: `${entry.name} chart`,
    attributes: Object.fromEntries(
      Object.entries(entry.initial ?? {})
        .filter(([key, value]) => LOOK_OPTIONS.has(key) && value !== false)
        .map(([key, value]) => [attributeName(key), value === true ? "" : String(value)]),
    ),
  }));
  return `<!doctype html>
<html lang="en" class="${scheme}">
<head>
<meta charset="utf-8" />
<title>Sparkline Mini Charts: the 24 charts</title>
<style>
  ${SHEET_STYLES}
  .grid { display: grid; grid-template-columns: repeat(6, 196px); gap: 14px; margin: 0; padding: 0; list-style: none; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
  .preview { display: grid; place-items: center; block-size: 112px; padding: 14px 16px; background: var(--card-2); border-bottom: 1px solid var(--border); }
  .preview > * { max-inline-size: 100%; }
  .body { padding: 10px 14px 12px; }
  .name { margin: 0; font-size: 14px; font-weight: 600; }
  .tag { display: block; margin-top: 3px; font-size: 11px; color: var(--muted); }
</style>
<script type="module">
  import "./dist/register.js";
  const entries = ${JSON.stringify(entries)};
  const grid = document.querySelector(".grid");
  for (const entry of entries) {
    const chart = document.createElement(entry.tag);
    for (const [name, value] of Object.entries(entry.attributes)) chart.setAttribute(name, value);
    chart.setAttribute("label", entry.label);
    chart.data = entry.data;
    // Wide charts fill the card's width; round ones keep their own aspect ratio at a fixed height.
    const ratio = Number(chart.chartWidth) / Number(chart.chartHeight) || 10 / 3;
    if (ratio >= 2.5) {
      chart.style.inlineSize = "100%";
      chart.style.setProperty("--mini-chart-aspect-ratio", "2 / 1");
    } else {
      chart.style.blockSize = ratio >= 1.5 ? "72px" : "84px";
    }
    const card = document.createElement("li");
    card.className = "card";
    card.innerHTML = '<div class="preview"></div><div class="body"><p class="name"></p><code class="tag"></code></div>';
    card.querySelector(".preview").append(chart);
    card.querySelector(".name").textContent = entry.name;
    card.querySelector(".tag").textContent = "<" + entry.tag + ">";
    grid.append(card);
  }
  document.body.dataset.ready = "";
</script>
</head>
<body><ul class="grid"></ul></body>
</html>`;
}

/** A KPI card with an area chart whose built-in tooltip is shown by hovering a point. */
const TOOLTIP_PAGE = `<!doctype html>
<html lang="en" class="light">
<head>
<meta charset="utf-8" />
<title>Sparkline Mini Charts: tooltip</title>
<style>
  ${SHEET_STYLES}
  body { padding: 56px 40px 32px; }
  .card { inline-size: 560px; padding: 20px 22px 18px; background: var(--card); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 1px 2px rgb(16 24 40 / 0.06), 0 12px 32px -12px rgb(16 24 40 / 0.18); }
  .title { margin: 0; font-size: 14px; color: var(--muted); }
  .value { margin: 4px 0 14px; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
  .value span { margin-left: 8px; font-size: 14px; font-weight: 600; color: #047857; }
  mini-area-chart { inline-size: 100%; }
</style>
<script type="module">
  import "./dist/register.js";
  const chart = document.querySelector("mini-area-chart");
  chart.data = [18.2, 23.4, 20.1, 31.6, 27.3, 38.4, 35.2, 44.9, 41.3, 52.7];
  document.body.dataset.ready = "";
</script>
</head>
<body>
  <article class="card">
    <p class="title">Weekly revenue (k$)</p>
    <p class="value">$52.7k<span>▲ 27.6%</span></p>
    <mini-area-chart curve="smooth" points="all" tooltip locale="en-US" label="Weekly revenue, last 10 weeks"></mini-area-chart>
  </article>
</body>
</html>`;

/**
 * Answers the generated pages' requests: the pages from memory, `dist/…` from packages/core/dist/.
 *
 * @param {import("@playwright/test").Page} page
 * @param {Record<string, string>} documents HTML by path (`/gallery.html`).
 */
async function serveSheet(page, documents) {
  await page.route(`${SHEET_ORIGIN}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    if (documents[pathname]) return route.fulfill({ contentType: "text/html", body: documents[pathname] });
    const file = normalize(join(distDir, decodeURIComponent(pathname.replace(/^\/dist\//, ""))));
    if (pathname.startsWith("/dist/") && file.startsWith(distDir + sep) && existsSync(file)) {
      const type = extname(file) === ".js" ? "text/javascript" : "application/octet-stream";
      return route.fulfill({ contentType: type, body: await readFile(file) });
    }
    return route.fulfill({ status: 404, body: "" });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Waits until every chart in the page has rendered an svg, fonts are loaded and two frames have passed. */
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.querySelectorAll("*")]
      .filter((element) => element.localName.startsWith("mini-") && element.localName.endsWith("-chart"))
      .every((chart) => chart.shadowRoot?.querySelector("svg")),
  );
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  await page.waitForTimeout(300);
}

/** The bounding box of `selector`, grown by `pad` px (or `[x, y]`), as a screenshot clip. */
async function clipAround(page, selector, pad = 24) {
  const [padX, padY] = Array.isArray(pad) ? pad : [pad, pad];
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} is not visible`);
  return { x: Math.max(0, box.x - padX), y: Math.max(0, box.y - padY), width: box.width + 2 * padX, height: box.height + 2 * padY };
}

/** The union of two clips. */
function union(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

/**
 * Opens a demo route in a fresh page.
 *
 * @param {import("@playwright/test").Browser} browser
 * @param {string} hash Route, e.g. `#/live`.
 * @param {{ scheme?: "light" | "dark", width?: number, height?: number }} [options]
 */
async function openDemo(browser, hash, { scheme = "light", width = 1280, height = 900 } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
  await page.goto(DEMO_URL + hash);
  await page.locator("main h1").waitFor();
  await settle(page);
  return page;
}

// ---------------------------------------------------------------------------
// The images
// ---------------------------------------------------------------------------

/** @type {Record<string, (browser: import("@playwright/test").Browser, context: { charts: readonly any[] }) => Promise<void>>} */
const SHOTS = {
  async hero(browser) {
    const page = await openDemo(browser, "#/", { height: 900 });
    const hero = await page.locator(".hero").boundingBox();
    await page.screenshot({ path: out("hero"), clip: { x: 0, y: 0, width: 1280, height: Math.round(hero.y + hero.height + 40) } });
    await page.close();
  },

  async "charts-gallery"(browser, { charts }) {
    await shootSheet(browser, charts, "light", "charts-gallery");
  },

  async "charts-gallery-dark"(browser, { charts }) {
    await shootSheet(browser, charts, "dark", "charts-gallery-dark");
  },

  async dashboard(browser) {
    const page = await openDemo(browser, "#/", { height: 2400 });
    await page.screenshot({ path: out("dashboard"), clip: await clipAround(page, "section[aria-labelledby='tiles-title']", 28) });
    await page.close();
  },

  async "data-table"(browser) {
    const page = await openDemo(browser, "#/", { height: 2400 });
    await page.screenshot({ path: out("data-table"), clip: await clipAround(page, "section[aria-labelledby='table-title']", 28) });
    await page.close();
  },

  async configurator(browser) {
    const page = await openDemo(browser, "#/charts/mini-line-chart", { height: 1400 });
    // The options column scrolls on its own: end it with the code panel, hide its scrollbar and fade its last option.
    const codeBottom = await page.evaluate(() => document.querySelector("[aria-labelledby='code-title']").getBoundingClientRect().bottom);
    const sideTop = await page.evaluate(() => document.querySelector(".config-side").getBoundingClientRect().top);
    await page.addStyleTag({
      content: `.config-side { max-height: ${Math.floor(codeBottom - sideTop)}px !important; scrollbar-width: none; mask-image: linear-gradient(to bottom, #000 calc(100% - 96px), transparent); }`,
    });
    // From the top of the preview to the bottom of the code panel; the events panel is left out.
    const layout = await clipAround(page, ".config-layout", 20);
    const code = await page.locator("[aria-labelledby='code-title']").boundingBox();
    // Hover the preview so the crosshair and active point show.
    const preview = await page.locator(".config-layout mini-line-chart").first().boundingBox();
    if (preview) {
      await page.mouse.move(preview.x + preview.width * 0.62, preview.y + preview.height * 0.5);
      await page.waitForTimeout(250);
    }
    await page.screenshot({ path: out("configurator"), clip: { ...layout, height: code.y + code.height + 20 - layout.y } });
    await page.close();
  },

  async live(browser) {
    const page = await openDemo(browser, "#/live", { scheme: "dark", height: 1200 });
    // Reduced motion pauses the stream: resume it, so the board shows live values drawn without transitions.
    await page.getByRole("button", { name: "Resume the stream" }).click();
    await page.waitForTimeout(3300);
    await settle(page);
    const header = await clipAround(page, ".page-header", 24);
    // Two rows of tiles; a smaller bottom padding keeps the third row out.
    const sixth = await clipAround(page, ".live-tile >> nth=5", [24, 10]);
    await page.screenshot({ path: out("live"), clip: union(header, sixth) });
    await page.close();
  },

  async tooltip(browser) {
    const page = await browser.newPage({ viewport: { width: 720, height: 420 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
    await serveSheet(page, { "/tooltip.html": TOOLTIP_PAGE });
    await page.goto(`${SHEET_ORIGIN}/tooltip.html`);
    await page.waitForSelector("body[data-ready]");
    await settle(page);
    // Hover the 8th of 10 points: the tooltip, crosshair and active point show.
    const box = await page.locator("mini-area-chart").boundingBox();
    await page.mouse.move(box.x + box.width * (7 / 9), box.y + box.height / 2);
    await page.locator("mini-area-chart").locator("[part~='tooltip'][data-visible]").waitFor();
    await settle(page);
    await page.screenshot({ path: out("tooltip"), clip: await clipAround(page, ".card", [32, 44]) });
    await page.close();
  },
};

/** Renders the 24-chart sheet in one scheme. */
async function shootSheet(browser, charts, scheme, name) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
  await serveSheet(page, { "/gallery.html": gallerySheet(charts, scheme) });
  await page.goto(`${SHEET_ORIGIN}/gallery.html`);
  await page.waitForSelector("body[data-ready]");
  await settle(page);
  await page.screenshot({ path: out(name), clip: await clipAround(page, ".grid", 28) });
  await page.close();
}

/** Output path of an image. */
const out = (name) => resolve(outDir, `${name}.png`);

// ---------------------------------------------------------------------------
// Server, optimisation and main
// ---------------------------------------------------------------------------

/** Starts `vite preview` of apps/demo/dist and resolves once it answers. */
async function startPreview() {
  const viteManifest = demoRequire.resolve("vite/package.json");
  const viteBin = resolve(dirname(viteManifest), JSON.parse(await readFile(viteManifest, "utf8")).bin.vite);
  const server = spawn(process.execPath, [viteBin, "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
    cwd: demoDir,
    stdio: ["ignore", "ignore", "inherit"],
  });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`vite preview exited with code ${server.exitCode}`);
    try {
      if ((await fetch(DEMO_URL)).ok) return server;
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  server.kill();
  throw new Error(`vite preview did not answer on ${DEMO_URL} within 30 s`);
}

/** Runs a `pnpm dlx` tool; returns false (with a warning) when it is unavailable or fails. */
function dlx(args) {
  const result = spawnSync("pnpm", ["dlx", ...args], { cwd: root, stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
  if (result.status === 0) return true;
  console.warn(`screenshots: \`pnpm dlx ${args[0]}\` failed (${(result.stderr || result.error?.message || "").trim().split("\n").at(-1)}); images left as captured.`);
  return false;
}

/** Shrinks the images: lossy palette quantisation (pngquant), then lossless recompression (oxipng). */
function optimise(files) {
  // Exit code 99 means "quality too low": pngquant keeps the original, which is fine.
  spawnSync("pnpm", ["dlx", "pngquant-bin", "--quality=75-95", "--speed=1", "--strip", "--skip-if-larger", "--force", "--ext", ".png", ...files], {
    cwd: root,
    stdio: "ignore",
  });
  dlx(["oxipng", "-o", "4", "--strip", "safe", "-q", ...files]);
}

async function main() {
  const args = process.argv.slice(2);
  const names = args.filter((arg) => !arg.startsWith("--"));
  const unknown = names.filter((name) => !(name in SHOTS));
  if (unknown.length > 0) throw new Error(`unknown image(s): ${unknown.join(", ")}. Known: ${Object.keys(SHOTS).join(", ")}`);
  for (const [path, fix] of [
    [resolve(distDir, "register.js"), "pnpm build"],
    [resolve(demoDir, "dist/index.html"), "pnpm build:demo"],
  ]) {
    if (!existsSync(path)) throw new Error(`${path} is missing: run \`${fix}\` first.`);
  }

  const { CHARTS } = await import(pathToFileURL(resolve(demoDir, "src/catalog.js")).href);
  await mkdir(outDir, { recursive: true });
  const server = await startPreview();
  const browser = await chromium.launch();
  const done = [];
  try {
    for (const name of names.length > 0 ? names : Object.keys(SHOTS)) {
      await SHOTS[name](browser, { charts: CHARTS }).catch((error) => {
        throw new Error(`${name}.png: ${error.message}`);
      });
      done.push(out(name));
    }
  } finally {
    await browser.close();
    server.kill();
  }

  if (!args.includes("--no-optimize")) optimise(done);
  for (const file of done) console.log(`${file.slice(root.length + 1)}  ${Math.round(statSync(file).size / 1024)} KB`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`screenshots: ${error.message}`);
    process.exitCode = 1;
  });
}
