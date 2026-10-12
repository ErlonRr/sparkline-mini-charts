// demo-smoke.spec.ts — Smoke tests of the built demo: every view boots cleanly and the fixed flows stay fixed.

import { expect, test } from "@playwright/test";
import {
  CHART_FREE_ROUTES,
  CHART_TAGS,
  ROUTES,
  collectConsoleProblems,
  openRoute,
  renderedChartsInView,
  stubExternalRequests,
} from "./demo-helpers.ts";

test.beforeEach(async ({ page }) => {
  await stubExternalRequests(page);
});

for (const route of ROUTES) {
  test(`#/${route} boots with a clean console and the 17 charts defined`, async ({ page }) => {
    const problems = collectConsoleProblems(page);
    await openRoute(page, route);

    const undefinedTags = await page.evaluate(
      (tags) => tags.filter((tag) => customElements.get(tag) === undefined),
      [...CHART_TAGS],
    );
    expect(undefinedTags).toEqual([]);

    if (!CHART_FREE_ROUTES.includes(route)) {
      await expect.poll(() => renderedChartsInView(page)).toBeGreaterThan(0);
    }
    // Let timers and deferred renders run before reading the console.
    await page.waitForTimeout(500);
    expect(problems).toEqual([]);
  });
}

test("an unknown chart route says the chart was not found", async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await openRoute(page, "components/mini-nope-chart");
  const view = page.locator("#view-not-found");
  await expect(view).toBeVisible();
  await expect(view.getByRole("heading", { name: "Chart not found" })).toBeVisible();
  await expect(view.locator("#not-found-tag")).toHaveText("<mini-nope-chart>");
  await expect(view.getByRole("link", { name: /Browse all 17 charts/ })).toHaveAttribute("href", "#/components");
  await expect(page.locator("#view-component-detail")).toBeHidden();
  expect(problems).toEqual([]);
});

test("the demo boots when localStorage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Storage is blocked", "SecurityError");
      },
    });
  });
  const problems = collectConsoleProblems(page);
  await openRoute(page, "components");
  await expect.poll(() => renderedChartsInView(page)).toBeGreaterThan(0);
  // Settings still work for the session.
  await page.locator("#theme-toggle-btn").click();
  await expect(page.locator("html")).toHaveClass(/light/);
  expect(problems).toEqual([]);
});

test("install tabs switch their own panels and the header pill copies the active command", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openRoute(page, "overview");
  const install = page.locator("#install-tabs");
  await install.getByRole("tab", { name: "npm", exact: true }).click();
  await expect(page.locator("#install-npm")).toBeVisible();
  await expect(page.locator("#install-pnpm")).toBeHidden();
  await expect(install.getByRole("tab", { name: "npm", exact: true })).toHaveAttribute("aria-selected", "true");

  // The framework tabs are untouched.
  await expect(page.locator("#tab-html-btn")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#tab-html")).not.toHaveAttribute("hidden");
  await expect(page.locator("#tab-react")).toHaveAttribute("hidden");

  await page.locator("#quick-install-btn").click();
  await expect(page.locator("#toast")).toContainText("npm install sparkline-mini-charts");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm install sparkline-mini-charts");
});

test("a framework tab does not change the install tabs", async ({ page }) => {
  await openRoute(page, "frameworks");
  await page.locator("#tab-react-btn").click();
  await expect(page.locator("#tab-react")).toBeVisible();
  await expect(page.locator("#tab-html")).toBeHidden();
  await expect(page.locator("#install-pnpm-tab")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#install-pnpm")).not.toHaveAttribute("hidden");
});

test("a failed copy shows an error toast", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
    });
  });
  const problems = collectConsoleProblems(page);
  await openRoute(page, "playground");
  await page.locator("#copy-code-btn").click();
  await expect(page.locator("#toast")).toHaveClass(/toast-error/);
  await expect(page.locator("#toast-msg")).toContainText("Could not copy");
  expect(problems).toEqual([]);
});

test("playground: the typed label wins, appears once, and the element is updated in place", async ({ page }) => {
  await openRoute(page, "playground");
  const preview = page.locator("#pg-preview-container mini-line-chart");
  await expect(preview).toHaveCount(1);
  await preview.evaluate((el) => el.setAttribute("data-test-marker", "first"));

  await page.locator("#pg-chart-label").fill("My typed label");
  await expect(preview).toHaveAttribute("label", "My typed label");
  // Same element: the marker set before typing is still there.
  await expect(preview).toHaveAttribute("data-test-marker", "first");

  const markup = (await page.locator("#pg-code-output").textContent()) ?? "";
  expect(markup.match(/\blabel=/g)).toHaveLength(1);
  expect(markup).toContain('label="My typed label"');
  const names = [...markup.matchAll(/^\s+([a-z-]+)(?==|$)/gm)].map((m) => m[1]);
  expect(new Set(names).size).toBe(names.length);
});

test("playground: invalid JSON shows an inline error and keeps the last preview", async ({ page }) => {
  await openRoute(page, "playground");
  const data = page.locator("#pg-chart-data");
  const before = await page.locator("#pg-preview-container mini-line-chart").getAttribute("data");
  await data.fill("[1, 2,");
  await expect(data).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#pg-data-error")).toBeVisible();
  await expect(page.locator("#pg-data-error")).toContainText("Invalid JSON");
  await expect(page.locator("#pg-preview-container mini-line-chart")).toHaveAttribute("data", before ?? "");

  await data.fill("[3, 1, 4]");
  await expect(data).not.toHaveAttribute("aria-invalid");
  await expect(page.locator("#pg-data-error")).toBeHidden();
  await expect(page.locator("#pg-preview-container mini-line-chart")).toHaveAttribute("data", "[3,1,4]");
});

test("theming lab: a preset survives a slider, a route change, and only its own pills react", async ({ page }) => {
  await openRoute(page, "theming");
  const board = page.locator("#theming-preview-board");
  await page.locator('#theme-presets-bar [data-preset="emerald"]').click();
  await page.locator("#theme-token-opacity").fill("0.7");
  await expect(page.locator("#theme-token-opacity-val")).toHaveText("0.7");

  await expect(page.locator('#theme-presets-bar [data-preset="emerald"]')).toHaveAttribute("aria-pressed", "true");
  const paletteFirst = () => board.evaluate((el) => el.style.getPropertyValue("--mini-chart-color-1"));
  expect(await paletteFirst()).toBe("#10b981");
  expect(await board.evaluate((el) => el.style.getPropertyValue("--mini-chart-bar-opacity-inactive"))).toBe("0.7");

  // Leaving and coming back keeps the preset.
  await page.goto("./#/overview");
  await page.goto("./#/theming");
  expect(await paletteFirst()).toBe("#10b981");

  // The gradients pills are a separate group.
  await page.goto("./#/gradients");
  await expect(page.locator('#gradient-presets-bar [data-grad-preset="thermal"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('#gradient-presets-bar [data-grad-preset="aurora"]').click();
  await page.goto("./#/overview");
  await page.goto("./#/gradients");
  await expect(page.locator('#gradient-presets-bar [data-grad-preset="aurora"]')).toHaveAttribute("aria-pressed", "true");
  await page.goto("./#/theming");
  await expect(page.locator('#theme-presets-bar [data-preset="emerald"]')).toHaveAttribute("aria-pressed", "true");
});

test("theming lab: Default (no theme) removes every override", async ({ page }) => {
  await openRoute(page, "theming");
  const board = page.locator("#theming-preview-board");
  await page.locator('#theme-presets-bar [data-preset="default"]').click();
  await expect(board).toHaveClass(/is-library-default/);
  expect(await board.evaluate((el) => el.style.cssText)).toBe("");
  // The site's own chart tokens are reset on the board too.
  expect(await board.evaluate((el) => getComputedStyle(el).getPropertyValue("--mini-chart-color").trim())).toBe("");
  await expect(page.locator("#theming-css-output")).toContainText("no --mini-chart-* overrides");
  await expect(page.locator("#theme-token-stroke")).toHaveCount(0);
});

test("theming lab: a tweak after Default overrides only the changed control", async ({ page }) => {
  await openRoute(page, "theming");
  const board = page.locator("#theming-preview-board");
  await page.locator('#theme-presets-bar [data-preset="emerald"]').click();
  await page.locator('#theme-presets-bar [data-preset="default"]').click();
  await page.locator("#theme-token-opacity").fill("0.6");

  const overrides = await board.evaluate((el) =>
    Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith("--mini-chart")),
  );
  expect(overrides).toEqual(["--mini-chart-bar-opacity-inactive"]);
  await expect(page.locator("#theming-css-output")).not.toContainText("--mini-chart-color:");
  await expect(page.locator("#theming-css-output")).toContainText("--mini-chart-bar-opacity-inactive: 0.6;");
});
