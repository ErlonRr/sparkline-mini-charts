// demo-a11y.spec.ts — Accessibility blockers of the demo: axe, reflow, drawer focus, motion and language.

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  ROUTES,
  dataWrites,
  instrumentDataWrites,
  openRoute,
  resetDataWrites,
  stubExternalRequests,
} from "./demo-helpers.ts";

test.beforeEach(async ({ page }) => {
  await stubExternalRequests(page);
});

test.describe("axe: no serious or critical violations", () => {
  // Reduced motion: no fade-in or stream while axe reads colors.
  test.use({ reducedMotion: "reduce" });

  for (const theme of ["light", "dark"]) {
    for (const route of ROUTES) {
      test(`#/${route} (${theme})`, async ({ page }) => {
        await page.addInitScript((value) => {
          try {
            localStorage.setItem("smc_theme", value);
          } catch {
            // Storage blocked: the default (dark) theme is tested.
          }
        }, theme);
        await openRoute(page, route);
        await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));

        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations
          .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
          .map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")),
            summary: violation.nodes[0]?.failureSummary,
          }));
        expect(blocking).toEqual([]);
      });
    }
  }
});

test.describe("reflow: no horizontal scroll", () => {
  for (const width of [320, 375]) {
    for (const route of ROUTES) {
      test(`#/${route} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await openRoute(page, route);
        await page.waitForTimeout(150);
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          widest: [...document.querySelectorAll("body *")]
            .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
            .filter((el) => getComputedStyle(el).position !== "fixed")
            .slice(0, 5)
            .map((el) => `${el.localName}${el.id ? `#${el.id}` : ""}.${[...el.classList].join(".")}`),
        }));
        expect(overflow.scrollWidth, `elements past the edge: ${overflow.widest.join(", ")}`).toBeLessThanOrEqual(
          overflow.clientWidth,
        );
      });
    }
  }
});

test.describe("mobile drawer", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("closed, it is not focusable; it opens, closes with Esc, backdrop and navigation, and gives focus back", async ({
    page,
  }) => {
    await openRoute(page, "overview");
    const toggle = page.locator("#mobile-menu-btn");
    const sidebar = page.locator("#docs-sidebar");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(await sidebar.evaluate((el) => (el as HTMLElement).inert)).toBe(true);

    // Tab through the whole page: focus never lands in the closed drawer.
    await page.locator("body").focus();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => document.getElementById("docs-sidebar")?.contains(document.activeElement));
      expect(inside).toBe(false);
    }

    // Open, then Esc.
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(await sidebar.evaluate((el) => (el as HTMLElement).inert)).toBe(false);
    await expect(sidebar.locator("a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();

    // Open, then the backdrop.
    await toggle.click();
    await page.locator("#drawer-backdrop").click({ position: { x: 360, y: 400 } });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();

    // Open, then navigate.
    await toggle.click();
    await sidebar.getByRole("link", { name: /Live Playground/ }).click();
    await expect(page).toHaveURL(/#\/playground$/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(await sidebar.evaluate((el) => (el as HTMLElement).inert)).toBe(true);
    await expect(toggle).toBeFocused();
  });
});

test.describe("motion", () => {
  test.describe("with reduced motion, no chart changes for 5 s", () => {
    test.use({ reducedMotion: "reduce" });

    for (const route of ROUTES) {
      test(`#/${route}`, async ({ page }) => {
        await instrumentDataWrites(page);
        await openRoute(page, route);
        await page.waitForTimeout(300);
        await resetDataWrites(page);
        await page.waitForTimeout(5000);
        expect(await dataWrites(page)).toBe(0);
        if (route === "streaming") {
          await expect(page.locator("#stream-status-text")).toContainText("PAUSED");
        }
      });
    }
  });

  test.describe("without a motion preference", () => {
    test.use({ reducedMotion: "no-preference" });

    test("the stream runs only on #/streaming, stops in a hidden tab and shows a text badge", async ({ page }) => {
      await instrumentDataWrites(page);
      await openRoute(page, "streaming");
      await expect(page.locator("#stream-status-text")).toContainText("LIVE");
      await expect.poll(() => dataWrites(page), { timeout: 5000 }).toBeGreaterThan(0);

      // Hidden tab: no writes.
      await page.evaluate(() => (window as unknown as { __setHidden: (hidden: boolean) => void }).__setHidden(true));
      await resetDataWrites(page);
      await page.waitForTimeout(3000);
      expect(await dataWrites(page)).toBe(0);

      // Visible again: it resumes.
      await page.evaluate(() => (window as unknown as { __setHidden: (hidden: boolean) => void }).__setHidden(false));
      await expect.poll(() => dataWrites(page), { timeout: 5000 }).toBeGreaterThan(0);

      // Another route: no writes. The router runs on hashchange, after goto() returns:
      // count only once the overview is the active view, so a last streaming tick is not counted.
      await page.goto("./#/overview");
      await expect(page.locator("#view-overview")).toHaveClass(/\bactive\b/);
      await expect(page.locator("#view-streaming")).not.toHaveClass(/\bactive\b/);
      await resetDataWrites(page);
      await page.waitForTimeout(3000);
      expect(await dataWrites(page)).toBe(0);

      // Pause shows the PAUSED badge.
      await page.goto("./#/streaming");
      await page.locator("#stream-toggle-btn").click();
      await expect(page.locator("#stream-status-text")).toContainText("PAUSED");
    });
  });
});

test("the language switch updates html[lang]", async ({ page }) => {
  await openRoute(page, "overview");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator("#lang-toggle-btn").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
});

test("the toast is a status message and icon links have names", async ({ page }) => {
  await openRoute(page, "overview");
  await expect(page.locator("#toast")).toHaveAttribute("role", "status");
  await expect(page.getByRole("link", { name: "sparkline-mini-charts on npm" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "sparkline-mini-charts on GitHub" })).toHaveCount(1);
});
