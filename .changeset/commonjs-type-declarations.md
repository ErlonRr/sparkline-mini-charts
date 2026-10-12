---
"sparkline-mini-charts": patch
---

### Fixed

- **CommonJS TypeScript declarations.** Projects that `require()` the CommonJS build now get CommonJS declarations (`.d.cts`) for all 24 entries, instead of ESM declarations "masquerading as ESM".
- **Subpath types under `moduleResolution: "node"`.** TypeScript's legacy `node` (node10) resolution ignores `exports`, so `sparkline-mini-charts/react`, `/math` and the other subpaths had no types there. A `typesVersions` map now points each subpath at its declarations.

### Changed

- The `exports` map uses nested `import` and `require` conditions, each with its own `types`, and exposes `./package.json`.
- The Angular CommonJS declarations import the types of the ESM-only `@angular/core` with `resolution-mode: "import"`.
