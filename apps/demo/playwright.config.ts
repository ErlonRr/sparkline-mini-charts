// playwright.config.ts — Browser tests of the demo, run against `vite preview` of the static build.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Not 4173, the default of `pnpm preview`: a preview of another build left running
// there must not be reused as the server under test.
const PORT = 4183;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

// The tests run the built demo, which loads the built library: fail early with the fix.
if (!existsSync(resolve(import.meta.dirname, "dist/index.html"))) {
  throw new Error("apps/demo/dist/ is missing: run `pnpm build && pnpm build:demo` before `pnpm test:e2e`.");
}

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
