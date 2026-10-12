// demo-helpers.ts — Routes, chart tags and page instrumentation shared by the demo browser tests.

import type { Page } from "@playwright/test";

/** The demo's 8 views, as hash routes. */
export const ROUTES = Object.freeze([
  "overview",
  "streaming",
  "components",
  "components/mini-line-chart",
  "theming",
  "gradients",
  "playground",
  "frameworks",
]);

/** Views without a live chart: the overview and the framework snippets. */
export const CHART_FREE_ROUTES = Object.freeze(["overview", "frameworks"]);

/** The 17 custom elements the library registers. */
export const CHART_TAGS = Object.freeze([
  "mini-area-chart",
  "mini-bar-chart",
  "mini-bullet-chart",
  "mini-candlestick-chart",
  "mini-combo-chart",
  "mini-gauge-chart",
  "mini-half-pie-chart",
  "mini-line-chart",
  "mini-ohlc-chart",
  "mini-pie-chart",
  "mini-progress-chart",
  "mini-radial-bar-chart",
  "mini-range-bar-chart",
  "mini-scatter-chart",
  "mini-stacked-area-chart",
  "mini-stream-chart",
  "mini-win-loss-chart",
]);

/**
 * Answers the only third-party request (the Google Fonts stylesheet) with an empty
 * stylesheet, so the tests run offline and the console has no network noise.
 */
export async function stubExternalRequests(page: Page): Promise<void> {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
}

/** Collects console errors and warnings and uncaught exceptions. */
export function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
  return problems;
}

/**
 * Counts `data` attribute writes on chart elements in `window.__dataWrites`, and lets
 * the test hide the page with `window.__setHidden(true)` (document.hidden + visibilitychange).
 */
export async function instrumentDataWrites(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const win = window as unknown as { __dataWrites: number; __setHidden: (hidden: boolean) => void };
    win.__dataWrites = 0;
    const setAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: string) {
      if (name === "data" && this.localName.startsWith("mini-")) win.__dataWrites++;
      return setAttribute.call(this, name, value);
    };
    let hidden = false;
    Object.defineProperty(Document.prototype, "hidden", { configurable: true, get: () => hidden });
    Object.defineProperty(Document.prototype, "visibilityState", {
      configurable: true,
      get: () => (hidden ? "hidden" : "visible"),
    });
    win.__setHidden = (value: boolean) => {
      hidden = value;
      document.dispatchEvent(new Event("visibilitychange"));
    };
  });
}

export const dataWrites = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __dataWrites: number }).__dataWrites);

export const resetDataWrites = (page: Page): Promise<void> =>
  page.evaluate(() => {
    (window as unknown as { __dataWrites: number }).__dataWrites = 0;
  });

/** Opens a route on a fresh load and waits until the app has booted. */
export async function openRoute(page: Page, route: string): Promise<void> {
  await page.goto(`./#/${route}`);
  await page.waitForFunction(() => document.querySelector(".page-view.active") !== null);
  await page.waitForLoadState("load");
}

/** Number of rendered charts (a shadow root with an <svg>) in the active view. */
export function renderedChartsInView(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      [...document.querySelectorAll(".page-view.active *")].filter(
        (el) => el.localName.startsWith("mini-") && el.shadowRoot?.querySelector("svg") !== null && el.shadowRoot !== null,
      ).length,
  );
}
