// demo.spec.ts — Browser tests of the demo: every route renders charts with a clean console,
// the configurator updates its live preview, and axe finds no serious or critical issue.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ROUTES = ["/", "/charts", "/charts/mini-line-chart", "/live", "/theming", "/frameworks"];

/** Collects console errors and warnings and uncaught exceptions. */
function collectProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(`console.${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
  return problems;
}

/** Opens a hash route and waits until a chart inside <main> has rendered its svg. */
async function open(page: Page, route: string): Promise<void> {
  await page.goto(`./#${route}`);
  await expect(page.locator("main h1")).toBeVisible();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("main *")].some(
      (element) => element.localName.startsWith("mini-") && element.shadowRoot?.querySelector("svg") && element.getBoundingClientRect().width > 0,
    ),
  );
}

// No fade-ins or streaming while the tests read the page.
test.use({ reducedMotion: "reduce" });

for (const route of ROUTES) {
  test(`#${route} renders visible charts with a clean console`, async ({ page }) => {
    const problems = collectProblems(page);
    await open(page, route);
    expect(problems).toEqual([]);
  });
}

test("the configurator updates the preview from a generated control", async ({ page }) => {
  const problems = collectProblems(page);
  await open(page, "/charts/mini-line-chart");
  const preview = page.locator("#preview-chart");
  const path = () => preview.evaluate((element) => element.shadowRoot?.querySelector('[part="line"]')?.getAttribute("d") ?? "");
  const before = await path();

  // The Curve control is generated from MiniLineChart.props.curve (an enum).
  await page.locator('[data-option="curve"]').getByRole("radio", { name: "step", exact: true }).check();

  await expect(preview).toHaveAttribute("curve", "step");
  await expect.poll(path).not.toBe(before);
  await expect(page.locator(".code-block code").first()).toContainText('curve="step"');
  await expect(page).toHaveURL(/curve=step/);

  // Interactive is on in the initial state: hovering logs sparkline-hover with its detail.
  const box = await preview.boundingBox();
  if (!box) throw new Error("preview has no box");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  await expect(page.locator(".event-item").first()).toContainText("sparkline-hover");
  expect(problems).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  for (const route of ["/", "/charts/mini-line-chart"]) {
    test(`axe: #${route} (${theme}) has no serious or critical violations`, async ({ page }) => {
      await page.addInitScript((value) => {
        try {
          localStorage.setItem("smc-theme", value);
        } catch {
          // Storage blocked: the system theme is tested.
        }
      }, theme);
      await open(page, route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map((violation) => ({ id: violation.id, targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")), summary: violation.nodes[0]?.failureSummary }));
      expect(blocking).toEqual([]);
    });
  }
}
