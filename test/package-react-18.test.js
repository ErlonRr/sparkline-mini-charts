// package-react-18.test.js — The same built React wrappers on React 18.3 (requires `pnpm build`).

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

if (typeof registerHooks !== "function") {
  // The React 18.3 aliases are wired in with a synchronous resolve hook (Node.js 22.15+ or 23.5+).
  // Locally the suite is skipped; on CI an older Node.js fails the run instead.
  const reason = `module.registerHooks() is unavailable on Node.js ${process.versions.node}`;
  test("React 18.3 wrappers", { skip: !process.env.CI && reason }, () => {
    assert.fail(`${reason}: CI must run Node.js 22.15 or newer`);
  });
} else {
  // The hook must be registered before anything resolves `react`, so the suite is imported dynamically.
  await import("./adapters/react-18.js");
  const { runReactSuite } = await import("./adapters/react-suite.js");

  await runReactSuite({ major: 18 });
}
