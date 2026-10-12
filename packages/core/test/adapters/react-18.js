// react-18.js — Resolves `react` and `react-dom` to the React 18.3 aliases for the whole process.

import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

/** Entry points the wrappers and the tests import, and the aliased package that serves each one. */
const aliasedEntries = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "react-dom/server",
  "react-dom/server.node",
];

/** @type {Map<string, string>} */
const aliases = new Map(
  aliasedEntries.map((specifier) => {
    const [, packageName = "", subpath = ""] = /^(react-dom|react)(\/.*)?$/.exec(specifier) ?? [];
    return [specifier, pathToFileURL(require.resolve(`${packageName}-18${subpath}`)).href];
  }),
);

/**
 * The same dist/react.js has to run against React 18.3, but `react` resolves
 * to React 19 everywhere, react-dom-18's own `require("react")` included,
 * because pnpm links that peer by package name. The hook sends every bare
 * React import, from ESM or CommonJS, to the `react-18`/`react-dom-18` npm aliases.
 * `module.registerHooks()` needs Node.js 22.15 or 23.5.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = aliases.get(specifier);
    return url ? { url, shortCircuit: true } : nextResolve(specifier, context);
  },
});
